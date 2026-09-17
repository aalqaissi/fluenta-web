# AI Studio Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship admin Studio AI authoring — `POST /api/ai/studio-generate|fill|extract` — with a vision-capable `AiClient`, structured `StudioQuestion` output behind a normalization gate, an offline heuristic fallback, and Reading/Listening editor wiring. Web/admin-only.

**Architecture:** Extend the Phase-1 `AiClient` with a `vision(...)` method (base64 image content blocks). `StudioAiService` prompts Claude (text for generate/fill, vision for extract), parses JSON, and runs a normalization gate to the `StudioQuestion` shape; offline it uses `StubStudioAuthor` (ported local heuristics). Admin-gated endpoints; the web wires the editor `AiButton`s with the local heuristic as the error/offline fallback.

**Tech Stack:** Java 21 / Spring Boot 3.3.5 / Maven / JUnit + MockMvc + Mockito · Anthropic Java SDK `com.anthropic:anthropic-java:2.34.0` (vision) · React + TypeScript + Vite.

Spec: [`docs/superpowers/specs/2026-09-17-ai-studio-authoring-design.md`](../specs/2026-09-17-ai-studio-authoring-design.md). Builds on the Foundation (`AiClient`, `AiProperties`, `AnthropicAiClient`, `AiDtos`, `AiController`) on `main`.

## Global Constraints

- **Web/admin-only** (no mobile). All three endpoints call `CurrentUser.requireAdmin()` (401 unauth, 403 non-admin).
- **The seeded demo user `u1`/Sara (`sara.hamzeh@example.com`) is an ADMIN** (SeedLoader forces `role="admin"`). So `login()` in `HttpContractTest` yields an admin token → studio endpoints return 200. A **403** test uses a freshly registered user (role defaults to `student`).
- **Model** from `AiProperties` (`props.model()`, default `claude-sonnet-5`, vision-capable); never hardcode a model id. Offline (`!props.live()`) → `StubStudioAuthor`; NEVER 501 for `/studio-*`.
- **Output** normalizes to `StudioQuestion { prompt, type?, options?, answer, wordLimit? }`. Valid `QuestionType`s (12): `true-false-notgiven, yes-no-notgiven, multiple-choice, multi-select, matching-information, matching-headings, matching-features, matching-sentence-endings, sentence-completion, summary-completion, diagram-label, short-answer`.
- **Caps:** `passageText` ≤ `props.maxEssayChars()`; `count` clamped 1–20; total base64 image bytes ≤ `props.maxImageBytes()` (new config, default 5_000_000).
- **Don't guess Anthropic SDK member names.** The image-block binding (`ImageBlockParam` + a base64 image source + `ContentBlockParam.ofImage` + `addUserMessageOfBlockParams`) must compile; if a name differs, `javap -classpath <anthropic-java jar in ~/.m2/repository/com/anthropic/> com.anthropic.models.messages.ImageBlockParam` (and related) to find it. Do not invent names or run a reflection program. If genuinely unresolvable, report BLOCKED with the exact compiler error.
- **Backend can't bind a socket here:** run tests with `mvn -q test -DforkCount=0`. If `AdminUsersContractTest` flakes, delete `backend/data/fluenta.db*` and re-run (known dev-DB drift). Vision/live paths can't run here — verify via mocked `AiClient`.
- **fluenta-web branch:** `feat/ai-studio-authoring` (already created).
- **Commit trailer:** end every commit body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Prefixes: `feat(backend)`, `feat(web)`, `test(...)`, `docs:`.

---

# Part A — Backend (`D:\personal\fluenta-web\backend`, branch `feat/ai-studio-authoring`)

### Task SB1: Studio DTOs + config + `AiClient.vision`

**Files:**
- Modify: `backend/src/main/java/com/fluenta/api/service/AiClient.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/AnthropicAiClient.java`
- Modify: `backend/src/main/java/com/fluenta/api/config/AiProperties.java` (add `maxImageBytes`)
- Modify: `backend/src/main/resources/application.yml` (add `max-image-bytes`)
- Modify: `backend/src/main/java/com/fluenta/api/dto/AiDtos.java`

**Interfaces:**
- Produces: `AiClient.vision(String systemPrompt, String userText, List<ImageInput> images) -> String`; `AiClient.ImageInput(String base64, String mediaType)`. `AiProperties.maxImageBytes()`. `AiDtos`: `StudioQuestionDto(String prompt, String type, List<String> options, String answer, Integer wordLimit)`, `StudioGenerateRequest(String passageText, String questionType, Integer count)`, `StudioImage(String base64, String mediaType)`, `StudioFillRequest(String passageText, List<StudioQuestionDto> questions)`, `StudioExtractRequest(List<StudioImage> images, String hint)`, `StudioQuestionsReply(List<StudioQuestionDto> questions)`, `StudioExtractResult(String passageText, List<StudioQuestionDto> questions)`.

Scaffolding — verified by the full suite compiling + green.

- [ ] **Step 1: Add `vision` + `ImageInput` to `AiClient.java`:**

