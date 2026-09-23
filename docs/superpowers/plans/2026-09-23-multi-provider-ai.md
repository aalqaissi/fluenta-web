# Multi-Provider AI Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LLM and speech-to-text providers selectable by config so the app runs on either Claude + OpenAI Whisper (default, unchanged) or the free Gemini + Groq pair — and adding future OpenAI-compatible providers is config-only.

**Architecture:** Keep `AnthropicAiClient` on its native SDK. Add one generic `OpenAiCompatibleAiClient` (over any OpenAI `/chat/completions` endpoint, incl. vision) and pick the single `AiClient` bean with a factory switching on `fluenta.ai.provider`. STT is already config-driven, so it just gains provider aliases and generic key names. Provider aliases preset base-url + model; explicit config overrides them.

**Tech Stack:** Java 21 / Spring Boot 3.3.5 / Maven / JUnit + MockMvc + Mockito · Anthropic Java SDK (unchanged) · `java.net.http` for the generic OpenAI-compatible client (same style as the existing `WhisperTranscriber`) · Jackson.

Spec: [`docs/superpowers/specs/2026-09-23-multi-provider-ai-design.md`](../specs/2026-09-23-multi-provider-ai-design.md). Builds on the AI seams (`AiClient`, `AnthropicAiClient`, `Transcriber`, `WhisperTranscriber`, `AiProperties`, `TranscribeProperties`) shipped in §2a–2e.

## Global Constraints

- **Backend only** (`fluenta-web/backend`). No web/mobile/endpoint changes.
- **Backward-compatible:** unconfigured = today's Claude + OpenAI Whisper, identical behavior (same default model `claude-sonnet-5`, same 16000 max-tokens on Anthropic). Existing tests stay green.
- **Selection is independent per seam:** `fluenta.ai.provider` (LLM, default `anthropic`) and `fluenta.ai.transcribe.provider` (STT, default `openai`).
- **Generic key env names:** `FLUENTA_AI_API_KEY` (LLM) and `FLUENTA_TRANSCRIBE_API_KEY` (STT), each falling back to the old `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`.
- **`live()` gating unchanged:** `enabled && api-key non-blank` → offline degrades to the deterministic stubs (never 501), for whichever provider is selected.
- **One generic client** for all non-Anthropic LLMs (`OpenAiCompatibleAiClient`), selected by a factory (`AiClientConfig`), which requires dropping `@Service` from `AnthropicAiClient`. Exactly one `AiClient` bean.
- **Alias presets** (LLM): `anthropic`→(n/a SDK, `claude-sonnet-5`), `openai`→(`https://api.openai.com/v1`, `gpt-4o-mini`), `gemini`→(`https://generativelanguage.googleapis.com/v1beta/openai`, `gemini-2.0-flash`), `groq`→(`https://api.groq.com/openai/v1`, `llama-3.3-70b-versatile`), `deepseek`→(`https://api.deepseek.com`, `deepseek-chat`), `openrouter`→(`https://openrouter.ai/api/v1`, none). STT: `openai`→(`https://api.openai.com/v1/audio/transcriptions`, `whisper-1`), `groq`→(`https://api.groq.com/openai/v1/audio/transcriptions`, `whisper-large-v3`). `base-url`/`model` config overrides the preset.
- **Compat client `max-tokens`** = `fluenta.ai.max-tokens` (default 8192). Anthropic keeps its hardcoded 16000 (no regression).
- **Backend can't bind a socket here:** verify with `mvn -q test -DforkCount=0` (in-process). NEVER start the server. If `AdminUsersContractTest` flakes on a re-run, delete `backend/data/fluenta.db*` and re-run; reset it before the final full-suite run. Live Gemini/Groq/OpenAI HTTP calls are **unverifiable here** — verify via pure request-build/response-parse unit tests + factory-selection tests + offline stubs.
- **Repo/branch:** `fluenta-web` branch `feat/multi-provider-ai` (create before starting; spec already committed to `main`).
- **Commit trailer:** end every commit body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (literal — do NOT substitute your own model name). Prefixes: `feat(backend)`, `test(...)`, `docs:`.

**Setup (once, before MP1):**
```bash
cd D:/personal/fluenta-web && git checkout main && git checkout -b feat/multi-provider-ai
```

---

### Task MP1: STT provider selection (`SttProviders` + `TranscribeProperties` + `WhisperTranscriber` + config)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/config/SttProviders.java`
- Modify: `backend/src/main/java/com/fluenta/api/config/TranscribeProperties.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/WhisperTranscriber.java`
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/fluenta/api/SttProvidersTest.java`

**Interfaces:**
- Produces: `SttProviders.baseUrl(String provider)` / `SttProviders.model(String provider)` (static, pure). `TranscribeProperties` gains `provider` (default `"openai"`), `providerOrDefault()`, `effectiveBaseUrl()`, `effectiveModel()`. `WhisperTranscriber` uses the effective values.

- [ ] **Step 1: Write the failing test `SttProvidersTest.java`:**

```java
package com.fluenta.api;

