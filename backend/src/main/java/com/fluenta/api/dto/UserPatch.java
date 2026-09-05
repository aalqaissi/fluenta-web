package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Partial user update — every field is nullable; only non-null fields are applied.
 * (Boxed types so "absent" is distinguishable from a real value.)
 */
public record UserPatch(
        String name,
        String plan,
        String planLabel,
        Integer renewsInDays,
        Double targetBand,
        String examDate,       // note: null cannot clear examDate via this patch; use "" or a dedicated flag
        Boolean saveHistory,
        JsonNode streak
) {}
