package com.fluenta.api.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fluenta.api.dto.AttemptDtos.AttemptDto;
import com.fluenta.api.dto.AttemptDtos.AttemptRequest;
import com.fluenta.api.dto.ExamDto;
import com.fluenta.api.repo.CertificateRepository;
import com.fluenta.api.repo.ExamRepository;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.service.AttemptService;
import com.fluenta.api.service.ExamService;
import com.fluenta.api.service.Json;
import com.fluenta.api.service.ScoringService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Headless verification of the data + logic layer, gated behind the {@code verify} profile so it
 * never runs in normal operation. Boot with:
 *   mvn spring-boot:run -Dspring-boot.run.arguments="--spring.main.web-application-type=none --spring.profiles.active=verify"
 * This avoids the embedded web server (and thus the Java NIO selector self-pipe), so the core logic
 * can be validated against real SQLite even where the local environment blocks that selector.
 */
@Component
@Profile("verify")
@Order(100)
public class VerifyRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(VerifyRunner.class);

    private final UserRepository users;
    private final ExamRepository exams;
    private final CertificateRepository certs;
    private final ExamService examService;
    private final AttemptService attemptService;
    private final ScoringService scoring;
    private final Json json;

    private int passed = 0;
    private int failed = 0;

    public VerifyRunner(UserRepository users, ExamRepository exams, CertificateRepository certs,
                        ExamService examService, AttemptService attemptService, ScoringService scoring, Json json) {
        this.users = users;
        this.exams = exams;
        this.certs = certs;
        this.examService = examService;
        this.attemptService = attemptService;
        this.scoring = scoring;
        this.json = json;
    }

    private void check(String name, boolean ok) {
        if (ok) { passed++; log.info("PASS  {}", name); }
        else { failed++; log.error("FAIL  {}", name); }
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("===== Fluenta backend verification =====");

        // 1) Seeding
        check("seed users == 1", users.count() == 1);
        check("seed exams == 7", exams.count() == 7);
        check("seed certificates == 2", certs.count() == 2);

        // 2) Scoring — synthetic reading exam (raw->band, absolute table)
        JsonNode reading = json.mapper().readTree("""
            {"passages":[{"id":"p","groups":[{"questions":[
              {"id":"a","correct":"True"},{"id":"b","correct":"False"},
              {"id":"c","correct":"Not Given"},{"id":"d","correct":"cat"}]}]}]}
            """);
        ScoringService.Score allRight = scoring.score("reading", reading,
                Map.of("a", "true", "b", "FALSE", "c", "not given", "d", "cat"));
        check("reading all-correct -> 4/4", allRight.correct() == 4 && allRight.total() == 4);
        ScoringService.Score halfR = scoring.score("reading", reading,
                Map.of("a", "true", "b", "wrong", "c", "", "d", "cat"));
        check("reading 2/4 (blank + wrong ignored)", halfR.correct() == 2 && halfR.total() == 4);

        // 3) Scoring — synthetic listening exam (accuracy -> band)
        JsonNode listening = json.mapper().readTree("""
            {"sections":[{"id":"s","group":{"questions":[
              {"id":"q1","correct":"Tuesday"},{"id":"q2","correct":"40"},
              {"id":"q3","correct":"library"},{"id":"q4","correct":"9am"}]}}]}
            """);
        ScoringService.Score lAll = scoring.score("listening", listening,
                Map.of("q1", "tuesday", "q2", "40", "q3", "library", "q4", "9am"));
        check("listening 4/4 -> band 9.0", lAll.correct() == 4 && lAll.band() == 9.0);
        ScoringService.Score lNone = scoring.score("listening", listening,
                Map.of("q1", "x", "q2", "x", "q3", "x", "q4", "x"));
        check("listening 0/4 -> band 3.5", lNone.correct() == 0 && lNone.band() == 3.5);

        // 4) Real submit through AttemptService against the seeded reading exam
        ExamDto readLang = examService.get("read-languages");
        Map<String, String> key = scoring.answerKey(readLang.content());
        AttemptDto perfect = attemptService.submit("u1",
                new AttemptRequest("read-languages", "reading",
                        json.mapper().valueToTree(key), 600));
        check("submit(read-languages) total matches key size",
                perfect.total() == key.size() && perfect.correct() == key.size());
        log.info("      read-languages: {} questions, perfect band = {}", key.size(), perfect.band());

        // 5) Exam CRUD round-trip (studio format)
        JsonNode content = json.mapper().readTree(
                "{\"passages\":[{\"id\":\"vp1\",\"title\":\"V\",\"questionType\":\"short-answer\",\"questions\":[{\"id\":\"vq1\",\"prompt\":\"?\",\"answer\":\"x\"}]}]}");
        ExamDto created = examService.create(new ExamDto(null, "reading", "Verify Exam", "academic",
                "draft", "user", 30, null, "studio", content));
        check("create assigns id", created.id() != null && !created.id().isBlank());
        ExamDto published = examService.setStatus(created.id(), "published");
        check("setStatus -> published", "published".equals(published.status()));
        ExamDto dup = examService.duplicate(created.id());
        check("duplicate makes a new draft", !dup.id().equals(created.id()) && "draft".equals(dup.status())
                && dup.title().endsWith("(copy)"));
        List<ExamDto> readingList = examService.list("reading", null, null);
        check("list(reading) includes created + duplicate", readingList.stream().anyMatch(e -> e.id().equals(created.id()))
                && readingList.stream().anyMatch(e -> e.id().equals(dup.id())));
        examService.delete(created.id());
        examService.delete(dup.id());
        check("delete removes exams", exams.findById(created.id()).isEmpty() && exams.findById(dup.id()).isEmpty());

        log.info("===== Verification: {} passed, {} failed =====", passed, failed);
        if (failed > 0) throw new IllegalStateException("Verification failed: " + failed + " check(s)");
    }
}
