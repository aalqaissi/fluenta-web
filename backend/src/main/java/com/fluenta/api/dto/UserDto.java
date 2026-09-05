package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Mirrors the frontend user profile. */
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
        String track,
        String examType,
        String purpose,
        String level,
        boolean onboarded,
        JsonNode streak
) {}
