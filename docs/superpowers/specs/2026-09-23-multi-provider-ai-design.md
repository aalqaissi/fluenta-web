# Design Spec — Pluggable multi-provider AI layer

_Date: 2026-09-23 · Status: approved for planning · Repo: `fluenta-web` (Spring Boot backend). **Backend-only** — web + mobile call `/api/ai/*` unchanged._

Makes the LLM and speech-to-text (STT) providers **selectable by configuration**, so the app can run on the current **Claude + OpenAI Whisper** pair or the free **Gemini + Groq** pair (and future providers), instead of being hard-wired to Anthropic + OpenAI. Builds directly on the existing seams from the Gen AI/LLM MVP: `AiClient` (LLM) and `Transcriber` (STT), with `AiProperties`/`TranscribeProperties` config and the `props.live()` offline gating.

**Default behavior is unchanged:** with nothing configured, the app runs exactly as today (Anthropic Claude + OpenAI Whisper). Everything here is additive + backward-compatible.

---

## 1. Goals / Non-goals

**Goals**
- Select the **LLM provider** by config (`fluenta.ai.provider`): `anthropic` (default, native SDK) or any **OpenAI-compatible** provider (`gemini`, `openai`, `groq`, `deepseek`, `openrouter`, …) via one generic client.
- Select the **STT provider** by config: `openai` (default) or `groq` — already possible via the config-driven `WhisperTranscriber`; this formalizes it with provider aliases.
- **Adaptable for the future:** adding a new OpenAI-compatible LLM or STT provider is **config-only** (base-url + model + key) — no new code.
- **Generic, provider-agnostic key names:** `FLUENTA_AI_API_KEY` (LLM) and `FLUENTA_TRANSCRIBE_API_KEY` (STT), with the old `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` kept only as silent fallbacks.
- Ship the **two pairs** working: Claude + OpenAI Whisper (default) and Gemini + Groq (free).
- Preserve every existing feature behind the seams: Coach, Writing, Speaking, Live Interview (all `AiClient.complete`/`chat`), Studio generate/fill (`complete`), Studio extract (`vision`), and STT for Speaking + Live Interview.

**Non-goals (this phase)**
- No web/mobile changes, no new endpoints, no new AI feature. Clients are unaffected.
- No "profile" that couples LLM + STT into one switch — they are selected independently (the two pairs are documented preset combos).
- No native per-provider SDKs beyond Anthropic's (Gemini/others go through the generic OpenAI-compatible client, using Gemini's OpenAI-compatible endpoint).
- No per-provider key registry (single active key per seam — see §2).
- No streaming; requests stay single-shot request/response as today.
- Not changing `AnthropicAiClient`'s behavior (model default, max tokens, thinking/effort) — no regression to the current live path.

---

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| LLM abstraction | Keep `AnthropicAiClient` (native SDK). Add **one** generic `OpenAiCompatibleAiClient` (`AiClient` impl) speaking the OpenAI `/chat/completions` format (+ vision via `image_url` base64 data URIs). Backs Gemini now; future OpenAI-compatible providers are config-only. |
| Selection | **Independent per seam.** `fluenta.ai.provider` picks the LLM; `fluenta.ai.transcribe.provider` picks the STT. Any LLM pairs with any STT. |
| Bean wiring | A `AiClientConfig` `@Bean AiClient` **factory** switches on `fluenta.ai.provider` → exactly one `AiClient` bean. `@Service` is removed from `AnthropicAiClient`; both impls are instantiated by the factory. Services inject `AiClient` unchanged. |
| Provider aliases | Named LLM aliases (`anthropic`, `openai`, `gemini`, `groq`, `deepseek`, `openrouter`) preset a default **base-url + model**; STT aliases (`openai`, `groq`) preset transcribe base-url + model. `fluenta.ai.base-url` / `fluenta.ai.model` (and the transcribe equivalents) override the preset. |
| Key ergonomics | **One active key per seam.** Generic env names `FLUENTA_AI_API_KEY` / `FLUENTA_TRANSCRIBE_API_KEY`, falling back to `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` for backward-compat. |
| `live()` gating | Unchanged: `enabled && api-key non-blank`. Offline (no key) still degrades to the deterministic stubs — never 501 — for whichever provider is selected. |
| Default provider | `anthropic` (LLM) + `openai` (STT) → identical to today when unconfigured. |
| Max tokens | New `fluenta.ai.max-tokens` (default 8192) used by the compat client only. `AnthropicAiClient` keeps its current 16000 (no regression). |
| Scope | Backend only (`fluenta-web/backend`). |
| Verification | Live Gemini/Groq/OpenAI HTTP calls **can't run here** (no keys/socket) → verified via pure request-build/response-parse unit tests + the factory selection test + alias-resolution tests + the offline stubs. State plainly. |

