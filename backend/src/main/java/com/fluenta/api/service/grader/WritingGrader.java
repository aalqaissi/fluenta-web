package com.fluenta.api.service.grader;

import com.fluenta.api.dto.AiDtos;

/** Produces writing feedback for an essay. Implementations: live (Claude) and offline (heuristic). */
public interface WritingGrader {
    AiDtos.WritingResult grade(AiDtos.WritingFeedbackRequest req);
}
