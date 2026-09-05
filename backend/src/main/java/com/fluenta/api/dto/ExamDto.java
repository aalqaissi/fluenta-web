package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Full exam payload. {@code content} is the nested authoring/runtime JSON (passages, sections,
 * writing parts, speaking parts, or full-mock references), passed through verbatim to the FE.
 */
public record ExamDto(
        String id,
        String skill,
        String title,
        String module,
        String status,
        String scope,
        int timeLimit,
        String updatedAt,
        String format,
        JsonNode content
) {}