---

## 3. Backend architecture

All under `backend/src/main/java/com/fluenta/api/`, reusing the existing seams.

```
service/ OpenAiCompatibleAiClient.java   NEW: AiClient impl over OpenAI /chat/completions (+ vision), raw java.net.http
         AnthropicAiClient.java          EDIT: drop @Service (factory owns it); use props.effectiveModel()
         WhisperTranscriber.java         EDIT: use props.effectiveBaseUrl()/effectiveModel() (else unchanged)
config/  AiClientConfig.java             NEW: @Bean AiClient factory switching on fluenta.ai.provider
         LlmProviders.java               NEW: alias -> {baseUrl, model} preset resolver (pure)
         SttProviders.java               NEW: alias -> {baseUrl, model} preset resolver (pure)
         AiProperties.java               EDIT: + provider, baseUrl, maxTokens; + effectiveModel()/effectiveBaseUrl()/providerOrDefault()
         TranscribeProperties.java       EDIT: + provider; + effectiveBaseUrl()/effectiveModel(); base-url/model defaults -> blank (resolved)
         application.yml                 EDIT: provider knobs + generic key env names (see §4)
```

### 3.1 `OpenAiCompatibleAiClient` (the only new client)
Implements `AiClient` (`complete`/`chat`/`vision`) via `java.net.http` POST to `<effective-base-url>/chat/completions`, header `Authorization: Bearer <api-key>`, body `application/json`. Mirrors `WhisperTranscriber`'s HTTP discipline (lazy `HttpClient`, `timeoutSeconds`, `statusCode/100 != 2` → `ApiException(BAD_GATEWAY, "The AI service is temporarily unavailable. Please try again.")`, any exception → same).

- **`complete(system, user)`** → `messages: [{role:"system",content:system},{role:"user",content:user}]`.
- **`chat(system, turns)`** → `[{role:"system",content:system}, …turns]` where each `ChatTurn` maps `assistant`→assistant else `user` (blanks skipped; first non-system must be user — reuse the mapping already proven in `CoachService`/`LiveInterviewService`, but that mapping happens in the services, so here just pass turns through faithfully).
- **`vision(system, userText, images)`** → the user message `content` is an array: `[{type:"text",text:userText}, {type:"image_url", image_url:{url:"data:<mediaType>;base64,<base64>"}} …]`.
- Body always includes `"model": <effective-model>` and `"max_tokens": <fluenta.ai.max-tokens>`. No `thinking`/`effort` (Anthropic-only).
- **Response parse:** `choices[0].message.content` as text (empty string if absent).
- **Testable core:** pure static/package methods `buildChatBody(model, maxTokens, messages)`, `buildVisionBody(...)`, and `parseContent(json)` — unit-tested with canned JSON, no network. The `send()` wrapper is thin.

### 3.2 `AiClientConfig` factory + provider resolution
```java
@Bean
AiClient aiClient(AiProperties props, ObjectMapper om) {
    return "anthropic".equalsIgnoreCase(props.providerOrDefault())
        ? new AnthropicAiClient(props)
        : new OpenAiCompatibleAiClient(props, om);
}
```
`AnthropicAiClient` loses `@Service`; `OpenAiCompatibleAiClient` is a plain class. Exactly one `AiClient` bean exists → no ambiguity; the offline stubs are separate beans gated by `props.live()`, unchanged.

`LlmProviders` (pure) maps an alias → default `{baseUrl, model}`:
| provider | base-url | default model |
|---|---|---|
| `anthropic` | *(SDK — n/a)* | `claude-sonnet-5` |
| `openai` | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| `groq` | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| `deepseek` | `https://api.deepseek.com` | `deepseek-chat` |
| `openrouter` | `https://openrouter.ai/api/v1` | *(none — must set model)* |

`AiProperties.effectiveModel()` = `model()` if non-blank else `LlmProviders.model(provider)`; `effectiveBaseUrl()` = `baseUrl()` if non-blank else `LlmProviders.baseUrl(provider)`. `AnthropicAiClient` uses `effectiveModel()` (base-url irrelevant to the SDK) — so an unconfigured `anthropic` still resolves to `claude-sonnet-5` exactly as today. An **unknown** provider name resolves to a blank base-url; rather than POST to an invalid URL, the compat client raises a clear `ApiException` on first use ("No base URL configured for AI provider '<name>' — set fluenta.ai.base-url").

