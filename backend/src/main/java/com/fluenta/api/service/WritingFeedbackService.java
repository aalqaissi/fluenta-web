package com.fluenta.api.service;

import com.fluenta.api.config.AiProperties;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.service.grader.ClaudeWritingGrader;
import com.fluenta.api.service.grader.StubWritingGrader;
import com.fluenta.api.service.grader.WritingGrader;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Orchestrates writing feedback: picks a grader, runs the validation gate, (later) persists. */
@Service
public class WritingFeedbackService {

    /** Canonical criterion order + labels (must match the web/mobile UI). */
    private static final String[][] CRITERIA = {
            {"task", "Task Achievement"},
            {"coherence", "Coherence & Cohesion"},
            {"lexical", "Lexical Resource"},
            {"grammar", "Grammatical Range & Accuracy"}};

    private final AiProperties props;
    private final StubWritingGrader stub;
    private final ClaudeWritingGrader claude;

    public WritingFeedbackService(AiProperties props, StubWritingGrader stub, ClaudeWritingGrader claude) {
        this.props = props;
        this.stub = stub;
        this.claude = claude;
    }

    public AiDtos.WritingResult generate(String userId, AiDtos.WritingFeedbackRequest req) {
        String essay = req.essay();
        if (essay == null || essay.isBlank()) throw ApiException.badRequest("Essay is empty");
        if (essay.length() > props.maxEssayChars()) {
            throw ApiException.badRequest("Essay is too long (max " + props.maxEssayChars() + " characters)");
        }
        WritingGrader grader = props.live() ? claude : stub;
        return validate(grader.grade(req), essay);
    }

    /** Validation gate. Public for unit visibility; called on every result before it leaves the server. */
    AiDtos.WritingResult validate(AiDtos.WritingResult raw, String essay) {
        Map<String, AiDtos.WritingCriterion> byKey = new LinkedHashMap<>();
        if (raw.criteria() != null) {
            for (AiDtos.WritingCriterion c : raw.criteria()) byKey.put(c.key(), c);
        }
        List<AiDtos.WritingCriterion> criteria = new ArrayList<>();
        for (String[] spec : CRITERIA) {
            AiDtos.WritingCriterion c = byKey.get(spec[0]);
            double band = c == null ? clampHalf(raw.overall()) : clampHalf(c.band());
            String summary = c == null ? "Not enough information to assess this criterion." : c.summary();
            criteria.add(new AiDtos.WritingCriterion(spec[0], spec[1], band, summary));
        }

        List<AiDtos.WritingAnnotation> anns = new ArrayList<>();
        int id = 1;
        if (raw.annotations() != null) {
            for (AiDtos.WritingAnnotation a : raw.annotations()) {
                if (a.quote() == null || a.quote().isBlank() || !essay.contains(a.quote())) continue;
                if (byKeyMissing(a.criterion())) continue;
                anns.add(new AiDtos.WritingAnnotation("a" + id++, a.criterion(), a.quote(), a.note()));
            }
        }

        return new AiDtos.WritingResult(raw.id(), raw.source(), clampHalf(raw.overall()),
                StubWritingGrader.countWords(essay), essay, criteria, anns);
    }

    private static boolean byKeyMissing(String criterion) {
        for (String[] spec : CRITERIA) if (spec[0].equals(criterion)) return false;
        return true;
    }

    private static double clampHalf(double v) { return Math.round(Math.max(0, Math.min(9, v)) * 2) / 2.0; }
}
