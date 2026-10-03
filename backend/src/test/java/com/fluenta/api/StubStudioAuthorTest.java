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
    void matchingFillsBlankOptionsAndSpreadsAnswersOverTheList() {
        var options = stub.matchingOptions("matching-sentence-endings", java.util.Arrays.asList("", "kept.", ""));
        assertThat(options).hasSize(3);
        assertThat(options.get(1)).isEqualTo("kept.");
        assertThat(options.get(0)).isNotBlank();
        var qs = stub.matchingQuestions("matching-sentence-endings", 4, 3);
        // Sentence endings use each ending once, so 4 asked from a 3-entry list gives 3.
        assertThat(qs).extracting(StudioQuestionDto::answer).containsExactly("A", "B", "C");
        assertThat(qs).allSatisfy(q -> assertThat(q.type()).isEqualTo("matching-sentence-endings"));
    }

    @Test
    void multiSelectGeneratesChooseNLettersPerQuestion() {
        var qs = stub.multiSelect(4, 3);
        assertThat(qs).hasSize(4).allSatisfy(q -> {
            assertThat(q.type()).isEqualTo("multi-select");
            assertThat(q.options()).hasSize(7);
            assertThat(q.answer()).matches("[A-G],[A-G],[A-G]");
            assertThat(q.answer().split(",")).doesNotHaveDuplicates().isSorted();
            assertThat(q.choose()).isEqualTo(3);
        });
    }

    @Test
    void multiSelectPlaceholderAnswersAreNotAlwaysTheFirstLetters() {
        var seen = new java.util.HashSet<String>();
        for (int i = 0; i < 30; i++) seen.add(stub.multiSelect(1, 2).get(0).answer());
        assertThat(seen).hasSizeGreaterThan(1);
    }

    @Test
    void offlineHeadingsNameParagraphsAndUseEachHeadingOnce() {
        var qs = stub.matchingQuestions("matching-headings", 6, 5, List.of("A", "B", "C"));
        assertThat(qs).extracting(StudioQuestionDto::prompt).containsExactly("Paragraph A", "Paragraph B", "Paragraph C");
        assertThat(qs).extracting(StudioQuestionDto::answer).doesNotHaveDuplicates();
        assertThat(stub.matchingQuestions("matching-sentence-endings", 6, 4)).hasSize(4);
        assertThat(stub.matchingQuestions("matching-features", 6, 4)).hasSize(6);
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

    @Test
    void offlinePassageStatesTheSectionBrief() {
        var r = stub.passage("general", 1, "library");
        assertThat(r.text()).contains("library").contains("notices");
        assertThat(r.title()).isNotBlank();
    }
}
