package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Deterministic reading/listening scoring — the server-side port of the frontend
 * {@code src/lib/mockApi.ts} scorer. Not AI: it compares answers against the exam's answer key (via {@link AnswerMatcher}) and
 * maps the raw score to an IELTS-style band.
 */
@Service
public class ScoringService {

    public record Score(int correct, int total, double band) {}

    /**
     * Extract {@code questionId -> correctAnswer} from an exam's content, regardless of format.
     * Kept for callers that only need the primary answer; scoring uses {@link #keys}.
     */
    public Map<String, String> answerKey(JsonNode content) {
        Map<String, String> out = new LinkedHashMap<>();
        keys(content).forEach((id, k) -> out.put(id, k.answer()));
        return out;
    }

    /**
     * Extract the full answer key ({@code questionId -> AnswerMatcher.Key}). Walks the JSON tree and
     * treats any object carrying a textual {@code id} plus a textual {@code answer} (Studio shape) or
     * {@code correct} (runtime shape) as a scorable question, collecting its {@code accepted}
     * variants, {@code wordLimit} and effective type — its own {@code type}, else the nearest
     * ancestor's {@code type}/{@code questionType} (passage / section / group).
     */
    public Map<String, AnswerMatcher.Key> keys(JsonNode content) {
        Map<String, AnswerMatcher.Key> key = new LinkedHashMap<>();
        collect(content, null, key);
        return key;
    }

    private void collect(JsonNode node, String inheritedType, Map<String, AnswerMatcher.Key> key) {
        if (node == null) return;
        if (node.isObject()) {
            String type = inheritedType;
            if (node.hasNonNull("questionType") && node.get("questionType").isTextual()) type = node.get("questionType").asText();
            if (node.hasNonNull("type") && node.get("type").isTextual()) type = node.get("type").asText();
            JsonNode id = node.get("id");
            JsonNode answer = node.has("answer") ? node.get("answer") : node.get("correct");
            if (id != null && id.isTextual() && answer != null && answer.isTextual()) {
                key.put(id.asText(), new AnswerMatcher.Key(answer.asText(), accepted(node.get("accepted")),
                        wordLimit(node.get("wordLimit")), type));
            }
            for (var it = node.fields(); it.hasNext(); ) {
                var e = it.next();
                collect(e.getValue(), type, key);
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) collect(child, inheritedType, key);
        }
    }

    private static List<String> accepted(JsonNode node) {
        List<String> out = new ArrayList<>();
        if (node != null && node.isArray()) node.forEach(a -> { if (a.isTextual()) out.add(a.asText()); });
        return out;
    }

    private static Object wordLimit(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return node.asInt();
        return node.isTextual() ? node.asText() : null;
    }

    /** Score submitted answers against an exam's content for the given skill. */
    public Score score(String skill, JsonNode content, Map<String, String> answers) {
        Map<String, AnswerMatcher.Key> key = keys(content);
        int correct = 0;
        for (Map.Entry<String, AnswerMatcher.Key> q : key.entrySet()) {
            if (AnswerMatcher.matches(answers.getOrDefault(q.getKey(), ""), q.getValue())) correct++;
        }
        int total = key.size();
        double band = "listening".equalsIgnoreCase(skill)
                ? bandFromAccuracy(correct, total)
                : rawToBand(correct);
        return new Score(correct, total, band);
    }

    /** Accuracy → IELTS-style band (listening & variable-length skills). Mirrors the FE table. */
    public double bandFromAccuracy(int correct, int total) {
        if (total == 0) return 0;
        double pct = (double) correct / total;
        double[][] table = {
                {0.97, 9}, {0.9, 8.5}, {0.82, 8}, {0.75, 7.5}, {0.67, 7},
                {0.58, 6.5}, {0.5, 6}, {0.42, 5.5}, {0.33, 5}, {0.25, 4.5}, {0.15, 4}
        };
        for (double[] row : table) if (pct >= row[0]) return row[1];
        return 3.5;
    }

    /** Rough IELTS Academic Reading raw→band (out of ~40). Mirrors the FE table. */
    public double rawToBand(int raw) {
        int[][] table = {
                {39, 90}, {37, 85}, {35, 80}, {33, 75}, {30, 70}, {27, 65},
                {23, 60}, {19, 55}, {15, 50}, {13, 45}, {10, 40}
        };
        for (int[] row : table) if (raw >= row[0]) return row[1] / 10.0;
        return 3.5;
    }
}
