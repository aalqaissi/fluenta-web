package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fluenta.api.domain.AttemptEntity;
import com.fluenta.api.domain.SpeakingFeedbackEntity;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.domain.WritingFeedbackEntity;
import com.fluenta.api.dto.OverviewDto;
import com.fluenta.api.dto.OverviewDto.SkillPoint;
import com.fluenta.api.dto.OverviewDto.SkillStat;
import com.fluenta.api.repo.AttemptRepository;
import com.fluenta.api.repo.SpeakingFeedbackRepository;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.repo.WritingFeedbackRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Builds the dashboard overview from the user's own results — graded reading/listening attempts and
 * writing/speaking AI feedback. Per skill: tests taken and a current band (mean of the latest
 * {@link #CURRENT_WINDOW} results, rounded to the nearest half band); plus the current average, gap
 * to the user's target, strongest/weakest skill, a progress-over-time series and recent activity.
 * Aggregates are computed server-side so the FE just renders.
 */
@Service
public class OverviewService {

    // insertion-ordered: this is the order the dashboard lists skills in
    private static final Map<String, String> LABELS = new LinkedHashMap<>();
    static {
        LABELS.put("listening", "Listening");
        LABELS.put("reading", "Reading");
        LABELS.put("writing", "Writing");
        LABELS.put("speaking", "Speaking");
        LABELS.put("vocabulary", "Vocabulary");
        LABELS.put("grammar", "Grammar");
    }

    private static final int CURRENT_WINDOW = 3;
    private static final int RECENT_LIMIT = 5;

    /** One scored result, whatever table it came from. */
    private record Result(String id, String type, String skill, String title, String createdAt, Double band) {
        String date() { return createdAt.length() >= 10 ? createdAt.substring(0, 10) : createdAt; }
    }

    private final UserRepository users;
    private final AttemptRepository attempts;
    private final WritingFeedbackRepository writing;
    private final SpeakingFeedbackRepository speaking;
    private final ObjectMapper om;

    public OverviewService(UserRepository users, AttemptRepository attempts,
                           WritingFeedbackRepository writing, SpeakingFeedbackRepository speaking,
                           ObjectMapper om) {
        this.users = users;
        this.attempts = attempts;
        this.writing = writing;
        this.speaking = speaking;
        this.om = om;
    }

    public OverviewDto build(String userId) {
        UserEntity user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        List<Result> results = results(userId); // oldest first

        Map<String, List<Double>> bandsBySkill = new LinkedHashMap<>();
        Map<String, Integer> testsBySkill = new LinkedHashMap<>();
        for (Result r : results) {
            testsBySkill.merge(r.skill(), 1, Integer::sum);
            if (r.band() != null) bandsBySkill.computeIfAbsent(r.skill(), k -> new ArrayList<>()).add(r.band());
        }

        List<SkillStat> skills = new ArrayList<>();
        LABELS.forEach((key, label) -> skills.add(new SkillStat(key, label,
                currentBand(bandsBySkill.get(key)), testsBySkill.getOrDefault(key, 0))));

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

        return new OverviewDto(target, avg, gap, results.size(), skills, strongest, weakest,
                series(results), recentActivity(results));
    }

    /** All of the user's scored results, merged across tables, oldest first. */
    private List<Result> results(String userId) {
        List<Result> out = new ArrayList<>();
        for (AttemptEntity a : attempts.findByUserIdOrderByCreatedAtDesc(userId)) {
            String label = LABELS.getOrDefault(a.getSkill(), a.getSkill());
            out.add(new Result(a.getId(), "completed", a.getSkill(),
                    "Completed " + (a.getExamTitle() != null ? a.getExamTitle() : label + " Practice"),
                    nz(a.getCreatedAt()), a.getBand()));
        }
        for (WritingFeedbackEntity w : writing.findByUserIdOrderByCreatedAtDesc(userId)) {
            String task = w.getTaskNumber() != null ? "Writing Task " + w.getTaskNumber() : "Writing Task";
            out.add(new Result(w.getId(), "feedback", "writing", "Received " + task + " Feedback",
                    nz(w.getCreatedAt()), overallBand(w.getResultJson())));
        }
        for (SpeakingFeedbackEntity sp : speaking.findByUserIdOrderByCreatedAtDesc(userId)) {
            out.add(new Result(sp.getId(), "feedback", "speaking", "Received Speaking Feedback",
                    nz(sp.getCreatedAt()), overallBand(sp.getResultJson())));
        }
        out.sort(Comparator.comparing(Result::createdAt));
        return out;
    }

    /**
     * Per-skill series: one point per day (that day's mean, half-band rounded). Overall: one point per
     * day on which anything was scored — the mean of every skill's current band as of that day.
     */
    private ObjectNode series(List<Result> results) {
        Map<String, TreeMap<String, List<Double>>> byDay = new LinkedHashMap<>();
        LABELS.keySet().forEach(k -> byDay.put(k, new TreeMap<>()));
        for (Result r : results) {
            if (r.band() == null) continue;
            byDay.computeIfAbsent(r.skill(), k -> new TreeMap<>())
                    .computeIfAbsent(r.date(), d -> new ArrayList<>()).add(r.band());
        }

        ObjectNode out = om.createObjectNode();
        byDay.forEach((skill, days) -> {
            ArrayNode pts = out.putArray(skill);
            days.forEach((date, bands) -> pts.add(point(date, halfBand(mean(bands)))));
        });

        ArrayNode overall = out.putArray("overall");
        Map<String, List<Double>> soFar = new LinkedHashMap<>();
        TreeMap<String, List<Result>> resultsByDay = new TreeMap<>();
        results.stream().filter(r -> r.band() != null)
                .forEach(r -> resultsByDay.computeIfAbsent(r.date(), d -> new ArrayList<>()).add(r));
        resultsByDay.forEach((date, dayResults) -> {
            dayResults.forEach(r -> soFar.computeIfAbsent(r.skill(), k -> new ArrayList<>()).add(r.band()));
            List<Double> current = soFar.values().stream().map(OverviewService::currentBand).toList();
            overall.add(point(date, halfBand(mean(current))));
        });
        return out;
    }

    /** Newest-first activity feed, capped at {@link #RECENT_LIMIT}. */
    private ArrayNode recentActivity(List<Result> results) {
        ArrayNode out = om.createArrayNode();
        for (int i = results.size() - 1; i >= 0 && out.size() < RECENT_LIMIT; i--) {
            Result r = results.get(i);
            ObjectNode n = out.addObject();
            n.put("id", r.id()).put("type", r.type()).put("skill", r.skill()).put("title", r.title());
            n.put("date", r.date()); // FE expects YYYY-MM-DD
            if (r.band() != null) n.put("band", r.band());
        }
        return out;
    }

    private ObjectNode point(String date, double band) {
        ObjectNode p = om.createObjectNode();
        p.put("date", date).put("band", band);
        return p;
    }

    /** Current band = mean of the latest {@link #CURRENT_WINDOW} results (oldest-first list). */
    private static Double currentBand(List<Double> bands) {
        if (bands == null || bands.isEmpty()) return null;
        return halfBand(mean(bands.subList(Math.max(0, bands.size() - CURRENT_WINDOW), bands.size())));
    }

    private static double mean(List<Double> xs) {
        return xs.stream().mapToDouble(Double::doubleValue).average().orElse(0);
    }

    /** IELTS bands are reported to the nearest half. */
    private static double halfBand(double x) {
        return Math.round(x * 2) / 2.0;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private Double overallBand(String resultJson) {
        if (resultJson == null) return null;
        try {
            JsonNode overall = om.readTree(resultJson).path("overall");
            return overall.isNumber() ? overall.asDouble() : null;
        } catch (Exception e) {
            return null;
        }
    }

    // keep an ordered label lookup available if needed elsewhere
    static Map<String, String> labels() {
        return new LinkedHashMap<>(LABELS);
    }
}