```java
    /** Vision: one user message with the given images + text. */
    String vision(String systemPrompt, String userText, List<ImageInput> images);

    record ImageInput(String base64, String mediaType) {}  // mediaType e.g. "image/jpeg", "image/png"
```

- [ ] **Step 2: Implement `vision(...)` in `AnthropicAiClient.java`** — confirm the SDK image-block names via `javap` if they don't compile (see Global Constraints). Add imports as needed:

```java
    @Override
    public String vision(String systemPrompt, String userText, java.util.List<ImageInput> images) {
        try {
            java.util.List<com.anthropic.models.messages.ContentBlockParam> blocks = new java.util.ArrayList<>();
            for (ImageInput img : images) {
                var source = com.anthropic.models.messages.Base64ImageSource.builder()
                        .mediaType(com.anthropic.models.messages.Base64ImageSource.MediaType.of(img.mediaType()))
                        .data(img.base64())
                        .build();
                blocks.add(com.anthropic.models.messages.ContentBlockParam.ofImage(
                        com.anthropic.models.messages.ImageBlockParam.builder().source(source).build()));
            }
            blocks.add(com.anthropic.models.messages.ContentBlockParam.ofText(
                    com.anthropic.models.messages.TextBlockParam.builder().text(userText).build()));

            MessageCreateParams params = MessageCreateParams.builder()
                    .model(props.model())
                    .maxTokens(16000L)
                    .thinking(ThinkingConfigAdaptive.builder().build())
                    .outputConfig(OutputConfig.builder().effort(effort()).build())
                    .system(systemPrompt)
                    .addUserMessageOfBlockParams(blocks)
                    .build();
            Message response = client().messages().create(params);
            StringBuilder sb = new StringBuilder();
            response.content().forEach(block -> block.text().ifPresent(x -> sb.append(x.text())));
            return sb.toString();
        } catch (AnthropicServiceException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The Studio AI is temporarily unavailable. Please try again.");
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The Studio AI could not be reached. Please try again.");
        }
    }
```
> If `Base64ImageSource` / `MediaType.of` / `ImageBlockParam` / `ofImage` / `addUserMessageOfBlockParams` don't match the SDK, `javap` the classes and fix ONLY those names. Keep the request/parse structure.

- [ ] **Step 3: Add `maxImageBytes` to `AiProperties.java`** — add the record component (with `@DefaultValue`) and an accessor is auto-generated:

```java
        @DefaultValue("5000000") int maxImageBytes,
```
Place it after `maxEssayChars` in the record parameter list (before `persist`), and add `max-image-bytes: ${FLUENTA_AI_MAX_IMAGE_BYTES:5000000}` under `fluenta.ai` in `application.yml`. (Note: this changes the `AiProperties` canonical constructor — the existing tests that construct `new AiProperties(...)` positionally must add the new arg; grep for `new AiProperties(` in `src/test` and update each call, inserting `5000000` in the new position. Confirm with `mvn` in Step 5.)

- [ ] **Step 4: Add studio records to `AiDtos.java`** (inside the class):

```java
    public record StudioQuestionDto(String prompt, String type, List<String> options, String answer, Integer wordLimit) {}
    public record StudioGenerateRequest(String passageText, String questionType, Integer count) {}
    public record StudioImage(String base64, String mediaType) {}
    public record StudioFillRequest(String passageText, List<StudioQuestionDto> questions) {}
    public record StudioExtractRequest(List<StudioImage> images, String hint) {}
    public record StudioQuestionsReply(List<StudioQuestionDto> questions) {}
    public record StudioExtractResult(String passageText, List<StudioQuestionDto> questions) {}
```

- [ ] **Step 5: Verify compile + no regression** — `mvn -q test -DforkCount=0`. Fix any `new AiProperties(...)` call sites broken by Step 3. Expected: BUILD SUCCESS, full suite green. If `AnthropicAiClient` fails to compile on an SDK image name, fix per the javap note.

- [ ] **Step 6: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/AiClient.java \
  backend/src/main/java/com/fluenta/api/service/AnthropicAiClient.java \
  backend/src/main/java/com/fluenta/api/config/AiProperties.java \
  backend/src/main/resources/application.yml \
  backend/src/main/java/com/fluenta/api/dto/AiDtos.java \
  backend/src/test
git commit -m "$(printf 'feat(backend): AiClient.vision + studio DTOs + max-image-bytes\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SB2: `StubStudioAuthor` (offline heuristics)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/studio/StubStudioAuthor.java`
- Test: `backend/src/test/java/com/fluenta/api/StubStudioAuthorTest.java`

**Interfaces:**
- Produces: `StubStudioAuthor` (`@Component`) — `List<StudioQuestionDto> generate(String type, int count)`, `List<StudioQuestionDto> fill(List<StudioQuestionDto> questions, String fallbackType)`, `StudioExtractResult extract()`. Ported from the web `aiQuestions`/`defaultAnswerFor`. Deterministic; no model call.

- [ ] **Step 1: Write the failing test `StubStudioAuthorTest.java`:**

