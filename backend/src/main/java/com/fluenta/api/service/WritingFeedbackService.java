package com.fluenta.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.domain.WritingFeedbackEntity;
import com.fluenta.api.dto.AiDtos;
import com.fluenta.api.repo.WritingFeedbackRepository;
import com.fluenta.api.service.grader.ClaudeWritingGrader;
import com.fluenta.api.service.grader.EssayTypeClassifier;
import com.fluenta.api.service.grader.StubWritingGrader;
import com.fluenta.api.service.grader.WritingGrader;
import com.fluenta.api.service.grader.WritingRubric;
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

    /** Canonical criterion order + labels (must match the web/mobile UI); "task" is labelled per variant. */
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
        AiDtos.WritingResult result = validate(grader.grade(req), req);
        return props.persist() ? persist(userId, req, result) : result;
    }

    private AiDtos.WritingResult persist(String userId, AiDtos.WritingFeedbackRequest req, AiDtos.WritingResult r) {
        String id = UUID.randomUUID().toString();
        AiDtos.WritingResult withId = new AiDtos.WritingResult(id, r.source(), r.overall(),
                r.wordCount(), r.answer(), r.criteria(), r.annotations(), r.taskType(), r.essayType(), r.coaching());
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
    AiDtos.WritingResult validate(AiDtos.WritingResult raw, AiDtos.WritingFeedbackRequest req) {
        String essay = req.essay();
        WritingRubric.Variant variant = WritingRubric.of(req.taskNumber(), req.module(), req.kind());
        Map<String, AiDtos.WritingCriterion> byKey = new LinkedHashMap<>();
        if (raw.criteria() != null) {
            for (AiDtos.WritingCriterion c : raw.criteria()) byKey.put(c.key(), c);
        }
        List<AiDtos.WritingCriterion> criteria = new ArrayList<>();
        for (String[] spec : CRITERIA) {
            AiDtos.WritingCriterion c = byKey.get(spec[0]);
            double band = c == null ? clampHalf(raw.overall()) : clampHalf(c.band());
            String summary = c == null ? "Not enough information to assess this criterion." : c.summary();
            String label = "task".equals(spec[0]) ? WritingRubric.taskLabel(variant) : spec[1];
            criteria.add(new AiDtos.WritingCriterion(spec[0], label, band, summary));
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

        // Estimated overall = the four equally weighted criteria, rounded to the nearest half band —
        // derived from the criteria, never a free-floating model number.
        double overall = clampHalf(criteria.stream().mapToDouble(AiDtos.WritingCriterion::band).average().orElse(0));

        String essayType = null;
        if (variant == WritingRubric.Variant.TASK2) {
            essayType = EssayTypeClassifier.isKnown(raw.essayType()) ? raw.essayType()
                    : EssayTypeClassifier.classify(req.prompt());
        }

        return new AiDtos.WritingResult(raw.id(), raw.source(), overall,
                StubWritingGrader.countWords(essay), essay, criteria, anns,
                variant.key(), essayType, coaching(raw.coaching(), variant, req, essayType));
    }

    private static final java.util.Set<String> STATUSES = java.util.Set.of("good", "improve", "tip");

    /** Keep only well-formed notes for this variant (≤6); fall back to the offline heuristics when none survive. */
    private static List<AiDtos.CoachingNote> coaching(List<AiDtos.CoachingNote> raw, WritingRubric.Variant variant,
                                                      AiDtos.WritingFeedbackRequest req, String essayType) {
        Map<String, String> titles = WritingRubric.coaching(variant);
        List<AiDtos.CoachingNote> out = new ArrayList<>();
        if (raw != null) {
            for (AiDtos.CoachingNote n : raw) {
                if (n == null || !titles.containsKey(n.key()) || !STATUSES.contains(n.status())) continue;
                if (n.note() == null || n.note().isBlank()) continue;
                if (out.stream().anyMatch(o -> o.key().equals(n.key()))) continue;
                out.add(new AiDtos.CoachingNote(n.key(), titles.get(n.key()), n.status(), n.note().trim()));
                if (out.size() == 6) break;
            }
        }
        return out.isEmpty() ? StubWritingGrader.coaching(variant, req, essayType) : out;
    }

    private static boolean byKeyMissing(String criterion) {
        for (String[] spec : CRITERIA) if (spec[0].equals(criterion)) return false;
        return true;
    }

    private static double clampHalf(double v) { return Math.round(Math.max(0, Math.min(9, v)) * 2) / 2.0; }
}
