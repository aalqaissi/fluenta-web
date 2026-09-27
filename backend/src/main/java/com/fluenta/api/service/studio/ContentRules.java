package com.fluenta.api.service.studio;

import java.util.Locale;

/**
 * Content-generation rules from the owner's IELTS spec (§1, §2, §8): Academic and General Training
 * reading are generated separately (GT is never a simplified Academic passage), listening parts have
 * fixed contexts, and full mocks follow the Yalla 13 + 13 + 14 (reading) / 4 × 10 (listening) setup.
 */
public final class ContentRules {
    private ContentRules() {}

    /** Yalla English Hub full Reading mock: questions per passage (total 40). */
    public static final int[] READING_FULL = {13, 13, 14};
    /** Full Listening: questions per part (total 40). */
    public static final int[] LISTENING_FULL = {10, 10, 10, 10};

    private static final String[] LISTENING_PARTS = {
            "Part 1 — a conversation between two people in an everyday social context (e.g. booking, enquiry)",
            "Part 2 — a monologue in an everyday social context (e.g. a talk about local facilities)",
            "Part 3 — a conversation among up to four people in an educational or training context",
            "Part 4 — a monologue on an academic subject, such as a university lecture or presentation"};

    private static final String GT_NOT_ACADEMIC =
            " This is General Training: it is NOT a simplified Academic passage — use the source type, purpose and"
            + " register of real General Training texts.";

    private static boolean general(String module) {
        return module != null && module.toLowerCase(Locale.ROOT).startsWith("general");
    }

    /** What the reading passage for this module/section must be. */
    public static String passageBrief(String module, Integer section) {
        int s = section == null ? 1 : Math.max(1, Math.min(3, section));
        if (!general(module)) {
            return "Academic Reading passage " + s + ": an academic-style text (about 700-900 words) of the kind found in"
                    + " books, journals, magazines or newspapers for a non-specialist audience — descriptive, factual,"
                    + " discursive, argumentative or analytical" + (s == 3 ? ", with a clear line of argument and the"
                    + " writer's views or claims" : "") + ". Write 5-7 paragraphs labelled A, B, C… at the start of each"
                    + " paragraph. A diagram, table or other visual may be described where it helps.";
        }
        return switch (s) {
            case 1 -> "General Training Reading Section 1 (social survival): two or three short everyday texts such as"
                    + " notices, advertisements, timetables/schedules, instructions or practical information leaflets,"
                    + " each with its own short heading." + GT_NOT_ACADEMIC;
            case 2 -> "General Training Reading Section 2 (workplace survival): one or two workplace texts such as"
                    + " job descriptions, staff policies, contracts, training material, staff information or"
                    + " workplace procedures." + GT_NOT_ACADEMIC;
            default -> "General Training Reading Section 3 (general reading): ONE longer, more complex text (about"
                    + " 700-900 words) on a topic of general interest, in paragraphs labelled A, B, C…." + GT_NOT_ACADEMIC;
        };
    }

    /** A CONTEXT line for question generation; empty when nothing is known. */
    public static String context(String skill, String module, Integer section) {
        if ("listening".equalsIgnoreCase(skill)) {
            if (section == null || section < 1 || section > 4) return "IELTS Listening (same for Academic and General Training).";
            return "IELTS Listening " + LISTENING_PARTS[section - 1] + ".";
        }
        if (module == null || module.isBlank()) return "";
        return general(module)
                ? passageBrief("general", section)
                : "Academic Reading" + (section == null ? "" : " passage " + section) + ": academic register and reading demands.";
    }
}
