package com.fluenta.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.service.AnswerMatcher;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Runs the shared answer-match vectors (also copied to the mobile repo) against the Java matcher. */
class AnswerMatcherTest {

    @Test
    void allSharedVectorsPass() throws Exception {
        JsonNode vectors;
        try (InputStream in = getClass().getResourceAsStream("/answer-match-vectors.json")) {
            vectors = new ObjectMapper().readTree(in);
        }
        List<String> failures = new ArrayList<>();
        for (JsonNode v : vectors) {
            List<String> accepted = new ArrayList<>();
            if (v.has("accepted")) v.get("accepted").forEach(a -> accepted.add(a.asText()));
            Object limit = !v.has("wordLimit") ? null
                    : v.get("wordLimit").isNumber() ? (Object) v.get("wordLimit").asInt() : v.get("wordLimit").asText();
            var key = new AnswerMatcher.Key(v.get("answer").asText(), accepted, limit,
                    v.has("type") ? v.get("type").asText() : null);
            boolean got = AnswerMatcher.matches(v.get("given").asText(), key);
            if (got != v.get("expect").asBoolean()) failures.add(v.get("note").asText() + " → got " + got);
        }
        assertThat(failures).isEmpty();
        assertThat(vectors.size()).isGreaterThan(20);
    }
}
