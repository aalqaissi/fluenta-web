package com.fluenta.api.service.grader;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Deterministic Task 2 essay-type classifier over the task wording. The owner spec requires the
 * essay type to be identified BEFORE structural feedback; this is the offline answer, the hint sent
 * to the model, and the fallback when the model returns an unknown type.
 */
public final class EssayTypeClassifier {
    private EssayTypeClassifier() {}

    /** key → label, in display order. */
    public static final Map<String, String> TYPES = new LinkedHashMap<>();
    static {
        TYPES.put("opinion", "Opinion (Agree / Disagree)");
        TYPES.put("extent", "Opinion (To What Extent)");
        TYPES.put("discussion", "Discussion (Both Views)");
        TYPES.put("adv-disadv", "Advantages & Disadvantages");
        TYPES.put("outweigh", "Advantages Outweigh Disadvantages");
        TYPES.put("problem-solution", "Problems & Solutions");
        TYPES.put("cause-solution", "Causes & Solutions");
        TYPES.put("two-part", "Two-Part / Direct Questions");
        TYPES.put("other", "Other / Mixed");
    }

    public static String classify(String prompt) {
        if (prompt == null || prompt.isBlank()) return "other";
        String p = prompt.toLowerCase(Locale.ROOT);
        if (p.contains("discuss both") || (p.contains("discuss") && p.contains("view"))) return "discussion";
        if (p.contains("outweigh")) return "outweigh";
        if (p.contains("advantages and disadvantages") || p.contains("advantages and the disadvantages")
                || p.contains("benefits and drawbacks")) return "adv-disadv";
        if (p.contains("to what extent")) return "extent";
        if (p.contains("agree or disagree") || p.contains("do you agree")) return "opinion";
        boolean solutions = p.contains("solution") || p.contains("measures") || p.contains("solve")
                || p.contains("tackle") || p.contains("what can be done");
        if (p.contains("problem") && solutions) return "problem-solution";
        if ((p.contains("cause") || p.contains("reason") || p.contains("why")) && solutions) return "cause-solution";
        if (p.chars().filter(c -> c == '?').count() >= 2) return "two-part";
        return "other";
    }

    public static boolean isKnown(String key) { return key != null && TYPES.containsKey(key); }

    /** Opinion essays defend ONE side across both body paragraphs (unlike discussion essays). */
    public static boolean isOpinion(String key) { return "opinion".equals(key) || "extent".equals(key); }

    public static String label(String key) { return TYPES.getOrDefault(key, TYPES.get("other")); }
}
