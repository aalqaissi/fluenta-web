package com.fluenta.api;

import com.fluenta.api.service.studio.QuestionTypeRules;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionTypeRulesTest {

    private static final List<String> READING_TYPES = List.of(
            "multiple-choice", "multi-select", "true-false-notgiven", "yes-no-notgiven",
            "matching-information", "matching-headings", "matching-features", "matching-sentence-endings",
            "sentence-completion", "summary-completion", "note-completion", "table-completion",
            "flow-chart-completion", "diagram-label", "short-answer");

    @Test
    void everyReadingTypeHasAnAimAndRules() {
        for (String t : READING_TYPES) {
            assertThat(QuestionTypeRules.forType(t)).as(t).isNotNull();
            assertThat(QuestionTypeRules.forType(t).aim()).as(t).isNotBlank();
            assertThat(QuestionTypeRules.prompt(t)).as(t).contains("AIM:");
        }
    }

    @Test
    void orderAndLetterReuseFollowIelts() {
        assertThat(QuestionTypeRules.forType("true-false-notgiven").textOrder()).isTrue();
        assertThat(QuestionTypeRules.forType("matching-sentence-endings").textOrder()).isTrue();
        assertThat(QuestionTypeRules.forType("matching-information").textOrder()).isFalse();
        assertThat(QuestionTypeRules.forType("diagram-label").textOrder()).isFalse();

        assertThat(QuestionTypeRules.lettersOnce("matching-headings")).isTrue();
        assertThat(QuestionTypeRules.lettersOnce("matching-sentence-endings")).isTrue();
        assertThat(QuestionTypeRules.lettersOnce("matching-features")).isFalse();
        assertThat(QuestionTypeRules.lettersOnce("matching-information")).isFalse();
        assertThat(QuestionTypeRules.prompt("matching-headings")).contains("lower-case Roman numerals");
    }

    @Test
    void unknownTypeHasNoRules() {
        assertThat(QuestionTypeRules.forType("nope")).isNull();
        assertThat(QuestionTypeRules.prompt("nope")).isEmpty();
    }
}