```java
package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.StudioQuestionDto;
import com.fluenta.api.service.studio.StubStudioAuthor;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StubStudioAuthorTest {
    private final StubStudioAuthor stub = new StubStudioAuthor();

    @Test
    void generateProducesTypedQuestionsWithAnswers() {
        var qs = stub.generate("true-false-notgiven", 3);
        assertThat(qs).hasSize(3);
        assertThat(qs).allSatisfy(q -> {
            assertThat(q.prompt()).isNotBlank();
            assertThat(q.answer()).isEqualTo("TRUE");
            assertThat(q.type()).isEqualTo("true-false-notgiven");
        });
        assertThat(stub.generate("multiple-choice", 2))
                .allSatisfy(q -> { assertThat(q.options()).hasSize(4); assertThat(q.answer()).isEqualTo("A"); });
    }

    @Test
    void fillOnlySetsAnswersLeavingPromptsIntact() {
        var input = List.of(new StudioQuestionDto("Q1", "yes-no-notgiven", null, "", null));
        var out = stub.fill(input, "yes-no-notgiven");
        assertThat(out).singleElement().satisfies(q -> {
            assertThat(q.prompt()).isEqualTo("Q1");
            assertThat(q.answer()).isEqualTo("YES");
        });
    }

    @Test
    void extractReturnsPassageAndQuestions() {
        var r = stub.extract();
        assertThat(r.passageText()).isNotBlank();
        assertThat(r.questions()).isNotEmpty();
    }
}
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=StubStudioAuthorTest`. Expected: FAIL (class missing).

- [ ] **Step 3: Create `StubStudioAuthor.java`** (ports `aiQuestions`/`defaultAnswerFor`):

```java
package com.fluenta.api.service.studio;

import com.fluenta.api.dto.AiDtos.StudioExtractResult;
import com.fluenta.api.dto.AiDtos.StudioQuestionDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** Offline/free Studio authoring: deterministic placeholders (ported from the web aiQuestions/defaultAnswerFor). */
@Component
public class StubStudioAuthor {

    public static String defaultAnswerFor(String type) {
        if ("true-false-notgiven".equals(type)) return "TRUE";
        if ("yes-no-notgiven".equals(type)) return "YES";
        if ("multiple-choice".equals(type) || "multi-select".equals(type)) return "A";
        return "sample";
    }

    private static List<String> optionsFor(String type) {
        if ("multi-select".equals(type)) return List.of("", "", "", "", "");
        if ("multiple-choice".equals(type)) return List.of("", "", "", "");
        return null;
    }

    public List<StudioQuestionDto> generate(String type, int count) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            out.add(new StudioQuestionDto(
                    i == 0 ? "AI-generated question about the content." : "Another AI-generated question.",
                    type, optionsFor(type), defaultAnswerFor(type), 2));
        }
        return out;
    }

    public List<StudioQuestionDto> fill(List<StudioQuestionDto> questions, String fallbackType) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (StudioQuestionDto q : questions) {
            String type = q.type() != null ? q.type() : fallbackType;
            String answer = (q.answer() != null && !q.answer().isBlank()) ? q.answer() : defaultAnswerFor(type);
            out.add(new StudioQuestionDto(q.prompt(), q.type(), q.options(), answer, q.wordLimit()));
        }
        return out;
    }

    public StudioExtractResult extract() {
        return new StudioExtractResult(
                "Extracted passage text (offline placeholder). Connect the AI service to read your photos.",
                generate("true-false-notgiven", 2));
    }
}
```

- [ ] **Step 4: Run the test** — `mvn -q test -DforkCount=0 -Dtest=StubStudioAuthorTest`. Expected: PASS.

- [ ] **Step 5: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/studio/StubStudioAuthor.java \
  backend/src/test/java/com/fluenta/api/StubStudioAuthorTest.java
git commit -m "$(printf 'feat(backend): offline studio authoring stub\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SB3: `StudioAiService` (generate / fill / extract + normalization gate)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/StudioAiService.java`
- Test: `backend/src/test/java/com/fluenta/api/StudioAiServiceTest.java`

**Interfaces:**
- Consumes: `AiProperties`, `AiClient` (+`ImageInput`), `StubStudioAuthor`, `ObjectMapper`, `AiDtos.*`, `ApiException`.
- Produces: `StudioAiService.generate(StudioGenerateRequest) -> StudioQuestionsReply`, `fill(StudioFillRequest) -> StudioQuestionsReply`, `extract(StudioExtractRequest) -> StudioExtractResult`. Offline → `StubStudioAuthor`. Live → `AiClient` (text for generate/fill, `vision` for extract) then parse + **normalize** to valid `StudioQuestion` shapes.

- [ ] **Step 1: Write the failing test `StudioAiServiceTest.java`** (mocks `AiClient`; forces live):

