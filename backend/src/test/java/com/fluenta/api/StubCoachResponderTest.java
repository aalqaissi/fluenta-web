package com.fluenta.api;

import com.fluenta.api.service.coach.StubCoachResponder;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StubCoachResponderTest {
    private final StubCoachResponder coach = new StubCoachResponder();

    @Test
    void taskAchievementBranch() {
        assertThat(coach.respond("Why did I get band 5 on Task Achievement?"))
                .contains("Task Achievement");
    }

    @Test
    void trueFalseNotGivenBranch() {
        assertThat(coach.respond("give me a true/false not given reading drill"))
                .contains("True/False/Not Given");
    }

    @Test
    void coherenceBranch() {
        assertThat(coach.respond("how do I improve coherence and cohesion?"))
                .containsIgnoringCase("referencing");
    }

    @Test
    void skimScanBranch() {
        assertThat(coach.respond("what is skimming vs scanning?"))
                .contains("Skimming");
    }

    @Test
    void defaultBranchAndNullSafe() {
        assertThat(coach.respond("hello")).isNotBlank();
        assertThat(coach.respond(null)).isNotBlank();
    }
}
