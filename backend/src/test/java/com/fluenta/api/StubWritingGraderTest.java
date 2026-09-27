package com.fluenta.api;

import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.grader.StubWritingGrader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StubWritingGraderTest {
    private final StubWritingGrader grader = new StubWritingGrader();

    private AiDtos.WritingFeedbackRequest req(String essay, int minWords) {
        return new AiDtos.WritingFeedbackRequest("w-task2", 2, "Opinion Essay", "academic",
                "Some prompt", minWords, essay);
    }

    @Test
    void returnsFourCriteriaAndOfflineSource() {
        var r = grader.grade(req("This is a short essay about technology. ".repeat(40), 250));
        assertThat(r.source()).isEqualTo("offline");
        assertThat(r.id()).isNull();
        assertThat(r.criteria()).extracting(AiDtos.WritingCriterion::key)
                .containsExactly("task", "coherence", "lexical", "grammar");
        assertThat(r.overall()).isBetween(0.0, 9.0);
        assertThat(r.criteria()).allSatisfy(c -> assertThat(c.band()).isBetween(0.0, 9.0));
    }

    @Test
    void annotationQuotesAreSubstringsOfEssay() {
        String essay = "On the one hand. On the other hand. In conclusion. " + "word ".repeat(60);
        var r = grader.grade(req(essay, 250));
        assertThat(r.annotations()).isNotEmpty();
        assertThat(r.annotations()).allSatisfy(a -> assertThat(essay).contains(a.quote()));
        assertThat(r.annotations()).anySatisfy(a -> assertThat(a.quote()).isEqualTo("On the one hand."));
    }

    @Test
    void isDeterministicAndPenalisesUnderLength() {
        var shortReq = req("word ".repeat(50), 250);
        var a = grader.grade(shortReq);
        var b = grader.grade(shortReq);
        assertThat(a.overall()).isEqualTo(b.overall());
        var longR = grader.grade(req("word ".repeat(260), 250));
        assertThat(a.overall()).isLessThanOrEqualTo(longR.overall());
    }

    @Test
    void task2CoachingFlagsShoppingListAndOpinionStructure() {
        String essay = String.join("\n\n",
                "Some people think cars should be banned. I agree.",
                "Firstly cars pollute. Secondly they are noisy. Also they are dangerous. Moreover they are expensive.",
                "Public transport is better because it moves more people. For example, buses in London carry millions. Therefore cities benefit.",
                "In conclusion, cars should be limited.");
        var r = grader.grade(new AiDtos.WritingFeedbackRequest("w", 2, "Essay", "academic",
                "Cars should be banned from city centres. Do you agree or disagree?", 250, essay));
        assertThat(r.taskType()).isEqualTo("task2");
        assertThat(r.essayType()).isEqualTo("opinion");
        assertThat(r.criteria().get(0).label()).isEqualTo("Task Response");
        assertThat(r.coaching()).extracting(AiDtos.CoachingNote::key).contains("essay-structure", "peel", "shopping-list");
        assertThat(r.coaching()).filteredOn(n -> n.key().equals("essay-structure"))
                .singleElement().satisfies(n -> assertThat(n.note()).contains("ONE clear position"));
    }

    @Test
    void generalTask1CoachingCoversBulletsAndRegister() {
        var r = grader.grade(new AiDtos.WritingFeedbackRequest("w", 1, "Formal letter", "general",
                "Write to your manager...", 150, "Dear Sir, I am writing to complain."));
        assertThat(r.taskType()).isEqualTo("general-t1");
        assertThat(r.essayType()).isNull();
        assertThat(r.criteria().get(0).label()).isEqualTo("Task Achievement");
        assertThat(r.coaching()).extracting(AiDtos.CoachingNote::key).contains("bullets", "register");
    }
}
