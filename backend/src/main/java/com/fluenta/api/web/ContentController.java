package com.fluenta.api.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fluenta.api.service.ContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Seeded, read-only reference content used by the dashboard, lessons, achievements and pricing screens. */
@RestController
@RequestMapping("/api")
public class ContentController {

    private final ContentService content;

    public ContentController(ContentService content) {
        this.content = content;
    }

    @GetMapping("/lessons")
    public JsonNode lessons() {
        return content.read("lessons");
    }

    @GetMapping("/achievements")
    public JsonNode achievements() {
        return content.read("achievements");
    }

    @GetMapping("/plans")
    public JsonNode plans() {
        return content.read("plans");
    }

    @GetMapping("/progress")
    public JsonNode progress() {
        return content.read("progress");
    }
}
