package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.studio.ContentRules;
import com.fluenta.api.service.studio.QuestionTypeRules;
import com.fluenta.api.service.studio.StubStudioAuthor;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Studio authoring: generate/fill questions (text) and extract (vision), normalized to StudioQuestion shape. */
@Service
public class StudioAiService {

    private static final Set<String> TYPES = Set.of(
            "true-false-notgiven", "yes-no-notgiven", "multiple-choice", "multi-select",
            "matching-information", "matching-headings", "matching-features", "matching-sentence-endings",
            "sentence-completion", "summary-completion", "diagram-label", "short-answer",
            "note-completion", "table-completion", "flow-chart-completion", "form-completion");
    private static final Set<String> TEXT_TYPES = Set.of(
            "sentence-completion", "summary-completion", "diagram-label", "short-answer",
            "note-completion", "table-completion", "flow-chart-completion", "form-completion");

    /** Shared item-writing rules (owner spec §2): TFNG and YNNG test different things; the text is the only source. */
    private static final String ITEM_RULES = """
        TRUE/FALSE/NOT GIVEN tests FACTUAL information: TRUE = the statement agrees with the information in the text;
        FALSE = it contradicts the information; NOT GIVEN = the text gives no information to confirm or contradict it.
        YES/NO/NOT GIVEN tests the WRITER'S VIEWS or claims: YES = it agrees with the writer's view/claim; NO = it
        contradicts the writer's view/claim; NOT GIVEN = the writer's position on that point cannot be established.
        Keep the two task types distinct and decide every answer ONLY from the text — never from outside knowledge,
        assumptions, probability or common sense. Completion answers (sentence/summary/note/table/flow-chart/form/
        diagram-label/short-answer) must be words copied from the text and must fit the word limit.""";

    private static final String GEN_SYSTEM = """
        You are an IELTS item writer. Write questions grounded ONLY in the given passage. Return ONLY a JSON
        object {"questions":[{"prompt":string,"type":string,"options":[string]?,"answer":string,"wordLimit":number?,"accepted":[string]?}]}.
        Use the requested question type. For multiple-choice give 4 options and answer a letter A-D; for multi-select
        ("Choose TWO/THREE") write each question as ONE item with 5 options (7 when CHOOSE is 3) and answer exactly
        CHOOSE different letters, comma-separated (e.g. "A,C"): the letters of the options the passage states or
        clearly supports — check each one against the text; every other option must be plausible but wrong
        according to the passage — COUNT is the number of such items, so return COUNT
        of them; for true-false-notgiven answer TRUE/FALSE/NOT GIVEN; for yes-no-notgiven answer
        YES/NO/NOT GIVEN; for completion/short-answer answer the exact words from the passage within the word limit, and list in
        "accepted" any other answers that must also be marked correct (British/American spellings, digits vs words,
        e.g. "4"/"four"); mark words a candidate may omit with parentheses, e.g. "(the) library". No prose, no fences.
        """ + ITEM_RULES;
    private static final String PASSAGE_SYSTEM = """
        You are an IELTS reading-content writer for Yalla English Hub. Write ONE original reading text that follows
        the BRIEF exactly (source type, purpose, register, length and paragraph labels). Do not copy published
        IELTS material. Return ONLY a JSON object {"title":string,"text":string}; separate paragraphs in "text" with
        a blank line. No prose, no fences.""";
    /** Matching types answered from a lettered list stored on the passage. */
    private static final Set<String> LIST_TYPES = Set.of(
            "matching-headings", "matching-features", "matching-sentence-endings", "matching-information");
    private static final int MAX_OPTIONS = 26;
    private static final String MATCH_SYSTEM = """
        You are an IELTS item writer building a matching task grounded ONLY in the given passage. You get the
        question type, a lettered LIST (some entries written, some marked "(write this one)") and COUNT.
        1) Complete the LIST: write every "(write this one)" entry; copy written entries unchanged; keep the same
           number of entries in the same order. For matching-sentence-endings each entry is a sentence ENDING;
           for matching-headings a short paragraph heading; for matching-features a name/feature (person, place,
           date…); for matching-information the list is the passage's paragraphs (copy it unchanged).
        2) Write COUNT questions whose answer is ONE letter from the LIST. For matching-sentence-endings each
           question is a sentence BEGINNING that one ending completes correctly according to the passage; for
           matching-headings it names the paragraph to title; for matching-features/matching-information it is a
           statement. Prefer different answers for different questions; unused entries act as distractors.
        Return ONLY {"options":[string],"questions":[{"prompt":string,"answer":"A"}]}. No prose, no fences.""";
    private static final String FILL_SYSTEM = """
        You are an IELTS examiner. For each question (prompt + type + options), return the correct answer grounded in
        the passage, preserving prompt/type/options and order. Return ONLY {"questions":[...]} with the same shape as
        the input plus a correct "answer" per the type's convention (letter for choice; TRUE/FALSE/NOT GIVEN etc.). No prose.
        """ + ITEM_RULES;
    private static final String EXTRACT_SYSTEM = """
        You read an uploaded image for an IELTS author. If it is a reading passage or question sheet, transcribe the
        passage into "passageText" and structure its questions. If it is a chart/graph/diagram/map/process, write a
        concise relevant passage/description into "passageText" and generate grounded questions. Return ONLY a JSON
        object {"passageText":string,"questions":[{"prompt","type","options"?,"answer","wordLimit"?}]}. No prose, no fences.""";

