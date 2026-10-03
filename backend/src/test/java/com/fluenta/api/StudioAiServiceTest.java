package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.StudioAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {"fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test"})
class StudioAiServiceTest {

    @MockBean AiClient ai;
    @Autowired StudioAiService studio;

    @Test
    void generateNormalizesTypeOptionsAndAnswer() {
        // Model returns a bad band-y answer + missing options for an MC question.
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[
              {"prompt":"Which is correct?","type":"multiple-choice","answer":"banana"},
              {"prompt":"","type":"multiple-choice","answer":"B"}
            ]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "multiple-choice", 2));
        assertThat(r.questions()).hasSize(1);                      // blank-prompt question dropped
        var q = r.questions().get(0);
        assertThat(q.type()).isEqualTo("multiple-choice");
        assertThat(q.options()).hasSize(4);                        // padded to 4
        assertThat(q.answer()).matches("[A-D]");                   // coerced to a valid letter
    }

    @Test
    void generateKeepsAcceptedVariantsForTextAnswersOnly() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[
              {"prompt":"The ___ of the flag","type":"sentence-completion","answer":"colour","accepted":["color"," ","colour"],"wordLimit":1},
              {"prompt":"Is it true?","type":"true-false-notgiven","answer":"TRUE","accepted":["T"]}
            ]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "sentence-completion", 2));
        assertThat(r.questions().get(0).accepted()).containsExactly("color");   // blank + duplicate-of-answer dropped
        assertThat(r.questions().get(1).accepted()).isNull();                   // choice types carry no variants
    }

    @Test
    void wordLimitIsRaisedWhenTheKeyItselfIsLonger() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[{"prompt":"Where?","type":"short-answer","answer":"the old town hall","wordLimit":2}]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "short-answer", 1));
        assertThat(r.questions().get(0).wordLimit()).isEqualTo(4);
    }

    @Test
    void generatePromptCarriesModuleContextAndTfngYnngDefinitions() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"questions\":[]}");
        studio.generate(new StudioGenerateRequest("Some passage", "yes-no-notgiven", 2, null, "general", 2, "reading"));
        var system = org.mockito.ArgumentCaptor.forClass(String.class);
        var user = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(ai).complete(system.capture(), user.capture());
        assertThat(system.getValue()).containsIgnoringCase("writer's views").containsIgnoringCase("factual information").contains("outside knowledge");
        assertThat(user.getValue()).contains("General Training").contains("workplace");
    }

    @Test
    void newCompletionTypesNormaliseWithWordLimits() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[{"prompt":"Stage 2: the leaves are ___","type":"flow-chart-completion","answer":"dried"},
                          {"prompt":"Name: ___","type":"form-completion","answer":"Jones"}]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "note-completion", 2));
        assertThat(r.questions()).extracting(StudioQuestionDto::type).containsExactly("flow-chart-completion", "form-completion");
        assertThat(r.questions()).allSatisfy(q -> assertThat(q.wordLimit()).isNotNull());
    }

    @Test
    void passageFollowsTheModuleBrief() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"title\":\"Staff canteen rules\",\"text\":\"A. The canteen opens at 8.\"}");
        var r = studio.passage(new StudioPassageRequest("general", 2, "canteen"));
        assertThat(r.title()).isEqualTo("Staff canteen rules");
        assertThat(r.text()).contains("canteen");
        var user = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(ai).complete(anyString(), user.capture());
        assertThat(user.getValue()).contains("workplace").contains("NOT a simplified Academic passage").contains("canteen");
    }

    @Test
    void fillReturnsAnswersForEachQuestion() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q1\",\"type\":\"true-false-notgiven\",\"answer\":\"false\"}]}");
        var r = studio.fill(new StudioFillRequest("passage",
                List.of(new StudioQuestionDto("Q1", "true-false-notgiven", null, "", null))));
        assertThat(r.questions()).singleElement().satisfies(q ->
                assertThat(q.answer()).isEqualTo("FALSE"));          // uppercased/validated
    }

    @Test
    void extractUsesVisionAndParses() {
        when(ai.vision(anyString(), anyString(), anyList())).thenReturn(
            "{\"passageText\":\"A chart shows sales rising.\",\"questions\":[{\"prompt\":\"Sales rose?\",\"type\":\"yes-no-notgiven\",\"answer\":\"YES\"}]}");
        var r = studio.extract(new StudioExtractRequest(
                List.of(new StudioImage("aGVsbG8=", "image/png")), null));
        assertThat(r.passageText()).contains("chart");
        assertThat(r.questions()).singleElement().satisfies(q ->
                assertThat(q.answer()).isEqualTo("YES"));
        verify(ai).vision(anyString(), anyString(), anyList());
    }

    @Test
    void rejectsOversizeImage() {
        String big = "a".repeat(6_000_001);  // > default 5MB cap (chars ≈ bytes here)
        assertThatThrownBy(() -> studio.extract(new StudioExtractRequest(
                List.of(new StudioImage(big, "image/png")), null))).isInstanceOf(com.fluenta.api.web.ApiException.class);
    }

    @Test
    void generateFallsBackToShortAnswerWhenQuestionTypeIsNull() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q\",\"type\":\"short-answer\",\"answer\":\"word\"}]}");
        var r = studio.generate(new StudioGenerateRequest("passage", null, 2));
        assertThat(r.questions()).isNotEmpty();
        assertThat(r.questions().get(0).type()).isEqualTo("short-answer");
    }

    // --- matching types: the lettered list (sentence endings / headings / features) ---

    @Test
    void matchingGenerateCompletesBlankOptionsKeepsAdminOnesAndAnswersWithLetters() {
        // The admin typed B; A and C are blank. The model rewrites B (must be ignored), returns an
        // extra option (must be dropped) and answers with an out-of-range letter (must be coerced).
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"options":["expose errors.","AI rewrote B","apply weighting.","extra D"],
             "questions":[
               {"prompt":"Breaking an evaluation into parts can","answer":"b"},
               {"prompt":"Statistical rules are useful because they","answer":"Z"}
             ]}""");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-sentence-endings", 2,
                List.of("", "prevent one feature dominating.", "")));
        assertThat(r.options()).containsExactly("expose errors.", "prevent one feature dominating.", "apply weighting.");
        assertThat(r.questions()).hasSize(2).allSatisfy(q -> {
            assertThat(q.type()).isEqualTo("matching-sentence-endings");
            assertThat(q.options()).isNull();                    // the list lives on the passage
            assertThat(q.answer()).matches("[A-C]");
        });
        assertThat(r.questions().get(0).answer()).isEqualTo("B");
    }

    // --- Bug 6: IELTS rules per type; letters once; headings tied to the passage's paragraphs ---

    @Test
    void generatePromptCarriesTheTypesIeltsRules() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"questions\":[]}");
        studio.generate(new StudioGenerateRequest("passage", "true-false-notgiven", 2));
        verify(ai).complete(anyString(), argThat(u -> u.contains("TYPE RULES (true-false-notgiven)")
                && u.contains("FACTUAL") && u.contains("ORDER: questions follow the order")));
    }

    @Test
    void sentenceEndingsUseEachEndingOnceDroppingRepeats() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"options":["e1","e2","e3","e4","e5"],"questions":[
              {"prompt":"Beginning one","answer":"B"},
              {"prompt":"Beginning two","answer":"B"},
              {"prompt":"Beginning three","answer":"D"}]}""");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-sentence-endings", 3, List.of("", "", "", "", "")));
        assertThat(r.questions()).extracting(StudioQuestionDto::answer).containsExactly("B", "D");
        assertThat(r.questions()).extracting(StudioQuestionDto::prompt).containsExactly("Beginning one", "Beginning three");
    }

    @Test
    void featuresMayReuseALetter() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"options":["Kahneman","Damasio"],"questions":[
              {"prompt":"Described two systems","answer":"A"},{"prompt":"Studied heuristics","answer":"A"}]}""");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-features", 2, List.of("", "")));
        assertThat(r.questions()).extracting(StudioQuestionDto::answer).containsExactly("A", "A");
    }

    @Test
    void headingsNameRealParagraphsOnceEachWithDistinctHeadings() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"options":["h1","h2","h3","h4","h5"],"questions":[
              {"prompt":"paragraph b","answer":"C"},
              {"prompt":"Paragraph Z","answer":"A"},
              {"prompt":"Paragraph B","answer":"D"},
              {"prompt":"Section D","answer":"C"},
              {"prompt":"Paragraph D","answer":"E"}]}""");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-headings", 4,
                List.of("", "", "", "", ""), null, null, null, null, List.of("A", "B", "C", "D")));
        // Z isn't a paragraph; the 2nd B repeats a paragraph; "Section D" repeats heading C.
        assertThat(r.questions()).extracting(StudioQuestionDto::prompt).containsExactly("Paragraph B", "Paragraph D");
        assertThat(r.questions()).extracting(StudioQuestionDto::answer).containsExactly("C", "E");
        verify(ai).complete(anyString(), argThat(u -> u.contains("PARAGRAPHS: A, B, C, D") && u.contains("TYPE RULES (matching-headings)")));
    }

    @Test
    void matchingGenerateWithZeroCountOnlyFillsTheList() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"options\":[\"one.\",\"two.\"],\"questions\":[{\"prompt\":\"ignored\",\"answer\":\"A\"}]}");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-headings", 0, List.of("", "")));
        assertThat(r.options()).containsExactly("one.", "two.");
        assertThat(r.questions()).isEmpty();
    }

    @Test
    void matchingGenerateSendsTheListToTheModel() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"options\":[\"x.\"],\"questions\":[]}");
        studio.generate(new StudioGenerateRequest("passage", "matching-sentence-endings", 3, List.of("", "kept ending.")));
        verify(ai).complete(anyString(), argThat(u -> u.contains("B. kept ending.") && u.contains("A. (write this one)") && u.contains("COUNT: 3")));
    }

    @Test
    void matchingGenerateWithoutAListMakesCountPlusTwoOptions() {
        when(ai.complete(anyString(), anyString())).thenReturn("{\"options\":[],\"questions\":[]}");
        var r = studio.generate(new StudioGenerateRequest("passage", "matching-features", 3, null));
        assertThat(r.options()).hasSize(5);                         // blanks the model skipped get a placeholder
        assertThat(r.options()).allSatisfy(o -> assertThat(o).isNotBlank());
    }

    @Test
    void fillAnswersMatchingQuestionsWithALetterFromTheirList() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q1\",\"type\":\"matching-sentence-endings\",\"answer\":\"c\"}]}");
        var r = studio.fill(new StudioFillRequest("passage", List.of(new StudioQuestionDto(
                "Q1", "matching-sentence-endings", List.of("a.", "b.", "c."), "", null))));
        assertThat(r.questions()).singleElement().satisfies(q -> {
            assertThat(q.answer()).isEqualTo("C");
            assertThat(q.options()).isNull();
        });
    }

    // --- multi-select: "Choose TWO/THREE" — one question with several correct letters ---

    @Test
    void multiSelectGenerateKeepsEveryQuestionWithChooseNLetters() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[
              {"prompt":"Which TWO benefits are mentioned?","options":["a","b","c","d","e"],"answer":"C, a"},
              {"prompt":"Which TWO problems are noted?","options":["a","b","c","d","e"],"answer":"B,D,E"},
              {"prompt":"Which TWO groups took part?","options":["a","b","c"],"answer":"Z"}
            ]}""");
        var r = studio.generate(new StudioGenerateRequest("passage", "multi-select", 3, null, null, null, null, 2));
        assertThat(r.questions()).hasSize(3).allSatisfy(q -> {
            assertThat(q.type()).isEqualTo("multi-select");
            assertThat(q.choose()).isEqualTo(2);
            assertThat(q.options()).hasSize(5);                    // padded to 5 for choose TWO
        });
        // Options are shuffled after generation, so check the texts the answer letters point at:
        assertThat(r.questions()).extracting(StudioAiServiceTest::answerTexts)
                .containsExactly(List.of("a", "c"), List.of("b", "d"), List.of()); // trimmed to TWO; invalid dropped
        assertThat(r.questions()).extracting(StudioQuestionDto::answer).allSatisfy(a -> assertThat(a).matches("|[A-E],[A-E]"));
        verify(ai).complete(anyString(), argThat(u -> u.contains("CHOOSE: 2") && u.contains("COUNT: 3")));
    }

    /** The option texts a multi-select answer's letters point at, sorted. */
    private static List<String> answerTexts(StudioQuestionDto q) {
        return com.fluenta.api.service.AnswerMatcher.letters(q.answer()).stream()
                .map(l -> q.options().get(l.charAt(0) - 'A')).sorted().toList();
    }

    @Test
    void generatedChoiceOptionsAreShuffledAndTheAnswerFollowsItsText() {
        // The model puts the correct options first (A, B) — a common bias. After generation the
        // options are shuffled; the answer letters must still point at the same correct texts,
        // and across many generations the correct pair must not always sit at A,B.
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[{"prompt":"Which TWO are true?",
              "options":["right one","right two","wrong one","wrong two","wrong three"],"answer":"A,B"}]}""");
        java.util.Set<String> answersSeen = new java.util.HashSet<>();
        for (int i = 0; i < 30; i++) {
            var q = studio.generate(new StudioGenerateRequest("passage", "multi-select", 1, null, null, null, null, 2))
                    .questions().get(0);
            assertThat(answerTexts(q)).containsExactly("right one", "right two");
            assertThat(q.options()).containsExactlyInAnyOrder("right one", "right two", "wrong one", "wrong two", "wrong three");
            answersSeen.add(q.answer());
        }
        assertThat(answersSeen).hasSizeGreaterThan(1);
    }

    @Test
    void generatedMultipleChoiceIsShuffledToo() {
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[{"prompt":"Which?","type":"multiple-choice","options":["right","w1","w2","w3"],"answer":"A"}]}""");
        java.util.Set<String> answersSeen = new java.util.HashSet<>();
        for (int i = 0; i < 30; i++) {
            var q = studio.generate(new StudioGenerateRequest("passage", "multiple-choice", 1)).questions().get(0);
            assertThat(q.options().get(q.answer().charAt(0) - 'A')).isEqualTo("right");
            answersSeen.add(q.answer());
        }
        assertThat(answersSeen).hasSizeGreaterThan(1);
    }

    @Test
    void multiSelectChooseThreeGetsSevenOptions() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Which THREE?\",\"options\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\"],\"answer\":\"g,a,d\"}]}");
        var r = studio.generate(new StudioGenerateRequest("passage", "multi-select", 1, null, null, null, null, 3));
        assertThat(r.questions()).singleElement().satisfies(q -> {
            assertThat(q.options()).hasSize(7);
            assertThat(answerTexts(q)).containsExactly("a", "d", "g");
            assertThat(q.choose()).isEqualTo(3);
        });
    }

    @Test
    void multiSelectFillAnswersWithTheQuestionsChooseCount() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q\",\"type\":\"multi-select\",\"answer\":\"f, b, d\"}]}");
        var in = new StudioQuestionDto("Q", "multi-select", List.of("a", "b", "c", "d", "e", "f", "g"), "", null, null, 3);
        var r = studio.fill(new StudioFillRequest("passage", List.of(in)));
        assertThat(r.questions()).singleElement().satisfies(q -> {
            assertThat(q.answer()).isEqualTo("B,D,F");
            assertThat(q.choose()).isEqualTo(3);
        });
    }

    @Test
    void fillRejectsOversizePassage() {
        assertThatThrownBy(() -> studio.fill(new StudioFillRequest("a".repeat(12_001),
                List.of(new StudioQuestionDto("Q1", "short-answer", null, "", null)))))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
