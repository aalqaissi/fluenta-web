package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.dto.AiDtos.*;
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
            "sentence-completion", "summary-completion", "diagram-label", "short-answer");
    private static final Set<String> TEXT_TYPES = Set.of(
            "sentence-completion", "summary-completion", "diagram-label", "short-answer");

    private static final String GEN_SYSTEM = """
        You are an IELTS item writer. Write questions grounded ONLY in the given passage. Return ONLY a JSON
        object {"questions":[{"prompt":string,"type":string,"options":[string]?,"answer":string,"wordLimit":number?}]}.
        Use the requested question type. For multiple-choice give 4 options and answer a letter A-D; for multi-select
        give 5 options (A-E); for true-false-notgiven answer TRUE/FALSE/NOT GIVEN; for yes-no-notgiven answer
        YES/NO/NOT GIVEN; for completion/short-answer answer the exact words from the passage. No prose, no fences.""";
    private static final String FILL_SYSTEM = """
        You are an IELTS examiner. For each question (prompt + type + options), return the correct answer grounded in
        the passage, preserving prompt/type/options and order. Return ONLY {"questions":[...]} with the same shape as
        the input plus a correct "answer" per the type's convention (letter for choice; TRUE/FALSE/NOT GIVEN etc.). No prose.""";
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
        int count = clamp(req.count() == null ? 2 : req.count(), 1, 20);
        if (!props.live()) return new StudioQuestionsReply(stub.generate(type, count));
        String user = "QUESTION TYPE: " + type + "\nCOUNT: " + count + "\nPASSAGE:\n" + passage;
        return new StudioQuestionsReply(normalize(readQuestions(parse(ai.complete(GEN_SYSTEM, user))), type));
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
        return new StudioQuestionsReply(normalize(readQuestions(parse(ai.complete(FILL_SYSTEM, user))), fallback));
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
            out.add(new StudioQuestionDto(q.path("prompt").asText(""), q.path("type").asText(null),
                    options.isEmpty() ? null : options, q.path("answer").asText(""), wl));
        }
        return out;
    }

    List<StudioQuestionDto> normalize(List<StudioQuestionDto> raw, String fallbackType) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (StudioQuestionDto q : raw) {
            if (q.prompt() == null || q.prompt().isBlank()) continue;
            String type = (q.type() != null && TYPES.contains(q.type())) ? q.type() : fallbackType;
            List<String> options = null;
            if ("multiple-choice".equals(type)) options = pad(q.options(), 4);
            else if ("multi-select".equals(type)) options = pad(q.options(), 5);
            String answer = normalizeAnswer(type, q.answer(), options);
            Integer wl = q.wordLimit();
            if (TEXT_TYPES.contains(type) && wl == null) wl = 2;
            out.add(new StudioQuestionDto(q.prompt(), type, options, answer, wl));
        }
        return out;
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
