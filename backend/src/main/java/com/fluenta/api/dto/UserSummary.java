package com.fluenta.api.dto;

public record UserSummary(
        String id,
        String name,
        String email,
        String plan,
        String planLabel,
        boolean emailVerified,
        boolean onboarded
) {}