```java
package com.fluenta.api;

import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.StudioAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {"fluenta.ai.enabled=true", "fluenta.ai.api-key=sk-test"})
class StudioAiServiceTest {

    @MockBean AiClient ai;
    @Autowired StudioAiService studio;

    @Test
    void generateNormalizesTypeOptionsAndAnswer() {
        // Model returns a bad band-y answer + missing options for an MC question.
        when(ai.complete(anyString(), anyString())).thenReturn("""
            {"questions":[
              {"prompt":"Which is correct?","type":"multiple-choice","answer":"banana"},
              {"prompt":"","type":"multiple-choice","answer":"B"}
            ]}""");
        var r = studio.generate(new StudioGenerateRequest("Some passage", "multiple-choice", 2));
        assertThat(r.questions()).hasSize(1);                      // blank-prompt question dropped
        var q = r.questions().get(0);
        assertThat(q.type()).isEqualTo("multiple-choice");
        assertThat(q.options()).hasSize(4);                        // padded to 4
        assertThat(q.answer()).matches("[A-D]");                   // coerced to a valid letter
    }

    @Test
    void fillReturnsAnswersForEachQuestion() {
        when(ai.complete(anyString(), anyString())).thenReturn(
            "{\"questions\":[{\"prompt\":\"Q1\",\"type\":\"true-false-notgiven\",\"answer\":\"false\"}]}");
        var r = studio.fill(new StudioFillRequest("passage",
                List.of(new StudioQuestionDto("Q1", "true-false-notgiven", null, "", null))));
        assertThat(r.questions()).singleElement().satisfies(q ->
                assertThat(q.answer()).isEqualTo("FALSE"));          // uppercased/validated
    }

    @Test
    void extractUsesVisionAndParses() {
        when(ai.vision(anyString(), anyString(), anyList())).thenReturn(
            "{\"passageText\":\"A chart shows sales rising.\",\"questions\":[{\"prompt\":\"Sales rose?\",\"type\":\"yes-no-notgiven\",\"answer\":\"YES\"}]}");
        var r = studio.extract(new StudioExtractRequest(
                List.of(new StudioImage("aGVsbG8=", "image/png")), null));
        assertThat(r.passageText()).contains("chart");
        assertThat(r.questions()).singleElement().satisfies(q ->
                assertThat(q.answer()).isEqualTo("YES"));
        verify(ai).vision(anyString(), anyString(), anyList());
    }

    @Test
    void rejectsOversizeImage() {
        String big = "a".repeat(6_000_001);  // > default 5MB cap (chars ≈ bytes here)
        assertThatThrownBy(() -> studio.extract(new StudioExtractRequest(
                List.of(new StudioImage(big, "image/png")), null))).isInstanceOf(com.fluenta.api.web.ApiException.class);
    }
}
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=StudioAiServiceTest`. Expected: FAIL (service missing).

- [ ] **Step 3: Create `StudioAiService.java`:**

