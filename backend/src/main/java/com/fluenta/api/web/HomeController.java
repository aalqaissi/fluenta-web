package com.fluenta.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Health endpoint (no auth needed). `/` is left for the bundled SPA — see {@code config.SpaConfig}. */
@RestController
public class HomeController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "app", "Yalla English Hub API",
                "status", "ok",
                "api", "/api");
    }
}
