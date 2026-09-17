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

    public record CoachTurn(String role, String text) {}          // role: "user" | "coach"
    public record CoachRequest(List<CoachTurn> messages) {}
    public record CoachReply(String reply) {}

    public record StudioQuestionDto(String prompt, String type, List<String> options, String answer, Integer wordLimit) {}
    public record StudioGenerateRequest(String passageText, String questionType, Integer count) {}
    public record StudioImage(String base64, String mediaType) {}
    public record StudioFillRequest(String passageText, List<StudioQuestionDto> questions) {}
    public record StudioExtractRequest(List<StudioImage> images, String hint) {}
    public record StudioQuestionsReply(List<StudioQuestionDto> questions) {}
    public record StudioExtractResult(String passageText, List<StudioQuestionDto> questions) {}
}
