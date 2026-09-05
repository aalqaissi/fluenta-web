package com.fluenta.api.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fluenta.api.domain.CertificateEntity;
import com.fluenta.api.domain.ExamEntity;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.repo.CertificateRepository;
import com.fluenta.api.repo.ExamRepository;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.service.Json;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.Instant;

/**
 * Populates the database from {@code classpath:seed/*.json} on first startup (when no users exist).
 * The seed files are generated from the frontend mock content by {@code scripts/export-seed.mjs}.
 */
@Component
@Order(0)
public class SeedLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedLoader.class);

    private final UserRepository users;
    private final ExamRepository exams;
    private final CertificateRepository certs;
    private final Json json;

    public SeedLoader(UserRepository users, ExamRepository exams, CertificateRepository certs, Json json) {
        this.users = users;
        this.exams = exams;
        this.certs = certs;
        this.json = json;
    }

    @Override
    public void run(String... args) {
        if (users.count() > 0) {
            log.info("Seed skipped — {} user(s) already present.", users.count());
            return;
        }
        try {
            seedUser();
            seedExams();
            seedCertificates();
            log.info("Seed complete: {} user(s), {} exam(s), {} certificate(s).",
                    users.count(), exams.count(), certs.count());
        } catch (Exception e) {
            log.error("Seeding failed", e);
        }
    }

    private JsonNode read(String name) throws Exception {
        try (InputStream in = new ClassPathResource("seed/" + name).getInputStream()) {
            return json.mapper().readTree(in);
        }
    }

    private void seedUser() throws Exception {
        JsonNode u = read("user.json");
        UserEntity e = new UserEntity();
        e.setId(u.path("id").asText());
        e.setName(u.path("name").asText());
        e.setEmail(u.path("email").asText());
        e.setInitials(u.path("initials").asText());
        e.setAvatarUrl(u.hasNonNull("avatarUrl") ? u.get("avatarUrl").asText() : null);
        e.setPlan(u.path("plan").asText("free"));
        e.setPlanLabel(u.path("planLabel").asText("Free"));
        e.setRenewsInDays(u.path("renewsInDays").asInt(0));
        e.setTargetBand(u.path("targetBand").asDouble(7));
        e.setExamDate(u.hasNonNull("examDate") ? u.get("examDate").asText() : null);
        e.setSaveHistory(u.path("saveHistory").asBoolean(true));
        e.setStreak(u.has("streak") ? json.write(u.get("streak")) : null);
        users.save(e);
    }

    private void seedExams() throws Exception {
        JsonNode arr = read("exams.json");
        for (JsonNode x : arr) {
            ExamEntity e = new ExamEntity();
            e.setId(x.path("id").asText());
            e.setSkill(x.path("skill").asText());
            e.setTitle(x.path("title").asText());
            e.setModule(x.path("module").asText("academic"));
            e.setStatus(x.path("status").asText("draft"));
            e.setScope(x.path("scope").asText("global"));
            e.setTimeLimit(x.path("timeLimit").asInt(30));
            e.setFormat(x.path("format").asText("studio"));
            e.setUpdatedAt(x.hasNonNull("updatedAt") ? x.get("updatedAt").asText() : Instant.now().toString());
            e.setContent(x.has("content") ? json.write(x.get("content")) : null);
            exams.save(e);
        }
    }

    private void seedCertificates() throws Exception {
        JsonNode arr = read("certificates.json");
        for (JsonNode c : arr) {
            CertificateEntity e = new CertificateEntity();
            e.setId(c.path("id").asText());
            e.setUserId("u1");
            e.setTitle(c.path("title").asText());
            e.setCandidate(c.path("candidate").asText());
            e.setModule(c.path("module").asText("academic"));
            e.setCentre(c.path("centre").asText("Online Practice"));
            e.setIssuedOn(c.path("issuedOn").asText());
            e.setDateOfBirth(c.path("dateOfBirth").asText(""));
            e.setSex(c.path("sex").asText(""));
            e.setCountryOfOrigin(c.path("countryOfOrigin").asText(""));
            e.setNationality(c.path("nationality").asText(""));
            e.setFirstLanguage(c.path("firstLanguage").asText(""));
            e.setSchemeCode(c.path("schemeCode").asText("Online Practice Test"));
            e.setScores(c.has("scores") ? json.write(c.get("scores")) : null);
            e.setOverall(c.path("overall").asDouble(0));
            e.setCefr(c.path("cefr").asText(""));
            e.setComments(c.path("comments").asText(""));
            e.setStatus(c.path("status").asText("issued"));
            certs.save(e);
        }
    }
}
