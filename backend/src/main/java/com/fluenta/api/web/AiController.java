package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.CoachService;
import com.fluenta.api.service.StudioAiService;
import com.fluenta.api.service.WritingFeedbackService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI feature endpoints. Writing feedback and the coach are live (both fall back to an offline
 * heuristic when the AI service is disabled/keyless). Every other feature is still held and
 * returns 501.
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final WritingFeedbackService writing;
    private final CoachService coach;
    private final StudioAiService studio;

    public AiController(WritingFeedbackService writing, CoachService coach, StudioAiService studio) {
        this.writing = writing;
        this.coach = coach;
        this.studio = studio;
    }

    @PostMapping("/writing-feedback")
    public AiDtos.WritingResult writingFeedback(@RequestBody AiDtos.WritingFeedbackRequest req) {
        return writing.generate(CurrentUser.require(), req);
    }

    @GetMapping("/writing-feedback/{id}")
    public AiDtos.WritingResult getWritingFeedback(@PathVariable String id) {
        return writing.get(CurrentUser.require(), id);
    }

    @PostMapping("/coach")
    public AiDtos.CoachReply coach(@RequestBody AiDtos.CoachRequest req) {
        return coach.reply(CurrentUser.require(), req);
    }

    @PostMapping("/studio-generate")
    public AiDtos.StudioQuestionsReply studioGenerate(@RequestBody AiDtos.StudioGenerateRequest req) {
        CurrentUser.requireAdmin();
        return studio.generate(req);
    }

    @PostMapping("/studio-fill")
    public AiDtos.StudioQuestionsReply studioFill(@RequestBody AiDtos.StudioFillRequest req) {
        CurrentUser.requireAdmin();
        return studio.fill(req);
    }

    @PostMapping("/studio-extract")
    public AiDtos.StudioExtractResult studioExtract(@RequestBody AiDtos.StudioExtractRequest req) {
        CurrentUser.requireAdmin();
        return studio.extract(req);
    }

    /** Held features: studio-*, speaking-feedback, live-interview. */
    @PostMapping("/{feature}")
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public Map<String, Object> notImplemented(@PathVariable String feature) {
        return Map.of(
                "error", "AI feature '" + feature + "' is not available yet",
                "status", 501,
                "comingSoon", true);
    }
}
