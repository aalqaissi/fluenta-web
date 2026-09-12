package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.FeedbackDtos.*;
import com.fluenta.api.service.FeedbackService;
import org.springframework.web.bind.annotation.*;

/**
 * Admin "Feedback Review" queue. Part of the Content Studio authoring surface; endpoints
 * require an admin role (see {@link CurrentUser#requireAdmin()}).
 */
@RestController
@RequestMapping("/api/admin/feedback")
public class AdminFeedbackController {

    private final FeedbackService feedback;

    public AdminFeedbackController(FeedbackService feedback) {
        this.feedback = feedback;
    }

    @GetMapping
    public FeedbackQueue queue() {
        CurrentUser.requireAdmin();
        return feedback.queue();
    }

    @PatchMapping("/{id}")
    public FeedbackDto update(@PathVariable String id, @RequestBody FeedbackUpdate req) {
        CurrentUser.requireAdmin();
        return feedback.update(id, req);
    }
}