import com.fluenta.api.config.SttProviders;
import com.fluenta.api.config.TranscribeProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SttProvidersTest {

    @Test
    void aliasesResolveToPresets() {
        assertThat(SttProviders.baseUrl("openai")).isEqualTo("https://api.openai.com/v1/audio/transcriptions");
        assertThat(SttProviders.model("openai")).isEqualTo("whisper-1");
        assertThat(SttProviders.baseUrl("groq")).isEqualTo("https://api.groq.com/openai/v1/audio/transcriptions");
        assertThat(SttProviders.model("groq")).isEqualTo("whisper-large-v3");
        assertThat(SttProviders.baseUrl("unknown")).isEmpty();
    }

    @Test
    void effectiveValuesUsePresetThenOverride() {
        // provider openai, no explicit base-url/model -> preset
        var openai = new TranscribeProperties(true, "sk", "", "", 25_000_000L, 240, "openai");
        assertThat(openai.effectiveBaseUrl()).isEqualTo("https://api.openai.com/v1/audio/transcriptions");
        assertThat(openai.effectiveModel()).isEqualTo("whisper-1");
        // explicit override wins
        var override = new TranscribeProperties(true, "sk", "https://x/y", "custom", 25_000_000L, 240, "groq");
        assertThat(override.effectiveBaseUrl()).isEqualTo("https://x/y");
        assertThat(override.effectiveModel()).isEqualTo("custom");
        // default provider (blank) -> openai
        var blank = new TranscribeProperties(true, "sk", "", "", 25_000_000L, 240, "");
        assertThat(blank.effectiveModel()).isEqualTo("whisper-1");
    }
}
```
> Note the constructor arg order used here — `(enabled, apiKey, baseUrl, model, maxAudioBytes, maxAudioSeconds, provider)` — matches Step 3. `maxAudioBytes` is a `long` literal (`25_000_000L`).

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=SttProvidersTest`. Expected: FAIL (classes/methods missing).

- [ ] **Step 3: Create `SttProviders.java`:**

```java
package com.fluenta.api.config;

import java.util.Map;

/** STT provider alias -> default {base-url, model}. Pure; no Spring. */
public final class SttProviders {
    private SttProviders() {}

    private record Preset(String baseUrl, String model) {}

    private static final Map<String, Preset> PRESETS = Map.of(
            "openai", new Preset("https://api.openai.com/v1/audio/transcriptions", "whisper-1"),
            "groq",   new Preset("https://api.groq.com/openai/v1/audio/transcriptions", "whisper-large-v3"));

    public static String baseUrl(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.baseUrl();
    }

    public static String model(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.model();
    }
}
```

- [ ] **Step 4: Modify `TranscribeProperties.java`** — add `provider` (last arg), change `base-url`/`model` defaults to blank, add the effective/provider methods. The record currently is `(enabled, apiKey, baseUrl, model, maxAudioBytes, maxAudioSeconds)`; new form:

```java
@ConfigurationProperties("fluenta.ai.transcribe")
public record TranscribeProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("") String apiKey,
        @DefaultValue("") String baseUrl,      // blank -> resolved from provider preset
        @DefaultValue("") String model,        // blank -> resolved from provider preset
        @DefaultValue("25000000") long maxAudioBytes,
        @DefaultValue("240") int maxAudioSeconds,
        @DefaultValue("openai") String provider) {

    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public String providerOrDefault() {
        return provider == null || provider.isBlank() ? "openai" : provider.trim().toLowerCase();
    }

    public String effectiveBaseUrl() {
        return baseUrl != null && !baseUrl.isBlank() ? baseUrl : SttProviders.baseUrl(providerOrDefault());
    }

    public String effectiveModel() {
        return model != null && !model.isBlank() ? model : SttProviders.model(providerOrDefault());
    }

    @Override
    public String toString() {
        return "TranscribeProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", provider=" + provider + ", baseUrl=" + baseUrl + ", model=" + model
                + ", maxAudioBytes=" + maxAudioBytes + ", maxAudioSeconds=" + maxAudioSeconds + "]";
    }
}
```
> Keep whatever `import`s the file already had (e.g. `@ConfigurationProperties`, `@DefaultValue`); add `import com.fluenta.api.config.SttProviders;` is NOT needed (same package). If the existing `live()`/`toString()` differ, preserve their intent; only the field list, defaults, and the three new methods matter.

- [ ] **Step 5: Modify `WhisperTranscriber.java`** — use the effective values (two edits):
  - Line ~36: `HttpRequest.newBuilder(URI.create(props.baseUrl()))` → `URI.create(props.effectiveBaseUrl())`.
  - Line ~69 (`writeField(out, boundary, "model", props.model());`) → `props.effectiveModel()`.
  Nothing else changes.

