package com.fluenta.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.domain.WritingFeedbackEntity;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.repo.WritingFeedbackRepository;
import com.fluenta.api.service.grader.ClaudeWritingGrader;
import com.fluenta.api.service.grader.StubWritingGrader;
import com.fluenta.api.service.grader.WritingGrader;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Orchestrates writing feedback: picks a grader, runs the validation gate, (later) persists. */
@Service
public class WritingFeedbackService {

    private static final Logger log = LoggerFactory.getLogger(WritingFeedbackService.class);

    /** Canonical criterion order + labels (must match the web/mobile UI). */
    private static final String[][] CRITERIA = {
            {"task", "Task Achievement"},
            {"coherence", "Coherence & Cohesion"},
            {"lexical", "Lexical Resource"},
            {"grammar", "Grammatical Range & Accuracy"}};

    private final AiProperties props;
    private final StubWritingGrader stub;
    private final ClaudeWritingGrader claude;
    private final WritingFeedbackRepository repo;
    private final ObjectMapper om;

    public WritingFeedbackService(AiProperties props, StubWritingGrader stub, ClaudeWritingGrader claude,
                                  WritingFeedbackRepository repo, ObjectMapper om) {
        this.props = props;
        this.stub = stub;
        this.claude = claude;
        this.repo = repo;
        this.om = om;
    }

    public AiDtos.WritingResult generate(String userId, AiDtos.WritingFeedbackRequest req) {
        String essay = req.essay();
        if (essay == null || essay.isBlank()) throw ApiException.badRequest("Essay is empty");
        if (essay.length() > props.maxEssayChars()) {
            throw ApiException.badRequest("Essay is too long (max " + props.maxEssayChars() + " characters)");
        }
        WritingGrader grader = props.live() ? claude : stub;
        AiDtos.WritingResult result = validate(grader.grade(req), essay);
        return props.persist() ? persist(userId, req, result) : result;
    }

    private AiDtos.WritingResult persist(String userId, AiDtos.WritingFeedbackRequest req, AiDtos.WritingResult r) {
        String id = UUID.randomUUID().toString();
        AiDtos.WritingResult withId = new AiDtos.WritingResult(id, r.source(), r.overall(),
                r.wordCount(), r.answer(), r.criteria(), r.annotations());
        try {
            WritingFeedbackEntity e = new WritingFeedbackEntity();
            e.setId(id);
            e.setUserId(userId);
            e.setTaskId(req.taskId());
            e.setTaskNumber(req.taskNumber());
            e.setEssay(req.essay());
            e.setResultJson(om.writeValueAsString(withId));
            e.setModel(props.live() ? props.effectiveModel() : "offline");
            e.setSource(r.source());
            e.setCreatedAt(Instant.now().toString());
            repo.save(e);
        } catch (Exception ex) {
            // persistence must never block returning feedback — but a non-null id must be retrievable,
            // so fall back to the original (id == null) result rather than claiming a save that failed.
            log.warn("Failed to persist writing feedback id={}: {}: {}", id, ex.getClass().getName(), ex.getMessage());
            return r;
        }
        return withId;
    }

    public AiDtos.WritingResult get(String userId, String id) {
        WritingFeedbackEntity e = repo.findById(id).orElseThrow(() -> ApiException.notFound("Feedback"));
        if (!userId.equals(e.getUserId())) throw new ApiException(HttpStatus.FORBIDDEN, "Not your feedback");
        try {
            return om.readValue(e.getResultJson(), AiDtos.WritingResult.class);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read stored feedback");
        }
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
