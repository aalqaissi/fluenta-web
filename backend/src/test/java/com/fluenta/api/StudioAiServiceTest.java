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
    void generateKeepsAcceptedVariantsForTextAnswersOnly() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[
              {"prompt":"The ___ of the flag","type":"sentence-completion","answer":"colour","accepted":["color"," ","colour"],"wordLimit":1},
              {"prompt":"Is it true?","type":"true-false-notgiven","answer":"TRUE","accepted":["T"]}
            ]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "sentence-completion", 2));
        assertThat(r.questions().get(0).accepted()).containsExactly("color");   // blank + duplicate-of-answer dropped
        assertThat(r.questions().get(1).accepted()).isNull();                   // choice types carry no variants
    }

    @Test
    void wordLimitIsRaisedWhenTheKeyItselfIsLonger() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[{"prompt":"Where?","type":"short-answer","answer":"the old town hall","wordLimit":2}]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "short-answer", 1));
        assertThat(r.questions().get(0).wordLimit()).isEqualTo(4);
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

    @Test
    void generateFallsBackToShortAnswerWhenQuestionTypeIsNull() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q\",\"type\":\"short-answer\",\"answer\":\"word\"}]}");
        var r = studio.generate(new StudioGenerateRequest("passage", null, 2));
        assertThat(r.questions()).isNotEmpty();
        assertThat(r.questions().get(0).type()).isEqualTo("short-answer");
    }

    // --- matching types: the lettered list (sentence endings / headings / features) ---

    @Test
    void matchingGenerateCompletesBlankOptionsKeepsAdminOnesAndAnswersWithLetters() {
        // The admin typed B; A and C are blank. The model rewrites B (must be ignored), returns an
        // extra option (must be dropped) and answers with an out-of-range letter (must be coerced).
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"options":["expose errors.","AI rewrote B","apply weighting.","extra D"],
             "questions":[
               {"prompt":"Breaking an evaluation into parts can","answer":"b"},
               {"prompt":"Statistical rules are useful because they","answer":"Z"}
             ]}""");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-sentence-endings", 2,
                List.of("", "prevent one feature dominating.", "")));
        assertThat(r.options()).containsExactly("expose errors.", "prevent one feature dominating.", "apply weighting.");
        assertThat(r.questions()).hasSize(2).allSatisfy(q -> {
            assertThat(q.type()).isEqualTo("matching-sentence-endings");
            assertThat(q.options()).isNull();                    // the list lives on the passage
            assertThat(q.answer()).matches("[A-C]");
        });
        assertThat(r.questions().get(0).answer()).isEqualTo("B");
    }

    @Test
    void matchingGenerateWithZeroCountOnlyFillsTheList() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"options\":[\"one.\",\"two.\"],\"questions\":[{\"prompt\":\"ignored\",\"answer\":\"A\"}]}");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-headings", 0, List.of("", "")));
        assertThat(r.options()).containsExactly("one.", "two.");
        assertThat(r.questions()).isEmpty();
    }

    @Test
    void matchingGenerateSendsTheListToTheModel() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"options\":[\"x.\"],\"questions\":[]}");
        studio.generate(new StudioGenerateRequest("passage", "matching-sentence-endings", 3, List.of("", "kept ending.")));
        verify(ai).complete(anyString(), argThat(u -> u.contains("B. kept ending.") && u.contains("A. (write this one)") && u.contains("COUNT: 3")));
    }

    @Test
    void matchingGenerateWithoutAListMakesCountPlusTwoOptions() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"options\":[],\"questions\":[]}");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-features", 3, null));
        assertThat(r.options()).hasSize(5);                         // blanks the model skipped get a placeholder
        assertThat(r.options()).allSatisfy(o -> assertThat(o).isNotBlank());
    }

    @Test
    void fillAnswersMatchingQuestionsWithALetterFromTheirList() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q1\",\"type\":\"matching-sentence-endings\",\"answer\":\"c\"}]}");
        var r = studio.fill(new StudioFillRequest("passage", List.of(new StudioQuestionDto(
                "Q1", "matching-sentence-endings", List.of("a.", "b.", "c."), "", null))));
        assertThat(r.questions()).singleElement().satisfies(q -> {
            assertThat(q.answer()).isEqualTo("C");
            assertThat(q.options()).isNull();
        });
    }

    @Test
    void fillRejectsOversizePassage() {
        assertThatThrownBy(() -> studio.fill(new StudioFillRequest("a".repeat(12_001),
                List.of(new StudioQuestionDto("Q1", "short-answer", null, "", null)))))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
