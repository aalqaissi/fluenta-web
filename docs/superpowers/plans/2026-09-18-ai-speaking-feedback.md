# AI Speaking Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship student-facing IELTS Speaking feedback — real audio capture (web + mobile) → server-side STT → Claude grading behind a normalization gate → `overall + 4 criteria`, with an offline stub (never 501) and audio stored gated by the persist flag.

**Architecture:** Both clients record each of the 3 parts, upload each clip via the existing `POST /api/media`, then POST `{examId, parts:[{number,prompt,audioUrl}]}` to `POST /api/ai/speaking-feedback`. The backend resolves each `audioUrl` to its file, transcribes it via a `Transcriber` seam (live: OpenAI Whisper; offline: `StubTranscriber`), grades the combined transcript with `AiClient.complete`, runs a normalization gate, and persists when `fluenta.ai.persist` is on.

**Tech Stack:** Java 21 / Spring Boot 3.3.5 / Maven / JUnit + MockMvc + Mockito · Anthropic Java SDK (grading) · OpenAI Whisper REST (STT, via `java.net.http`) · React + TypeScript + Vite · Flutter (Dart) + `record` + `permission_handler`.

Spec: [`docs/superpowers/specs/2026-09-18-ai-speaking-feedback-design.md`](../specs/2026-09-18-ai-speaking-feedback-design.md). Builds on the Foundation (`AiClient`, `AiProperties`, `AnthropicAiClient`, `AiDtos`, `AiController`) and the §2a Writing pattern (`WritingFeedbackService`, `WritingFeedbackEntity`, offline stub + validation gate) and the §2c media reuse.

## Global Constraints

- **Student-facing** (not admin). The endpoint calls `CurrentUser.require()` → **401** when unauthenticated. Any authenticated user (student or admin) → **200**.
- **Model** from `AiProperties` (`props.model()`, default `claude-sonnet-5`); never hardcode a model id. STT model from `TranscribeProperties` (`whisper-1`).
- **Offline** = `!transcribe.live() || !props.live()` → deterministic `StubTranscriber` + `StubSpeakingGrader`. **NEVER 501** for `/speaking-feedback`.
- **Output** normalizes to `SpeakingResult { id, source, overall, criteria[4], parts[] }`. The 4 criteria are exactly, in order, with these keys+labels: `fluency`→"Fluency & Coherence", `lexical`→"Lexical Resource", `grammar`→"Grammatical Range & Accuracy", `pronunciation`→"Pronunciation". Every band is a number clamped to `[0,9]` and snapped to the nearest `0.5`. `overall` = the model's value (if valid) else the mean of the 4 criterion bands, snapped.
- **Caps:** total base64/binary audio bytes ≤ `transcribe.maxAudioBytes()` (default `25_000_000`); `parts` size 1–3.
- **Config** lives on a **sibling** `@ConfigurationProperties("fluenta.ai.transcribe")` record `TranscribeProperties` — NOT new components on the `AiProperties` canonical constructor (that would re-ripple the positional `new AiProperties(...)` test call sites; a known §2c cost).
- **Media store** must accept the recorded MIME types: extend `MediaStorageService` to allow `audio/webm` (→ `.webm`) and `audio/wav` (→ `.wav`). `audio/mp4`/`audio/x-m4a`/`audio/aac` are already allowed.
- **Pronunciation** is graded but **estimated from the transcript** — the grading prompt instructs the model to say so in the pronunciation note. No acoustic measurement.
- **Audio retention gated by `props.persist()`:** on → save a `SpeakingFeedbackEntity` (transcripts + result JSON) and keep the clips; off → delete the part clips after grading and persist nothing (return a transient id).
- **Backend can't bind a socket here:** run tests with `mvn -q test -DforkCount=0`. If `AdminUsersContractTest` flakes, delete `backend/data/fluenta.db*` and re-run. The **live STT + live grade + real audio path can't run here** — verify via mocked `Transcriber` + mocked `AiClient` + the gate.
- **Repos/branches:** backend + web on `fluenta-web` branch `feat/ai-speaking-feedback` (already created; spec committed). Mobile on `fluenta-mobile` (`D:\personal\fluenta-mobile`) — create branch `feat/ai-speaking-feedback` there for Part C.
- **Commit trailer:** end every commit body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Prefixes: `feat(backend)`, `feat(web)`, `feat(mobile)`, `test(...)`, `docs:`.

---

# Part A — Backend (`D:\personal\fluenta-web\backend`, branch `feat/ai-speaking-feedback`)

Gate = `mvn -q test -DforkCount=0` (in-process MockMvc).

### Task SP1: Speaking DTOs + `TranscribeProperties` + `Transcriber` seam + media store webm

**Files:**
- Modify: `backend/src/main/java/com/fluenta/api/dto/AiDtos.java`
- Create: `backend/src/main/java/com/fluenta/api/config/TranscribeProperties.java`
- Create: `backend/src/main/java/com/fluenta/api/service/Transcriber.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/MediaStorageService.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: the app's `@ConfigurationPropertiesScan`/`@EnableConfigurationProperties` registration (see Step 3)
- Test: `backend/src/test/java/com/fluenta/api/MediaStorageServiceWebmTest.java`

**Interfaces:**
- Produces: `AiDtos.SpeakingPartInput(Integer number, String prompt, String audioUrl)`, `SpeakingFeedbackRequest(String examId, List<SpeakingPartInput> parts)`, `SpeakingCriterionDto(String key, String label, double band, String note)`, `SpeakingPartResult(Integer number, String transcript, String note)`, `SpeakingResult(String id, String source, double overall, List<SpeakingCriterionDto> criteria, List<SpeakingPartResult> parts)`. `TranscribeProperties` with `enabled()`, `apiKey()`, `baseUrl()`, `model()`, `maxAudioBytes()`, `maxAudioSeconds()`, `live()`. `Transcriber { String transcribe(byte[] audio, String mediaType); }`. `MediaStorageService.readAudio(String url) -> byte[]`, `MediaStorageService.deleteQuietly(String url)`, and `audio/webm`/`audio/wav` acceptance.

- [ ] **Step 1: Add speaking records to `AiDtos.java`** (inside the class, after the coach records):

```java
    public record SpeakingPartInput(Integer number, String prompt, String audioUrl) {}
    public record SpeakingFeedbackRequest(String examId, List<SpeakingPartInput> parts) {}
    public record SpeakingCriterionDto(String key, String label, double band, String note) {}
    public record SpeakingPartResult(Integer number, String transcript, String note) {}
    public record SpeakingResult(String id, String source, double overall,
                                 List<SpeakingCriterionDto> criteria, List<SpeakingPartResult> parts) {}
