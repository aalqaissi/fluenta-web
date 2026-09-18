package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.SpeakingCriterionDto;
import com.fluenta.api.service.speaking.StubSpeakingGrader;
import com.fluenta.api.service.speaking.StubTranscriber;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StubSpeakingTest {
    private final StubTranscriber transcriber = new StubTranscriber();
    private final StubSpeakingGrader grader = new StubSpeakingGrader();

    @Test
    void transcriberIsDeterministicAndNonBlank() {
        String a = transcriber.transcribe(new byte[0], "audio/webm");
        String b = transcriber.transcribe(new byte[]{1, 2, 3}, "audio/mp4");
        assertThat(a).isNotBlank().isEqualTo(b);
    }

    @Test
    void graderReturnsTheFourCanonicalCriteriaInOrder() {
        List<SpeakingCriterionDto> cs = grader.grade();
        assertThat(cs).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(cs).allSatisfy(c -> {
            assertThat(c.label()).isNotBlank();
            assertThat(c.note()).isNotBlank();
            assertThat(c.band()).isBetween(0.0, 9.0);
        });
    }
}
