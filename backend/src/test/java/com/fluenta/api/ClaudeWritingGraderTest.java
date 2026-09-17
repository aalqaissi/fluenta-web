package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.grader.ClaudeWritingGrader;
import com.fluenta.api.web.ApiException;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

class ClaudeWritingGraderTest {
    private final ObjectMapper om = new ObjectMapper();

    private AiDtos.WritingFeedbackRequest req(String essay) {
        return new AiDtos.WritingFeedbackRequest("w1", 2, "Opinion Essay", "academic", "Prompt", 250, essay);
    }

    @Test
    void mapsValidJsonToResult() {
        String json = """
            {"overall":6.5,"criteria":[
              {"key":"task","label":"Task Achievement","band":6,"summary":"ok"},
              {"key":"coherence","label":"Coherence & Cohesion","band":7,"summary":"ok"},
              {"key":"lexical","label":"Lexical Resource","band":6,"summary":"ok"},
              {"key":"grammar","label":"Grammatical Range & Accuracy","band":7,"summary":"ok"}],
             "annotations":[{"criterion":"grammar","quote":"is are","note":"agreement"}]}""";
        AiClient fake = new AiClient() {
            @Override public String complete(String system, String user) { return json; }
            @Override public String chat(String systemPrompt, java.util.List<ChatTurn> turns) {
                throw new UnsupportedOperationException("not used in this test");
            }
            @Override public String vision(String systemPrompt, String userText, java.util.List<ImageInput> images) {
                throw new UnsupportedOperationException("not used in this test");
            }
        };
        var grader = new ClaudeWritingGrader(fake, om);

        var r = grader.grade(req("The cat is are happy."));
        assertThat(r.source()).isEqualTo("ai");
        assertThat(r.overall()).isEqualTo(6.5);
        assertThat(r.criteria()).hasSize(4);
        assertThat(r.annotations()).singleElement()
                .satisfies(a -> assertThat(a.quote()).isEqualTo("is are"));
    }

    @Test
    void retriesOnceThenThrowsOnUnparseable() {
        AtomicInteger calls = new AtomicInteger();
        AiClient fake = new AiClient() {
            @Override public String complete(String system, String user) {
                calls.incrementAndGet();
                return "sorry, not json";
            }
            @Override public String chat(String systemPrompt, java.util.List<ChatTurn> turns) {
                throw new UnsupportedOperationException("not used in this test");
            }
            @Override public String vision(String systemPrompt, String userText, java.util.List<ImageInput> images) {
                throw new UnsupportedOperationException("not used in this test");
            }
        };
        var grader = new ClaudeWritingGrader(fake, om);

        assertThatThrownBy(() -> grader.grade(req("essay")))
                .isInstanceOf(ApiException.class);
        assertThat(calls.get()).isEqualTo(2); // initial + one repair retry
    }
}
