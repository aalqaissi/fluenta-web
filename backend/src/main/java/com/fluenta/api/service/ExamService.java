package com.fluenta.api.service;

import com.fluenta.api.domain.ExamEntity;
import com.fluenta.api.dto.ExamDto;
import com.fluenta.api.repo.ExamRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ExamService {

    private final ExamRepository exams;
    private final Mappers mappers;

    public ExamService(ExamRepository exams, Mappers mappers) {
        this.exams = exams;
        this.mappers = mappers;
    }

    static String uid() {
        // 7-char base36, matching the frontend uid()
        return Long.toString(Math.abs(java.util.concurrent.ThreadLocalRandom.current().nextLong()), 36)
                .substring(0, 7);
    }

    static String now() {
        return Instant.now().toString();
    }

    public List<ExamDto> list(String skill, String status, String scope) {
        return exams.findAll().stream()
                .filter(e -> skill == null || skill.equalsIgnoreCase(e.getSkill()))
                .filter(e -> status == null || status.equalsIgnoreCase(e.getStatus()))
                .filter(e -> scope == null || scope.equalsIgnoreCase(e.getScope()))
                .sorted(Comparator.comparing(ExamEntity::getUpdatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(mappers::toDto)
                .toList();
    }

    public ExamDto get(String id) {
        return mappers.toDto(require(id));
    }

    public ExamDto create(ExamDto dto) {
        ExamEntity e = new ExamEntity();
        mappers.apply(dto, e);
        if (e.getId() == null || e.getId().isBlank()) e.setId(uid());
        e.setUpdatedAt(now());
        return mappers.toDto(exams.save(e));
    }

    public ExamDto update(String id, ExamDto dto) {
        ExamEntity e = require(id);
        mappers.apply(dto, e);
        e.setId(id); // ignore any id change in the body
        e.setUpdatedAt(now());
        return mappers.toDto(exams.save(e));
    }

    public void delete(String id) {
        exams.deleteById(id);
    }

    public ExamDto duplicate(String id) {
        ExamEntity src = require(id);
        ExamEntity copy = new ExamEntity();
        copy.setId(uid());
        copy.setSkill(src.getSkill());
        copy.setTitle((src.getTitle() == null ? "Untitled" : src.getTitle()) + " (copy)");
        copy.setModule(src.getModule());
        copy.setStatus("draft");
        copy.setScope(src.getScope());
        copy.setTimeLimit(src.getTimeLimit());
        copy.setFormat(src.getFormat());
        copy.setContent(src.getContent());
        copy.setUpdatedAt(now());
        return mappers.toDto(exams.save(copy));
    }

    public ExamDto setStatus(String id, String status) {
        ExamEntity e = require(id);
        e.setStatus(status);
        e.setUpdatedAt(now());
        return mappers.toDto(exams.save(e));
    }

    private ExamEntity require(String id) {
        return Optional.ofNullable(id).flatMap(exams::findById)
                .orElseThrow(() -> ApiException.notFound("Exam"));
    }
}
