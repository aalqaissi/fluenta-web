package com.fluenta.api.service.studio;

import com.fluenta.api.dto.AiDtos.StudioExtractResult;
import com.fluenta.api.dto.AiDtos.StudioPassageReply;
import com.fluenta.api.dto.AiDtos.StudioQuestionDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** Offline/free Studio authoring: deterministic placeholders (ported from the web aiQuestions/defaultAnswerFor). */
@Component
public class StubStudioAuthor {

    public static String defaultAnswerFor(String type) {
        if ("true-false-notgiven".equals(type)) return "TRUE";
        if ("yes-no-notgiven".equals(type)) return "YES";
        if ("multiple-choice".equals(type) || "multi-select".equals(type)) return "A";
        return "sample";
    }

    private static List<String> optionsFor(String type) {
        if ("multi-select".equals(type)) return List.of("", "", "", "", "");
        if ("multiple-choice".equals(type)) return List.of("", "", "", "");
        return null;
    }

    public List<StudioQuestionDto> generate(String type, int count) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            out.add(new StudioQuestionDto(
                    i == 0 ? "AI-generated question about the content." : "Another AI-generated question.",
                    type, optionsFor(type), defaultAnswerFor(type), 2));
        }
        return out;
    }

    /** "A,B" / "A,B,C": the first {@code choose} letters. */
    private static String firstLetters(int choose) {
        return randomLetters(choose >= 3 ? 3 : 2, choose >= 3 ? 7 : 5);
    }

    /** {@code n} distinct random letters among the first {@code of}, sorted ("B,E") — never always A,B. */
    private static String randomLetters(int n, int of) {
        List<String> all = new ArrayList<>();
        for (int i = 0; i < of; i++) all.add(String.valueOf((char) ('A' + i)));
        java.util.Collections.shuffle(all, java.util.concurrent.ThreadLocalRandom.current());
        List<String> picked = new ArrayList<>(all.subList(0, n));
        java.util.Collections.sort(picked);
        return String.join(",", picked);
    }

    /** Placeholder "Choose TWO/THREE" questions: 5 options (7 for THREE), the first N letters correct. */
    public List<StudioQuestionDto> multiSelect(int count, int choose) {
        List<StudioQuestionDto> out = new ArrayList<>();
        int size = choose >= 3 ? 7 : 5;
        for (int i = 0; i < count; i++) {
            out.add(new StudioQuestionDto(
                    i == 0 ? "AI-generated question about the content." : "Another AI-generated question.",
                    "multi-select", new ArrayList<>(java.util.Collections.nCopies(size, "")), firstLetters(choose),
                    null, null, choose >= 3 ? 3 : 2));
        }
        return out;
    }

    private static String optionNoun(String type) {
        if ("matching-sentence-endings".equals(type)) return "ending";
        if ("matching-headings".equals(type)) return "heading";
        return "option";
    }

    /** Completes a matching list: blank entries get a placeholder, filled ones are kept. */
    public List<String> matchingOptions(String type, List<String> options) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < options.size(); i++) {
            String o = options.get(i);
            out.add(o != null && !o.isBlank() ? o : "Sample " + optionNoun(type) + " " + (char) ('A' + i) + " (offline placeholder).");
        }
        return out;
    }

    /** Placeholder matching questions whose answers walk through the list A, B, C… */
    public List<StudioQuestionDto> matchingQuestions(String type, int count, int optionCount) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String letter = String.valueOf((char) ('A' + (i % Math.max(1, optionCount))));
            out.add(new StudioQuestionDto(
                    i == 0 ? "AI-generated question about the content." : "Another AI-generated question.",
                    type, null, letter, null));
        }
        return out;
    }

    public List<StudioQuestionDto> fill(List<StudioQuestionDto> questions, String fallbackType) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (StudioQuestionDto q : questions) {
            String type = q.type() != null ? q.type() : fallbackType;
            boolean blank = q.answer() == null || q.answer().isBlank();
            String answer = !blank ? q.answer()
                    : "multi-select".equals(type) ? firstLetters(q.choose() == null ? 2 : q.choose())
                    : defaultAnswerFor(type);
            out.add(new StudioQuestionDto(q.prompt(), q.type(), q.options(), answer, q.wordLimit(), q.accepted(), q.choose()));
        }
        return out;
    }

    /** Offline placeholder passage that states the section brief, so authors see what to write. */
    public StudioPassageReply passage(String module, Integer section, String topic) {
        String brief = ContentRules.passageBrief(module, section);
        String subject = topic == null || topic.isBlank() ? "your chosen topic" : topic.trim();
        return new StudioPassageReply("Draft passage (offline placeholder)",
                "A. This is an offline placeholder passage about " + subject + ". Connect the AI service to write it.\n\n"
                        + "B. Brief it will follow: " + brief);
    }

    public StudioExtractResult extract() {
        return new StudioExtractResult(
                "Extracted passage text (offline placeholder). Connect the AI service to read your photos.",
                generate("true-false-notgiven", 2));
    }
}