```java
package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.dto.AiDtos.*;
import com.fluenta.api.service.studio.StubStudioAuthor;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Studio authoring: generate/fill questions (text) and extract (vision), normalized to StudioQuestion shape. */
@Service
public class StudioAiService {

    private static final Set<String> TYPES = Set.of(
            "true-false-notgiven", "yes-no-notgiven", "multiple-choice", "multi-select",
            "matching-information", "matching-headings", "matching-features", "matching-sentence-endings",
            "sentence-completion", "summary-completion", "diagram-label", "short-answer");
    private static final Set<String> TEXT_TYPES = Set.of(
            "sentence-completion", "summary-completion", "diagram-label", "short-answer");

    private static final String GEN_SYSTEM = """
        You are an IELTS item writer. Write questions grounded ONLY in the given passage. Return ONLY a JSON
        object {"questions":[{"prompt":string,"type":string,"options":[string]?,"answer":string,"wordLimit":number?}]}.
        Use the requested question type. For multiple-choice give 4 options and answer a letter A-D; for multi-select
        give 5 options (A-E); for true-false-notgiven answer TRUE/FALSE/NOT GIVEN; for yes-no-notgiven answer
        YES/NO/NOT GIVEN; for completion/short-answer answer the exact words from the passage. No prose, no fences.""";
    private static final String FILL_SYSTEM = """
        You are an IELTS examiner. For each question (prompt + type + options), return the correct answer grounded in
        the passage, preserving prompt/type/options and order. Return ONLY {"questions":[...]} with the same shape as
        the input plus a correct "answer" per the type's convention (letter for choice; TRUE/FALSE/NOT GIVEN etc.). No prose.""";
    private static final String EXTRACT_SYSTEM = """
        You read an uploaded image for an IELTS author. If it is a reading passage or question sheet, transcribe the
        passage into "passageText" and structure its questions. If it is a chart/graph/diagram/map/process, write a
        concise relevant passage/description into "passageText" and generate grounded questions. Return ONLY a JSON
        object {"passageText":string,"questions":[{"prompt","type","options"?,"answer","wordLimit"?}]}. No prose, no fences.""";

    private final AiProperties props;
    private final AiClient ai;
    private final StubStudioAuthor stub;
    private final ObjectMapper om;

    public StudioAiService(AiProperties props, AiClient ai, StubStudioAuthor stub, ObjectMapper om) {
        this.props = props; this.ai = ai; this.stub = stub; this.om = om;
    }

    public StudioQuestionsReply generate(StudioGenerateRequest req) {
        String passage = req.passageText() == null ? "" : req.passageText();
        if (passage.length() > props.maxEssayChars()) throw ApiException.badRequest("Passage is too long");
        String type = TYPES.contains(req.questionType()) ? req.questionType() : "short-answer";
        int count = clamp(req.count() == null ? 2 : req.count(), 1, 20);
        if (!props.live()) return new StudioQuestionsReply(stub.generate(type, count));
        String user = "QUESTION TYPE: " + type + "\nCOUNT: " + count + "\nPASSAGE:\n" + passage;
        return new StudioQuestionsReply(normalize(parse(ai.complete(GEN_SYSTEM, user)), type));
    }

    public StudioQuestionsReply fill(StudioFillRequest req) {
        List<StudioQuestionDto> qs = req.questions() == null ? List.of() : req.questions();
        if (qs.isEmpty()) throw ApiException.badRequest("No questions to fill");
        String fallback = qs.get(0).type() != null && TYPES.contains(qs.get(0).type()) ? qs.get(0).type() : "short-answer";
        if (!props.live()) return new StudioQuestionsReply(stub.fill(qs, fallback));
        String user;
        try { user = "PASSAGE:\n" + (req.passageText() == null ? "" : req.passageText())
                + "\nQUESTIONS JSON:\n" + om.writeValueAsString(qs); }
        catch (Exception e) { throw ApiException.badRequest("Bad questions payload"); }
        return new StudioQuestionsReply(normalize(parse(ai.complete(FILL_SYSTEM, user)), fallback));
    }

    public StudioExtractResult extract(StudioExtractRequest req) {
        List<StudioImage> images = req.images() == null ? List.of() : req.images();
        if (images.isEmpty()) throw ApiException.badRequest("No image provided");
        long bytes = images.stream().mapToLong(i -> i.base64() == null ? 0 : i.base64().length()).sum();
        if (bytes > props.maxImageBytes()) throw ApiException.badRequest("Image is too large");
        if (!props.live()) return stub.extract();
        List<AiClient.ImageInput> imgs = new ArrayList<>();
        for (StudioImage i : images) imgs.add(new AiClient.ImageInput(i.base64(), i.mediaType()));
        String hint = req.hint() == null || req.hint().isBlank() ? "" : ("\nHINT: " + req.hint());
        JsonNode node = parse(ai.vision(EXTRACT_SYSTEM, "Extract into the JSON schema." + hint, imgs));
        String passageText = node.path("passageText").asText("");
        List<StudioQuestionDto> qs = normalize(readQuestions(node), "short-answer");
        return new StudioExtractResult(passageText, qs);
    }

    // --- parsing + normalization gate ---

    private JsonNode parse(String raw) {
        if (raw == null) throw ApiException.badRequest("Empty AI response");
        String s = raw.trim();
        int a = s.indexOf('{'), b = s.lastIndexOf('}');
        if (a < 0 || b <= a) throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        try { return om.readTree(s.substring(a, b + 1)); }
        catch (Exception e) { throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "Could not read the AI response."); }
    }

    private List<StudioQuestionDto> readQuestions(JsonNode node) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (JsonNode q : node.path("questions")) {
            List<String> options = new ArrayList<>();
            for (JsonNode o : q.path("options")) options.add(o.asText(""));
            Integer wl = q.hasNonNull("wordLimit") ? q.get("wordLimit").asInt() : null;
            out.add(new StudioQuestionDto(q.path("prompt").asText(""), q.path("type").asText(null),
                    options.isEmpty() ? null : options, q.path("answer").asText(""), wl));
        }
        return out;
    }
    private List<StudioQuestionDto> parseQuestions(JsonNode node) { return readQuestions(node); }

    List<StudioQuestionDto> normalize(List<StudioQuestionDto> raw, String fallbackType) {
        List<StudioQuestionDto> out = new ArrayList<>();
        for (StudioQuestionDto q : raw) {
            if (q.prompt() == null || q.prompt().isBlank()) continue;
            String type = (q.type() != null && TYPES.contains(q.type())) ? q.type() : fallbackType;
            List<String> options = null;
            if ("multiple-choice".equals(type)) options = pad(q.options(), 4);
            else if ("multi-select".equals(type)) options = pad(q.options(), 5);
            String answer = normalizeAnswer(type, q.answer(), options);
            Integer wl = TEXT_TYPES.contains(type) ? (q.wordLimit() == null ? 2 : q.wordLimit()) : q.wordLimit();
            out.add(new StudioQuestionDto(q.prompt(), type, options, answer, wl));
        }
        return out;
    }

    private String normalizeAnswer(String type, String answer, List<String> options) {
        String a = answer == null ? "" : answer.trim();
        switch (type) {
            case "multiple-choice": return letterInRange(a, 4);
            case "multi-select": return letterInRange(a, 5);
            case "true-false-notgiven": {
                String u = a.toUpperCase();
                return Set.of("TRUE", "FALSE", "NOT GIVEN").contains(u) ? u : "TRUE";
            }
            case "yes-no-notgiven": {
                String u = a.toUpperCase();
                return Set.of("YES", "NO", "NOT GIVEN").contains(u) ? u : "YES";
            }
            default: return a.isBlank() ? "sample" : a;
        }
    }

    private String letterInRange(String a, int n) {
        String u = a.toUpperCase();
        if (u.length() == 1 && u.charAt(0) >= 'A' && u.charAt(0) < 'A' + n) return u;
        return "A";
    }

    private List<String> pad(List<String> opts, int n) {
        List<String> out = new ArrayList<>(opts == null ? List.of() : opts);
        while (out.size() < n) out.add("");
        return out.subList(0, n);
    }

    private int clamp(int v, int lo, int hi) { return Math.max(lo, Math.min(hi, v)); }
}
```