```

- [ ] **Step 2: Create `TranscribeProperties.java`:**

```java
package com.fluenta.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Binds {@code fluenta.ai.transcribe.*}. Live STT requires enabled AND a non-blank API key. */
@ConfigurationProperties("fluenta.ai.transcribe")
public record TranscribeProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("") String apiKey,
        @DefaultValue("https://api.openai.com/v1/audio/transcriptions") String baseUrl,
        @DefaultValue("whisper-1") String model,
        @DefaultValue("25000000") long maxAudioBytes,
        @DefaultValue("240") int maxAudioSeconds) {

    /** True when a live STT call should be attempted; false → offline stub transcript. */
    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /** Never expose the raw API key. */
    @Override
    public String toString() {
        return "TranscribeProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", baseUrl=" + baseUrl + ", model=" + model
                + ", maxAudioBytes=" + maxAudioBytes + ", maxAudioSeconds=" + maxAudioSeconds + "]";
    }
}
```

- [ ] **Step 3: Register `TranscribeProperties`.** Find how `AiProperties` is registered. Run `grep -rn "AiProperties.class\|@ConfigurationPropertiesScan\|@EnableConfigurationProperties" backend/src/main/java`. If there is an `@EnableConfigurationProperties({AiProperties.class, ...})`, add `TranscribeProperties.class` to that list. If the app uses `@ConfigurationPropertiesScan` (package scan), no change is needed. Confirm at Step 8 (the service will fail to autowire it otherwise).

- [ ] **Step 4: Create `Transcriber.java`:**

```java
package com.fluenta.api.service;

/** Minimal seam over a speech-to-text provider. Keeps the STT SDK/HTTP out of feature code. */
public interface Transcriber {
    /** Audio bytes + IANA media type (e.g. "audio/webm", "audio/mp4") -> plain transcript text. */
    String transcribe(byte[] audio, String mediaType);
}
```

- [ ] **Step 5: Extend `MediaStorageService.java`** — accept `audio/webm`/`audio/wav`, and add `readAudio`/`deleteQuietly`. First read the file to find the content-type→extension map and the storage root field. Add `audio/webm`→`webm` and `audio/wav`→`wav` to the accepted map (and the filename-extension fallback: `.webm`→webm, `.wav`→wav). Then add these methods (adapt field names to the file — `root`/`mediaDir` is the base `Path`; the served prefix is `/media/`):

```java
    /** Resolve a stored "/media/<name>" URL to bytes on disk. Rejects path escapes. */
    public byte[] readAudio(String url) {
        java.nio.file.Path p = resolve(url);
        try {
            return java.nio.file.Files.readAllBytes(p);
        } catch (java.io.IOException e) {
            throw com.fluenta.api.web.ApiException.badRequest("Audio file not found");
        }
    }

    /** Best-effort delete of a stored "/media/<name>" file. Never throws. */
    public void deleteQuietly(String url) {
        try { java.nio.file.Files.deleteIfExists(resolve(url)); } catch (Exception ignored) {}
    }

    /** Map a "/media/<name>" URL to its on-disk path under the media root; reject traversal. */
    private java.nio.file.Path resolve(String url) {
        String name = url == null ? "" : url.replaceFirst("^/?media/", "");
        java.nio.file.Path base = this.root.toAbsolutePath().normalize();      // adapt to the actual root field
        java.nio.file.Path p = base.resolve(name).normalize();
        if (!p.startsWith(base)) throw com.fluenta.api.web.ApiException.badRequest("Invalid media path");
        return p;
    }
