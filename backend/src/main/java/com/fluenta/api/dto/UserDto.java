package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Mirrors the frontend {@code FluentaUser}. */
public record UserDto(
        String id,
        String name,
        String email,
        String initials,
        String avatarUrl,
        String plan,
        String planLabel,
        int renewsInDays,
        double targetBand,
        String examDate,
        boolean saveHistory,
        JsonNode streak
) {}