- [ ] **Step 6: Modify the transcribe block in `application.yml`** (match the existing 2-space indentation under `fluenta.ai.transcribe`):

```yaml
    transcribe:
      enabled: ${FLUENTA_TRANSCRIBE_ENABLED:true}
      provider: ${FLUENTA_TRANSCRIBE_PROVIDER:openai}
      api-key: ${FLUENTA_TRANSCRIBE_API_KEY:${OPENAI_API_KEY:}}
      base-url: ${FLUENTA_TRANSCRIBE_URL:}
      model: ${FLUENTA_TRANSCRIBE_MODEL:}
      max-audio-bytes: ${FLUENTA_TRANSCRIBE_MAX_BYTES:25000000}
      max-audio-seconds: ${FLUENTA_TRANSCRIBE_MAX_SECONDS:240}
```

- [ ] **Step 7: Run the test + full suite** — `mvn -q test -DforkCount=0 -Dtest=SttProvidersTest` (PASS), then `mvn -q test -DforkCount=0` (BUILD SUCCESS; reset `backend/data/fluenta.db*` first if `AdminUsersContractTest` flakes). No test constructs `TranscribeProperties` positionally except the new one, and `WhisperTranscriber` is only exercised live (mocked at the seam elsewhere), so the suite stays green.

- [ ] **Step 8: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/config/SttProviders.java \
  backend/src/main/java/com/fluenta/api/config/TranscribeProperties.java \
  backend/src/main/java/com/fluenta/api/service/WhisperTranscriber.java \
  backend/src/main/resources/application.yml \
  backend/src/test/java/com/fluenta/api/SttProvidersTest.java
git commit -m "$(printf 'feat(backend): STT provider selection (openai/groq aliases) + generic key name\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task MP2: LLM provider config (`LlmProviders` + `AiProperties` fields/effective* + `AnthropicAiClient` model)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/config/LlmProviders.java`
- Modify: `backend/src/main/java/com/fluenta/api/config/AiProperties.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/AnthropicAiClient.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/test/java/com/fluenta/api/WritingFeedbackServiceTest.java` (constructor arity)
- Test: `backend/src/test/java/com/fluenta/api/LlmProvidersTest.java`

**Interfaces:**
- Produces: `LlmProviders.baseUrl(String)` / `LlmProviders.model(String)` (static, pure). `AiProperties` gains `provider` (default `"anthropic"`), `baseUrl` (default `""`), `maxTokens` (default `8192`), plus `providerOrDefault()`, `effectiveModel()`, `effectiveBaseUrl()`. `AnthropicAiClient` uses `props.effectiveModel()`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test `LlmProvidersTest.java`:**

