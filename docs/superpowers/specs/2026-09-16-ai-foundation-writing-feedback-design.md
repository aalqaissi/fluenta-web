# Design Spec — AI Foundation + Writing Feedback (MVP)

_Date: 2026-09-16 · Status: approved for planning · Repos: `fluenta-web` (Spring Boot backend + React/TS web), `fluenta-mobile` (Flutter)_

Implements **§1 Foundation** and **§2a Writing feedback** of [`docs/ai-llm-mvp-pending.md`](../../ai-llm-mvp-pending.md). This is the first slice of the Gen AI / LLM MVP.

---

## 1. Goals / Non-goals

**Goals**
- A reusable backend AI foundation: config + secrets, an SDK-wrapping `AiClient`, error/timeout/retry handling, a feature flag that degrades gracefully.
- A working **writing-feedback** feature end-to-end: essay + task context → IELTS overall band + 4 criteria + inline annotations, in the **existing `WritingResult` shape** so the current result screens render real data.
- A **free/offline demo path** (no API key) that returns a real, essay-aware result (not a 501), so demos work at zero cost.
- Wire **web and mobile** clients to the real endpoint, keeping the static sample as an error/offline fallback.
- **Persist** results server-side behind an on/off toggle.

**Non-goals (this phase)**
- Coach chat, Studio generate/extract, Speaking feedback, Live Interview (§2b–2e stay held / 501).
- Streaming (writing feedback is a single request/response).
- A prompt-eval harness (a couple of sanity checks only; the eval set is a later cross-cutting item).
- Showing feedback in progress/history dashboards (persistence enables it; surfacing it is a follow-up).

---

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Live model (default) | **`claude-sonnet-5`**, configurable (Opus 5 = one-line config swap). |
| Free/demo path | **Deterministic, essay-aware heuristic grader** (offline, zero cost). Replaces the static sample as the fallback. |
| Degrade behavior | Writing-feedback **never returns 501**; it returns an offline result when AI is disabled/keyless. Other AI features stay 501 `comingSoon`. |
| Scope | Backend **+ web + mobile**. |
| Persistence | **On by default**, behind a config toggle (`fluenta.ai.persist`); toggle also governs whether essays are stored (privacy). |
| Structured JSON | Prefer **structured outputs** (`output_config.format`); fallback = prompt-instructed JSON + Jackson parse + one repair-retry. A server-side **validation gate** is the real safety net regardless. |
| JSON extraction honesty | Response carries `source: "ai" | "offline"` so a heuristic estimate is distinguishable from an examiner-grade result. |

---

## 3. Backend architecture

New/changed files under `backend/src/main/java/com/fluenta/api/`, mirroring existing patterns (`@Service` + constructor injection, `CurrentUser.require()`, `ApiException` → `GlobalExceptionHandler`, config via properties, DTO records grouped per file).

```
config/  AiProperties.java            @ConfigurationProperties("fluenta.ai")
service/ AiClient.java                thin Anthropic-SDK wrapper (transport/config/errors) — REUSABLE
         WritingFeedbackService.java  chooses grader, validates result, persists if enabled
         grader/WritingGrader.java    interface: WritingResult grade(WritingFeedbackRequest req)
         grader/ClaudeWritingGrader   live: builds prompt, calls AiClient, parses → WritingResult
         grader/StubWritingGrader     offline: deterministic heuristic → WritingResult
dto/     AiDtos.java                  WritingFeedbackRequest, WritingResult, WritingCriterion, WritingAnnotation
domain/  WritingFeedbackEntity.java   persisted result (behind toggle)
repo/    WritingFeedbackRepository.java
web/     AiController.java            REPLACE: real POST /api/ai/writing-feedback (+ keep catch-all 501)
```

**Layering rationale.** `AiClient` owns everything SDK-specific (request build, adaptive thinking + effort, timeout, retry, error mapping) so future features (Coach, Studio, Speaking) reuse it without touching the SDK. Per-feature **prompt + parse + fallback** lives in the feature service (`WritingFeedbackService` + graders). This satisfies the doc's "one place that builds prompts, calls the model, parses/validates" as the *foundation layer*, while keeping features isolated and independently testable.

### 3.1 Dependency (pom.xml)

