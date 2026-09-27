package com.fluenta.api.service.grader;

import com.fluenta.api.dto.AiDtos;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Offline, deterministic Yalla coaching notes (the teaching-strategy layer). Used by the stub grader and
 * as the gate's fallback when a live model returns no usable coaching. Never touches criterion bands.
 */
public final class YallaCoachingHeuristics {
    private YallaCoachingHeuristics() {}

    private static final Pattern ENUMERATORS = Pattern.compile(
            "\\b(firstly|secondly|thirdly|also|another|moreover|furthermore|in addition|additionally|besides)\\b");

    public static List<AiDtos.CoachingNote> notes(WritingRubric.Variant v, AiDtos.WritingFeedbackRequest req, String essayType) {
        Map<String, String> titles = WritingRubric.coaching(v);
        String essay = req.essay() == null ? "" : req.essay().trim();
        List<String> paragraphs = paragraphs(essay);
        List<AiDtos.CoachingNote> out = new ArrayList<>();
        switch (v) {
            case ACADEMIC_T1 -> {
                boolean overview = essay.toLowerCase(Locale.ROOT).contains("overall");
                out.add(note(titles, "overview", overview ? "good" : "improve", overview
                        ? "You include an overview. Keep it as its own paragraph after the introduction, summarising the main trends or features."
                        : "Add a separate overview paragraph after the introduction. Yalla's recommended opening: \"Overall, as can be observed from the given chart, ...\" then state the main trends, highest/lowest or key stages."));
                out.add(note(titles, "introduction", "tip",
                        "Paraphrase the task in your introduction: what is shown, the categories, the timeframe and the unit of measurement."));
                out.add(note(titles, "body-grouping", "tip",
                        "Group related data in each body paragraph and compare it — select key figures rather than listing every number."));
            }
            case GENERAL_T1 -> {
                out.add(note(titles, "purpose", "tip", "Make the reason for writing clear in your first one or two sentences."));
                out.add(note(titles, "bullets", paragraphs.size() >= 3 ? "good" : "improve", paragraphs.size() >= 3
                        ? "Your letter is organised into paragraphs — check each of the three bullet points has its own developed paragraph."
                        : "Give each of the three bullet points its own paragraph and develop it with details or reasons."));
                out.add(note(titles, "register", "tip", "Match the tone to the relationship: "
                        + (req.kind() == null ? "formal, semi-formal or informal" : req.kind().toLowerCase(Locale.ROOT))
                        + " — keep greetings, sign-off and vocabulary consistent. No postal address is needed."));
            }
            case TASK2 -> {
                String type = essayType == null ? EssayTypeClassifier.classify(req.prompt()) : essayType;
                out.add(note(titles, "essay-structure", "tip", structureTip(type)));
                List<String> bodies = paragraphs.size() >= 3 ? paragraphs.subList(1, paragraphs.size() - 1) : paragraphs;
                boolean thin = bodies.stream().anyMatch(p -> sentences(p) < 3);
                out.add(note(titles, "peel", thin ? "improve" : "good", thin
                        ? "At least one body paragraph is thin. Build it with PEEL: Point, Explanation, Example, Link (e.g. \"Consequently, ...\" when it follows logically)."
                        : "Your body paragraphs have room for PEEL — check each has a clear Point, Explanation, Example and a Link back to the question."));
                boolean listy = bodies.stream().anyMatch(p -> count(ENUMERATORS, p.toLowerCase(Locale.ROOT)) >= 3);
                if (listy) out.add(note(titles, "shopping-list", "improve",
                        "A body paragraph lists several ideas one after another — the shopping list trap. Keep at most two main ideas and explain and support each one."));
                if (paragraphs.size() != 4) out.add(note(titles, "conclusion", "tip",
                        "Yalla's preferred shape is four paragraphs: introduction, two PEEL body paragraphs and a conclusion that restates your position without a new argument."));
            }
        }
        return out;
    }

    static String structureTip(String type) {
        if (EssayTypeClassifier.isOpinion(type)) {
            return "This is an opinion essay: take ONE clear position and use both body paragraphs to defend it with two different reasons — not one paragraph per side.";
        }
        return switch (type) {
            case "discussion" -> "This is a discussion essay: body 1 discusses the first view, body 2 the second view, and give your own opinion where the question asks for it.";
            case "adv-disadv" -> "Advantages and disadvantages: one body paragraph for the advantages, one for the disadvantages.";
            case "outweigh" -> "Advantages outweigh disadvantages: give a clear judgement in the introduction and show why one side is stronger.";
            case "problem-solution" -> "Problems and solutions: body 1 explains the problems, body 2 proposes matching solutions.";
            case "cause-solution" -> "Causes and solutions: body 1 explains the causes, body 2 proposes solutions that address them.";
            case "two-part" -> "Two-part question: answer each question directly, one body paragraph per question.";
            default -> "Identify exactly what the question asks and answer every part of it.";
        };
    }

    private static AiDtos.CoachingNote note(Map<String, String> titles, String key, String status, String text) {
        return new AiDtos.CoachingNote(key, titles.get(key), status, text);
    }

    private static List<String> paragraphs(String essay) {
        List<String> out = new ArrayList<>();
        for (String p : essay.split("\\n\\s*\\n|\\r\\n\\s*\\r\\n")) if (!p.isBlank()) out.add(p.trim());
        if (out.size() <= 1) {
            out.clear();
            for (String p : essay.split("\\R")) if (!p.isBlank()) out.add(p.trim());
        }
        return out;
    }

    private static int sentences(String p) {
        int n = 0;
        for (String s : p.split("(?<=[.!?])\\s+")) if (!s.isBlank()) n++;
        return n;
    }

    private static int count(Pattern pattern, String s) {
        Matcher m = pattern.matcher(s);
        int n = 0;
        while (m.find()) n++;
        return n;
    }
}
