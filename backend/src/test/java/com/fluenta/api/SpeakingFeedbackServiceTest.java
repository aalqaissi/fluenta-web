package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.MediaStorageService;
import com.fluenta.api.service.SpeakingFeedbackService;
import com.fluenta.api.service.Transcriber;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test", "fluenta.ai.persist=false",
        "fluenta.ai.transcribe.enabled=true", "fluenta.ai.transcribe.api-key=sk-whisper"})
class SpeakingFeedbackServiceTest {

    @MockBean Transcriber transcriber;      // replaces the WhisperTranscriber (the only Transcriber bean)
    @MockBean AiClient ai;
    // @SpyBean (not @MockBean): MediaConfig calls media.location() while building the /media/**
    // resource handler at context-startup time, before any test method's when(...) stub runs. A
    // @MockBean returns null there and blows up context load with an NPE deep in Spring's
    // ResourceHttpRequestHandler; a spy wraps the real bean so location() stays valid while
    // readAudio(...) is still stubbable per test.
    @SpyBean MediaStorageService media;
    @Autowired SpeakingFeedbackService svc;

    @Test
    void transcribesEachPartThenGradesAndNormalizes() {
        // doReturn(...).when(spy)... (not when(spy...).thenReturn(...)): media is a @SpyBean, so
        // when(media.readAudio(...)) would invoke the REAL method first to record the call, and
        // the real implementation throws (no such file) before the stub is ever installed.
        doReturn(new byte[]{1, 2, 3}).when(media).readAudio(anyString());
        when(transcriber.transcribe(any(), anyString())).thenReturn("I am from a small town near the coast.");
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"overall": 12,
             "criteria": [
               {"key":"fluency","band":6.3,"note":"steady"},
               {"key":"lexical","band":6,"note":"ok"},
               {"key":"grammar","band":5,"note":"ok"}
             ]}""");
        var req = new SpeakingFeedbackRequest("speak-1", List.of(
                new SpeakingPartInput(1, "Where are you from?", "/media/a.webm"),
                new SpeakingPartInput(2, "Describe a skill.", "/media/b.webm")));
        var r = svc.generate("u1", req);

        assertThat(r.source()).isEqualTo("claude");
        assertThat(r.criteria()).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(r.criteria().get(0).band()).isEqualTo(6.5);       // 6.3 snapped
        assertThat(r.overall()).isBetween(0.0, 9.0);                 // 12 was invalid -> recomputed
        assertThat(r.parts()).hasSize(2);
        assertThat(r.parts().get(0).transcript()).contains("coast");
        verify(transcriber, times(2)).transcribe(any(), anyString());
    }

    @Test
    void rejectsEmptyParts() {
        assertThatThrownBy(() -> svc.generate("u1", new SpeakingFeedbackRequest("x", List.of())))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }

    @Test
    void rejectsOversizeAudio() {
        doReturn(new byte[26_000_000]).when(media).readAudio(anyString());   // > 25MB default
        var req = new SpeakingFeedbackRequest("x", List.of(
                new SpeakingPartInput(1, "Q", "/media/a.webm")));
        assertThatThrownBy(() -> svc.generate("u1", req))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
