package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Mirrors the frontend {@code CertRecord}. */
public record CertificateDto(
        String id,
        String title,
        String candidate,
        String module,
        String centre,
        String issuedOn,
        String dateOfBirth,
        String sex,
        String countryOfOrigin,
        String nationality,
        String firstLanguage,
        String schemeCode,
        JsonNode scores,
        double overall,
        String cefr,
        String comments,
        String status
) {}
