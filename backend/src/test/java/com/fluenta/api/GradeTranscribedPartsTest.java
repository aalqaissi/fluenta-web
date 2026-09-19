package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.SpeakingFeedbackService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = {
        "fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test", "fluenta.ai.persist=false"})
class GradeTranscribedPartsTest {

    @MockBean AiClient ai;
    @Autowired SpeakingFeedbackService svc;

    @Test
    void gradesFromTranscriptsThroughTheNormalizationGate() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"overall": 12,
             "criteria": [
               {"key":"fluency","band":6.3,"note":"steady"},
               {"key":"lexical","band":6,"note":"ok"},
               {"key":"grammar","band":5,"note":"ok"}
             ]}""");
        var parts = List.of(
                new SpeakingPartResult(1, "I am from a small coastal town.", ""),
                new SpeakingPartResult(3, "I think technology helps learning.", ""));
        var r = svc.gradeTranscribedParts("u1", "live-interview", "PART 1\nTRANSCRIPT: ...\n", parts, true);

        assertThat(r.source()).isEqualTo("claude");
        assertThat(r.criteria()).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(r.criteria().get(0).band()).isEqualTo(6.5);   // 6.3 snapped
        assertThat(r.overall()).isBetween(0.0, 9.0);             // 12 invalid -> recomputed
        assertThat(r.parts()).hasSize(2);
    }

    @Test
    void offlineUsesTheStubGrader() {
        var parts = List.of(new SpeakingPartResult(1, "hello", ""));
        var r = svc.gradeTranscribedParts("u1", "live-interview", "PART 1\n", parts, false);
        assertThat(r.source()).isEqualTo("offline");
        assertThat(r.criteria()).hasSize(4);
    }
}