### 3.3 STT (already pluggable)
`SttProviders` maps `openai` → (`https://api.openai.com/v1/audio/transcriptions`, `whisper-1`) and `groq` → (`https://api.groq.com/openai/v1/audio/transcriptions`, `whisper-large-v3`). `TranscribeProperties.effectiveBaseUrl()/effectiveModel()` resolve like the LLM (explicit override else preset). `WhisperTranscriber` swaps `props.baseUrl()`→`effectiveBaseUrl()` and `props.model()`→`effectiveModel()`; otherwise unchanged (it already speaks the OpenAI multipart format both providers accept and reads `{"text":…}`). Groq needs **no code** — just `fluenta.ai.transcribe.provider=groq` + a key.

---

## 4. Config (`application.yml`) + keys

```yaml
fluenta:
  ai:
    enabled: ${FLUENTA_AI_ENABLED:true}
    provider: ${FLUENTA_AI_PROVIDER:anthropic}
    api-key: ${FLUENTA_AI_API_KEY:${ANTHROPIC_API_KEY:}}   # generic; old name as fallback
    base-url: ${FLUENTA_AI_BASE_URL:}                       # blank -> provider preset
    model: ${FLUENTA_AI_MODEL:}                             # blank -> provider preset
    max-tokens: ${FLUENTA_AI_MAX_TOKENS:8192}
    effort: ${FLUENTA_AI_EFFORT:medium}                     # anthropic-only
    timeout-seconds: ${FLUENTA_AI_TIMEOUT:60}
    max-essay-chars: ${FLUENTA_AI_MAX_ESSAY_CHARS:12000}
    max-image-bytes: ${FLUENTA_AI_MAX_IMAGE_BYTES:5000000}
    persist: ${FLUENTA_AI_PERSIST:true}
    transcribe:
      enabled: ${FLUENTA_TRANSCRIBE_ENABLED:true}
      provider: ${FLUENTA_TRANSCRIBE_PROVIDER:openai}
      api-key: ${FLUENTA_TRANSCRIBE_API_KEY:${OPENAI_API_KEY:}}   # generic; old name as fallback
      base-url: ${FLUENTA_TRANSCRIBE_URL:}                        # blank -> provider preset
      model: ${FLUENTA_TRANSCRIBE_MODEL:}                         # blank -> provider preset
      max-audio-bytes: ${FLUENTA_TRANSCRIBE_MAX_BYTES:25000000}
      max-audio-seconds: ${FLUENTA_TRANSCRIBE_MAX_SECONDS:240}
```

**`AiProperties` record** gains `provider` (`@DefaultValue("anthropic")`), `baseUrl` (`@DefaultValue("")`), `maxTokens` (`@DefaultValue("8192")`) appended after `persist`. The `model` YAML default changes `claude-sonnet-5`→blank (resolved via the `anthropic` preset). This ripples to the **3 positional `new AiProperties(...)`** call sites in `WritingFeedbackServiceTest` — append `, "anthropic", "", 8192`. `TranscribeProperties` gains `provider` (`@DefaultValue("openai")`); its `base-url`/`model` defaults change to blank (resolved via preset). No positional `new TranscribeProperties(...)` exists in tests (verified), so no ripple there. Keys are redacted in both `toString()`s (already the pattern).

---

## 5. The two pairs (documented presets)

- **Claude + OpenAI Whisper (default):** set `FLUENTA_AI_API_KEY=<anthropic>` and `FLUENTA_TRANSCRIBE_API_KEY=<openai>`. Providers default to `anthropic`/`openai`; nothing else needed. (Old `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` still work.)
- **Gemini + Groq (free):** `FLUENTA_AI_PROVIDER=gemini`, `FLUENTA_AI_API_KEY=<gemini>`; `FLUENTA_TRANSCRIBE_PROVIDER=groq`, `FLUENTA_TRANSCRIBE_API_KEY=<groq>`. Models default to `gemini-2.0-flash` / `whisper-large-v3`, overridable via `FLUENTA_AI_MODEL` / `FLUENTA_TRANSCRIBE_MODEL`.

The `dist-app` launcher docs are updated to show both, using the generic key names: `backend/deploy/start.cmd` (commented `set` examples) + `backend/deploy/README.txt` (which `package.cmd` copies into `dist-app/`).

---

## 6. Safety / ops