- [ ] **Step 4: Run the test** — `mvn -q test -DforkCount=0 -Dtest=StudioAiServiceTest`. Expected: PASS.

- [ ] **Step 5: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/StudioAiService.java \
  backend/src/test/java/com/fluenta/api/StudioAiServiceTest.java
git commit -m "$(printf 'feat(backend): studio AI service + normalization gate\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SB4: `AiController` studio endpoints + contract tests

**Files:**
- Modify: `backend/src/main/java/com/fluenta/api/web/AiController.java`
- Modify: `backend/src/test/java/com/fluenta/api/HttpContractTest.java`

**Interfaces:**
- Consumes: `StudioAiService`, `CurrentUser.requireAdmin()`.
- Produces: `POST /api/ai/studio-generate|studio-fill|studio-extract` (admin).

- [ ] **Step 1: Add contract tests to `HttpContractTest.java`** — `login()` (Sara) is admin; add a helper to register a student:

```java
    private String registerStudent() throws Exception {
        String email = "stud" + System.nanoTime() + "@example.com";
        String body = "{\"email\":\"" + email + "\",\"password\":\"pw123456\",\"name\":\"Stud\"}";
        MvcResult res = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void studioGenerateAsAdminReturnsQuestions() throws Exception {
        String token = login(); // Sara = admin
        String body = "{\"passageText\":\"The Nile is a river in Africa.\",\"questionType\":\"true-false-notgiven\",\"count\":2}";
        mvc.perform(post("/api/ai/studio-generate").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions").isArray())
                .andExpect(jsonPath("$.questions[0].prompt").isNotEmpty());
    }

    @Test
    void studioRequiresAdmin() throws Exception {
        String token = registerStudent();
        mvc.perform(post("/api/ai/studio-generate").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"passageText\":\"x\",\"questionType\":\"short-answer\",\"count\":1}"))
                .andExpect(status().isForbidden());
    }
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=HttpContractTest#studioGenerateAsAdminReturnsQuestions`. Expected: FAIL (501/404 today).

- [ ] **Step 3: Add the endpoints to `AiController.java`** — inject `StudioAiService`, add three routes:

```java
    @PostMapping("/studio-generate")
    public AiDtos.StudioQuestionsReply studioGenerate(@RequestBody AiDtos.StudioGenerateRequest req) {
        CurrentUser.requireAdmin();
        return studio.generate(req);
    }

    @PostMapping("/studio-fill")
    public AiDtos.StudioQuestionsReply studioFill(@RequestBody AiDtos.StudioFillRequest req) {
        CurrentUser.requireAdmin();
        return studio.fill(req);
    }

    @PostMapping("/studio-extract")
    public AiDtos.StudioExtractResult studioExtract(@RequestBody AiDtos.StudioExtractRequest req) {
        CurrentUser.requireAdmin();
        return studio.extract(req);
    }
```
Add `StudioAiService studio` to the constructor (now `AiController(WritingFeedbackService writing, CoachService coach, StudioAiService studio)`) and the field + import. Keep the writing/coach routes and the 501 catch-all unchanged.

- [ ] **Step 4: Run the AI contract tests** — `mvn -q test -DforkCount=0 -Dtest=HttpContractTest`. Expected: PASS (admin 200; student 403; coach/writing/live-interview unchanged).

- [ ] **Step 5: Full backend suite** — `mvn -q test -DforkCount=0`. Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/web/AiController.java \
  backend/src/test/java/com/fluenta/api/HttpContractTest.java
git commit -m "$(printf 'feat(backend): admin studio-generate/fill/extract endpoints\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

# Part B — Web (`D:\personal\fluenta-web`, branch `feat/ai-studio-authoring`)

Gate = `npm run lint` + `npm run build`.

