package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.StudioQuestionDto;
import com.fluenta.api.service.studio.StubStudioAuthor;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StubStudioAuthorTest {
    private final StubStudioAuthor stub = new StubStudioAuthor();

    @Test
    void generateProducesTypedQuestionsWithAnswers() {
        var qs = stub.generate("true-false-notgiven", 3);
        assertThat(qs).hasSize(3);
        assertThat(qs).allSatisfy(q -> {
            assertThat(q.prompt()).isNotBlank();
            assertThat(q.answer()).isEqualTo("TRUE");
            assertThat(q.type()).isEqualTo("true-false-notgiven");
        });
        assertThat(stub.generate("multiple-choice", 2))
                .allSatisfy(q -> { assertThat(q.options()).hasSize(4); assertThat(q.answer()).isEqualTo("A"); });
    }

    @Test
    void fillOnlySetsAnswersLeavingPromptsIntact() {
        var input = List.of(new StudioQuestionDto("Q1", "yes-no-notgiven", null, "", null));
        var out = stub.fill(input, "yes-no-notgiven");
        assertThat(out).singleElement().satisfies(q -> {
            assertThat(q.prompt()).isEqualTo("Q1");
            assertThat(q.answer()).isEqualTo("YES");
        });
    }

    @Test
    void extractReturnsPassageAndQuestions() {
        var r = stub.extract();
        assertThat(r.passageText()).isNotBlank();
        assertThat(r.questions()).isNotEmpty();
    }
}
