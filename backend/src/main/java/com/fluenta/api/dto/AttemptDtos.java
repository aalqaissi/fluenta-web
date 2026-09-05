package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Attempt submit request and graded-attempt response. */
public final class AttemptDtos {
    private AttemptDtos() {}

    /** Submitted by the runner: the exam + the student's answers. Scoring is server-side. */
    public record AttemptRequest(
            String examId,
            String skill,      // reading | listening
            JsonNode answers,  // { questionId: answer }
            int durationUsedSec
    ) {}

    /** A graded attempt returned to the results page. */
    public record AttemptDto(
            String id,
            String examId,
            String examTitle,
            String skill,
            JsonNode answers,
            int correct,
            int total,
            double band,
            int durationUsedSec,
            String createdAt
    ) {}
}