### Task SW1: `api.ai.studio*` + AiButton loading

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/features/studio/components.tsx`

**Interfaces:**
- Produces: types `AiStudioQuestion`, request/reply types, `api.ai.studioGenerate/studioFill/studioExtract`; `AiButton` gains an optional `loading?: boolean` (spinner + disabled while loading).

- [ ] **Step 1: Add to `src/lib/api.ts`** — types + methods in the `ai` group:

```ts
export interface AiStudioQuestion {
  prompt: string;
  type?: string;
  options?: string[];
  answer: string;
  wordLimit?: number;
}
export interface AiStudioGenerateRequest { passageText: string; questionType: string; count: number; }
export interface AiStudioFillRequest { passageText: string; questions: AiStudioQuestion[]; }
export interface AiStudioImage { base64: string; mediaType: string; }
export interface AiStudioExtractRequest { images: AiStudioImage[]; hint?: string; }
export interface AiStudioQuestionsReply { questions: AiStudioQuestion[]; }
export interface AiStudioExtractResult { passageText: string; questions: AiStudioQuestion[]; }
```
Inside `api.ai`:
```ts
    studioGenerate: (req: AiStudioGenerateRequest) => request<AiStudioQuestionsReply>("POST", "/ai/studio-generate", req),
    studioFill: (req: AiStudioFillRequest) => request<AiStudioQuestionsReply>("POST", "/ai/studio-fill", req),
    studioExtract: (req: AiStudioExtractRequest) => request<AiStudioExtractResult>("POST", "/ai/studio-extract", req),
```

- [ ] **Step 2: Extend `AiButton` in `components.tsx`** — add `loading?`, show a spinner and disable while loading:

```tsx
import { Sparkles, Loader2 } from "lucide-react";

export function AiButton({ label, onClick, disabled, loading }: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-info/40 bg-info/[0.06] px-2.5 py-1.5 text-xs font-semibold text-info transition-colors hover:bg-info/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {label}
    </button>
  );
}
```
(Ensure `Sparkles` is still imported; add `Loader2`.)

- [ ] **Step 3: Verify** — `npm run lint` + `npm run build`, both clean. Commit:

```bash
git add src/lib/api.ts src/features/studio/components.tsx
git commit -m "$(printf 'feat(web): api.ai.studio* client + AiButton loading state\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task SW2: Wire Reading + Listening editors

**Files:**
- Modify: `src/features/studio/editors/ReadingEditor.tsx`
- Modify: `src/features/studio/editors/ListeningEditor.tsx`

**Interfaces:**
- Consumes: `api.ai.studioGenerate/studioFill/studioExtract` (SW1), the existing `aiQuestions`/`defaultAnswerFor` (kept as fallback).

Pattern for each button: set a per-key busy flag, call the API, merge the result, and **on error fall back to the existing local heuristic**. Use a small busy-state map. Add near the top of each editor component:

```tsx
import { api } from "@/lib/api";
// ...
const [busy, setBusy] = useState<Record<string, boolean>>({});
const setB = (k: string, v: boolean) => setBusy((m) => ({ ...m, [k]: v }));
const withId = (q: { prompt: string; type?: string; options?: string[]; answer: string; wordLimit?: number }) =>
  ({ id: Math.random().toString(36).slice(2, 9), ...q });
```

- [ ] **Step 1: ReadingEditor — Generate** (replace the existing `onClick`):

```tsx
                  <AiButton
                    label="Generate with AI"
                    loading={busy[`gen:${p.id}`]}
                    onClick={async () => {
                      setB(`gen:${p.id}`, true);
                      try {
                        const res = await api.ai.studioGenerate({ passageText: p.text, questionType: p.questionType, count: Math.max(1, p.questions.length || 2) });
                        setP(idx, { questions: [...p.questions, ...res.questions.map(withId)] });
                      } catch {
                        setP(idx, { questions: [...p.questions, ...aiQuestions(p.questionType)] });
                      } finally { setB(`gen:${p.id}`, false); }
                    }}
                  />
```

- [ ] **Step 2: ReadingEditor — Fill** (replace the existing `onClick`; still gated by `fillDisabled`):

```tsx
                  <AiButton
                    label="Fill Missing Answers with AI"
                    disabled={fillDisabled}
                    loading={busy[`fill:${p.id}`]}
                    onClick={async () => {
                      setB(`fill:${p.id}`, true);
                      try {
                        const res = await api.ai.studioFill({ passageText: p.text, questions: p.questions.map((q) => ({ prompt: q.prompt, type: q.type, options: q.options, answer: q.answer, wordLimit: q.wordLimit })) });
                        const filled = res.questions;
                        setP(idx, { questions: p.questions.map((q, i) => (q.answer ? q : { ...q, answer: filled[i]?.answer ?? defaultAnswerFor(q.type ?? p.questionType) })) });
                      } catch {
                        setP(idx, { questions: p.questions.map((q) => (q.answer ? q : { ...q, answer: defaultAnswerFor(q.type ?? p.questionType) })) });
                      } finally { setB(`fill:${p.id}`, false); }
                    }}
                  />
```

- [ ] **Step 3: ReadingEditor — Extract** (the `inputMode === "extract"` block). Read the selected image file as base64 and call the endpoint; keep the placeholder as fallback. The current block uses `MediaDrop` with `imageName`; add a hidden file read via an `<input type="file">` ref or reuse the existing image selection to get a `File`. Minimal approach — add a file input for extract:

