package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fluenta.api.domain.AttemptEntity;
import com.fluenta.api.domain.ExamEntity;
import com.fluenta.api.dto.AttemptDtos.AttemptDto;
import com.fluenta.api.dto.AttemptDtos.AttemptRequest;
import com.fluenta.api.repo.AttemptRepository;
import com.fluenta.api.repo.ExamRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AttemptService {

    private final AttemptRepository attempts;
    private final ExamRepository exams;
    private final ScoringService scoring;
    private final Mappers mappers;
    private final Json json;

    public AttemptService(AttemptRepository attempts, ExamRepository exams, ScoringService scoring,
                          Mappers mappers, Json json) {
        this.attempts = attempts;
        this.exams = exams;
        this.scoring = scoring;
        this.mappers = mappers;
        this.json = json;
    }

    public AttemptDto submit(String userId, AttemptRequest req) {
        ExamEntity exam = exams.findById(req.examId())
                .orElseThrow(() -> ApiException.notFound("Exam"));
        JsonNode content = json.parse(exam.getContent());
        Map<String, String> answers = toStringMap(req.answers());
        String skill = req.skill() != null ? req.skill() : exam.getSkill();

        ScoringService.Score score = scoring.score(skill, content, answers);

        AttemptEntity a = new AttemptEntity();
        a.setId(ExamService.uid());
        a.setUserId(userId);
        a.setExamId(exam.getId());
        a.setExamTitle(exam.getTitle());
        a.setSkill(skill);
        a.setAnswers(json.write(req.answers()));
        a.setCorrect(score.correct());
        a.setTotal(score.total());
        a.setBand(score.band());
        a.setDurationUsedSec(req.durationUsedSec());
        a.setCreatedAt(Instant.now().toString());
        return mappers.toDto(attempts.save(a));
    }

    public AttemptDto get(String userId, String id) {
        AttemptEntity a = attempts.findById(id).orElseThrow(() -> ApiException.notFound("Attempt"));
        if (!a.getUserId().equals(userId)) throw ApiException.notFound("Attempt");
        return mappers.toDto(a);
    }

    public AttemptDto latestForExam(String userId, String examId) {
        return attempts.findByUserIdAndExamIdOrderByCreatedAtDesc(userId, examId).stream()
                .findFirst().map(mappers::toDto)
                .orElseThrow(() -> ApiException.notFound("Attempt"));
    }

    public List<AttemptDto> list(String userId) {
        return attempts.findByUserIdOrderByCreatedAtDesc(userId).stream().map(mappers::toDto).toList();
    }

    private Map<String, String> toStringMap(JsonNode node) {
        Map<String, String> out = new LinkedHashMap<>();
        if (node != null && node.isObject()) {
            node.fields().forEachRemaining(e -> out.put(e.getKey(), e.getValue().asText("")));
        }
        return out;
    }
}