```java
package com.fluenta.api;

import com.fluenta.api.config.AiProperties;
import com.fluenta.api.config.LlmProviders;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LlmProvidersTest {

    private AiProperties props(String provider, String baseUrl, String model) {
        return new AiProperties(true, "sk", model, "medium", 60, 12000, 5000000, false, provider, baseUrl, 8192);
    }

    @Test
    void aliasesResolveToPresets() {
        assertThat(LlmProviders.model("anthropic")).isEqualTo("claude-sonnet-5");
        assertThat(LlmProviders.baseUrl("gemini")).isEqualTo("https://generativelanguage.googleapis.com/v1beta/openai");
        assertThat(LlmProviders.model("gemini")).isEqualTo("gemini-2.0-flash");
        assertThat(LlmProviders.baseUrl("unknown")).isEmpty();
    }

    @Test
    void effectiveModelAndBaseUrlUsePresetThenOverride() {
        assertThat(props("anthropic", "", "").effectiveModel()).isEqualTo("claude-sonnet-5");   // default unchanged
        assertThat(props("gemini", "", "").effectiveModel()).isEqualTo("gemini-2.0-flash");
        assertThat(props("gemini", "", "").effectiveBaseUrl())
                .isEqualTo("https://generativelanguage.googleapis.com/v1beta/openai");
        assertThat(props("gemini", "https://x/y", "custom-model").effectiveModel()).isEqualTo("custom-model");
        assertThat(props("gemini", "https://x/y", "custom-model").effectiveBaseUrl()).isEqualTo("https://x/y");
        assertThat(props("", "", "").providerOrDefault()).isEqualTo("anthropic");
    }
}
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=LlmProvidersTest`. Expected: FAIL (won't compile — new args/methods missing).

- [ ] **Step 3: Create `LlmProviders.java`:**

```java
package com.fluenta.api.config;

import java.util.Map;

/** LLM provider alias -> default {base-url, model}. Anthropic base-url is n/a (native SDK). Pure; no Spring. */
public final class LlmProviders {
    private LlmProviders() {}

    private record Preset(String baseUrl, String model) {}

    private static final Map<String, Preset> PRESETS = Map.of(
            "anthropic",  new Preset("", "claude-sonnet-5"),
            "openai",     new Preset("https://api.openai.com/v1", "gpt-4o-mini"),
            "gemini",     new Preset("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.0-flash"),
            "groq",       new Preset("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
            "deepseek",   new Preset("https://api.deepseek.com", "deepseek-chat"),
            "openrouter", new Preset("https://openrouter.ai/api/v1", ""));

    public static String baseUrl(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.baseUrl();
    }

    public static String model(String provider) {
        Preset p = PRESETS.get(provider == null ? "" : provider.toLowerCase());
        return p == null ? "" : p.model();
    }
}
```

- [ ] **Step 4: Modify `AiProperties.java`** — append the three fields and add the methods. New form:

```java
@ConfigurationProperties("fluenta.ai")
public record AiProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("") String apiKey,
        @DefaultValue("") String model,
        @DefaultValue("medium") String effort,
        @DefaultValue("60") int timeoutSeconds,
        @DefaultValue("12000") int maxEssayChars,
        @DefaultValue("5000000") int maxImageBytes,
        @DefaultValue("true") boolean persist,
        @DefaultValue("anthropic") String provider,
        @DefaultValue("") String baseUrl,
        @DefaultValue("8192") int maxTokens) {

    public boolean live() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public String providerOrDefault() {
        return provider == null || provider.isBlank() ? "anthropic" : provider.trim().toLowerCase();
    }

    public String effectiveModel() {
        return model != null && !model.isBlank() ? model : LlmProviders.model(providerOrDefault());
    }

    public String effectiveBaseUrl() {
        return baseUrl != null && !baseUrl.isBlank() ? baseUrl : LlmProviders.baseUrl(providerOrDefault());
    }

    @Override
    public String toString() {
        return "AiProperties[enabled=" + enabled
                + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<blank>" : "<set>")
                + ", provider=" + provider + ", model=" + model + ", baseUrl=" + baseUrl
                + ", effort=" + effort + ", timeoutSeconds=" + timeoutSeconds
                + ", maxEssayChars=" + maxEssayChars + ", maxImageBytes=" + maxImageBytes
                + ", maxTokens=" + maxTokens + ", persist=" + persist + "]";
    }
}
```

- [ ] **Step 5: Modify `AnthropicAiClient.java`** — replace the three `props.model()` calls (in `complete`, `chat`, `vision`, each `.model(props.model())`) with `.model(props.effectiveModel())`. No other change; keep `@Service` for now (MP4 removes it).

- [ ] **Step 6: Modify the `ai` block in `application.yml`** — add provider/base-url/max-tokens and switch to the generic key + blank model default:

```yaml
  ai:
    enabled: ${FLUENTA_AI_ENABLED:true}
    provider: ${FLUENTA_AI_PROVIDER:anthropic}
    api-key: ${FLUENTA_AI_API_KEY:${ANTHROPIC_API_KEY:}}
    base-url: ${FLUENTA_AI_BASE_URL:}
    model: ${FLUENTA_AI_MODEL:}
    max-tokens: ${FLUENTA_AI_MAX_TOKENS:8192}
    effort: ${FLUENTA_AI_EFFORT:medium}
    timeout-seconds: ${FLUENTA_AI_TIMEOUT:60}
    max-essay-chars: ${FLUENTA_AI_MAX_ESSAY_CHARS:12000}
    max-image-bytes: ${FLUENTA_AI_MAX_IMAGE_BYTES:5000000}
    persist: ${FLUENTA_AI_PERSIST:true}
    transcribe:
      # (unchanged from MP1)
```
> Leave the `transcribe:` sub-block exactly as MP1 set it.

- [ ] **Step 7: Fix `WritingFeedbackServiceTest.java` constructor arity** — the 3 `new AiProperties(...)` calls each get `, "anthropic", "", 8192` appended (provider, baseUrl, maxTokens):
  - line ~18: `new AiProperties(false, "", "claude-sonnet-5", "medium", 60, 12000, 5000000, false, "anthropic", "", 8192)`
  - line ~50: `new AiProperties(true, "sk-test", "claude-sonnet-5", "medium", 60, 12000, 5000000, false, "anthropic", "", 8192)`
  - line ~78: `new AiProperties(false, "", "claude-sonnet-5", "medium", 60, 10, 5000000, false, "anthropic", "", 8192)`

- [ ] **Step 8: Run tests** — `mvn -q test -DforkCount=0 -Dtest=LlmProvidersTest,WritingFeedbackServiceTest` (PASS), then full suite `mvn -q test -DforkCount=0` (BUILD SUCCESS; reset the db file first if needed). `effectiveModel()` resolves to `claude-sonnet-5` for the default provider, so Anthropic behavior is unchanged.

- [ ] **Step 9: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/config/LlmProviders.java \
  backend/src/main/java/com/fluenta/api/config/AiProperties.java \
  backend/src/main/java/com/fluenta/api/service/AnthropicAiClient.java \
  backend/src/main/resources/application.yml \
  backend/src/test/java/com/fluenta/api/WritingFeedbackServiceTest.java \
  backend/src/test/java/com/fluenta/api/LlmProvidersTest.java
git commit -m "$(printf 'feat(backend): LLM provider config + aliases + generic key name\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task MP3: `OpenAiCompatibleAiClient` (generic LLM client)

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/service/OpenAiCompatibleAiClient.java`
- Test: `backend/src/test/java/com/fluenta/api/OpenAiCompatibleAiClientTest.java`

**Interfaces:**
- Consumes: `AiClient` (interface + `ChatTurn`/`ImageInput`), `AiProperties` (`effectiveBaseUrl()`/`effectiveModel()`/`apiKey()`/`maxTokens()`/`timeoutSeconds()`/`providerOrDefault()`), `ObjectMapper`, `ApiException`.
- Produces: `OpenAiCompatibleAiClient` (implements `AiClient`) — a plain class (NOT `@Component`); the MP4 factory instantiates it. Public-for-test builders `buildCompleteBody`/`buildChatBody`/`buildVisionBody` (return the request JSON) and `parseContent(String)`.

- [ ] **Step 1: Write the failing test `OpenAiCompatibleAiClientTest.java`** (pure — no network):

```java
package com.fluenta.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.OpenAiCompatibleAiClient;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiCompatibleAiClientTest {

    private final ObjectMapper om = new ObjectMapper();
    // provider gemini, explicit model so effectiveModel() is deterministic
    private final AiProperties props = new AiProperties(
            true, "sk", "gemini-2.0-flash", "medium", 60, 12000, 5000000, false, "gemini", "", 8192);
    private final OpenAiCompatibleAiClient client = new OpenAiCompatibleAiClient(props, om);

    @Test
    void completeBodyHasSystemAndUserAndModelAndMaxTokens() throws Exception {
        JsonNode b = om.readTree(client.buildCompleteBody("SYS", "USER"));
        assertThat(b.path("model").asText()).isEqualTo("gemini-2.0-flash");
        assertThat(b.path("max_tokens").asInt()).isEqualTo(8192);
        assertThat(b.path("messages").get(0).path("role").asText()).isEqualTo("system");
        assertThat(b.path("messages").get(0).path("content").asText()).isEqualTo("SYS");
        assertThat(b.path("messages").get(1).path("role").asText()).isEqualTo("user");
        assertThat(b.path("messages").get(1).path("content").asText()).isEqualTo("USER");
    }

    @Test
    void chatBodyMapsAssistantAndUserRolesInOrder() throws Exception {
        JsonNode b = om.readTree(client.buildChatBody("SYS", List.of(
                new AiClient.ChatTurn("user", "hi"),
                new AiClient.ChatTurn("assistant", "hello"),
                new AiClient.ChatTurn("user", "bye"))));
        var msgs = b.path("messages");
        assertThat(msgs.get(0).path("role").asText()).isEqualTo("system");
        assertThat(msgs.get(1).path("role").asText()).isEqualTo("user");
        assertThat(msgs.get(2).path("role").asText()).isEqualTo("assistant");
        assertThat(msgs.get(3).path("role").asText()).isEqualTo("user");
        assertThat(msgs.get(3).path("content").asText()).isEqualTo("bye");
    }

    @Test
    void visionBodyEmbedsImagesAsDataUris() throws Exception {
        JsonNode b = om.readTree(client.buildVisionBody("SYS", "look",
                List.of(new AiClient.ImageInput("QUJD", "image/png"))));
        var content = b.path("messages").get(1).path("content");   // user message content array
        assertThat(content.get(0).path("type").asText()).isEqualTo("text");
        assertThat(content.get(0).path("text").asText()).isEqualTo("look");
        assertThat(content.get(1).path("type").asText()).isEqualTo("image_url");
        assertThat(content.get(1).path("image_url").path("url").asText())
                .isEqualTo("data:image/png;base64,QUJD");
    }

    @Test
    void parseContentExtractsChoiceMessageContent() {
        String resp = "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"the answer\"}}]}";
        assertThat(client.parseContent(resp)).isEqualTo("the answer");
        assertThat(client.parseContent("{\"choices\":[]}")).isEmpty();   // tolerant of missing
    }
}
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=OpenAiCompatibleAiClientTest`. Expected: FAIL (class missing).

- [ ] **Step 3: Create `OpenAiCompatibleAiClient.java`:**

```java
package com.fluenta.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/** Generic AiClient over any OpenAI-compatible /chat/completions endpoint (Gemini, OpenAI, Groq, DeepSeek,
 *  OpenRouter, local). Instantiated by AiClientConfig when fluenta.ai.provider != "anthropic". */
public class OpenAiCompatibleAiClient implements AiClient {

    private final AiProperties props;
    private final ObjectMapper om;
    private volatile HttpClient http;

    public OpenAiCompatibleAiClient(AiProperties props, ObjectMapper om) {
        this.props = props;
        this.om = om;
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        return send(buildCompleteBody(systemPrompt, userPrompt));
    }

    @Override
    public String chat(String systemPrompt, List<ChatTurn> turns) {
        return send(buildChatBody(systemPrompt, turns));
    }

    @Override
    public String vision(String systemPrompt, String userText, List<ImageInput> images) {
        return send(buildVisionBody(systemPrompt, userText, images));
    }

    // --- request builders + parser: public so cross-package tests can exercise them without a network call ---

    public String buildCompleteBody(String systemPrompt, String userPrompt) {
        ArrayNode messages = om.createArrayNode();
        messages.add(msg("system", systemPrompt));
        messages.add(msg("user", userPrompt));
        return body(messages);
    }

    public String buildChatBody(String systemPrompt, List<ChatTurn> turns) {
        ArrayNode messages = om.createArrayNode();
        messages.add(msg("system", systemPrompt));
        for (ChatTurn t : turns) {
            String role = "assistant".equals(t.role()) ? "assistant" : "user";
            messages.add(msg(role, t.text()));
        }
        return body(messages);
    }

    public String buildVisionBody(String systemPrompt, String userText, List<ImageInput> images) {
        ArrayNode messages = om.createArrayNode();
        messages.add(msg("system", systemPrompt));
        ObjectNode userMsg = om.createObjectNode();
        userMsg.put("role", "user");
        ArrayNode content = om.createArrayNode();
        ObjectNode textPart = om.createObjectNode();
        textPart.put("type", "text");
        textPart.put("text", userText == null ? "" : userText);
        content.add(textPart);
        for (ImageInput img : images) {
            ObjectNode imgPart = om.createObjectNode();
            imgPart.put("type", "image_url");
            ObjectNode url = om.createObjectNode();
            url.put("url", "data:" + img.mediaType() + ";base64," + img.base64());
            imgPart.set("image_url", url);
            content.add(imgPart);
        }
        userMsg.set("content", content);
        messages.add(userMsg);
        return body(messages);
    }

    public String parseContent(String responseJson) {
        try {
            JsonNode node = om.readTree(responseJson);
            return node.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not read the AI response.");
        }
    }

    // --- internals ---

    private String body(ArrayNode messages) {
        ObjectNode b = om.createObjectNode();
        b.put("model", props.effectiveModel());
        b.put("max_tokens", props.maxTokens());
        b.set("messages", messages);
        return b.toString();
    }

    private ObjectNode msg(String role, String content) {
        ObjectNode m = om.createObjectNode();
        m.put("role", role);
        m.put("content", content == null ? "" : content);
        return m;
    }

    private String send(String requestBody) {
        String base = props.effectiveBaseUrl();
        if (base == null || base.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "No base URL configured for AI provider '" + props.providerOrDefault()
                            + "' — set fluenta.ai.base-url");
        }
        String url = base.endsWith("/") ? base + "chat/completions" : base + "/chat/completions";
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "Bearer " + props.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(props.timeoutSeconds()))
                    .build();
            HttpResponse<String> res = getHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new ApiException(HttpStatus.BAD_GATEWAY,
                        "The AI service is temporarily unavailable. Please try again.");
            }
            return parseContent(res.body());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI service could not be reached. Please try again.");
        }
    }

    private HttpClient getHttpClient() {
        if (http == null) {
            synchronized (this) {
                if (http == null) {
                    http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
                }
            }
        }
        return http;
    }
}
```

- [ ] **Step 4: Run the test** — `mvn -q test -DforkCount=0 -Dtest=OpenAiCompatibleAiClientTest`. Expected: PASS. Then full suite `mvn -q test -DforkCount=0` (BUILD SUCCESS — the class is not yet wired; it just compiles + its unit tests pass).

- [ ] **Step 5: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/service/OpenAiCompatibleAiClient.java \
  backend/src/test/java/com/fluenta/api/OpenAiCompatibleAiClientTest.java
git commit -m "$(printf 'feat(backend): generic OpenAI-compatible AiClient (chat + vision)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task MP4: `AiClientConfig` factory + select the provider

**Files:**
- Create: `backend/src/main/java/com/fluenta/api/config/AiClientConfig.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/AnthropicAiClient.java` (drop `@Service`)
- Test: `backend/src/test/java/com/fluenta/api/AiClientConfigTest.java`

**Interfaces:**
- Consumes: `AiProperties`, `ObjectMapper`, `AnthropicAiClient`, `OpenAiCompatibleAiClient` (MP3).
- Produces: a single `AiClient` bean chosen by `fluenta.ai.provider` (default/`anthropic` → `AnthropicAiClient`; anything else → `OpenAiCompatibleAiClient`).

- [ ] **Step 1: Write the failing test `AiClientConfigTest.java`:**

```java
package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.config.AiClientConfig;
import com.fluenta.api.config.AiProperties;
import com.fluenta.api.service.AnthropicAiClient;
import com.fluenta.api.service.OpenAiCompatibleAiClient;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiClientConfigTest {

    private final AiClientConfig config = new AiClientConfig();
    private final ObjectMapper om = new ObjectMapper();

    private AiProperties props(String provider) {
        return new AiProperties(true, "sk", "", "medium", 60, 12000, 5000000, false, provider, "", 8192);
    }

    @Test
    void defaultAndAnthropicUseTheSdkClient() {
        assertThat(config.aiClient(props("anthropic"), om)).isInstanceOf(AnthropicAiClient.class);
        assertThat(config.aiClient(props(""), om)).isInstanceOf(AnthropicAiClient.class);   // blank -> anthropic
    }

    @Test
    void nonAnthropicUsesTheCompatClient() {
        assertThat(config.aiClient(props("gemini"), om)).isInstanceOf(OpenAiCompatibleAiClient.class);
        assertThat(config.aiClient(props("deepseek"), om)).isInstanceOf(OpenAiCompatibleAiClient.class);
    }
}
```

- [ ] **Step 2: Run it** — `mvn -q test -DforkCount=0 -Dtest=AiClientConfigTest`. Expected: FAIL (class missing).

- [ ] **Step 3: Create `AiClientConfig.java`:**

```java
package com.fluenta.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluenta.api.service.AiClient;
import com.fluenta.api.service.AnthropicAiClient;
import com.fluenta.api.service.OpenAiCompatibleAiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Selects the single AiClient bean by fluenta.ai.provider (default "anthropic" -> native SDK client). */
@Configuration
public class AiClientConfig {

