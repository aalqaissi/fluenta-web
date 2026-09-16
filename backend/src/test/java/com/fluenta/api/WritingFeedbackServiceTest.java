package com.fluenta.api;

import com.fluenta.api.config.AiProperties;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.WritingFeedbackService;
import com.fluenta.api.service.grader.ClaudeWritingGrader;
import com.fluenta.api.service.grader.StubWritingGrader;
import com.fluenta.api.web.ApiException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class WritingFeedbackServiceTest {

    private AiProperties offline() {
        return new AiProperties(false, "", "claude-sonnet-5", "medium", 60, 12000, false);
    }

    private AiDtos.WritingFeedbackRequest req(String essay) {
        return new AiDtos.WritingFeedbackRequest("w1", 2, "Opinion Essay", "academic", "Prompt", 250, essay);
    }

    private WritingFeedbackService svc(AiProperties props, com.fluenta.api.service.grader.WritingGrader claude) {
        // ClaudeWritingGrader isn't used in offline mode, but the constructor requires it.
        return new WritingFeedbackService(props, new StubWritingGrader(),
                (ClaudeWritingGrader) claude);
    }

    @Test
    void offlineComputesWordCountAndFourCriteria() {
        var service = new WritingFeedbackService(offline(), new StubWritingGrader(), null);
        var r = service.generate("u1", req("word ".repeat(120)));
        assertThat(r.source()).isEqualTo("offline");
        assertThat(r.wordCount()).isEqualTo(120);
        assertThat(r.criteria()).extracting(AiDtos.WritingCriterion::key)
                .containsExactly("task", "coherence", "lexical", "grammar");
        assertThat(r.id()).isNull(); // persist=false
    }

    @Test
    void gateDropsHallucinatedQuotesAndClampsBands() {
        // A grader that returns an out-of-range band and a quote not in the essay.
        com.fluenta.api.service.grader.WritingGrader bad = rq -> new AiDtos.WritingResult(
                null, "ai", 12.0, 0, rq.essay(),
                List.of(new AiDtos.WritingCriterion("task", "Task Achievement", 11, "x")),
                List.of(new AiDtos.WritingAnnotation(null, "grammar", "NOT IN ESSAY", "n"),
                        new AiDtos.WritingAnnotation(null, "grammar", "real span", "n")));
        var props = new AiProperties(true, "sk-test", "claude-sonnet-5", "medium", 60, 12000, false);
        var service = new WritingFeedbackService(props, new StubWritingGrader(),
                new com.fluenta.api.service.grader.ClaudeWritingGrader((s, u) -> "", null) {
                    @Override public AiDtos.WritingResult grade(AiDtos.WritingFeedbackRequest r) { return bad.grade(r); }
                });
        var r = service.generate("u1", req("this has a real span inside it"));
        assertThat(r.overall()).isLessThanOrEqualTo(9.0);
        assertThat(r.criteria()).extracting(AiDtos.WritingCriterion::key)
                .containsExactly("task", "coherence", "lexical", "grammar");
        assertThat(r.criteria()).allSatisfy(c -> assertThat(c.band()).isBetween(0.0, 9.0));
        assertThat(r.annotations()).allSatisfy(a -> assertThat(r.answer()).contains(a.quote()));
        assertThat(r.annotations()).extracting(AiDtos.WritingAnnotation::quote).containsExactly("real span");
        assertThat(r.annotations()).extracting(AiDtos.WritingAnnotation::id).containsExactly("a1");
    }

    @Test
    void rejectsBlankAndOversizeEssays() {
        var service = new WritingFeedbackService(offline(), new StubWritingGrader(), null);
        assertThatThrownBy(() -> service.generate("u1", req("   "))).isInstanceOf(ApiException.class);
        var smallCap = new AiProperties(false, "", "claude-sonnet-5", "medium", 60, 10, false);
        var svc2 = new WritingFeedbackService(smallCap, new StubWritingGrader(), null);
        assertThatThrownBy(() -> svc2.generate("u1", req("this essay is definitely longer than ten characters")))
                .isInstanceOf(ApiException.class);
    }
}