- **Untrusted input** posture is unchanged (prompts already refuse embedded instructions; the §2e char caps and normalization gates still apply on top of whatever provider answers).
- **Keys redacted** in `toString()`; never logged. One active key per seam in memory.
- **Cost/latency:** picking a cheaper/free provider is the point; `max-tokens` bounds output; timeouts unchanged.
- **Error mapping:** the compat client maps provider/HTTP failures to a generic `ApiException(BAD_GATEWAY, …)` (no provider internals leaked).
- **Backward-compat:** unconfigured = today's Claude + OpenAI Whisper, byte-for-byte behavior (same model default, same 16000 max-tokens on Anthropic).

---

## 7. Tests & verification (MockMvc, `mvn -q test -DforkCount=0`)

- **`OpenAiCompatibleAiClientTest`** (pure, no network): `buildChatBody`/`buildVisionBody` produce correct OpenAI-shaped JSON (system+user/assistant roles; vision `image_url` data URI); `parseContent` extracts `choices[0].message.content` and tolerates missing fields.
- **`LlmProvidersTest` / `SttProvidersTest`:** each alias resolves to the expected base-url + model; explicit overrides win; unknown provider handled (clear error, not silent).
- **`AiClientConfigTest`** (or a `@SpringBootTest` slice): `provider=anthropic`/unset → the bean is `AnthropicAiClient`; `provider=gemini` (+ base-url/key props) → `OpenAiCompatibleAiClient`. Exactly one `AiClient` bean.
- **`AiProperties.effectiveModel()/effectiveBaseUrl()`:** anthropic-unset → `claude-sonnet-5`; gemini-unset → the gemini preset; explicit override wins.
- **Regression:** existing AI tests stay green — `WritingFeedbackServiceTest` (fixed constructor arity), the coach/speaking/live-interview/studio suites, and `HttpContractTest` (all run offline via stubs or force `anthropic`).
- **Cannot verify here** (no keys/socket): live Gemini/Groq/OpenAI HTTP round-trips + real `WhisperTranscriber` against Groq. Shipped on the pure-method + selection tests + offline stubs; a real check needs a keyed, bindable host (see §9).

---

## 8. Risks / open items

- **Vision needs a vision-capable LLM.** Gemini supports images, so Studio extract works on the Gemini pair. A **text-only** provider (e.g. DeepSeek) would make `vision()` (Studio extract) fail with a `BAD_GATEWAY` rather than gracefully degrade — acceptable for now (documented); a future enhancement could fall back to the offline heuristic on vision errors.
- **Prompt/JSON fidelity varies by model.** The examiner/grader prompts demand strict JSON; the existing tolerant `{…}` parsing + normalization gates absorb minor deviations, but **band accuracy** on non-Claude models is unverified — run the small IELTS eval before trusting scores in production.
- **Model ids drift.** The alias default models are current-plausible picks; the `FLUENTA_AI_MODEL` / `FLUENTA_TRANSCRIBE_MODEL` overrides are the durable escape hatch. Load the `claude-api` skill only for Anthropic ids; Gemini/Groq/OpenAI ids come from their consoles.
- **Gemini OpenAI-compat endpoint** is Google's compatibility layer; it supports chat + vision + system role for our usage, but is less feature-rich than Gemini's native API (acceptable — we chose the generic client deliberately).
- **Graphify + docs** (standing rule): after the build, refresh graphify for the web/backend repo (on-disk only) and update `docs/ai-llm-mvp-pending.md` / `docs/ROADMAP.md` with the provider-config note. No mobile change this time.

---

## 9. File change summary

**backend** — add: `service/OpenAiCompatibleAiClient.java`, `config/AiClientConfig.java`, `config/LlmProviders.java`, `config/SttProviders.java`, tests (`OpenAiCompatibleAiClientTest`, `LlmProvidersTest`, `SttProvidersTest`, `AiClientConfigTest`/selection); edit: `config/AiProperties.java` (+3 fields + effective* methods), `config/TranscribeProperties.java` (+provider + effective* methods + blank defaults), `service/AnthropicAiClient.java` (drop `@Service`, use `effectiveModel()`), `service/WhisperTranscriber.java` (use `effective*`), `resources/application.yml`, `backend/deploy/start.cmd` + `backend/deploy/README.txt` (generic key names + both pairs), `src/test/.../WritingFeedbackServiceTest.java` (constructor arity).

**docs** — `docs/ai-llm-mvp-pending.md` + `docs/ROADMAP.md`: note the multi-provider config + the two pairs.

**Post-plan integration check (off-machine):** on a keyed, bindable host, run each pair — set the pair's env vars, hit Coach/Writing/Speaking/Live-Interview + Studio extract, and confirm real responses (and, for Gemini, that Studio image-extract works). Here, verification is the MockMvc suite + the pure-method tests.
