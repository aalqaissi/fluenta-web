package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.OverviewDto;
import com.fluenta.api.dto.OverviewDto.SkillPoint;
import com.fluenta.api.dto.OverviewDto.SkillStat;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the dashboard overview: per-skill bands (seeded), plus derived stats — current average,
 * gap to the user's target, strongest/weakest skill — and the progress-over-time series + recent
 * activity (seeded). Aggregates are computed server-side so the FE just renders.
 */
@Service
public class OverviewService {

    private static final Map<String, String> LABELS = Map.of(
            "listening", "Listening", "reading", "Reading", "writing", "Writing",
            "speaking", "Speaking", "vocabulary", "Vocabulary", "grammar", "Grammar");

    private final ContentService content;
    private final UserRepository users;

    public OverviewService(ContentService content, UserRepository users) {
        this.content = content;
        this.users = users;
    }

    public OverviewDto build(String userId) {
        UserEntity user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        JsonNode data = content.read("overview");

        List<SkillStat> skills = new ArrayList<>();
        for (JsonNode s : data.path("skills")) {
            String key = s.path("key").asText();
            Double band = s.hasNonNull("band") ? s.get("band").asDouble() : null;
            int tests = s.path("tests").asInt(0);
            skills.add(new SkillStat(key, LABELS.getOrDefault(key, key), band, tests));
        }

        // aggregates over skills that have a band
        List<SkillStat> scored = skills.stream().filter(s -> s.band() != null).toList();
        double avg = scored.isEmpty() ? 0
                : Math.round(scored.stream().mapToDouble(SkillStat::band).average().orElse(0) * 10) / 10.0;
        double target = user.getTargetBand();
        double gap = Math.max(0, Math.round((target - avg) * 10) / 10.0);

        SkillPoint strongest = scored.stream().max((a, b) -> Double.compare(a.band(), b.band()))
                .map(s -> new SkillPoint(s.key(), s.label(), s.band())).orElse(null);
        SkillPoint weakest = scored.stream().min((a, b) -> Double.compare(a.band(), b.band()))
                .map(s -> new SkillPoint(s.key(), s.label(), s.band())).orElse(null);

        int testsCompleted = data.hasNonNull("testsCompleted")
                ? data.get("testsCompleted").asInt()
                : skills.stream().mapToInt(SkillStat::tests).sum();

        return new OverviewDto(target, avg, gap, testsCompleted, skills, strongest, weakest,
                data.get("series"), data.get("recentActivity"));
    }

    // keep an ordered label lookup available if needed elsewhere
    static Map<String, String> labels() {
        return new LinkedHashMap<>(LABELS);
    }
}
