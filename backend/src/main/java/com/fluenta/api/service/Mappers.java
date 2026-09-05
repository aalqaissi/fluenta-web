package com.fluenta.api.service;

import com.fluenta.api.domain.AttemptEntity;
import com.fluenta.api.domain.CertificateEntity;
import com.fluenta.api.domain.ExamEntity;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.AttemptDtos.AttemptDto;
import com.fluenta.api.dto.CertificateDto;
import com.fluenta.api.dto.ExamDto;
import com.fluenta.api.dto.UserDto;
import org.springframework.stereotype.Component;

/** Entity ↔ DTO conversions (JSON columns parsed to nodes on the way out). */
@Component
public class Mappers {

    private final Json json;

    public Mappers(Json json) {
        this.json = json;
    }

    public UserDto toDto(UserEntity u) {
        return new UserDto(
                u.getId(), u.getName(), u.getEmail(), u.getInitials(), u.getAvatarUrl(),
                u.getPlan(), u.getPlanLabel(), u.getRenewsInDays(), u.getTargetBand(),
                u.getExamDate(), u.isSaveHistory(), u.getTrack(), u.getExamType(), u.getPurpose(),
                u.getLevel(), u.isOnboarded(), json.parse(u.getStreak()));
    }

    public ExamDto toDto(ExamEntity e) {
        return new ExamDto(
                e.getId(), e.getSkill(), e.getTitle(), e.getModule(), e.getStatus(),
                e.getScope(), e.getTimeLimit(), e.getUpdatedAt(), e.getFormat(),
                json.parse(e.getContent()));
    }

    public void apply(ExamDto dto, ExamEntity e) {
        e.setId(dto.id());
        e.setSkill(dto.skill());
        e.setTitle(dto.title());
        e.setModule(dto.module());
        e.setStatus(dto.status());
        e.setScope(dto.scope() == null ? "user" : dto.scope());
        e.setTimeLimit(dto.timeLimit());
        e.setUpdatedAt(dto.updatedAt());
        e.setFormat(dto.format() == null ? "studio" : dto.format());
        e.setContent(json.write(dto.content()));
    }

    public AttemptDto toDto(AttemptEntity a) {
        return new AttemptDto(
                a.getId(), a.getExamId(), a.getExamTitle(), a.getSkill(),
                json.parse(a.getAnswers()), a.getCorrect(), a.getTotal(), a.getBand(),
                a.getDurationUsedSec(), a.getCreatedAt());
    }

    public CertificateDto toDto(CertificateEntity c) {
        return new CertificateDto(
                c.getId(), c.getTitle(), c.getCandidate(), c.getType(), c.getVerificationNumber(),
                c.getModule(), c.getCentre(), c.getIssuedOn(), c.getDateOfBirth(), c.getSex(),
                c.getCountryOfOrigin(), c.getNationality(), c.getFirstLanguage(), c.getSchemeCode(),
                json.parse(c.getScores()), c.getOverall(), c.getCefr(), c.getComments(), c.getStatus());
    }

    public void apply(CertificateDto dto, CertificateEntity c) {
        c.setId(dto.id());
        c.setTitle(dto.title());
        c.setCandidate(dto.candidate());
        c.setType(dto.type() == null ? "standard" : dto.type());
        c.setVerificationNumber(dto.verificationNumber());
        c.setModule(dto.module());
        c.setCentre(dto.centre());
        c.setIssuedOn(dto.issuedOn());
        c.setDateOfBirth(dto.dateOfBirth());
        c.setSex(dto.sex());
        c.setCountryOfOrigin(dto.countryOfOrigin());
        c.setNationality(dto.nationality());
        c.setFirstLanguage(dto.firstLanguage());
        c.setSchemeCode(dto.schemeCode());
        c.setScores(json.write(dto.scores()));
        c.setOverall(dto.overall());
        c.setCefr(dto.cefr());
        c.setComments(dto.comments());
        c.setStatus(dto.status());
    }
}