```
> If the media root field is not named `root`, use the real field. If a `resolve`/`pathFor` helper already exists, reuse it instead of adding a duplicate.

- [ ] **Step 6: Add config to `application.yml`** — under `fluenta.ai`, add a `transcribe` block (match the existing 2-space indentation; place after `persist`):

```yaml
    transcribe:
      enabled: ${FLUENTA_TRANSCRIBE_ENABLED:true}
      api-key: ${OPENAI_API_KEY:}
      base-url: ${FLUENTA_TRANSCRIBE_URL:https://api.openai.com/v1/audio/transcriptions}
      model: ${FLUENTA_TRANSCRIBE_MODEL:whisper-1}
      max-audio-bytes: ${FLUENTA_TRANSCRIBE_MAX_BYTES:25000000}
      max-audio-seconds: ${FLUENTA_TRANSCRIBE_MAX_SECONDS:240}
```

- [ ] **Step 7: Write the media-store test `MediaStorageServiceWebmTest.java`:**

```java
package com.fluenta.api;

import com.fluenta.api.service.MediaStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.*;

class MediaStorageServiceWebmTest {

    // Construct the service the same way the app does. If it needs a base dir/props,
    // pass a temp dir (see MediaContractTest for the existing construction pattern).
    private final MediaStorageService storage = MediaStorageServiceTestSupport.newInTempDir();

    @Test
    void acceptsWebmAudio() {
        var file = new MockMultipartFile("file", "clip.webm", "audio/webm", new byte[]{1, 2, 3});
        String url = storage.store(file);                       // adapt to the real store(...) signature
        assertThat(url).endsWith(".webm");
        assertThat(storage.readAudio(url)).containsExactly(1, 2, 3);
    }

    @Test
    void rejectsUnsupportedType() {
        var file = new MockMultipartFile("file", "x.txt", "text/plain", new byte[]{1});
        assertThatThrownBy(() -> storage.store(file))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
```
> Look at the existing `MediaContractTest` for exactly how `MediaStorageService` is constructed and how `store(...)` is called (field names, temp-dir setup). Mirror that here; add a tiny `MediaStorageServiceTestSupport` helper only if there is no simpler constructor. If `store` is only reachable via the controller, instead assert webm acceptance through a `MockMvc` multipart POST to `/api/media` (copy the MediaContractTest setup) and drop the `readAudio` assertion.

- [ ] **Step 8: Verify compile + no regression** — `mvn -q test -DforkCount=0`. Expected: BUILD SUCCESS, full suite green (incl. the new webm test). If `TranscribeProperties` fails to autowire later, revisit Step 3.

- [ ] **Step 9: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/dto/AiDtos.java \
  backend/src/main/java/com/fluenta/api/config/TranscribeProperties.java \
  backend/src/main/java/com/fluenta/api/service/Transcriber.java \
  backend/src/main/java/com/fluenta/api/service/MediaStorageService.java \
  backend/src/main/resources/application.yml \
  backend/src/main/java/com/fluenta/api \
  backend/src/test/java/com/fluenta/api/MediaStorageServiceWebmTest.java
git commit -m "$(printf 'feat(backend): speaking DTOs + transcribe config + Transcriber seam + media webm\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SP2: `StubTranscriber` + `StubSpeakingGrader` (offline heuristics)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/speaking/StubTranscriber.java`
- Create: `backend/src/main/java/com/fluenta/api/service/speaking/StubSpeakingGrader.java`
- Test: `backend/src/test/java/com/fluenta/api/StubSpeakingTest.java`

**Interfaces:**
- Consumes: `Transcriber`, `AiDtos.SpeakingCriterionDto`.
- Produces: `StubTranscriber` (`@Component`, standalone — NOT implementing `Transcriber`, so `WhisperTranscriber` stays the only `Transcriber` bean and the SP4 `@MockBean Transcriber` is unambiguous) with `String transcribe(byte[] audio, String mediaType)`. `StubSpeakingGrader` (`@Component`) — `List<SpeakingCriterionDto> grade()` returning the deterministic 4 criteria (fluency 6, lexical 6, grammar 5, pronunciation 6). Deterministic; no model/network call.

- [ ] **Step 1: Write the failing test `StubSpeakingTest.java`:**

```java
package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.SpeakingCriterionDto;
import com.fluenta.api.service.speaking.StubSpeakingGrader;
import com.fluenta.api.service.speaking.StubTranscriber;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StubSpeakingTest {
    private final StubTranscriber transcriber = new StubTranscriber();
    private final StubSpeakingGrader grader = new StubSpeakingGrader();

    @Test
    void transcriberIsDeterministicAndNonBlank() {
        String a = transcriber.transcribe(new byte[0], "audio/webm");
        String b = transcriber.transcribe(new byte[]{1, 2, 3}, "audio/mp4");
        assertThat(a).isNotBlank().isEqualTo(b);
    }

    @Test
    void graderReturnsTheFourCanonicalCriteriaInOrder() {
        List<SpeakingCriterionDto> cs = grader.grade();
        assertThat(cs).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(cs).allSatisfy(c -> {
            assertThat(c.label()).isNotBlank();
            assertThat(c.note()).isNotBlank();
            assertThat(c.band()).isBetween(0.0, 9.0);
        });
    }
}
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=StubSpeakingTest`. Expected: FAIL (classes missing).

- [ ] **Step 3: Create `StubTranscriber.java`:**

```java
package com.fluenta.api.service.speaking;

import org.springframework.stereotype.Component;

/** Offline/free STT: a deterministic placeholder transcript (no network). Standalone so it is
 *  NOT a second com.fluenta.api.service.Transcriber bean (keeps the SP4 @MockBean unambiguous). */
@Component
public class StubTranscriber {
    public String transcribe(byte[] audio, String mediaType) {
        return "[offline transcript placeholder — connect the speech service to transcribe your recording]";
    }
}
```

- [ ] **Step 4: Create `StubSpeakingGrader.java`:**

```java
package com.fluenta.api.service.speaking;

import com.fluenta.api.dto.AiDtos.SpeakingCriterionDto;
import org.springframework.stereotype.Component;

import java.util.List;

/** Offline/free speaking grade: deterministic per-criterion bands (no model call). */
@Component
public class StubSpeakingGrader {
    public List<SpeakingCriterionDto> grade() {
        return List.of(
                new SpeakingCriterionDto("fluency", "Fluency & Coherence", 6,
                        "Steady pace overall; add more linking phrases to connect ideas. (offline sample)"),
                new SpeakingCriterionDto("lexical", "Lexical Resource", 6,
                        "Good range on familiar topics; reach for less common collocations. (offline sample)"),
                new SpeakingCriterionDto("grammar", "Grammatical Range & Accuracy", 5,
                        "Simple structures are accurate; complex sentences need more control. (offline sample)"),
                new SpeakingCriterionDto("pronunciation", "Pronunciation", 6,
                        "Estimated from the transcript, not measured acoustically. (offline sample)"));
    }
}
```

- [ ] **Step 5: Run the test** — `mvn -q test -DforkCount=0 -Dtest=StubSpeakingTest`. Expected: PASS.

- [ ] **Step 6: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/speaking/StubTranscriber.java \
  backend/src/main/java/com/fluenta/api/service/speaking/StubSpeakingGrader.java \
  backend/src/test/java/com/fluenta/api/StubSpeakingTest.java
git commit -m "$(printf 'feat(backend): offline speaking stub transcriber + grader\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SP3: `WhisperTranscriber` (live STT)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/WhisperTranscriber.java`

**Interfaces:**
- Consumes: `TranscribeProperties`, `ApiException`.
- Produces: `WhisperTranscriber` (`@Component implements Transcriber`) — POSTs multipart to the OpenAI transcriptions endpoint. It is the **only** `Transcriber` bean (StubTranscriber is standalone), so the SP4 service test replaces it cleanly with a `@MockBean Transcriber`.

Live-only; unverifiable here (no key/socket). Verified by: compiles + full suite green. No unit test hits the network.

- [ ] **Step 1: Create `WhisperTranscriber.java`:**

```java
package com.fluenta.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.TranscribeProperties;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

/** Live STT via the OpenAI Whisper transcriptions REST endpoint (multipart). The only Transcriber bean. */
@Component
public class WhisperTranscriber implements Transcriber {

    private final TranscribeProperties props;
    private final ObjectMapper om;
    private final HttpClient http = HttpClient.newHttpClient();

    public WhisperTranscriber(TranscribeProperties props, ObjectMapper om) {
        this.props = props;
        this.om = om;
    }

    @Override
    public String transcribe(byte[] audio, String mediaType) {
        String boundary = "----fluenta" + Long.toHexString(System.nanoTime());
        String filename = "audio." + ext(mediaType);
        try {
            byte[] body = multipart(boundary, audio, mediaType, filename);
            HttpRequest req = HttpRequest.newBuilder(URI.create(props.baseUrl()))
                    .header("Authorization", "Bearer " + props.apiKey())
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new ApiException(HttpStatus.BAD_GATEWAY,
                        "The speech service is temporarily unavailable. Please try again.");
            }
            return om.readTree(res.body()).path("text").asText("");
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "The speech service could not be reached. Please try again.");
        }
    }

    private byte[] multipart(String boundary, byte[] audio, String mediaType, String filename) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeField(out, boundary, "model", props.model());
        writeField(out, boundary, "language", "en");
        writeField(out, boundary, "response_format", "json");
        // file part
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n")
                .getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + (mediaType == null ? "application/octet-stream" : mediaType) + "\r\n\r\n")
                .getBytes(StandardCharsets.UTF_8));
        out.write(audio);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private void writeField(ByteArrayOutputStream out, String boundary, String name, String value) throws Exception {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(value.getBytes(StandardCharsets.UTF_8));
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private String ext(String mediaType) {
        if (mediaType == null) return "webm";
        if (mediaType.contains("webm")) return "webm";
        if (mediaType.contains("mp4") || mediaType.contains("m4a")) return "m4a";
        if (mediaType.contains("mpeg") || mediaType.contains("mp3")) return "mp3";
        if (mediaType.contains("wav")) return "wav";
        if (mediaType.contains("aac")) return "aac";
        return "webm";
    }
}
```

- [ ] **Step 2: Verify** — `mvn -q test -DforkCount=0`. Expected: BUILD SUCCESS, full suite green. (No new test; this class is exercised only via mocks in SP4 and live integration off-machine.)

- [ ] **Step 3: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/WhisperTranscriber.java
git commit -m "$(printf 'feat(backend): live Whisper transcriber (STT)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SP4: `SpeakingFeedbackService` + normalization gate + persistence

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/SpeakingFeedbackService.java`
- Create: `backend/src/main/java/com/fluenta/api/domain/SpeakingFeedbackEntity.java`
- Create: `backend/src/main/java/com/fluenta/api/repo/SpeakingFeedbackRepository.java`
- Test: `backend/src/test/java/com/fluenta/api/SpeakingFeedbackServiceTest.java`
- Test: `backend/src/test/java/com/fluenta/api/SpeakingNormalizeTest.java`

**Interfaces:**
- Consumes: `TranscribeProperties`, `AiProperties`, `Transcriber` (the live `WhisperTranscriber`, the only impl), `StubTranscriber`, `StubSpeakingGrader`, `AiClient`, `MediaStorageService`, `SpeakingFeedbackRepository`, `ObjectMapper`, `AiDtos.*`, `ApiException`.
- Produces: `SpeakingFeedbackService.generate(String userId, SpeakingFeedbackRequest) -> SpeakingResult`, `get(String userId, String id) -> SpeakingResult`, package-private `List<SpeakingCriterionDto> normalize(List<SpeakingCriterionDto> raw)` + `double snapBand(double)`.

- [ ] **Step 1: Create the entity `SpeakingFeedbackEntity.java`** (mirror `WritingFeedbackEntity`):

```java
package com.fluenta.api.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "speaking_feedback")
public class SpeakingFeedbackEntity {
    @Id
    private String id;
    private String userId;
    private String examId;
    @Column(length = 40000)
    private String transcriptsJson;
    @Column(length = 40000)
    private String resultJson;
    private String model;
    private String source;
    private String createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getTranscriptsJson() { return transcriptsJson; }
    public void setTranscriptsJson(String v) { this.transcriptsJson = v; }
    public String getResultJson() { return resultJson; }
    public void setResultJson(String v) { this.resultJson = v; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 2: Create the repo `SpeakingFeedbackRepository.java`:**

```java
package com.fluenta.api.repo;

import com.fluenta.api.domain.SpeakingFeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpeakingFeedbackRepository extends JpaRepository<SpeakingFeedbackEntity, String> {
}
```

- [ ] **Step 3: Write the gate unit test `SpeakingNormalizeTest.java`** (no Spring — constructs the service with nulls it never touches, calls the package-private gate):

```java
package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.SpeakingCriterionDto;
import com.fluenta.api.service.SpeakingFeedbackService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpeakingNormalizeTest {
    private final SpeakingFeedbackService svc =
            new SpeakingFeedbackService(null, null, null, null, null, null, null, null, null);

    @Test
    void clampsSnapsAndOrdersToTheFourCanonicalCriteria() {
        var raw = List.of(
                new SpeakingCriterionDto("grammar", "whatever", 12.0, ""),     // out of range, blank note, wrong order
                new SpeakingCriterionDto("fluency", "whatever", 6.3, "ok"),    // 6.3 -> 6.5
                new SpeakingCriterionDto("lexical", "whatever", -2.0, "ok"));   // missing pronunciation
        var out = svc.normalize(raw);
        assertThat(out).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(out.get(0).band()).isEqualTo(6.5);   // fluency snapped
        assertThat(out.get(2).band()).isEqualTo(9.0);   // grammar clamped to 9
        assertThat(out.get(1).band()).isEqualTo(0.0);   // lexical clamped to 0
        assertThat(out).allSatisfy(c -> assertThat(c.note()).isNotBlank());  // blank notes filled
        assertThat(out.get(3).key()).isEqualTo("pronunciation");             // filled-in default
        assertThat(out).extracting(SpeakingCriterionDto::label)
                .containsExactly("Fluency & Coherence", "Lexical Resource",
                        "Grammatical Range & Accuracy", "Pronunciation");
    }

    @Test
    void snapBandRoundsToNearestHalf() {
        assertThat(svc.snapBand(6.24)).isEqualTo(6.0);
        assertThat(svc.snapBand(6.25)).isEqualTo(6.5);
        assertThat(svc.snapBand(10.0)).isEqualTo(9.0);
    }
}
```

- [ ] **Step 4: Write the service test `SpeakingFeedbackServiceTest.java`** (mocks `Transcriber` + `AiClient` + `MediaStorageService`; forces live; persist off):

```java
package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.MediaStorageService;
import com.fluenta.api.service.SpeakingFeedbackService;
import com.fluenta.api.service.Transcriber;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test", "fluenta.ai.persist=false",
        "fluenta.ai.transcribe.enabled=true", "fluenta.ai.transcribe.api-key=sk-whisper"})
class SpeakingFeedbackServiceTest {

    @MockBean Transcriber transcriber;      // replaces the WhisperTranscriber (the only Transcriber bean)
    @MockBean AiClient ai;
    @MockBean MediaStorageService media;
    @Autowired SpeakingFeedbackService svc;

    @Test
    void transcribesEachPartThenGradesAndNormalizes() {
        when(media.readAudio(anyString())).thenReturn(new byte[]{1, 2, 3});
        when(transcriber.transcribe(any(), anyString())).thenReturn("I am from a small town near the coast.");
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"overall": 12,
             "criteria": [
               {"key":"fluency","band":6.3,"note":"steady"},
               {"key":"lexical","band":6,"note":"ok"},
               {"key":"grammar","band":5,"note":"ok"}
             ]}""");
        var req = new SpeakingFeedbackRequest("speak-1", List.of(
                new SpeakingPartInput(1, "Where are you from?", "/media/a.webm"),
                new SpeakingPartInput(2, "Describe a skill.", "/media/b.webm")));
        var r = svc.generate("u1", req);

        assertThat(r.source()).isEqualTo("claude");
        assertThat(r.criteria()).extracting(SpeakingCriterionDto::key)
                .containsExactly("fluency", "lexical", "grammar", "pronunciation");
        assertThat(r.criteria().get(0).band()).isEqualTo(6.5);       // 6.3 snapped
        assertThat(r.overall()).isBetween(0.0, 9.0);                 // 12 was invalid -> recomputed
        assertThat(r.parts()).hasSize(2);
        assertThat(r.parts().get(0).transcript()).contains("coast");
        verify(transcriber, times(2)).transcribe(any(), anyString());
    }

    @Test
    void rejectsEmptyParts() {
        assertThatThrownBy(() -> svc.generate("u1", new SpeakingFeedbackRequest("x", List.of())))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }

    @Test
    void rejectsOversizeAudio() {
        when(media.readAudio(anyString())).thenReturn(new byte[26_000_000]);   // > 25MB default
        var req = new SpeakingFeedbackRequest("x", List.of(
                new SpeakingPartInput(1, "Q", "/media/a.webm")));
        assertThatThrownBy(() -> svc.generate("u1", req))
                .isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
```

- [ ] **Step 5: Run both tests** — `mvn -q test -DforkCount=0 -Dtest=SpeakingNormalizeTest,SpeakingFeedbackServiceTest`. Expected: FAIL (service missing / won't compile).

- [ ] **Step 6: Create `SpeakingFeedbackService.java`:**

```java
package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.config.TranscribeProperties;
import com.fluenta.api.domain.SpeakingFeedbackEntity;
import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.repo.SpeakingFeedbackRepository;
import com.fluenta.api.service.speaking.StubSpeakingGrader;
import com.fluenta.api.service.speaking.StubTranscriber;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Speaking feedback: transcribe each part (STT), grade the transcript (Claude), normalize, persist. */
@Service
public class SpeakingFeedbackService {

    /** Canonical criterion order + labels (must match the web/mobile UI). */
    private static final String[][] CRITERIA = {
            {"fluency", "Fluency & Coherence"},
            {"lexical", "Lexical Resource"},
            {"grammar", "Grammatical Range & Accuracy"},
            {"pronunciation", "Pronunciation"}};

    private static final String GRADE_SYSTEM = """
        You are an IELTS speaking examiner. You are given the examiner prompts and the TRANSCRIPT of a
        candidate's spoken answers (produced by speech-to-text). Grade the candidate on the four IELTS
        speaking criteria and return ONLY a JSON object:
        {"overall":number,"criteria":[{"key":"fluency|lexical|grammar|pronunciation","band":number,"note":string}]}.
        Bands are 0-9 in 0.5 steps. For pronunciation you only have a transcript (no audio), so ESTIMATE it from
        fluency/coherence signals and SAY in the note that it is estimated from a transcript, not measured. No prose, no fences.""";

    private final TranscribeProperties tp;
    private final AiProperties props;
    private final Transcriber transcriber;        // live WhisperTranscriber (or a test mock)
    private final StubTranscriber stubTranscriber;
    private final StubSpeakingGrader stubGrader;
    private final AiClient ai;
    private final MediaStorageService media;
    private final SpeakingFeedbackRepository repo;
    private final ObjectMapper om;

    public SpeakingFeedbackService(TranscribeProperties tp, AiProperties props, Transcriber transcriber,
                                   StubTranscriber stubTranscriber, StubSpeakingGrader stubGrader, AiClient ai,
                                   MediaStorageService media, SpeakingFeedbackRepository repo, ObjectMapper om) {
        this.tp = tp; this.props = props; this.transcriber = transcriber;
        this.stubTranscriber = stubTranscriber; this.stubGrader = stubGrader; this.ai = ai;
        this.media = media; this.repo = repo; this.om = om;
    }

    public SpeakingResult generate(String userId, SpeakingFeedbackRequest req) {
        List<SpeakingPartInput> parts = req == null || req.parts() == null ? List.of() : req.parts();
        if (parts.isEmpty()) throw ApiException.badRequest("No recordings to grade");
        if (parts.size() > 3) throw ApiException.badRequest("Too many parts");

        boolean live = tp.live() && props.live();
        List<SpeakingPartResult> partResults = new ArrayList<>();
        long totalBytes = 0;
        StringBuilder prompt = new StringBuilder();

        for (SpeakingPartInput p : parts) {
            String transcript;
            if (live) {
                byte[] audio = media.readAudio(p.audioUrl());
                totalBytes += audio.length;
                if (totalBytes > tp.maxAudioBytes()) throw ApiException.badRequest("Recording is too large");
                transcript = transcriber.transcribe(audio, mediaTypeFor(p.audioUrl()));
            } else {
                transcript = stubTranscriber.transcribe(new byte[0], "audio/webm");
            }
            partResults.add(new SpeakingPartResult(p.number(), transcript, ""));
            prompt.append("PART ").append(p.number() == null ? "?" : p.number())
                    .append("\nPROMPT: ").append(p.prompt() == null ? "" : p.prompt())
                    .append("\nTRANSCRIPT: ").append(transcript).append("\n\n");
        }

        List<SpeakingCriterionDto> criteria;
        double overall;
        String source;
        if (!live) {
            criteria = normalize(stubGrader.grade());
            overall = meanBand(criteria);
            source = "offline";
        } else {
            JsonNode node = parse(ai.complete(GRADE_SYSTEM, prompt.toString()));
            criteria = normalize(readCriteria(node));
            double modelOverall = node.path("overall").asDouble(-1);
            overall = (modelOverall >= 0 && modelOverall <= 9) ? snapBand(modelOverall) : meanBand(criteria);
            source = "claude";
        }

        String id = UUID.randomUUID().toString();
        SpeakingResult result = new SpeakingResult(id, source, overall, criteria, partResults);

        if (props.persist()) {
            persist(userId, req, result, partResults);
        } else if (live) {
            for (SpeakingPartInput p : parts) media.deleteQuietly(p.audioUrl());  // ephemeral: drop the clips
        }
        return result;
    }

    public SpeakingResult get(String userId, String id) {
        SpeakingFeedbackEntity e = repo.findById(id).orElseThrow(() -> ApiException.notFound("Speaking feedback"));
        if (!userId.equals(e.getUserId())) throw ApiException.notFound("Speaking feedback");
        try { return om.readValue(e.getResultJson(), SpeakingResult.class); }
        catch (Exception ex) { throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read saved feedback."); }
    }

    // --- gate ---

    List<SpeakingCriterionDto> normalize(List<SpeakingCriterionDto> raw) {
        Map<String, SpeakingCriterionDto> byKey = new LinkedHashMap<>();
        if (raw != null) for (SpeakingCriterionDto c : raw) if (c != null && c.key() != null) byKey.put(c.key(), c);
        List<SpeakingCriterionDto> out = new ArrayList<>();
        for (String[] def : CRITERIA) {
            SpeakingCriterionDto c = byKey.get(def[0]);
            double band = c == null ? 5.0 : snapBand(c.band());
            String note = c == null || c.note() == null || c.note().isBlank()
                    ? "Not enough evidence to assess." : c.note();
            out.add(new SpeakingCriterionDto(def[0], def[1], band, note));
        }
        return out;
    }

    double snapBand(double b) {
        double snapped = Math.round(b * 2.0) / 2.0;
        return Math.max(0.0, Math.min(9.0, snapped));
    }

    private double meanBand(List<SpeakingCriterionDto> cs) {
        double sum = 0; for (SpeakingCriterionDto c : cs) sum += c.band();
        return cs.isEmpty() ? 0 : snapBand(sum / cs.size());
    }

    private List<SpeakingCriterionDto> readCriteria(JsonNode node) {
        List<SpeakingCriterionDto> out = new ArrayList<>();
        for (JsonNode c : node.path("criteria")) {
            out.add(new SpeakingCriterionDto(c.path("key").asText(null), "",
                    c.path("band").asDouble(5.0), c.path("note").asText("")));
        }
        return out;
    }

    private JsonNode parse(String raw) {
        if (raw == null) throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        String s = raw.trim();
        int a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a < 0 || b <= a) throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        try { return om.readTree(s.substring(a, b + 1)); }
        catch (Exception e) { throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response."); }
    }

    private String mediaTypeFor(String url) {
        String u = url == null ? "" : url.toLowerCase();
        if (u.endsWith(".webm")) return "audio/webm";
        if (u.endsWith(".m4a") || u.endsWith(".mp4")) return "audio/mp4";
        if (u.endsWith(".mp3")) return "audio/mpeg";
        if (u.endsWith(".wav")) return "audio/wav";
        if (u.endsWith(".aac")) return "audio/aac";
        return "audio/webm";
    }

    private void persist(String userId, SpeakingFeedbackRequest req, SpeakingResult result,
                         List<SpeakingPartResult> parts) {
        try {
            SpeakingFeedbackEntity e = new SpeakingFeedbackEntity();
            e.setId(result.id());
            e.setUserId(userId);
            e.setExamId(req.examId());
            e.setTranscriptsJson(om.writeValueAsString(parts));
            e.setResultJson(om.writeValueAsString(result));
            e.setModel(props.model());
            e.setSource(result.source());
            e.setCreatedAt(Instant.now().toString());
            repo.save(e);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save feedback.");
        }
    }
}
```

- [ ] **Step 7: Run both tests** — `mvn -q test -DforkCount=0 -Dtest=SpeakingNormalizeTest,SpeakingFeedbackServiceTest`. Expected: PASS. Then the full suite `mvn -q test -DforkCount=0` (reset `backend/data/fluenta.db*` first if `AdminUsersContractTest` flakes). Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/SpeakingFeedbackService.java \
  backend/src/main/java/com/fluenta/api/domain/SpeakingFeedbackEntity.java \
  backend/src/main/java/com/fluenta/api/repo/SpeakingFeedbackRepository.java \
  backend/src/test/java/com/fluenta/api/SpeakingFeedbackServiceTest.java \
  backend/src/test/java/com/fluenta/api/SpeakingNormalizeTest.java
git commit -m "$(printf 'feat(backend): speaking feedback service + normalization gate + persistence\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SP5: `AiController` speaking endpoints + contract tests

**Files:**
- Modify: `backend/src/main/java/com/fluenta/api/web/AiController.java`
- Modify: `backend/src/test/java/com/fluenta/api/HttpContractTest.java`

**Interfaces:**
- Consumes: `SpeakingFeedbackService`, `CurrentUser.require()`.
- Produces: `POST /api/ai/speaking-feedback` + `GET /api/ai/speaking-feedback/{id}` (student).

- [ ] **Step 1: Add contract tests to `HttpContractTest.java`** — `login()` returns an authenticated (admin) token, which is fine (any authenticated user → 200); the 401 uses no header:

```java
    @Test
    void speakingFeedbackAsStudentReturnsCriteria() throws Exception {
        String token = login(); // any authenticated user is allowed
        String body = "{\"examId\":\"speak-1\",\"parts\":[{\"number\":1,\"prompt\":\"Where are you from?\",\"audioUrl\":\"/media/x.webm\"}]}";
        mvc.perform(post("/api/ai/speaking-feedback").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criteria").isArray())
                .andExpect(jsonPath("$.criteria[0].key").value("fluency"))
                .andExpect(jsonPath("$.overall").isNumber());
    }

    @Test
    void speakingFeedbackRequiresAuth() throws Exception {
        mvc.perform(post("/api/ai/speaking-feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"x\",\"parts\":[{\"number\":1,\"prompt\":\"Q\",\"audioUrl\":\"/media/x.webm\"}]}"))
                .andExpect(status().isUnauthorized());
    }
```
> The default test profile is OFFLINE (no keys), so `speaking-feedback` runs through the stub grader → the 200 test needs no key and touches no disk (offline path skips `media.readAudio`).

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=HttpContractTest#speakingFeedbackAsStudentReturnsCriteria`. Expected: FAIL (501/404 today).

- [ ] **Step 3: Add the endpoints to `AiController.java`** — inject `SpeakingFeedbackService`, add two routes:

```java
    @PostMapping("/speaking-feedback")
    public AiDtos.SpeakingResult speakingFeedback(@RequestBody AiDtos.SpeakingFeedbackRequest req) {
        return speaking.generate(CurrentUser.require(), req);
    }

    @GetMapping("/speaking-feedback/{id}")
    public AiDtos.SpeakingResult getSpeakingFeedback(@PathVariable String id) {
        return speaking.get(CurrentUser.require(), id);
    }
```
Add `SpeakingFeedbackService speaking` to the constructor and a `private final` field + import. Keep the writing/coach/studio routes and the 501 catch-all unchanged (the literal `/speaking-feedback` route takes precedence over `{feature}`).

- [ ] **Step 4: Run the AI contract tests** — `mvn -q test -DforkCount=0 -Dtest=HttpContractTest`. Expected: PASS (student 200; unauth 401; writing/coach/studio/live-interview unchanged).

- [ ] **Step 5: Full backend suite** — reset `backend/data/fluenta.db*`, then `mvn -q test -DforkCount=0`. Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/web/AiController.java \
  backend/src/test/java/com/fluenta/api/HttpContractTest.java
git commit -m "$(printf 'feat(backend): student speaking-feedback endpoints\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

# Part B — Web (`D:\personal\fluenta-web`, branch `feat/ai-speaking-feedback`)

Gate = `npm run lint` + `npm run build`.

### Task SW1: `api.ai.speakingFeedback` + types

**Files:**
- Modify: `src/lib/api.ts`

**Interfaces:**
- Produces: types `AiSpeakingCriterion`, `AiSpeakingPartResult`, `AiSpeakingResult`, `AiSpeakingPartInput`, `AiSpeakingFeedbackRequest`; `api.ai.speakingFeedback(req)`, `api.ai.getSpeakingFeedback(id)`.

- [ ] **Step 1: Add to `src/lib/api.ts`** — types near the other `Ai*` types:

```ts
export interface AiSpeakingCriterion { key: string; label: string; band: number; note: string; }
export interface AiSpeakingPartResult { number: number; transcript: string; note?: string; }
export interface AiSpeakingResult {
  id: string;
  source: string;
  overall: number;
  criteria: AiSpeakingCriterion[];
  parts: AiSpeakingPartResult[];
}
export interface AiSpeakingPartInput { number: number; prompt: string; audioUrl: string; }
export interface AiSpeakingFeedbackRequest { examId: string; parts: AiSpeakingPartInput[]; }
```
Inside `api.ai` (after `coach`):
```ts
    speakingFeedback: (req: AiSpeakingFeedbackRequest) =>
      request<AiSpeakingResult>("POST", "/ai/speaking-feedback", req),
    getSpeakingFeedback: (id: string) =>
      request<AiSpeakingResult>("GET", `/ai/speaking-feedback/${id}`),
```

- [ ] **Step 2: Verify** — `npm run lint` + `npm run build`, both clean. Commit:

```bash
git add src/lib/api.ts
git commit -m "$(printf 'feat(web): api.ai.speakingFeedback client + types\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SW2: Real audio capture + wiring in `SpeakingRunnerPage`

**Files:**
- Modify: `src/features/exam-runner/SpeakingRunnerPage.tsx`

**Interfaces:**
- Consumes: `api.ai.speakingFeedback` (SW1), `api.media.upload` (existing → `{ url }`), the existing `getSpeakingFeedback`/`speakingOverall` (kept as the error/offline fallback), `setLastSpeaking`.

Replace the **simulated** recorder (timer only) with real `MediaRecorder`, retain a `Blob` per part, and on Submit upload each clip then call the endpoint — falling back to the mock on any error (mic denied, upload/API failure). Keep the 2:30 `RECORD_CAP`, the per-part UI, `GradingModal`, and the full-exam `?full=` path.

- [ ] **Step 1: Add real recording state + helpers** near the top of the component (replace the simulated `toggleRecord`/effect). Import `SpeakingFeedback` type is already in scope via mockApi; add `import { api } from "@/lib/api";`:

```tsx
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [blobs, setBlobs] = useState<Record<string, Blob>>({});   // key = part.id
  const [submitting, setSubmitting] = useState(false);

  function pickMime(): string {
    const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return c.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setBlobs((m) => ({ ...m, [part.id]: blob }));
        setRecorded((r) => ({ ...r, [part.id]: true }));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recRef.current = rec;
      rec.start();
      setElapsed(0);
      setRecording(true);
    } catch {
      // mic denied/unavailable — mark this part "recorded" so the mock fallback can still grade on submit
      setRecorded((r) => ({ ...r, [part.id]: true }));
      setRecording(false);
    }
  }

  function stopRecording() {
    recRef.current?.state === "recording" && recRef.current.stop();
    setRecording(false);
  }
```
Rewrite `toggleRecord` to call `stopRecording()` when recording else `startRecording()`. In the existing `useEffect` cap timer, when `elapsed` reaches `cap`, call `stopRecording()` instead of just setting state. In `goToPart`, call `stopRecording()` first. On unmount, stop any live stream: extend the cleanup to `streamRef.current?.getTracks().forEach((t) => t.stop())`.

- [ ] **Step 2: Extend the recorder MIME extension helper** and rewrite `submit()` to upload each recorded blob and call the endpoint, with a full mock fallback:

```tsx
  function extFor(type: string): string {
    if (type.includes("webm")) return "webm";
    if (type.includes("mp4")) return "m4a";
    return "webm";
  }

  async function submit() {
    setSubmitting(true);
    try {
      const parts: { number: number; prompt: string; audioUrl: string }[] = [];
      for (let i = 0; i < exam.parts.length; i++) {
        const p = exam.parts[i];
        const blob = blobs[p.id];
        if (!blob) throw new Error("missing recording");   // fall back to the mock below
        const file = new File([blob], `part-${p.number}.${extFor(blob.type)}`, { type: blob.type || "audio/webm" });
        const { url } = await api.media.upload(file);
        parts.push({ number: p.number, prompt: promptTextFor(p), audioUrl: url });
      }
      const res = await api.ai.speakingFeedback({ examId: exam.id, parts });
      finishGrading(res.overall, res.criteria);
    } catch {
      const feedback = getSpeakingFeedback();
      finishGrading(speakingOverall(feedback), feedback);
    } finally {
      setSubmitting(false);
    }
  }

  function finishGrading(overall: number, feedback: SpeakingFeedback[]) {
    setGradedBand(overall);
    setLastSpeaking({ examId: exam.id, overall, feedback, partsRecorded: completed });
    setGrading(true);
  }

  // The examiner prompt sent to the grader: the cue card (+ bullets) or the joined questions.
  function promptTextFor(p: (typeof exam.parts)[number]): string {
    if (p.cueCard) return [p.cueCard, ...(p.bullets ?? [])].join(" \u2022 ");
    return p.questions.join(" ");
  }
```
> `res.criteria` is `AiSpeakingCriterion[]` which is structurally the web `SpeakingFeedback[]` (`key,label,band,note`) — `finishGrading` accepts it directly. `SpeakingResultsPage` renders `feedback` from `setLastSpeaking` unchanged.

- [ ] **Step 3: Wire the Submit button** — set `disabled`/`loading` while `submitting`, keep the existing label. Update the recorder caption from "Microphone is simulated in this preview." to a real hint (e.g. "We'll upload your recording to grade it."). Keep the rest of the JSX.

- [ ] **Step 4: Verify** — `npm run lint` + `npm run build`, both clean. (No backend/mic here; the error path exercises the mock fallback and the file must compile both paths.)

- [ ] **Step 5: Commit:**

```bash
git add src/features/exam-runner/SpeakingRunnerPage.tsx
git commit -m "$(printf 'feat(web): real speaking capture wired to /api/ai/speaking-feedback\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

# Part C — Mobile (`D:\personal\fluenta-mobile`, branch `feat/ai-speaking-feedback`)

**Setup (once, before SM1):** `cd D:\personal\fluenta-mobile && git checkout -b feat/ai-speaking-feedback`. Gate = `flutter analyze` (+ `flutter build apk --debug` where practical). Recording is device-verified off-machine.

### Task SM1: pubspec packages + models + api_client methods

**Files:**
- Modify: `D:\personal\fluenta-mobile\pubspec.yaml`
- Modify: `D:\personal\fluenta-mobile\lib\models\models.dart`
- Modify: `D:\personal\fluenta-mobile\lib\services\api_client.dart`

**Interfaces:**
- Produces: Dart `SpeakingCriterion`, `SpeakingResult` models (JSON-decodable); `ApiClient.uploadMedia(File file) -> String url`; `ApiClient.speakingFeedback({required String examId, required List<Map<String,dynamic>> parts}) -> SpeakingResult`.

- [ ] **Step 1: Add packages to `pubspec.yaml`** under `dependencies:` (keep existing `http`/`just_audio`):

```yaml
  record: ^5.1.2
  permission_handler: ^11.3.1
  path_provider: ^2.1.4
```
Run `cd D:\personal\fluenta-mobile && flutter pub get`.

- [ ] **Step 2: Add models to `lib/models/models.dart`** (mirror the existing `WritingResult` decoding style — check how `WritingResult.fromJson` reads fields and match it):

```dart
class SpeakingCriterion {
  final String key;
  final String label;
  final double band;
  final String note;
  SpeakingCriterion({required this.key, required this.label, required this.band, required this.note});
  factory SpeakingCriterion.fromJson(Map<String, dynamic> j) => SpeakingCriterion(
        key: j['key'] as String? ?? '',
        label: j['label'] as String? ?? '',
        band: (j['band'] as num?)?.toDouble() ?? 0,
        note: j['note'] as String? ?? '',
      );
}

class SpeakingResult {
  final String id;
  final String source;
  final double overall;
  final List<SpeakingCriterion> criteria;
  SpeakingResult({required this.id, required this.source, required this.overall, required this.criteria});
  factory SpeakingResult.fromJson(Map<String, dynamic> j) => SpeakingResult(
        id: j['id'] as String? ?? '',
        source: j['source'] as String? ?? '',
        overall: (j['overall'] as num?)?.toDouble() ?? 0,
        criteria: ((j['criteria'] as List?) ?? const [])
            .map((e) => SpeakingCriterion.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
```

- [ ] **Step 3: Add `uploadMedia` + `speakingFeedback` to `lib/services/api_client.dart`** — the existing `_request` is JSON; add a multipart upload using `package:http`. Check the file's imports/base-URL field (e.g. `_baseUrl`, `_token`) and match them:

```dart
  Future<String> uploadMedia(File file) async {
    final uri = Uri.parse('$baseUrl/media');                 // adapt to the real base-url getter
    final req = http.MultipartRequest('POST', uri);
    if (token != null) req.headers['Authorization'] = 'Bearer $token';   // adapt to the real token field
    req.files.add(await http.MultipartFile.fromPath('file', file.path));
    final res = await http.Response.fromStream(await req.send());
    if (res.statusCode ~/ 100 != 2) {
      throw ApiException(res.statusCode, 'Upload failed');   // adapt to the real error type
    }
    return (jsonDecode(res.body) as Map<String, dynamic>)['url'] as String;
  }

  Future<SpeakingResult> speakingFeedback({
    required String examId,
    required List<Map<String, dynamic>> parts,
  }) =>
      _request('POST', '/ai/speaking-feedback',
          body: {'examId': examId, 'parts': parts},
          decode: (j) => SpeakingResult.fromJson(j as Map<String, dynamic>));
```
> Match the exact shape of the existing `_request` (parameter names `body`/`decode`, the `http` import alias, the base-URL getter, the token header, and the error/exception type) — mirror how `writingFeedback` and `login` are written in the same file.

- [ ] **Step 4: Verify** — `cd D:\personal\fluenta-mobile && flutter analyze`. Expected: no new errors. Commit (in the mobile repo):

```bash
cd D:\personal\fluenta-mobile
git add pubspec.yaml pubspec.lock lib/models/models.dart lib/services/api_client.dart
git commit -m "$(printf 'feat(mobile): speaking result models + media upload + speakingFeedback client\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SM2: `speaking_screen` real recording + wiring + results

**Files:**
- Modify: `D:\personal\fluenta-mobile\lib\features\speaking\speaking_screen.dart`
- Modify (platform manifests for mic permission): `android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist`

**Interfaces:**
- Consumes: `ApiClient.uploadMedia`, `ApiClient.speakingFeedback` (SM1), `record` + `permission_handler` + `path_provider`.

Replace the simulated recorder with real capture (record to a temp file per part, retain the paths), enable the "Submit for AI feedback" button once ≥1 part is recorded, on submit upload each file → `speakingFeedback` → render the criteria/overall in a results card; on error/permission-denied keep the current "coming soon"/sample fallback.

- [ ] **Step 1: Add mic permission to the platform manifests.** Android `AndroidManifest.xml` (inside `<manifest>`): `<uses-permission android:name="android.permission.RECORD_AUDIO" />`. iOS `Info.plist`: a `<key>NSMicrophoneUsageDescription</key><string>Fluenta records your spoken answers to give IELTS Speaking feedback.</string>`.

- [ ] **Step 2: Rework `speaking_screen.dart`** — add real recording state and a submit/result flow. Replace the simulated `_toggle`/`_reset`/timer bits with the `record` package, keyed per part, and add a submit handler + a results card. Key additions (import `package:record/record.dart`, `package:permission_handler/permission_handler.dart`, `package:path_provider/path_provider.dart`, `dart:io`):

```dart
  final _rec = AudioRecorder();
  final Map<int, String> _clips = {};   // part index -> file path
  bool _submitting = false;
  SpeakingResult? _result;

  Future<void> _toggle() async {
    if (_recording) {
      final path = await _rec.stop();
      setState(() {
        _recording = false;
        _done = true;
        if (path != null) _clips[_part] = path;
      });
      return;
    }
    if (!await Permission.microphone.request().isGranted) {
      if (mounted) showToast(context, 'Microphone permission is needed to record.');
      return;
    }
    final dir = await getTemporaryDirectory();
    final file = '${dir.path}/speaking_${_part}_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _rec.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: file);
    setState(() { _recording = true; _elapsed = 0; });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _elapsed++));
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final api = context.read<AuthState>().api;
      final parts = <Map<String, dynamic>>[];
      for (var i = 0; i < _parts.length; i++) {
        final path = _clips[i];
        if (path == null) throw Exception('missing recording');
        final url = await api.uploadMedia(File(path));
        parts.add({'number': _parts[i].number, 'prompt': _promptFor(_parts[i]), 'audioUrl': url});
      }
      final res = await api.speakingFeedback(examId: 'speaking', parts: parts);
      if (mounted) setState(() => _result = res);
    } catch (_) {
      if (mounted) showToast(context, 'AI feedback is unavailable right now. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _promptFor(SpeakingPart p) =>
      p.cueCard != null ? [p.cueCard!, ...(p.bullets ?? const [])].join(' • ') : p.questions.join(' ');
```
Then: change the mic caption from "Microphone is simulated in this preview." to a real hint; enable the "Submit for AI feedback" button as `onPressed: (_clips.isEmpty || _submitting) ? null : _submit` (show a spinner when `_submitting`); and when `_result != null`, render a results card listing `_result!.overall` and each `_result!.criteria` (band + label + note) — mirror the layout of `writing_results_screen.dart`'s criteria list. Dispose the recorder in `dispose()` (`_rec.dispose()`).

- [ ] **Step 3: Verify** — `cd D:\personal\fluenta-mobile && flutter analyze`. Expected: no new errors. (Recording + upload are device-verified off-machine; analyze confirms it compiles.)

- [ ] **Step 4: Commit:**

```bash
cd D:\personal\fluenta-mobile
git add lib/features/speaking/speaking_screen.dart android/app/src/main/AndroidManifest.xml ios/Runner/Info.plist
git commit -m "$(printf 'feat(mobile): real speaking capture + AI feedback wiring\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

# Part D — Close-out

### Task SZ: Docs + roadmap (graphify handled by the controller)

**Files:**
- Modify: `D:\personal\fluenta-web\docs\ai-llm-mvp-pending.md`
- Modify: `D:\personal\fluenta-web\docs\ROADMAP.md`

- [ ] **Step 1:** In `docs/ai-llm-mvp-pending.md`, add a `**Status: DONE**` line under **§2d Speaking feedback** (matching the §2a/§2b/§2c style), noting: student-facing `/api/ai/speaking-feedback`; real audio capture (web + mobile) → server-side STT (Whisper seam) → Claude grading behind a 4-criteria normalization gate; offline stub (never 501); audio stored gated by persist; pronunciation estimated from transcript. Leave §2e Live Interview held.
- [ ] **Step 2:** In `docs/ROADMAP.md`, flip **AI: Speaking feedback** ☐→☑ (with a "Live (student): …" note matching the other done AI rows) AND flip the **"Real audio capture for Speaking"** cleanup row ☐→☑ (this slice delivered it: web `MediaRecorder`, mobile `record`). Escape or avoid literal `|` inside table cells.
- [ ] **Step 3: Commit:**

```bash
git add docs/ai-llm-mvp-pending.md docs/ROADMAP.md
git commit -m "$(printf 'docs: mark AI Speaking feedback (2d) + real audio capture done\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

- [ ] **Step 4:** Graphify refresh (web + backend + **mobile** — mobile is touched this slice) is run by the controller after the final review (code-only `graphify update`).

---

## Post-plan: integration verification (not on this machine)

A real check needs a host with keys + a socket + a microphone: set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`, run the server, and as a student record all 3 Speaking parts on web (and on a device for mobile), submit, and confirm a real transcript-grounded band + 4 criteria come back (pronunciation labelled estimated). Here, verification is the MockMvc suite (offline + normalization gate) + `npm run lint`/`build` + `flutter analyze`.

---

## Self-Review

**Spec coverage:** §2 capture (web `MediaRecorder` SW2 / mobile `record` SM2). §2/§3.1 server-side STT + `Transcriber` seam → SP1/SP3 (+ StubTranscriber SP2). §3.2 `SpeakingFeedbackService` (validate/transcribe/grade/offline-vs-live) → SP4. §3.3 normalization gate → SP4 (`normalize`/`snapBand`). §3.4 pronunciation estimated → SP2/SP4 prompt + note. §3.5 `TranscribeProperties` config → SP1. §4 endpoints + DTOs + student-auth + 200/401 tests → SP1/SP5. §4 media webm → SP1. §5 web wiring → SW1/SW2. §6 mobile wiring → SM1/SM2. §7 safety (auth, caps, gate, PII, persist gating) → SP1/SP4/SP5. §8 tests → SP1–SP5 + SW/SM gates. §9 graphify+ROADMAP → SZ. All covered.

**Placeholder scan:** No "TBD"/"add validation"/"similar to Task N". Every code step has real code; every test step has a runnable command + expected result. The three "adapt to the real field/signature" notes (media root field, mobile `_request`/base-url/token, `WritingResult.fromJson` style) are explicit "read the existing file and mirror it" instructions with the exact target named — not gaps — because those are pre-existing conventions the plan must not guess.

**Type consistency:** `Transcriber.transcribe(byte[],String)` defined SP1, implemented SP2 (`StubTranscriber`) + SP3 (`WhisperTranscriber` `@Primary`), consumed SP4. `AiDtos.Speaking*` records defined SP1, used SP4/SP5 + web (`AiSpeaking*`) SW1/SW2 + mobile (`SpeakingResult`/`SpeakingCriterion`) SM1/SM2. `SpeakingFeedbackService.generate/get` + package-private `normalize`/`snapBand` stable SP4→SP5 (+ tested in SP4). `TranscribeProperties.live()` defined SP1, used SP4. Endpoint paths (`/ai/speaking-feedback`) match `AiController` ↔ `api.ts` ↔ mobile `api_client`. The normalized criteria keys/labels (`fluency`/`lexical`/`grammar`/`pronunciation`) are identical across the backend gate, the web `SpeakingFeedback` type, and the mobile `SpeakingCriterion` model.
