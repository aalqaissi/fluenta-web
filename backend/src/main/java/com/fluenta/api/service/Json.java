package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/** Thin wrapper over the shared Jackson {@link ObjectMapper} for the JSON-column fields. */
@Component
public class Json {
    private final ObjectMapper mapper;

    public Json(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Parse a stored JSON string into a node (null/blank → null). */
    public JsonNode parse(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return mapper.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }

    /** Serialise a node/object to a compact JSON string (null → null). */
    public String write(Object value) {
        if (value == null || (value instanceof JsonNode n && n.isNull())) return null;
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialise JSON", e);
        }
    }

    public ObjectMapper mapper() { return mapper; }
}
