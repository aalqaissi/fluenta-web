package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.SpeakingCriterionDto;
import com.fluenta.api.service.SpeakingFeedbackService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpeakingNormalizeTest {
    private final SpeakingFeedbackService svc =
            new SpeakingFeedbackService(null, null, null, null, null, null, null, null, null);

    @Test
    void clampsSnapsAndOrdersToTheFourCanonicalCriteria() {
        var raw = List.of(
                new SpeakingCriterionDto("grammar", "whatever", 12.0, ""),     // out of range, blank note, wrong order
                new SpeakingCriterionDto("fluency", "whatever", 6.3, "ok"),    // 6.3 -> 6.5
                new SpeakingCriterionDto("lexical", "whatever", -2.0, "ok"));   // missing pronunciation
        var out = svc.normalize(raw);
        assertThat(out).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(out.get(0).band()).isEqualTo(6.5);   // fluency snapped
        assertThat(out.get(2).band()).isEqualTo(9.0);   // grammar clamped to 9
        assertThat(out.get(1).band()).isEqualTo(0.0);   // lexical clamped to 0
        assertThat(out).allSatisfy(c -> assertThat(c.note()).isNotBlank());  // blank notes filled
        assertThat(out.get(3).key()).isEqualTo("pronunciation");             // filled-in default
        assertThat(out).extracting(SpeakingCriterionDto::label)
                .containsExactly("Fluency & Coherence", "Lexical Resource",
                        "Grammatical Range & Accuracy", "Pronunciation");
    }

    @Test
    void snapBandRoundsToNearestHalf() {
        assertThat(svc.snapBand(6.24)).isEqualTo(6.0);
        assertThat(svc.snapBand(6.25)).isEqualTo(6.5);
        assertThat(svc.snapBand(10.0)).isEqualTo(9.0);
    }
}
