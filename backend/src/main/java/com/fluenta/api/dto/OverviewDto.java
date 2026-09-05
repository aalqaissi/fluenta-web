package com.fluenta.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/** The dashboard overview payload (progress + strengths/weaknesses + activity in one call). */
public record OverviewDto(
        double targetBand,
        double currentAverage,
        double gapToTarget,
        int testsCompleted,
        List<SkillStat> skills,
        SkillPoint strongest,
        SkillPoint weakest,
        JsonNode series,          // { overall:[{date,band}], listening:[...], ... }
        JsonNode recentActivity   // [{ id, type, skill, title, date, band? }]
) {
    public record SkillStat(String key, String label, Double band, int tests) {}
    public record SkillPoint(String key, String label, double band) {}
}
