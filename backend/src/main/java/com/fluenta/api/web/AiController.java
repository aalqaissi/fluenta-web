package com.fluenta.api.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * AI features are intentionally held at this stage. Every endpoint returns 501 Not Implemented so
 * the frontend can detect and disable the corresponding actions. Each will be implemented in a
 * later stage (writing feedback, speaking feedback, coach chat, live interview).
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    @PostMapping("/{feature}")
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public java.util.Map<String, Object> notImplemented(@PathVariable String feature) {
        return java.util.Map.of(
                "error", "AI feature '" + feature + "' is not available yet",
                "status", 501,
                "comingSoon", true);
    }
}
