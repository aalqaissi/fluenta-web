package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.AttemptDtos.AttemptDto;
import com.fluenta.api.dto.AttemptDtos.AttemptRequest;
import com.fluenta.api.service.AttemptService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attempts")
public class AttemptController {

    private final AttemptService attempts;

    public AttemptController(AttemptService attempts) {
        this.attempts = attempts;
    }

    /** Submit answers for server-side scoring; returns the graded attempt. */
    @PostMapping
    public AttemptDto submit(@RequestBody AttemptRequest req) {
        return attempts.submit(CurrentUser.require(), req);
    }

    @GetMapping("/{id}")
    public AttemptDto get(@PathVariable String id) {
        return attempts.get(CurrentUser.require(), id);
    }

    /** List the user's attempts, or (with {@code ?examId=}) the latest attempt for one exam. */
    @GetMapping
    public Object list(@RequestParam(required = false) String examId) {
        String userId = CurrentUser.require();
        if (examId != null) return attempts.latestForExam(userId, examId);
        return List.copyOf(attempts.list(userId));
    }
}
