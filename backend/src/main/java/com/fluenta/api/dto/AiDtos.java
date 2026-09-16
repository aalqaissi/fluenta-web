package com.fluenta.api.dto;

import java.util.List;

/** Request + response DTOs for AI writing feedback. Field names mirror the web/mobile WritingResult. */
public final class AiDtos {
    private AiDtos() {}

    public record WritingFeedbackRequest(
            String taskId, Integer taskNumber, String kind, String module,
            String prompt, Integer minWords, String essay) {}

    public record WritingCriterion(String key, String label, double band, String summary) {}

    public record WritingAnnotation(String id, String criterion, String quote, String note) {}

    public record WritingResult(
            String id, String source, double overall, int wordCount, String answer,
            List<WritingCriterion> criteria, List<WritingAnnotation> annotations) {}
}