```tsx
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setB(`ext:${p.id}`, true);
                        try {
                          const base64 = await fileToBase64(file);
                          const res = await api.ai.studioExtract({ images: [{ base64, mediaType: file.type || "image/jpeg" }] });
                          setP(idx, { text: res.passageText || p.text, questions: [...p.questions, ...res.questions.map(withId)] });
                        } catch {
                          setP(idx, { text: p.text || "Extracted passage text (offline). Connect the AI service to read photos.", questions: [...p.questions, newQuestion(), newQuestion()] });
                        } finally { setB(`ext:${p.id}`, false); }
                      }}
                    />
                    <AiButton label="Extract passage & questions" loading={busy[`ext:${p.id}`]} onClick={() => { /* button triggers the file input above; or keep as a hint */ }} />
```
Add a `fileToBase64` helper (strip the data-URL prefix) at module scope:
```tsx
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
```
(If wiring the `AiButton` to programmatically open the file input is cleaner, use a `useRef<HTMLInputElement>` and `onClick={() => ref.current?.click()}`; either is acceptable as long as choosing an image triggers `studioExtract` and errors fall back to the placeholder.)

- [ ] **Step 4: ListeningEditor — Generate + Fill** — same as Steps 1–2 but with `setS(idx, ...)`, `s.questions`, `s.questionType`, and `passageText: s.transcript` for the request. (Listening has no Extract button — skip it.)

- [ ] **Step 5: Verify** — `npm run lint` + `npm run build`, both clean. (No backend reachable here; the error path exercises the local-heuristic fallback.)

- [ ] **Step 6: Commit:**

```bash
git add src/features/studio/editors/ReadingEditor.tsx src/features/studio/editors/ListeningEditor.tsx
git commit -m "$(printf 'feat(web): wire Studio Generate/Fill/Extract to the AI endpoints\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

# Part C — Close-out

### Task SZ: Docs + roadmap (graphify handled by the controller)

**Files:**
- Modify: `D:\personal\fluenta-web\docs\ai-llm-mvp-pending.md` (tick §2c Studio)
- Modify: `D:\personal\fluenta-web\docs\ROADMAP.md`

- [ ] **Step 1:** In `docs/ai-llm-mvp-pending.md`, mark **§2c Studio Generate / Extract / Fill** done (note: admin-gated `/api/ai/studio-*`, vision extract via base64 images, structured normalization gate, offline heuristic fallback, Reading/Listening wired; web-only). Leave §2d Speaking / §2e Live Interview held.
- [ ] **Step 2:** In `docs/ROADMAP.md`, flip the Studio AI item → done, matching the file's format. (No mobile ROADMAP change — Studio is web-only.)
- [ ] **Step 3: Commit:**

```bash
git add docs/ai-llm-mvp-pending.md docs/ROADMAP.md
git commit -m "$(printf 'docs: mark AI Studio authoring (2c) done\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

- [ ] **Step 4:** Graphify refresh (web + backend) is run by the controller after the final review (mobile untouched this phase).

---

## Post-plan: integration verification (not on this machine)

A real check needs a host with a key + socket: set `ANTHROPIC_API_KEY`, run the server, and in the Studio (as an admin) generate questions from a passage, fill answers, and extract from a photo of a passage AND a photo of a chart/graph — confirming real typed questions and a relevant generated description. Here, verification is the MockMvc suite (offline + normalization gate) + `npm run lint`/`build`.

---

## Self-Review

**Spec coverage:** §3.1 AiClient.vision → SB1. §3.2 StudioAiService (generate/fill/extract, live/offline) → SB3. §3.3 normalization gate → SB3 (`normalize`). §3.4 StubStudioAuthor → SB2. §4 endpoints + DTOs + admin gating + 403/200 tests → SB1/SB4. §5 web wiring → SW1/SW2. §6 safety (admin, caps, gate) → SB3/SB4. §7 tests → SB2/SB3/SB4 + SW gates. §8 image cap/size + graphify → SB1/SZ. All covered.

**Placeholder scan:** No "TBD"/"add validation"/"similar to Task N". Every code step has real code; every test step has a runnable command + expected result. The one build-time confirmation (SDK image-block names) is a stated instruction with a javap fallback and a BLOCKED escape, not a gap.

**Type consistency:** `AiClient.vision(String,String,List<ImageInput>)` + `ImageInput(base64,mediaType)` defined SB1, used SB3. `AiDtos.Studio*` records defined SB1, used SB3/SB4 + web (`AiStudio*`) SW1/SW2. `StudioAiService.generate/fill/extract` signatures stable SB3→SB4. `StubStudioAuthor.generate/fill/extract` stable SB2→SB3. Normalization produces the exact `StudioQuestion` field set (`prompt,type,options,answer,wordLimit`) the web store consumes. Endpoint paths (`/ai/studio-generate|fill|extract`) match between `AiController` and `api.ts`.
