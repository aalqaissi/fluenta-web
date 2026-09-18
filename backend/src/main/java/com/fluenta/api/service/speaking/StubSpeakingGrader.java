package com.fluenta.api.service.speaking;

import com.fluenta.api.dto.AiDtos.SpeakingCriterionDto;
import org.springframework.stereotype.Component;

import java.util.List;

/** Offline/free speaking grade: deterministic per-criterion bands (no model call). */
@Component
public class StubSpeakingGrader {
    public List<SpeakingCriterionDto> grade() {
        return List.of(
                new SpeakingCriterionDto("fluency", "Fluency & Coherence", 6,
                        "Steady pace overall; add more linking phrases to connect ideas. (offline sample)"),
                new SpeakingCriterionDto("lexical", "Lexical Resource", 6,
                        "Good range on familiar topics; reach for less common collocations. (offline sample)"),
                new SpeakingCriterionDto("grammar", "Grammatical Range & Accuracy", 5,
                        "Simple structures are accurate; complex sentences need more control. (offline sample)"),
                new SpeakingCriterionDto("pronunciation", "Pronunciation", 6,
                        "Estimated from the transcript, not measured acoustically. (offline sample)"));
    }
}
