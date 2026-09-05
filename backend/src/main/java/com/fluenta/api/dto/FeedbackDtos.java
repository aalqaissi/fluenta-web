package com.fluenta.api.dto;

import java.util.List;

/** Feedback payloads: create request, full DTO, per-user summary, and admin status update. */
public final class FeedbackDtos {
    private FeedbackDtos() {}

    public record CreateFeedback(String category, String subject, String message, Integer rating) {}

    public record FeedbackDto(
            String id,
            String userId,
            String userName,
            String category,
            String subject,
            String message,
            Integer rating,
            String status,     // new | under_review | completed
            String adminReply,
            String createdAt,
            String updatedAt
    ) {}

    /** Dashboard "My Feedback" card summary. */
    public record FeedbackSummary(
            int total,
            int newCount,
            int underReview,
            int completed,
            FeedbackDto latest
    ) {}

    /** Admin update: change status and/or add a reply. */
    public record FeedbackUpdate(String status, String adminReply) {}

    /** Admin queue with per-status counts. */
    public record FeedbackQueue(int newCount, int underReview, int completed, List<FeedbackDto> items) {}
}
