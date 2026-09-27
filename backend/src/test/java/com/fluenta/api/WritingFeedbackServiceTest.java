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
        return new AiProperties(false, "", "claude-sonnet-5", "medium", 60, 12000, 5000000, false, "anthropic", "", 8192);
    }

    private AiDtos.WritingFeedbackRequest req(String essay) {
        return new AiDtos.WritingFeedbackRequest("w1", 2, "Opinion Essay", "academic", "Prompt", 250, essay);
    }

    private WritingFeedbackService svc(AiProperties props, com.fluenta.api.service.grader.WritingGrader claude) {
        // ClaudeWritingGrader isn't used in offline mode, but the constructor requires it.
        return new WritingFeedbackService(props, new StubWritingGrader(),
                (ClaudeWritingGrader) claude, null, null);
    }

    @Test
    void offlineComputesWordCountAndFourCriteria() {
        var service = new WritingFeedbackService(offline(), new StubWritingGrader(), null, null, null);
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
        var props = new AiProperties(true, "sk-test", "claude-sonnet-5", "medium", 60, 12000, 5000000, false, "anthropic", "", 8192);
        com.fluenta.api.service.AiClient noopAi = new com.fluenta.api.service.AiClient() {
            @Override public String complete(String system, String user) { return ""; }
            @Override public String chat(String systemPrompt, List<com.fluenta.api.service.AiClient.ChatTurn> turns) {
                throw new UnsupportedOperationException("not used in this test");
            }
            @Override public String vision(String systemPrompt, String userText, List<com.fluenta.api.service.AiClient.ImageInput> images) {
                throw new UnsupportedOperationException("not used in this test");
            }
        };
        var service = new WritingFeedbackService(props, new StubWritingGrader(),
                new com.fluenta.api.service.grader.ClaudeWritingGrader(noopAi, null) {
                    @Override public AiDtos.WritingResult grade(AiDtos.WritingFeedbackRequest r) { return bad.grade(r); }
                }, null, null);
        var r = service.generate("u1", req("this has a real span inside it"));
        assertThat(r.overall()).isLessThanOrEqualTo(9.0);
        assertThat(r.criteria()).extracting(AiDtos.WritingCriterion::key)
                .containsExactly("task", "coherence", "lexical", "grammar");
        assertThat(r.criteria()).allSatisfy(c -> assertThat(c.band()).isBetween(0.0, 9.0));
        assertThat(r.annotations()).allSatisfy(a -> assertThat(r.answer()).contains(a.quote()));
        assertThat(r.annotations()).extracting(AiDtos.WritingAnnotation::quote).containsExactly("real span");
        assertThat(r.annotations()).extracting(AiDtos.WritingAnnotation::id).containsExactly("a1");
    }

    private WritingFeedbackService liveWith(com.fluenta.api.service.grader.WritingGrader g) {
        var props = new AiProperties(true, "sk-test", "claude-sonnet-5", "medium", 60, 12000, 5000000, false, "anthropic", "", 8192);
        return new WritingFeedbackService(props, new StubWritingGrader(),
                new com.fluenta.api.service.grader.ClaudeWritingGrader(null, null) {
                    @Override public AiDtos.WritingResult grade(AiDtos.WritingFeedbackRequest r) { return g.grade(r); }
                }, null, null);
    }

    private static List<AiDtos.WritingCriterion> bands(double t, double c, double l, double g) {
        return List.of(new AiDtos.WritingCriterion("task", "x", t, "s"), new AiDtos.WritingCriterion("coherence", "x", c, "s"),
                new AiDtos.WritingCriterion("lexical", "x", l, "s"), new AiDtos.WritingCriterion("grammar", "x", g, "s"));
    }

    @Test
    void task2UsesTaskResponseCriteriaMeanOverallAndClassifierFallback() {
        var svc = liveWith(rq -> new AiDtos.WritingResult(null, "ai", 9.0, 0, rq.essay(), bands(6, 7, 6, 6), List.of(),
                "task2", "haiku", List.of(
                        new AiDtos.CoachingNote("peel", null, "improve", "Body 2 lacks an example."),
                        new AiDtos.CoachingNote("made-up", null, "improve", "dropped"),
                        new AiDtos.CoachingNote("shopping-list", null, "weird", "dropped: bad status"))));
        var r = svc.generate("u1", new AiDtos.WritingFeedbackRequest("w1", 2, "Essay", "academic",
                "Some say X. Do you agree or disagree?", 250, "An essay."));
        assertThat(r.criteria().get(0).label()).isEqualTo("Task Response");
        assertThat(r.overall()).isEqualTo(6.5);                    // mean 6.25 → 6.5, not the model's 9.0
        assertThat(r.taskType()).isEqualTo("task2");
        assertThat(r.essayType()).isEqualTo("opinion");            // unknown model type → classifier
        assertThat(r.coaching()).singleElement().satisfies(n -> {
            assertThat(n.key()).isEqualTo("peel");
            assertThat(n.title()).isEqualTo("PEEL paragraph development");
        });
    }

    @Test
    void task1HasAchievementLabelNoEssayTypeAndCoachingFallback() {
        var svc = liveWith(rq -> new AiDtos.WritingResult(null, "ai", 6, 0, rq.essay(), bands(6, 6, 6, 6), List.of()));
        var r = svc.generate("u1", new AiDtos.WritingFeedbackRequest("w1", 1, "Report", "academic",
                "The chart shows...", 150, "The chart shows sales. Sales rose."));
        assertThat(r.criteria().get(0).label()).isEqualTo("Task Achievement");
        assertThat(r.taskType()).isEqualTo("academic-t1");
        assertThat(r.essayType()).isNull();
        assertThat(r.coaching()).isNotEmpty();                    // offline heuristics fill the Yalla layer
        assertThat(r.coaching()).extracting(AiDtos.CoachingNote::key).contains("overview");
    }

    @Test
    void rejectsBlankAndOversizeEssays() {
        var service = new WritingFeedbackService(offline(), new StubWritingGrader(), null, null, null);
        assertThatThrownBy(() -> service.generate("u1", req("   "))).isInstanceOf(ApiException.class);
        var smallCap = new AiProperties(false, "", "claude-sonnet-5", "medium", 60, 10, 5000000, false, "anthropic", "", 8192);
        var svc2 = new WritingFeedbackService(smallCap, new StubWritingGrader(), null, null, null);
        assertThatThrownBy(() -> svc2.generate("u1", req("this essay is definitely longer than ten characters")))
                .isInstanceOf(ApiException.class);
    }
}
