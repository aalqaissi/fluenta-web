package com.fluenta.api.service.studio;

import com.fluenta.api.dto.AiDtos.StudioExtractResult;
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

    public List<StudioQuestionDto> fill(List<StudioQuestionDto> questions, String fallbackType) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (StudioQuestionDto q : questions) {
            String type = q.type() != null ? q.type() : fallbackType;
            String answer = (q.answer() != null && !q.answer().isBlank()) ? q.answer() : defaultAnswerFor(type);
            out.add(new StudioQuestionDto(q.prompt(), q.type(), q.options(), answer, q.wordLimit()));
        }
        return out;
    }

    public StudioExtractResult extract() {
        return new StudioExtractResult(
                "Extracted passage text (offline placeholder). Connect the AI service to read your photos.",
                generate("true-false-notgiven", 2));
    }
}
