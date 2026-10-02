package com.fluenta.api.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The single answer-key marking rule for objective (reading/listening) questions. Pure and
 * deterministic — no AI. Mirrored exactly by the web ({@code src/lib/answerMatch.ts}) and mobile
 * ({@code lib/utils/answer_match.dart}) review views; all three are pinned by the shared
 * {@code answer-match-vectors.json}.
 *
 * <ol>
 *   <li>Normalise case, quotes, whitespace and edge punctuation.</li>
 *   <li>For text (completion / short-answer) questions, an answer over the stated word/number
 *       limit is wrong even if it contains the right words.</li>
 *   <li>The answer, or any accepted variant, matches — with {@code (parenthesised)} words optional.</li>
 * </ol>
 */
public final class AnswerMatcher {
    private AnswerMatcher() {}

    /** One question's answer key. {@code wordLimit} is an Integer, a label String, or null. */
    public record Key(String answer, List<String> accepted, Object wordLimit, String type) {}

    /** Question types whose answers are typed words, so the word/number limit applies. */
    public static final Set<String> TEXT_TYPES = Set.of(
            "sentence-completion", "summary-completion", "note-completion", "table-completion",
            "flow-chart-completion", "form-completion", "diagram-label", "short-answer");

    private static final Pattern NUMBER = Pattern.compile("^[\\u00a3$\\u20ac]?\\d[\\d,.:/]*(%|st|nd|rd|th|am|pm)?$");
    private static final Pattern COUNT = Pattern.compile("\\b(\\d+|ONE|TWO|THREE|FOUR|FIVE)\\b");
    private static final Pattern OPTIONAL = Pattern.compile("\\(([^)]*)\\)");
    private static final String EDGE = ".,;:!?\"'";

    /** Marks earned out of marks available for one question. */
    public record Marks(int earned, int total) {}

    public static final String MULTI_SELECT = "multi-select";

    /**
     * Marks for one question. Multi-select ("Choose TWO/THREE") is worth one mark per correct letter,
     * in any order — choosing more letters than asked earns nothing. Every other type is worth 1
     * mark when {@link #matches} holds.
     */
    public static Marks marks(String given, Key key) {
        if (key != null && MULTI_SELECT.equals(key.type())) {
            Set<String> correct = letters(key.answer());
            Set<String> picked = letters(given);
            int total = Math.max(1, correct.size());
            if (picked.size() > total) return new Marks(0, total);
            picked.retainAll(correct);
            return new Marks(picked.size(), total);
        }
        return new Marks(matches(given, key) ? 1 : 0, 1);
    }

    /** "a, C" → {A, C}: the distinct single letters of a multi-select answer. */
    public static Set<String> letters(String s) {
        Set<String> out = new java.util.LinkedHashSet<>();
        if (s == null) return out;
        for (String part : s.split("[^A-Za-z]+")) {
            if (part.length() == 1) out.add(part.toUpperCase(Locale.ROOT));
        }
        return out;
    }

    public static boolean matches(String given, Key key) {
        if (key != null && MULTI_SELECT.equals(key.type()) && letters(key.answer()).size() > 1) {
            Marks m = marks(given, key);
            return m.earned() == m.total();
        }
        String g = normalize(given);
        if (g.isEmpty() || key == null || key.answer() == null) return false;
        if (gated(key.type()) && !withinLimit(g, key.wordLimit())) return false;
        List<String> candidates = new ArrayList<>(expand(key.answer()));
        if (key.accepted() != null) for (String a : key.accepted()) if (a != null) candidates.addAll(expand(a));
        for (String c : candidates) if (!c.isEmpty() && c.equals(g)) return true;
        return false;
    }

    static boolean gated(String type) {
        return type == null || type.isBlank() || TEXT_TYPES.contains(type);
    }

    public static String normalize(String s) {
        if (s == null) return "";
        String out = s.toLowerCase(Locale.ROOT)
                .replace('‘', '\'').replace('’', '\'')
                .replace('“', '"').replace('”', '"')
                .replaceAll("\\s+", " ").trim();
        int start = 0, end = out.length();
        while (start < end && EDGE.indexOf(out.charAt(start)) >= 0) start++;
        while (end > start && EDGE.indexOf(out.charAt(end - 1)) >= 0) end--;
        return out.substring(start, end).trim();
    }

    /** Is the (normalised) answer within the word/number limit? Unparseable limits never reject. */
    static boolean withinLimit(String normalizedGiven, Object limit) {
        if (limit == null) return true;
        int words = 0, numbers = 0;
        for (String t : normalizedGiven.split(" ")) {
            if (t.isEmpty()) continue;
            if (NUMBER.matcher(t).matches()) numbers++; else words++;
        }
        if (limit instanceof Number n) return n.intValue() <= 0 || words + numbers <= n.intValue();
        String label = limit.toString().toUpperCase(Locale.ROOT);
        boolean hasWord = label.contains("WORD");
        boolean hasNumber = label.contains("NUMBER");
        if (!hasWord && hasNumber) return words == 0 && numbers <= 1;
        Integer max = parseCount(label);
        if (!hasWord || max == null) return true;
        if (hasNumber && label.contains("AND/OR")) return words <= max && numbers <= 1;
        return words + numbers <= max;
    }

    private static Integer parseCount(String label) {
        Matcher m = COUNT.matcher(label);
        if (!m.find()) return null;
        return switch (m.group(1)) {
            case "ONE" -> 1;
            case "TWO" -> 2;
            case "THREE" -> 3;
            case "FOUR" -> 4;
            case "FIVE" -> 5;
            default -> Integer.parseInt(m.group(1));
        };
    }

    /** Expand {@code (optional)} words into every with/without combination, normalised. */
    static List<String> expand(String raw) {
        List<String> out = new ArrayList<>();
        Matcher m = OPTIONAL.matcher(raw);
        if (!m.find()) {
            out.add(normalize(raw));
            return out;
        }
        String before = raw.substring(0, m.start());
        String after = raw.substring(m.end());
        for (String rest : expand(after)) {
            out.add(normalize(before + " " + rest));
            out.add(normalize(before + " " + m.group(1) + " " + rest));
        }
        return out;
    }
}