    private final AiProperties props;
    private final AiClient ai;
    private final StubStudioAuthor stub;
    private final ObjectMapper om;

    public StudioAiService(AiProperties props, AiClient ai, StubStudioAuthor stub, ObjectMapper om) {
        this.props = props; this.ai = ai; this.stub = stub; this.om = om;
    }

    public StudioQuestionsReply generate(StudioGenerateRequest req) {
        String passage = req.passageText() == null ? "" : req.passageText();
        if (passage.length() > props.maxEssayChars()) throw ApiException.badRequest("Passage is too long");
        String type = (req.questionType() != null && TYPES.contains(req.questionType())) ? req.questionType() : "short-answer";
        if (LIST_TYPES.contains(type)) return generateMatching(req, passage, type);
        int count = clamp(req.count() == null ? 2 : req.count(), 1, 20);
        if (MULTI_SELECT.equals(type)) {
            int choose = chooseOf(req.choose(), null);
            if (!props.live()) return new StudioQuestionsReply(stub.multiSelect(count, choose));
            String user = contextLine(req) + "QUESTION TYPE: " + type + "\nCHOOSE: " + choose + "\nCOUNT: " + count
                    + "\n" + QuestionTypeRules.prompt(type) + "PASSAGE:\n" + passage;
            List<StudioQuestionDto> qs = new ArrayList<>();
            for (StudioQuestionDto q : readQuestions(parse(ai.complete(GEN_SYSTEM, user)))) {
                if (qs.size() >= count) break;
                if (q.prompt() == null || q.prompt().isBlank()) continue;
                qs.add(shuffleOptions(multiSelect(q.prompt(), q.options(), q.answer(), choose)));
            }
            return new StudioQuestionsReply(qs);
        }
        if (!props.live()) return new StudioQuestionsReply(stub.generate(type, count));
        String user = contextLine(req) + "QUESTION TYPE: " + type + "\nCOUNT: " + count + "\n"
                + QuestionTypeRules.prompt(type) + "PASSAGE:\n" + passage;
        List<StudioQuestionDto> qs = new ArrayList<>();
        for (StudioQuestionDto q : normalize(readQuestions(parse(ai.complete(GEN_SYSTEM, user))), type)) {
            qs.add("multiple-choice".equals(q.type()) ? shuffleOptions(q) : q);
        }
        return new StudioQuestionsReply(qs);
    }

