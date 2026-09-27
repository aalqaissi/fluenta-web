package com.fluenta.api;

import com.fluenta.api.service.grader.EssayTypeClassifier;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EssayTypeClassifierTest {

    private String key(String prompt) { return EssayTypeClassifier.classify(prompt); }

    @Test
    void opinionFamily() {
        assertThat(key("Some people think university should be free. Do you agree or disagree?")).isEqualTo("opinion");
        assertThat(key("Governments should ban cars in city centres. To what extent do you agree or disagree?")).isEqualTo("extent");
        assertThat(EssayTypeClassifier.isOpinion("extent")).isTrue();
    }

    @Test
    void discussionWinsOverOpinionWording() {
        assertThat(key("Some believe X, others think Y. Discuss both views and give your own opinion.")).isEqualTo("discussion");
        assertThat(EssayTypeClassifier.isOpinion("discussion")).isFalse();
    }

    @Test
    void advantagesProblemsCausesAndTwoPart() {
        assertThat(key("What are the advantages and disadvantages of working from home?")).isEqualTo("adv-disadv");
        assertThat(key("Do the advantages of tourism outweigh the disadvantages?")).isEqualTo("outweigh");
        assertThat(key("Traffic is increasing. What problems does this cause? What solutions can you suggest?")).isEqualTo("problem-solution");
        assertThat(key("Obesity is rising. What are the causes of this? What measures could be taken?")).isEqualTo("cause-solution");
        assertThat(key("Why do people move abroad? Is this a positive or negative development?")).isEqualTo("two-part");
        assertThat(key("Write about your favourite city.")).isEqualTo("other");
        assertThat(key(null)).isEqualTo("other");
    }

    @Test
    void labelsAndValidation() {
        assertThat(EssayTypeClassifier.label("problem-solution")).isEqualTo("Problems & Solutions");
        assertThat(EssayTypeClassifier.isKnown("discussion")).isTrue();
        assertThat(EssayTypeClassifier.isKnown("haiku")).isFalse();
    }
}
