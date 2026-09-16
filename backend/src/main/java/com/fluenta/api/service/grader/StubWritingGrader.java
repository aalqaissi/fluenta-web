package com.fluenta.api.service.grader;

import com.fluenta.api.dto.AiDtos;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic, essay-aware heuristic grader used when the AI service is disabled or keyless
 * (the free/offline demo path). No model call. Never masquerades as an examiner score — summaries
 * say "offline estimate" and {@code source} is "offline".
 */
@Component
public class StubWritingGrader implements WritingGrader {

    private static final List<String> LINKERS = List.of(
            "however", "therefore", "moreover", "furthermore", "although", "because",
            "on the other hand", "in addition", "for example", "as a result");
    private static final List<String> EMPTY_MARKERS = List.of(
            "On the one hand.", "On the other hand.", "In conclusion.", "Firstly.", "Secondly.");

    @Override
    public AiDtos.WritingResult grade(AiDtos.WritingFeedbackRequest req) {
        String essay = req.essay() == null ? "" : req.essay();
        int words = countWords(essay);
        int minWords = (req.minWords() == null || req.minWords() <= 0) ? 250 : req.minWords();
        double ratio = words / (double) minWords;

        double base = ratio >= 1.0 ? 6.0 : ratio >= 0.8 ? 5.5 : ratio >= 0.6 ? 5.0 : 4.5;
        String lower = essay.toLowerCase();
        long linkers = LINKERS.stream().filter(lower::contains).count();

        double task = clampHalf(base + (ratio >= 1.0 ? 0.5 : ratio < 0.6 ? -0.5 : 0));
        double coherence = clampHalf(base + (linkers >= 3 ? 0.5 : linkers == 0 ? -0.5 : 0));
        double lexical = clampHalf(base + (distinctRatio(essay) > 0.55 ? 0.5 : 0));
        double grammar = clampHalf(base - 0.5);
        double overall = roundHalf((task + coherence + lexical + grammar) / 4.0);

        List<AiDtos.WritingAnnotation> anns = new ArrayList<>();
        int id = 1;
        for (String marker : EMPTY_MARKERS) {
            if (essay.contains(marker)) {
                anns.add(new AiDtos.WritingAnnotation("a" + id++, "coherence", marker,
                        "Offline estimate: this is an empty discourse marker — follow it with a developed idea and an example."));
            }
        }
        for (String sentence : essay.split("(?<=[.!?])\\s+")) {
            String s = sentence.trim();
            if (countWords(s) > 45 && essay.contains(s)) {
                anns.add(new AiDtos.WritingAnnotation("a" + id++, "grammar", s,
                        "Offline estimate: this sentence is very long — break it into shorter clauses for clarity."));
                break;
            }
        }
        if (anns.isEmpty()) {
            String first = firstSentence(essay);
            if (!first.isBlank() && essay.contains(first)) {
                anns.add(new AiDtos.WritingAnnotation("a1", "coherence", first,
                        "Offline estimate: open with a clear position, then develop each idea with a topic sentence and example."));
            }
        }

        List<AiDtos.WritingCriterion> criteria = List.of(
                new AiDtos.WritingCriterion("task", "Task Achievement", task,
                        "Offline estimate from length and structure — connect to the internet for a full AI assessment."),
                new AiDtos.WritingCriterion("coherence", "Coherence & Cohesion", coherence,
                        "Offline estimate based on paragraphing and linking words."),
                new AiDtos.WritingCriterion("lexical", "Lexical Resource", lexical,
                        "Offline estimate based on vocabulary variety."),
                new AiDtos.WritingCriterion("grammar", "Grammatical Range & Accuracy", grammar,
                        "Offline estimate — a live model gives specific grammar feedback."));

        return new AiDtos.WritingResult(null, "offline", overall, words, essay, criteria, anns);
    }

    static int countWords(String s) {
        if (s == null || s.isBlank()) return 0;
        return s.trim().split("\\s+").length;
    }

    private static double distinctRatio(String essay) {
        String[] w = essay.toLowerCase().replaceAll("[^a-z\\s]", "").trim().split("\\s+");
        if (w.length == 0 || (w.length == 1 && w[0].isEmpty())) return 0;
        return new java.util.HashSet<>(List.of(w)).size() / (double) w.length;
    }

    private static String firstSentence(String essay) {
        String[] parts = essay.trim().split("(?<=[.!?])\\s+", 2);
        return parts.length == 0 ? "" : parts[0].trim();
    }

    private static double clampHalf(double v) { return roundHalf(Math.max(0, Math.min(9, v))); }

    private static double roundHalf(double v) { return Math.round(v * 2) / 2.0; }
}