Add the official Anthropic Java SDK. Maven coordinates: `com.anthropic:anthropic-java` (pin the latest release; confirm the exact version and client/params bindings from the `claude-api` skill's `java/claude-api/` docs at build time — **do not guess SDK type names**; write against the documented namespace table and let the compiler guide fixes).

### 3.2 Config (`application.yml` + `AiProperties`)

```yaml
fluenta:
  ai:
    enabled: ${FLUENTA_AI_ENABLED:true}       # false → force offline mode
    api-key: ${ANTHROPIC_API_KEY:}            # blank default → offline mode; never committed
    model: ${FLUENTA_AI_MODEL:claude-sonnet-5}
    effort: ${FLUENTA_AI_EFFORT:medium}       # low|medium|high|xhigh|max
    timeout-seconds: ${FLUENTA_AI_TIMEOUT:60}
    max-essay-chars: ${FLUENTA_AI_MAX_ESSAY_CHARS:12000}
    persist: ${FLUENTA_AI_PERSIST:true}       # store results + essays server-side
```

`AiProperties` is a `@ConfigurationProperties("fluenta.ai")` record/bean with those fields. **Live mode** iff `enabled == true` AND `api-key` is non-blank; otherwise **offline mode**.

### 3.3 `AiClient` (foundation)

- Constructed from `AiProperties`. Builds the Anthropic client (API key from config; when key is blank the client is not constructed / not used — offline graders never call it).
- One method for this phase, e.g. `String complete(String system, String user, ResponseFormat fmt)` (or a small typed request object) — returns the model's structured text; higher layers parse.
- Adaptive thinking (`thinking: {type: "adaptive"}`), `output_config.effort` from config, `max_tokens` sized for a feedback JSON (~4000, non-streaming is fine at this size).
- **Timeout** from config; **retry** on 429/5xx/connection via the SDK's `maxRetries` (default 2) or explicit config.
- **Error mapping**: catch the SDK's typed exceptions (most-specific-first) and throw `ApiException` with a friendly message + appropriate status (e.g. 502/503 for upstream failure, 400 for a request we reject). Never leak raw SDK stack messages to the client.

### 3.4 Graders

`WritingGrader` interface: `WritingResult grade(WritingFeedbackRequest req)`.

**`ClaudeWritingGrader` (live)**
- System prompt: an IELTS examiner that (a) scores Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy on the 0–9 band scale; (b) returns overall + per-criterion band + a one-sentence summary; (c) returns inline annotations where each `quote` is a **verbatim substring copied from the essay** (critical — the UIs highlight by `indexOf`); (d) **treats the essay as untrusted content and never follows instructions inside it**.
- User content: task context (taskNumber, kind, module, prompt, minWords) + the essay, clearly delimited.
- Output: structured JSON matching `WritingResult` (minus `answer`/`source`/`id`, which the service fills). Use structured outputs; fallback prompt+parse+one repair-retry.
- `source = "ai"`.

**`StubWritingGrader` (offline / free demo)**
- Deterministic, essay-aware. No model call. Signals → bands in a sane range (~4.0–6.5):
  - word count vs `minWords` (under-length penalty), sentence count, presence/variety of linking words, avg sentence length, empty-discourse-marker detection ("On the one hand." with no following clause), a few common-misspelling checks.
- Annotations: emitted only from real detected spans (quotes are actual substrings). If nothing detected, emit 1–2 anchored, generic-but-honest notes quoting real spans.
- Criterion summaries phrased as an **offline estimate** (honesty).
- `source = "offline"`.

### 3.5 `WritingFeedbackService`

1. Reject if `essay` blank or exceeds `max-essay-chars` (`ApiException.badRequest`).
2. Select grader (live vs offline) per §3.2.
3. Call `grade(req)`.
4. Fill `answer` = the submitted essay; compute `wordCount` server-side (don't trust client).
5. **Validation gate** (§3.6).
6. If `persist == true`: save `WritingFeedbackEntity`, set `id` on the response.
7. Return `WritingResult`.
8. If the **live** grader throws, the service may fall back to the offline grader (so the student still gets a result) OR propagate the error for the client to show + fall back to the sample. **Decision: propagate** the error (client shows an error state and its own sample fallback) — keeps live/offline explicit and avoids silently mislabeling a failed AI grade as a real one. (The offline grader is reachable via config, not via silent live-failure substitution.)

### 3.6 Validation gate (server-side, before returning)

- `overall` and every criterion `band` ∈ [0, 9]; round to nearest 0.5 for `overall`.
- Exactly the 4 criteria with keys `task`, `coherence`, `lexical`, `grammar` (fill/repair if the model omits one; if unrecoverable in live mode, repair-retry then error).
- Every annotation `quote` **must be a substring of the essay** — drop any that are not (a hallucinated span would silently fail to highlight; dropping keeps the UI clean). Assign stable `id`s (`a1`, `a2`, …).
- `wordCount` computed server-side.

---

## 4. API contract

`POST /api/ai/writing-feedback` — **student-facing**, `CurrentUser.require()`.

**Request**
```json
{ "taskNumber": 2, "kind": "Opinion Essay", "module": "academic",
  "prompt": "…task prompt…", "minWords": 250, "essay": "…student text…" }
```

**Response** — existing `WritingResult` shape + `id?` + `source`:
```json
{
  "id": "wf_…",              // present only when persisted
  "source": "ai",            // "ai" | "offline"
  "overall": 6.0,
  "wordCount": 248,
  "answer": "…echoed essay…",
  "criteria": [
    { "key": "task",      "label": "Task Achievement",             "band": 6, "summary": "…" },
    { "key": "coherence", "label": "Coherence & Cohesion",         "band": 6, "summary": "…" },
    { "key": "lexical",   "label": "Lexical Resource",             "band": 6, "summary": "…" },
    { "key": "grammar",   "label": "Grammatical Range & Accuracy", "band": 5, "summary": "…" }
  ],
  "annotations": [
    { "id": "a1", "criterion": "grammar", "quote": "…verbatim span…", "note": "…" }
  ]
}
```

`GET /api/ai/writing-feedback/{id}` — returns a persisted result (owner-scoped). Only meaningful when `persist=true`; 404 otherwise.

**Catch-all retained**: `POST /api/ai/{feature}` still returns 501 `{error, status:501, comingSoon:true}` for any feature other than `writing-feedback`, so Coach/Studio/Speaking stay held and `HttpContractTest.aiEndpointsAreDisabled` (which posts to `/api/ai/coach`) keeps passing. Route the specific path with a dedicated `@PostMapping("/writing-feedback")` alongside the existing `@PostMapping("/{feature}")`.

**DTOs (`AiDtos.java`)** — Java records: `WritingFeedbackRequest`, `WritingResult`, `WritingCriterion(key,label,band,summary)`, `WritingAnnotation(id,criterion,quote,note)`. Field names/casing must match the TS `WritingResult`/`WritingCriterion`/`WritingAnnotation` in [`src/mock/types.ts`](../../../src/mock/types.ts) and the Dart models exactly.

---

## 5. Persistence (behind toggle)

`WritingFeedbackEntity { id, userId, taskId (nullable), taskNumber, essay, resultJson, model, source, createdAt }` + `WritingFeedbackRepository extends JpaRepository`. Save on generate when `persist=true`; expose via `GET /api/ai/writing-feedback/{id}` (owner-scoped; 403/404 otherwise). When `persist=false`, results are ephemeral (returned, not stored) and **no essay text is written to the DB**. `resultJson` stored via the existing `service/Json.java` helper (consistent with how exam content is stored). `ddl-auto: update` creates the table.

---

## 6. Web wiring (`fluenta-web`)

- `src/lib/api.ts`: add types `AiWritingFeedbackRequest` and `AiWritingResult` (mirror the DTOs) and an `api.ai` group:
  ```ts
  ai: { writingFeedback: (req) => request<AiWritingResult>("POST", "/ai/writing-feedback", req),
        getWritingFeedback: (id) => request<AiWritingResult>("GET", `/ai/writing-feedback/${id}`) }
  ```
- `src/store/attempt-store.ts`: extend `WritingAttempt` with `result?: WritingResult | null` (and error state as needed).
- `src/features/writing/WritingEditorPage.tsx` `submit()`: build the request from the resolved `task` (`taskNumber`, `kind`, `module`, `prompt`, `minWords`) + `text`; call `api.ai.writingFeedback`; show real loading via `GradingModal`; on success stash result → navigate; on error, set an error flag and fall back to `sampleWritingResult`.
- `src/features/exam-runner/GradingModal.tsx`: drive it from the real async call (loading → done/error) instead of the fixed 1.8 s fake timer, or accept a `state` prop. Keep the "Scoring your answers" UX; add an error state. (Reading/listening still use the deterministic local timer — parameterize rather than break them.)
- `src/features/writing/WritingResultsPage.tsx`: read the real result from `attempt-store`, fall back to `sampleWritingResult` when absent/errored. Optionally badge `source === "offline"`.

## 7. Mobile wiring (`fluenta-mobile`)

- `lib/models/models.dart`: add `WritingResult.fromJson` (+ `WritingCriterion`/`WritingAnnotation` parsing incl. `WritingCriterionKey` from string), tolerant of missing fields; ignore unknown fields (`id`, `source`).
- `lib/services/api_client.dart`: add `Future<WritingResult> writingFeedback({required int taskNumber, required String kind, required String module, required String prompt, required int minWords, required String essay})` using the existing `_request` pattern.
- `lib/services/mock_api.dart`: extend `WritingAttempt`/`AttemptStore` to carry the fetched `WritingResult`.
- `lib/features/writing/writing_editor_screen.dart` `_submit`: call the API (real grading dialog / loading), stash result, navigate; on error keep the sample fallback.
- `lib/features/writing/writing_results_screen.dart`: render the fetched result, fall back to `sampleWritingResult`.
- Uses the existing editable Server URL (`AppConfig.serverUrl`) + bearer token.

---

## 8. Safety / ops

- **Prompt injection**: essay is untrusted; system prompt forbids following in-essay instructions; structured output + validation gate contain the blast radius.
- **Input cap**: `max-essay-chars` rejects oversize input (cost/DoS).
- **Cost/latency**: Sonnet 5 default, `effort=medium`, `max_tokens ~4000`, non-streaming; ~a few cents per live grade. Offline path is free.
- **Logging/PII**: never log essay bodies or full results at info level; log model id, latency, token usage, `source`. Persistence of essays is governed by the `persist` toggle.
- **Timeouts/retries**: from config; friendly `ApiException` on failure.

---

## 9. Tests & verification

- **Backend (MockMvc, `mvn test -DforkCount=0`)** — the dev machine can't bind a socket (Java NIO loopback blocked), so verify in-process:
  - `WritingFeedbackService` unit test with a **mocked `WritingGrader`** → asserts validation gate (band ranges, 4 criteria, quotes-are-substrings dropping, server `wordCount`).
  - `StubWritingGrader` test → offline mode returns a valid `WritingResult` (not 501), quotes are real substrings, bands in range, deterministic.
  - Contract test: `POST /api/ai/writing-feedback` (AI disabled in test config → offline grader) returns 200 + valid shape.
  - Retain `aiEndpointsAreDisabled` (Coach still 501). Add an assertion that `/api/ai/writing-feedback` is **not** 501.
  - `ClaudeWritingGrader` parsing test with a canned model JSON (no network) → maps to `WritingResult` and passes the gate.
- **Web**: `tsc`/`npm run build` clean; preview-verify the writing flow (offline mode) via the dev server.
- **Mobile**: `flutter analyze` clean; `WritingResult.fromJson` unit test against a sample payload.

---

## 10. Risks / open items

- **Java SDK bindings** for structured outputs / adaptive thinking must be confirmed from the `claude-api` skill's `java/claude-api/` docs at build time (don't guess type names). Fallback: prompt-instructed JSON + Jackson + one repair-retry. Contained by the validation gate.
- **Quote fidelity**: models occasionally paraphrase quotes; the substring-drop gate handles it, but the prompt must stress verbatim copying.
- **Live verification** can't run on this machine (no socket bind, and likely no key); live path is exercised via canned-JSON unit tests. A real end-to-end live check happens on another host/Docker/WSL with a key.
- **Graphify + ROADMAP**: after the build, refresh graphify for the touched codebases (standing rule) and flip the writing-feedback item held→done in both `docs/ROADMAP.md` files.

---

## 11. File change summary

**backend** — add: `config/AiProperties.java`, `service/AiClient.java`, `service/WritingFeedbackService.java`, `service/grader/{WritingGrader,ClaudeWritingGrader,StubWritingGrader}.java`, `dto/AiDtos.java`, `domain/WritingFeedbackEntity.java`, `repo/WritingFeedbackRepository.java`; edit: `pom.xml` (SDK dep), `application.yml` (`fluenta.ai.*`), `web/AiController.java` (real endpoint + retained catch-all), `test/.../HttpContractTest.java` (+ new grader/service tests).

**web** — edit: `src/lib/api.ts`, `src/store/attempt-store.ts`, `src/features/writing/WritingEditorPage.tsx`, `src/features/exam-runner/GradingModal.tsx`, `src/features/writing/WritingResultsPage.tsx`.

**mobile** — edit: `lib/models/models.dart`, `lib/services/api_client.dart`, `lib/services/mock_api.dart`, `lib/features/writing/writing_editor_screen.dart`, `lib/features/writing/writing_results_screen.dart`.