    @Bean
    public AiClient aiClient(AiProperties props, ObjectMapper om) {
        return "anthropic".equals(props.providerOrDefault())
                ? new AnthropicAiClient(props)
                : new OpenAiCompatibleAiClient(props, om);
    }
}
```

- [ ] **Step 4: Drop `@Service` from `AnthropicAiClient.java`** — remove the `@Service` annotation and its `import org.springframework.stereotype.Service;`. The class stays a plain class with its `public AnthropicAiClient(AiProperties props)` constructor (now instantiated by the factory). Do NOT annotate `OpenAiCompatibleAiClient` either — both are created only by `AiClientConfig`.

- [ ] **Step 5: Run the test + full suite** — `mvn -q test -DforkCount=0 -Dtest=AiClientConfigTest` (PASS), then reset `backend/data/fluenta.db*` and run `mvn -q test -DforkCount=0` (BUILD SUCCESS). The factory provides exactly one `AiClient` bean; existing `@SpringBootTest` AI tests that use `@MockBean AiClient` still override it, and offline contract tests are unaffected. If any test `@Autowired AnthropicAiClient` directly (grep `Autowired.*AnthropicAiClient` — expected none), switch it to `@Autowired AiClient`.

- [ ] **Step 6: Commit:**

```bash
git add backend/src/main/java/com/fluenta/api/config/AiClientConfig.java \
  backend/src/main/java/com/fluenta/api/service/AnthropicAiClient.java \
  backend/src/test/java/com/fluenta/api/AiClientConfigTest.java
