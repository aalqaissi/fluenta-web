package com.fluenta.api;

import com.fluenta.api.service.grader.WritingRubric;
import com.fluenta.api.service.grader.WritingRubric.Variant;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WritingRubricTest {

    @Test
    void variantFromTaskNumberModuleAndKind() {
        assertThat(WritingRubric.of(1, "academic", "Report")).isEqualTo(Variant.ACADEMIC_T1);
        assertThat(WritingRubric.of(1, "general", "Formal letter")).isEqualTo(Variant.GENERAL_T1);
        assertThat(WritingRubric.of(1, null, "Informal letter")).isEqualTo(Variant.GENERAL_T1);   // kind says letter
        assertThat(WritingRubric.of(2, "general", "Opinion Essay")).isEqualTo(Variant.TASK2);
        assertThat(WritingRubric.of(null, "academic", "Essay")).isEqualTo(Variant.TASK2);
        assertThat(Variant.GENERAL_T1.key()).isEqualTo("general-t1");
    }

    @Test
    void taskCriterionIsAchievementForTask1AndResponseForTask2() {
        assertThat(WritingRubric.taskLabel(Variant.ACADEMIC_T1)).isEqualTo("Task Achievement");
        assertThat(WritingRubric.taskLabel(Variant.GENERAL_T1)).isEqualTo("Task Achievement");
        assertThat(WritingRubric.taskLabel(Variant.TASK2)).isEqualTo("Task Response");
    }

    @Test
    void promptsCarryVariantRulesAndKeepCoachingSeparate() {
        String a = WritingRubric.systemPrompt(Variant.ACADEMIC_T1);
        assertThat(a).contains("Task Achievement").contains("overview").contains("Overall, as can be observed from the given chart");
        String g = WritingRubric.systemPrompt(Variant.GENERAL_T1);
        assertThat(g).contains("bullet").contains("register").contains("postal address");
        String t2 = WritingRubric.systemPrompt(Variant.TASK2);
        assertThat(t2).contains("Task Response").contains("essay type").contains("PEEL").contains("shopping list");
        for (String p : new String[]{a, g, t2}) {
            assertThat(p).contains("must NOT change any criterion band").contains("\"coaching\"");
        }
        assertThat(WritingRubric.coachingKeys(Variant.TASK2)).contains("essay-structure", "peel", "shopping-list");
        assertThat(WritingRubric.coachingKeys(Variant.ACADEMIC_T1)).contains("overview");
    }
}