    /**
     * Models tend to write the correct option(s) first, so generated answers would cluster on A / A,B.
     * Shuffle the options and carry each correct letter with its text — the key stays right, its
     * position becomes random. Only for freshly generated questions (an admin's own options are kept).
     */
    StudioQuestionDto shuffleOptions(StudioQuestionDto q) {
        List<String> opts = q.options();
        if (opts == null || opts.size() < 2) return q;
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < opts.size(); i++) order.add(i);
        java.util.Collections.shuffle(order, java.util.concurrent.ThreadLocalRandom.current());
        Set<String> correct = AnswerMatcher.letters(q.answer());
        List<String> shuffled = new ArrayList<>();
        List<String> answer = new ArrayList<>();
        for (int i = 0; i < order.size(); i++) {
            int from = order.get(i);
            shuffled.add(opts.get(from));
            if (correct.contains(String.valueOf((char) ('A' + from)))) answer.add(String.valueOf((char) ('A' + i)));
        }
        java.util.Collections.sort(answer);
        return new StudioQuestionDto(q.prompt(), q.type(), shuffled, String.join(",", answer), q.wordLimit(), q.accepted(), q.choose());
    }

    // --- multi-select ("Choose TWO/THREE"): one question, several correct letters ---

    private static final String MULTI_SELECT = AnswerMatcher.MULTI_SELECT;
    private static final int MS_MAX_OPTIONS = 8;

    /** 2 or 3: the requested count, else inferred from how many letters the answer already has. */
    private static int chooseOf(Integer requested, String answer) {
        if (requested != null) return requested >= 3 ? 3 : 2;
        return answer != null && AnswerMatcher.letters(answer).size() >= 3 ? 3 : 2;
    }

    /**
     * Gate for one multi-select question: options padded to 5 (7 for choose THREE, at most 8); the answer
     * keeps the first {@code choose} distinct letters that exist among the options, sorted ("C, a" → "A,C").
     * Fewer valid letters than asked stay as they are — the Studio flags it for the admin.
     */
    private StudioQuestionDto multiSelect(String prompt, List<String> options, String answer, int choose) {
        List<String> opts = new ArrayList<>(options == null ? List.of() : options);
        int size = Math.min(MS_MAX_OPTIONS, Math.max(choose == 3 ? 7 : 5, opts.size()));
        opts = pad(opts, size);
        List<String> picked = new ArrayList<>();
        for (String l : AnswerMatcher.letters(answer)) {
            if (picked.size() < choose && l.charAt(0) - 'A' < size) picked.add(l);
        }
        java.util.Collections.sort(picked);
        return new StudioQuestionDto(prompt, MULTI_SELECT, opts, String.join(",", picked), null, null, choose);
    }

    /** Module/section/part context (Academic vs General Training are generated separately). */
    private static String contextLine(StudioGenerateRequest req) {
        String c = ContentRules.context(req.skill(), req.module(), req.section());
        return c.isEmpty() ? "" : "CONTEXT: " + c + "\n";
    }

    /** Write a reading passage following the owner spec's module/section brief. */
    public StudioPassageReply passage(StudioPassageRequest req) {
        String module = req.module() == null ? "academic" : req.module();
        String topic = req.topic() == null ? "" : req.topic().trim();
        if (topic.length() > 200) throw ApiException.badRequest("Topic is too long");
        if (!props.live()) return stub.passage(module, req.section(), topic);
        String user = "BRIEF: " + ContentRules.passageBrief(module, req.section())
                + (topic.isEmpty() ? "" : "\nTOPIC: " + topic);
        JsonNode node = parse(ai.complete(PASSAGE_SYSTEM, user));
        String text = node.path("text").asText("").trim();
        if (text.isEmpty()) throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "The AI returned an empty passage.");
        if (text.length() > props.maxEssayChars()) text = text.substring(0, props.maxEssayChars());
        String title = node.path("title").asText("").trim();
        return new StudioPassageReply(title.isEmpty() ? "Untitled passage" : title, text);
    }

    /**
     * Matching types: complete the passage's lettered list first (blank entries only — entries the admin
     * wrote are kept verbatim), then write {@code count} questions answered by letters from that list.
     * {@code count} 0 only completes the list; no list at all means count + 2 entries (room for distractors).
     */
    private StudioQuestionsReply generateMatching(StudioGenerateRequest req, String passage, String type) {
        int count = clamp(req.count() == null ? 2 : req.count(), 0, 20);
        List<String> given = new ArrayList<>(req.options() == null ? List.of() : req.options());
        if (given.isEmpty()) for (int i = 0; i < Math.max(count + 2, 3); i++) given.add("");
        if (given.size() > MAX_OPTIONS) given = new ArrayList<>(given.subList(0, MAX_OPTIONS));
        for (int i = 0; i < given.size(); i++) given.set(i, given.get(i) == null ? "" : given.get(i).trim());

        List<String> paragraphs = paragraphLetters(req.paragraphs());
        if (!props.live()) {
            return new StudioQuestionsReply(stub.matchingQuestions(type, count, given.size(), paragraphs), stub.matchingOptions(type, given));
        }
        StringBuilder list = new StringBuilder();
        for (int i = 0; i < given.size(); i++) {
            list.append((char) ('A' + i)).append(". ").append(given.get(i).isEmpty() ? "(write this one)" : given.get(i)).append('\n');
        }
        String user = contextLine(req) + "QUESTION TYPE: " + type + "\nCOUNT: " + count + "\n" + QuestionTypeRules.prompt(type)
                + (HEADINGS.equals(type) && !paragraphs.isEmpty()
                        ? "PARAGRAPHS: " + String.join(", ", paragraphs)
                          + " (each question names one of these, written \"Paragraph X\", each at most once)\n"
                        : "")
                + "LIST:\n" + list + "PASSAGE:\n" + passage;
        JsonNode node = parse(ai.complete(MATCH_SYSTEM, user));

        // Gate: same length as asked, admin entries win, blanks the model skipped get a placeholder.
        List<String> fromAi = new ArrayList<>();
        for (JsonNode o : node.path("options")) fromAi.add(o.asText("").trim());
        List<String> placeholders = stub.matchingOptions(type, java.util.Collections.nCopies(given.size(), ""));
        List<String> filled = new ArrayList<>();
        for (int i = 0; i < given.size(); i++) {
            String mine = given.get(i);
            String theirs = i < fromAi.size() ? stripLetter(fromAi.get(i)) : "";
            filled.add(!mine.isEmpty() ? mine : !theirs.isEmpty() ? theirs : placeholders.get(i));
        }
        // Gate (IELTS): Headings and Sentence Endings use each letter at most once; each Headings question
        // names one real paragraph, once. A question that breaks this is dropped — re-lettering it would
        // silently make its answer wrong — so fewer than COUNT may come back.
        boolean once = QuestionTypeRules.lettersOnce(type);
        Set<String> usedLetters = new java.util.HashSet<>();
        Set<String> usedParagraphs = new java.util.HashSet<>();
        List<StudioQuestionDto> qs = new ArrayList<>();
        for (JsonNode q : node.path("questions")) {
            if (qs.size() >= count) break;
            String prompt = q.path("prompt").asText("").trim();
            if (prompt.isEmpty()) continue;
            String answer = letterInRange(q.path("answer").asText(""), filled.size());
            String paragraph = null;
            if (HEADINGS.equals(type)) {
                java.util.regex.Matcher m = PARAGRAPH_REF.matcher(prompt);
                if (!m.matches()) continue;
                paragraph = m.group(1).toUpperCase(java.util.Locale.ROOT);
                if ((!paragraphs.isEmpty() && !paragraphs.contains(paragraph)) || usedParagraphs.contains(paragraph)) continue;
                prompt = "Paragraph " + paragraph;
            }
            if (once && usedLetters.contains(answer)) continue;
            // Record only once the question is kept, so a dropped one doesn't block a later valid one.
            usedLetters.add(answer);
            if (paragraph != null) usedParagraphs.add(paragraph);
            qs.add(new StudioQuestionDto(prompt, type, null, answer, null));
        }
        return new StudioQuestionsReply(qs, filled);
    }

    private static final String HEADINGS = "matching-headings";
    /** "Paragraph B", "para. B", "Section B" or a bare "B" (whole prompt) → B. */
    private static final java.util.regex.Pattern PARAGRAPH_REF =
            java.util.regex.Pattern.compile("(?i)^(?:(?:paragraph|para\\.?|section)\\s+)?\\(?([A-Z])\\)?\\.?$");

    /** Distinct single paragraph letters, upper case, in order. */
    private static List<String> paragraphLetters(List<String> raw) {
        List<String> out = new ArrayList<>();
        if (raw != null) for (String s : raw) {
            String l = s == null ? "" : s.trim().toUpperCase(java.util.Locale.ROOT);
            if (l.length() == 1 && Character.isLetter(l.charAt(0)) && !out.contains(l)) out.add(l);
        }
        return out;
    }

    /** "A. text" / "A) text" → "text" (models sometimes echo the letter). */
    private static String stripLetter(String s) {
        return s.replaceFirst("^\\(?[A-Z]\\s*[.):]\\s+", "").trim();
    }

    public StudioQuestionsReply fill(StudioFillRequest req) {
        List<StudioQuestionDto> qs = req.questions() == null ? List.of() : req.questions();
        if (qs.isEmpty()) throw ApiException.badRequest("No questions to fill");
        String passage = req.passageText() == null ? "" : req.passageText();
        if (passage.length() > props.maxEssayChars()) throw ApiException.badRequest("Passage is too long");
        String fallback = qs.get(0).type() != null && TYPES.contains(qs.get(0).type()) ? qs.get(0).type() : "short-answer";
        if (!props.live()) return new StudioQuestionsReply(stub.fill(qs, fallback));
        String user;
        try { user = "PASSAGE:\n" + passage
                + "\nQUESTIONS JSON:\n" + om.writeValueAsString(qs); }
        catch (Exception e) { throw ApiException.badRequest("Bad questions payload"); }
        List<StudioQuestionDto> out = normalize(readQuestions(parse(ai.complete(FILL_SYSTEM, user))), fallback);
        // Matching answers must be a letter of the list the admin sent (the model need not echo it back).
        List<StudioQuestionDto> gated = new ArrayList<>();
        for (int i = 0; i < out.size(); i++) {
            StudioQuestionDto q = out.get(i);
            StudioQuestionDto input = i < qs.size() ? qs.get(i) : null;
            List<String> list = input != null ? input.options() : null;
            if (MULTI_SELECT.equals(q.type())) {
                // Answer with the question's own choose count, against the options the admin wrote.
                int choose = chooseOf(input != null ? input.choose() : null, q.answer());
                q = multiSelect(q.prompt(), list != null ? list : q.options(), q.answer(), choose);
            } else if (LIST_TYPES.contains(q.type()) && list != null && !list.isEmpty()) {
                q = new StudioQuestionDto(q.prompt(), q.type(), null,
                        letterInRange(q.answer(), Math.min(list.size(), MAX_OPTIONS)), q.wordLimit(), null);
            }
            gated.add(q);
        }
        return new StudioQuestionsReply(gated);
    }

    public StudioExtractResult extract(StudioExtractRequest req) {
        List<StudioImage> images = req.images() == null ? List.of() : req.images();
        if (images.isEmpty()) throw ApiException.badRequest("No image provided");
        long bytes = images.stream().mapToLong(i -> i.base64() == null ? 0 : i.base64().length()).sum();
        if (bytes > props.maxImageBytes()) throw ApiException.badRequest("Image is too large");
        if (!props.live()) return stub.extract();
        List<AiClient.ImageInput> imgs = new ArrayList<>();
        for (StudioImage i : images) imgs.add(new AiClient.ImageInput(i.base64(), i.mediaType()));
        String hint = req.hint() == null || req.hint().isBlank() ? "" : ("\nHINT: " + req.hint());
        JsonNode node = parse(ai.vision(EXTRACT_SYSTEM, "Extract into the JSON schema." + hint, imgs));
        String passageText = node.path("passageText").asText("");
        List<StudioQuestionDto> qs = normalize(readQuestions(node), "short-answer");
        return new StudioExtractResult(passageText, qs);
    }

    // --- parsing + normalization gate ---

    private JsonNode parse(String raw) {
        if (raw == null) throw ApiException.badRequest("Empty AI response");
        String s = raw.trim();
        int a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a < 0 || b <= a) throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        try { return om.readTree(s.substring(a, b + 1)); }
        catch (Exception e) { throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "Could not read the AI response."); }
    }

    private List<StudioQuestionDto> readQuestions(JsonNode node) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (JsonNode q : node.path("questions")) {
            List<String> options = new ArrayList<>();
            for (JsonNode o : q.path("options")) options.add(o.asText(""));
            Integer wl = q.hasNonNull("wordLimit") ? q.get("wordLimit").asInt() : null;
            List<String> accepted = new ArrayList<>();
            for (JsonNode a : q.path("accepted")) accepted.add(a.asText(""));
            out.add(new StudioQuestionDto(q.path("prompt").asText(""), q.path("type").asText(null),
                    options.isEmpty() ? null : options, q.path("answer").asText(""), wl,
                    accepted.isEmpty() ? null : accepted));
        }
        return out;
    }

    List<StudioQuestionDto> normalize(List<StudioQuestionDto> raw, String fallbackType) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (StudioQuestionDto q : raw) {
            if (q.prompt() == null || q.prompt().isBlank()) continue;
            String type = (q.type() != null && TYPES.contains(q.type())) ? q.type() : fallbackType;
            if (MULTI_SELECT.equals(type)) {
                out.add(multiSelect(q.prompt(), q.options(), q.answer(), chooseOf(q.choose(), q.answer())));
                continue;
            }
            List<String> options = null;
            if ("multiple-choice".equals(type)) options = pad(q.options(), 4);
            else if ("multi-select".equals(type)) options = pad(q.options(), 5);
            String answer = normalizeAnswer(type, q.answer(), options);
            // Matching: the list lives on the passage — answer with one of its letters, keep no per-question copy.
            if (LIST_TYPES.contains(type)) {
                int n = q.options() == null ? 0 : Math.min(q.options().size(), MAX_OPTIONS);
                answer = n > 0 ? letterInRange(q.answer() == null ? "" : q.answer().trim(), n) : answer.toUpperCase();
                options = null;
            }
            Integer wl = q.wordLimit();
            if (TEXT_TYPES.contains(type) && wl == null) wl = 2;
            // The key must itself satisfy the limit, or the correct answer would be marked wrong.
            if (TEXT_TYPES.contains(type)) wl = Math.max(wl, AnswerMatcher.normalize(answer).split(" ").length);
            List<String> accepted = TEXT_TYPES.contains(type) ? acceptedVariants(q.accepted(), answer) : null;
            out.add(new StudioQuestionDto(q.prompt(), type, options, answer, wl, accepted));
        }
        return out;
    }

    /** Up to 5 distinct, non-blank variants that differ from the primary answer; null when none. */
    private static List<String> acceptedVariants(List<String> raw, String answer) {
        if (raw == null) return null;
        List<String> out = new ArrayList<>();
        for (String a : raw) {
            if (a == null || a.isBlank()) continue;
            String t = a.trim();
            if (t.equalsIgnoreCase(answer) || out.stream().anyMatch(t::equalsIgnoreCase)) continue;
            if (out.size() < 5) out.add(t);
        }
        return out.isEmpty() ? null : out;
    }

    private String normalizeAnswer(String type, String answer, List<String> options) {
        String a = answer == null ? "" : answer.trim();
        switch (type) {
            case "multiple-choice": return letterInRange(a, 4);
            case "multi-select": return letterInRange(a, 5);
            case "true-false-notgiven": {
                String u = a.toUpperCase();
                return Set.of("TRUE", "FALSE", "NOT GIVEN").contains(u) ? u : "TRUE";
            }
            case "yes-no-notgiven": {
                String u = a.toUpperCase();
                return Set.of("YES", "NO", "NOT GIVEN").contains(u) ? u : "YES";
            }
            default: return a.isBlank() ? "sample" : a;
        }
    }

    private String letterInRange(String a, int n) {
        String u = a.toUpperCase();
        if (u.length() == 1 && u.charAt(0) >= 'A' && u.charAt(0) < 'A' + n) return u;
        return "A";
    }

    private List<String> pad(List<String> opts, int n) {
        List<String> out = new ArrayList<>(opts == null ? List.of() : opts);
        while (out.size() < n) out.add("");
        return out.subList(0, n);
    }

    private int clamp(int v, int lo, int hi) { return Math.max(lo, Math.min(hi, v)); }
}
