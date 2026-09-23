package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.MediaStorageService;
import com.fluenta.api.repo.SpeakingFeedbackRepository;
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

/**
 * Covers the persist-on save + get() round-trip + owner-scoped 404 paths that
 * SpeakingFeedbackServiceTest can't reach (it forces fluenta.ai.persist=false).
 */
@SpringBootTest(properties = {
        "fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test", "fluenta.ai.persist=true",
        "fluenta.ai.transcribe.enabled=true", "fluenta.ai.transcribe.api-key=sk-whisper"})
class SpeakingFeedbackPersistenceTest {

    @MockBean Transcriber transcriber;      // replaces the WhisperTranscriber (the only Transcriber bean)
    @MockBean AiClient ai;
    // @SpyBean (not @MockBean): MediaConfig calls media.location() while building the /media/**
    // resource handler at context-startup time, before any test method's when(...) stub runs. A
    // @MockBean returns null there and blows up context load with an NPE deep in Spring's
    // ResourceHttpRequestHandler; a spy wraps the real bean so location() stays valid while
    // readAudio(...) is still stubbable per test.
    @SpyBean MediaStorageService media;
    @Autowired SpeakingFeedbackService svc;
    @Autowired SpeakingFeedbackRepository repo;

    private SpeakingResult generate() {
        doReturn(new byte[]{1, 2, 3}).when(media).readAudio(anyString());
        when(transcriber.transcribe(any(), anyString())).thenReturn("a transcript");
        when(ai.complete(anyString(), anyString())).thenReturn(
                "{\"overall\":6.5,\"criteria\":["
                        + "{\"key\":\"fluency\",\"band\":6.5,\"note\":\"ok\"},"
                        + "{\"key\":\"lexical\",\"band\":6,\"note\":\"ok\"},"
                        + "{\"key\":\"grammar\",\"band\":6,\"note\":\"ok\"},"
                        + "{\"key\":\"pronunciation\",\"band\":6,\"note\":\"estimated\"}]}");
        var req = new SpeakingFeedbackRequest("speak-1", List.of(
                new SpeakingPartInput(1, "Where are you from?", "/media/a.webm")));
        return svc.generate("u1", req);
    }

    @Test
    void persistsAndFetchesByIdForTheOwner() {
        var result = generate();
        assertThat(result.id()).isNotBlank();
        // Regression guard: fluenta.ai.model is blank by default (MP2), so the persisted "model"
        // audit field must come from effectiveModel() (provider preset), not the raw blank field.
        assertThat(repo.findById(result.id()).orElseThrow().getModel()).isEqualTo("claude-sonnet-5");

        var fetched = svc.get("u1", result.id());

        assertThat(fetched.overall()).isEqualTo(result.overall());
        assertThat(fetched.criteria()).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(fetched.criteria()).extracting(SpeakingCriterionDto::band)
                .containsExactlyElementsOf(
                        result.criteria().stream().map(SpeakingCriterionDto::band).toList());
    }

    @Test
    void getRejectsANonOwner() {
        var result = generate();
        assertThatThrownBy(() -> svc.get("someone-else", result.id()))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }

    @Test
    void getRejectsAMissingId() {
        assertThatThrownBy(() -> svc.get("u1", "does-not-exist"))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
