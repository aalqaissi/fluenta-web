package com.fluenta.api.service;

import com.fluenta.api.domain.FeedbackEntity;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.FeedbackDtos.*;
import com.fluenta.api.repo.FeedbackRepository;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class FeedbackService {

    static final String NEW = "new";
    static final String UNDER_REVIEW = "under_review";
    static final String COMPLETED = "completed";

    private final FeedbackRepository feedback;
    private final UserRepository users;

    public FeedbackService(FeedbackRepository feedback, UserRepository users) {
        this.feedback = feedback;
        this.users = users;
    }

    public FeedbackDto create(String userId, CreateFeedback req) {
        UserEntity u = users.findById(userId).orElse(null);
        FeedbackEntity f = new FeedbackEntity();
        f.setId("fb-" + ExamService.uid());
        f.setUserId(userId);
        f.setUserName(u != null ? u.getName() : "Student");
        f.setCategory(req.category() == null ? "Suggestion" : req.category());
        f.setSubject(req.subject());
        f.setMessage(req.message());
        f.setRating(req.rating());
        f.setStatus(NEW);
        String now = Instant.now().toString();
        f.setCreatedAt(now);
        f.setUpdatedAt(now);
        return toDto(feedback.save(f));
    }

    public List<FeedbackDto> listForUser(String userId) {
        return feedback.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toDto).toList();
    }

    public FeedbackSummary summaryForUser(String userId) {
        List<FeedbackEntity> mine = feedback.findByUserIdOrderByCreatedAtDesc(userId);
        int n = 0, ur = 0, c = 0;
        for (FeedbackEntity f : mine) {
            switch (f.getStatus() == null ? "" : f.getStatus()) {
                case NEW -> n++;
                case UNDER_REVIEW -> ur++;
                case COMPLETED -> c++;
                default -> { }
            }
        }
        FeedbackDto latest = mine.isEmpty() ? null : toDto(mine.get(0));
        return new FeedbackSummary(mine.size(), n, ur, c, latest);
    }

    public FeedbackDto get(String userId, String id) {
        FeedbackEntity f = require(id);
        if (!f.getUserId().equals(userId)) throw ApiException.notFound("Feedback");
        return toDto(f);
    }

    // ---- admin ----

    public FeedbackQueue queue() {
        List<FeedbackDto> items = feedback.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
        return new FeedbackQueue(
                (int) feedback.countByStatus(NEW),
                (int) feedback.countByStatus(UNDER_REVIEW),
                (int) feedback.countByStatus(COMPLETED),
                items);
    }

    public FeedbackDto update(String id, FeedbackUpdate req) {
        FeedbackEntity f = require(id);
        if (req.status() != null && !req.status().isBlank()) {
            String s = req.status();
            if (!s.equals(NEW) && !s.equals(UNDER_REVIEW) && !s.equals(COMPLETED)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid status: " + s);
            }
            f.setStatus(s);
        }
        if (req.adminReply() != null) f.setAdminReply(req.adminReply());
        f.setUpdatedAt(Instant.now().toString());
        return toDto(feedback.save(f));
    }

    private FeedbackEntity require(String id) {
        return feedback.findById(id).orElseThrow(() -> ApiException.notFound("Feedback"));
    }

    private FeedbackDto toDto(FeedbackEntity f) {
        return new FeedbackDto(f.getId(), f.getUserId(), f.getUserName(), f.getCategory(), f.getSubject(),
                f.getMessage(), f.getRating(), f.getStatus(), f.getAdminReply(), f.getCreatedAt(), f.getUpdatedAt());
    }
}
