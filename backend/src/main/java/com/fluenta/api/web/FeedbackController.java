package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.FeedbackDtos.*;
import com.fluenta.api.service.FeedbackService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Student-facing feedback: submit, list mine, dashboard summary, view one. */
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedback;

    public FeedbackController(FeedbackService feedback) {
        this.feedback = feedback;
    }

    @PostMapping
    public FeedbackDto create(@RequestBody CreateFeedback req) {
        return feedback.create(CurrentUser.require(), req);
    }

    @GetMapping
    public List<FeedbackDto> list() {
        return feedback.listForUser(CurrentUser.require());
    }

    @GetMapping("/summary")
    public FeedbackSummary summary() {
        return feedback.summaryForUser(CurrentUser.require());
    }

    @GetMapping("/{id}")
    public FeedbackDto get(@PathVariable String id) {
        return feedback.get(CurrentUser.require(), id);
    }
}