git commit -m "$(printf 'feat(backend): AiClient provider factory (anthropic SDK vs OpenAI-compatible)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task MP5: Deploy docs + roadmap

**Files:**
- Modify: `backend/deploy/start.cmd`
- Modify: `backend/deploy/README.txt`
- Modify: `docs/ai-llm-mvp-pending.md`
- Modify: `docs/ROADMAP.md`

No test gate (docs/scripts). `package.cmd` copies `backend/deploy/start.cmd` + `README.txt` into `dist-app/`, so these are the canonical launcher docs.

- [ ] **Step 1: Add commented provider examples to `backend/deploy/start.cmd`** — just before the `"%JAVACMD%" -jar ...` line, add commented `set` lines showing both pairs with the generic key names (commented so the default run is unchanged):

```bat
rem --- AI provider keys (uncomment + fill in one pair) ---
rem  Pair A: Claude + OpenAI Whisper (default providers)
rem set "FLUENTA_AI_API_KEY=sk-ant-..."
rem set "FLUENTA_TRANSCRIBE_API_KEY=sk-..."
rem  Pair B: Gemini + Groq (free)
rem set "FLUENTA_AI_PROVIDER=gemini"
rem set "FLUENTA_AI_API_KEY=...gemini-key..."
rem set "FLUENTA_TRANSCRIBE_PROVIDER=groq"
rem set "FLUENTA_TRANSCRIBE_API_KEY=...groq-key..."
```

