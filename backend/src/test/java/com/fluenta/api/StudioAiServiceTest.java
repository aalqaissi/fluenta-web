package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.StudioAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {"fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test"})
class StudioAiServiceTest {

    @MockBean AiClient ai;
    @Autowired StudioAiService studio;

    @Test
    void generateNormalizesTypeOptionsAndAnswer() {
        // Model returns a bad band-y answer + missing options for an MC question.
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[
              {"prompt":"Which is correct?","type":"multiple-choice","answer":"banana"},
              {"prompt":"","type":"multiple-choice","answer":"B"}
            ]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "multiple-choice", 2));
        assertThat(r.questions()).hasSize(1);                      // blank-prompt question dropped
        var q = r.questions().get(0);
        assertThat(q.type()).isEqualTo("multiple-choice");
        assertThat(q.options()).hasSize(4);                        // padded to 4
        assertThat(q.answer()).matches("[A-D]");                   // coerced to a valid letter
    }

    @Test
    void fillReturnsAnswersForEachQuestion() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q1\",\"type\":\"true-false-notgiven\",\"answer\":\"false\"}]}");
        var r = studio.fill(new StudioFillRequest("passage",
                List.of(new StudioQuestionDto("Q1", "true-false-notgiven", null, "", null))));
        assertThat(r.questions()).singleElement().satisfies(q ->
                assertThat(q.answer()).isEqualTo("FALSE"));          // uppercased/validated
    }

    @Test
    void extractUsesVisionAndParses() {
        when(ai.vision(anyString(), anyString(), anyList())).thenReturn(
            "{\"passageText\":\"A chart shows sales rising.\",\"questions\":[{\"prompt\":\"Sales rose?\",\"type\":\"yes-no-notgiven\",\"answer\":\"YES\"}]}");
        var r = studio.extract(new StudioExtractRequest(
                List.of(new StudioImage("aGVsbG8=", "image/png")), null));
        assertThat(r.passageText()).contains("chart");
        assertThat(r.questions()).singleElement().satisfies(q ->
                assertThat(q.answer()).isEqualTo("YES"));
        verify(ai).vision(anyString(), anyString(), anyList());
    }

    @Test
    void rejectsOversizeImage() {
        String big = "a".repeat(6_000_001);  // > default 5MB cap (chars ≈ bytes here)
        assertThatThrownBy(() -> studio.extract(new StudioExtractRequest(
                List.of(new StudioImage(big, "image/png")), null))).isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
