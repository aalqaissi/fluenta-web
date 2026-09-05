package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.FeedbackDtos.*;
import com.fluenta.api.service.FeedbackService;
import org.springframework.web.bind.annotation.*;

/**
 * Admin "Feedback Review" queue. Any authenticated user is treated as admin in this prototype
 * (the Content Studio is the admin surface); harden with real roles later.
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
        CurrentUser.require();
        return feedback.queue();
    }

    @PatchMapping("/{id}")
    public FeedbackDto update(@PathVariable String id, @RequestBody FeedbackUpdate req) {
        CurrentUser.require();
        return feedback.update(id, req);
    }
}