- [ ] **Step 2: Add an "AI providers" section to `backend/deploy/README.txt`** documenting: without keys the app runs with offline stub AI (never errors); to enable real AI set one pair's env vars (list both pairs with the generic key names as in Step 1); models are overridable via `FLUENTA_AI_MODEL` / `FLUENTA_TRANSCRIBE_MODEL`.

- [ ] **Step 3: Note the config in `docs/ai-llm-mvp-pending.md`** — add a short line under the Foundation/§1 area (or a new "Providers" note) that LLM + STT are now provider-selectable (`fluenta.ai.provider` / `fluenta.ai.transcribe.provider`, generic `FLUENTA_AI_API_KEY` / `FLUENTA_TRANSCRIBE_API_KEY` keys), supporting Claude+OpenAI (default) and Gemini+Groq, with a generic OpenAI-compatible client for future providers.

- [ ] **Step 4: Add a Cleanup/enabler row (☑) to `docs/ROADMAP.md`** — e.g. "Pluggable AI providers — config-selectable LLM (Anthropic / OpenAI-compatible incl. Gemini) + STT (OpenAI / Groq); generic key names; default unchanged." Avoid literal `|` inside table cells.

- [ ] **Step 5: Commit:**

```bash
git add backend/deploy/start.cmd backend/deploy/README.txt docs/ai-llm-mvp-pending.md docs/ROADMAP.md
git commit -m "$(printf 'docs: document pluggable AI providers (two pairs) + deploy env vars\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Post-plan: integration verification (not on this machine)

On a keyed, bindable host, verify each pair end-to-end:
- **Claude + OpenAI:** default env (`FLUENTA_AI_API_KEY`=anthropic, `FLUENTA_TRANSCRIBE_API_KEY`=openai) → Coach/Writing/Speaking/Live-Interview + Studio extract return real responses.
- **Gemini + Groq:** `FLUENTA_AI_PROVIDER=gemini` + gemini key; `FLUENTA_TRANSCRIBE_PROVIDER=groq` + groq key → same features work, incl. Studio image-extract (Gemini vision) and STT transcription (Groq Whisper).
Here, verification is the MockMvc suite + the pure request-build/parse tests + the factory-selection test + offline stubs.

## Graphify (final step, standing rule)
Refresh graphify **code-only** for the web/backend repo (`GRAPHIFY_MAX_WORKERS=1 <interpreter> -m graphify update .` from `D:/personal/fluenta-web`). On-disk only (gitignored — NO commit). No mobile change this slice.

---

## Self-Review

**Spec coverage:** §2 LLM abstraction (generic client) → MP3; keep Anthropic SDK → MP2/MP4. §2 selection factory + drop @Service → MP4. §2 aliases → MP1 (`SttProviders`) + MP2 (`LlmProviders`). §2/§4 generic key names + config → MP1 (transcribe) + MP2 (ai). §2/§4 new `AiProperties` fields + effective* + arity fix → MP2. §3.1 compat client complete/chat/vision + body/parse → MP3. §3.2 factory + `LlmProviders` + `effectiveModel/effectiveBaseUrl` → MP2/MP4. §3.3 STT effective* + `WhisperTranscriber` + `SttProviders` → MP1. §5 two pairs presets + deploy docs → MP5. §6 error mapping (generic BAD_GATEWAY) → MP3. §7 tests (pure build/parse, provider resolution, factory selection, regression) → MP1–MP4. §8 vision-only-with-vision-provider / model-drift → documented (MP5 docs); graphify → Graphify step. All spec sections map to a task.

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step is complete, runnable code with a test + expected run result. The two doc steps (MP5) describe exact content to add and name the files; they are content instructions, not gaps. The `application.yml` edits show the exact blocks. The `WhisperTranscriber`/`AnthropicAiClient` edits name the exact lines/tokens to change.

**Type consistency:** `AiProperties` new arg order `(…, persist, provider, baseUrl, maxTokens)` is used identically in every constructor call (MP2 `LlmProvidersTest`, MP2 `WritingFeedbackServiceTest` arity fix, MP3 `OpenAiCompatibleAiClientTest`, MP4 `AiClientConfigTest`). `TranscribeProperties` new arg order `(…, maxAudioSeconds, provider)` matches MP1's test. `LlmProviders.baseUrl/model` + `SttProviders.baseUrl/model` (static, `String` in/out) consistent across MP1/MP2 and the effective* methods. `AiProperties.effectiveModel()/effectiveBaseUrl()/providerOrDefault()/maxTokens()` used by `AnthropicAiClient` (MP2), `OpenAiCompatibleAiClient` (MP3), and `AiClientConfig` (MP4) with matching names. `OpenAiCompatibleAiClient` public `buildCompleteBody/buildChatBody/buildVisionBody/parseContent` defined MP3, exercised by its test MP3. `AiClientConfig.aiClient(AiProperties, ObjectMapper)` defined MP4, tested MP4. Endpoint/format strings (`/chat/completions`, `image_url` data URI, `choices[0].message.content`) consistent within MP3.
