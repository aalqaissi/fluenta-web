package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fluenta.api.web.ApiException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Serves seeded, read-only reference content (lessons, achievements, plans, progress) from classpath JSON. */
@Service
public class ContentService {

    private final Json json;
    private final Map<String, JsonNode> cache = new ConcurrentHashMap<>();

    public ContentService(Json json) {
        this.json = json;
    }

    /** Read {@code classpath:seed/<name>.json} as a node (cached). */
    public JsonNode read(String name) {
        return cache.computeIfAbsent(name, this::load);
    }

    private JsonNode load(String name) {
        ClassPathResource res = new ClassPathResource("seed/" + name + ".json");
        if (!res.exists()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No seed content: " + name);
        }
        try (InputStream in = res.getInputStream()) {
            return json.mapper().readTree(in);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read seed: " + name);
        }
    }
}
