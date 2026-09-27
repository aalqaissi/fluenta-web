package com.fluenta.api;

import com.fluenta.api.service.studio.ContentRules;
import org.junit.jupiter.api.Test;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class ContentRulesTest {

    @Test
    void generalTrainingSectionsHaveTheirOwnSourceTypes() {
        assertThat(ContentRules.passageBrief("general", 1)).contains("notices").contains("advertisements");
        assertThat(ContentRules.passageBrief("general", 2)).contains("workplace").contains("job descriptions");
        assertThat(ContentRules.passageBrief("general", 3)).contains("ONE longer");
        for (int s = 1; s <= 3; s++) {
            assertThat(ContentRules.passageBrief("general", s)).contains("NOT a simplified Academic passage");
        }
        assertThat(ContentRules.passageBrief("academic", 2)).contains("academic").contains("paragraph");
        assertThat(ContentRules.passageBrief("academic", 1)).isNotEqualTo(ContentRules.passageBrief("general", 1));
    }

    @Test
    void contextLinesNameModuleSectionAndListeningPart() {
        assertThat(ContentRules.context("reading", "general", 2)).contains("General Training").contains("workplace");
        assertThat(ContentRules.context("reading", "academic", 1)).contains("Academic");
        assertThat(ContentRules.context("listening", null, 4)).contains("Part 4").contains("lecture");
        assertThat(ContentRules.context("reading", null, null)).isEmpty();
    }

    @Test
    void fullMockDistributionsTotalForty() {
        assertThat(IntStream.of(ContentRules.READING_FULL).sum()).isEqualTo(40);
        assertThat(ContentRules.READING_FULL).containsExactly(13, 13, 14);
        assertThat(IntStream.of(ContentRules.LISTENING_FULL).sum()).isEqualTo(40);
    }
}
