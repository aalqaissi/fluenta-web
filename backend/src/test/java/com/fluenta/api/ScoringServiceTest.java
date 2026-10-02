package com.fluenta.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.service.ScoringService;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ScoringServiceTest {
    private final ScoringService scoring = new ScoringService();

    private JsonNode studio() throws Exception {
        // Studio shape: passage-level questionType inherited by questions; stray wordLimit on a TFNG question.
        return new ObjectMapper().readTree("""
            {"passages":[
              {"questionType":"sentence-completion","questions":[
                {"id":"q1","answer":"park","wordLimit":1},
                {"id":"q2","answer":"colour","accepted":["color"],"wordLimit":1},
                {"id":"q3","answer":"(the) library","wordLimit":2},
                {"id":"q4","type":"true-false-notgiven","answer":"NOT GIVEN","wordLimit":1}
              ]}
            ]}""");
    }

    @Test
    void overLimitAnswerIsWrongEvenIfItContainsTheKey() throws Exception {
        var s = scoring.score("reading", studio(), Map.of("q1", "car park"));
        assertThat(s.correct()).isZero();
        assertThat(s.total()).isEqualTo(4);
    }

    @Test
    void acceptedVariantsOptionalWordsAndChoiceTypesScore() throws Exception {
        var s = scoring.score("reading", studio(),
                Map.of("q1", "Park.", "q2", "color", "q3", "library", "q4", "not given"));
        assertThat(s.correct()).isEqualTo(4);
    }

    @Test
    void runtimeShapeUsesGroupTypeAndLabelLimit() throws Exception {
        JsonNode rt = new ObjectMapper().readTree("""
            {"sections":[{"group":{"type":"short-answer","questions":[
              {"id":"a","correct":"four","accepted":["4"],"wordLimit":"ONE WORD/NUMBER"}]}}]}""");
        assertThat(scoring.score("listening", rt, Map.of("a", "4")).correct()).isEqualTo(1);
        assertThat(scoring.score("listening", rt, Map.of("a", "4 hours")).correct()).isZero();
    }

    @Test
    void chooseTwoEarnsOneMarkPerCorrectLetterAndCountsAsTwo() throws Exception {
        JsonNode exam = new ObjectMapper().readTree("""
            {"passages":[{"questionType":"multi-select","questions":[
              {"id":"m1","answer":"A,C","options":["a","b","c","d","e"]},
              {"id":"t1","type":"true-false-notgiven","answer":"TRUE"}
            ]}]}""");
        var s = scoring.score("reading", exam, Map.of("m1", "C,D", "t1", "true"));
        assertThat(s.total()).isEqualTo(3);     // 2 marks for the choose-TWO + 1 for TFNG
        assertThat(s.correct()).isEqualTo(2);   // C right, D wrong; TFNG right
    }

    @Test
    void answerKeyMapIsUnchanged() throws Exception {
        assertThat(scoring.answerKey(studio())).containsEntry("q2", "colour").hasSize(4);
    }
}
