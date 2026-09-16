package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.WritingFeedbackService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI feature endpoints. Writing feedback is live (falls back to an offline heuristic when the AI
 * service is disabled/keyless). Every other feature is still held and returns 501.
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final WritingFeedbackService writing;

    public AiController(WritingFeedbackService writing) { this.writing = writing; }

    @PostMapping("/writing-feedback")
    public AiDtos.WritingResult writingFeedback(@RequestBody AiDtos.WritingFeedbackRequest req) {
        return writing.generate(CurrentUser.require(), req);
    }

    /** Held features: coach, studio-*, speaking-feedback, live-interview. */
    @PostMapping("/{feature}")
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public Map<String, Object> notImplemented(@PathVariable String feature) {
        return Map.of(
                "error", "AI feature '" + feature + "' is not available yet",
                "status", 501,
                "comingSoon", true);
    }
}
