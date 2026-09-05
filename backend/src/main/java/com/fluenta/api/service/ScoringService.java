package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Deterministic reading/listening scoring — the server-side port of the frontend
 * {@code src/lib/mockApi.ts} scorer. Not AI: it compares answers against the exam's answer key and
 * maps the raw score to an IELTS-style band.
 */
@Service
public class ScoringService {

    public record Score(int correct, int total, double band) {}

    /**
     * Extract {@code questionId -> correctAnswer} from an exam's content, regardless of format.
     * Walks the JSON tree and treats any object carrying a textual {@code id} plus a textual
     * {@code answer} (Studio shape) or {@code correct} (runtime shape) as a scorable question.
     * Non-question nodes (passages, options, speaking prompts, ...) are ignored.
     */
    public Map<String, String> answerKey(JsonNode content) {
        Map<String, String> key = new LinkedHashMap<>();
        collect(content, key);
        return key;
    }

    private void collect(JsonNode node, Map<String, String> key) {
        if (node == null) return;
        if (node.isObject()) {
            JsonNode id = node.get("id");
            JsonNode answer = node.has("answer") ? node.get("answer") : node.get("correct");
            if (id != null && id.isTextual() && answer != null && answer.isTextual()) {
                key.put(id.asText(), answer.asText());
            }
            node.fields().forEachRemaining(e -> collect(e.getValue(), key));
        } else if (node.isArray()) {
            node.forEach(child -> collect(child, key));
        }
    }

    /** Score submitted answers against an exam's content for the given skill. */
    public Score score(String skill, JsonNode content, Map<String, String> answers) {
        Map<String, String> key = answerKey(content);
        int correct = 0;
        int total = 0;
        for (Map.Entry<String, String> q : key.entrySet()) {
            total++;
            String given = answers.getOrDefault(q.getKey(), "").trim().toLowerCase();
            String want = q.getValue().trim().toLowerCase();
            if (!given.isEmpty() && given.equals(want)) correct++;
        }
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
