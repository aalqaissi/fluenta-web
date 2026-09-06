package com.fluenta.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Root health page so hitting http://localhost:8080 confirms the API is up (no auth needed). */
@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
                "app", "Yalla English Hub API",
                "status", "ok",
                "api", "/api",
                "docs", "See backend/README.md");
    }
}
