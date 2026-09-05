package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** Mirrors the frontend certificate record. */
public record CertificateDto(
        String id,
        String title,
        String candidate,
        String type,               // "standard" | "ielts-report"
        String verificationNumber, // EIELTS-YYYY-NNNNNN
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
