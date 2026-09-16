# Gen AI / LLM MVP — Pending Work (hand-off)

_Prepared 2026-09-16. A self-contained list of everything AI/LLM-related that is currently **held**, so a fresh session can pick it up. Point the new session at this file._

Repos: `D:\personal\fluenta-web` (Spring Boot backend + React/TS web) and `D:\personal\fluenta-mobile` (Flutter).
Note: the backend can't bind a socket on this dev machine (Java NIO loopback blocked) — verify via MockMvc, run the live app on another host/Docker/WSL.

---

## 0. Current state (what "held" actually means today)

- **Backend:** `backend/src/main/java/com/fluenta/api/web/AiController.java` is a single placeholder — `POST /api/ai/{feature}` returns **501** `{error, status:501, comingSoon:true}` for every feature. There is **no** LLM client, no `AiService`, no API-key config.
- **Web:** `src/lib/api.ts` has **no `api.ai` group**. Nothing calls `/api/ai/*`. Instead:
  - Writing "grading" shows a canned `sampleWritingResult` (`src/mock/data.ts`) via `GradingModal` → `WritingResultsPage`.
  - Speaking results are similarly sample-based.
  - Coach (`src/features/coach/CoachPage.tsx`) is a placeholder/disabled surface.
  - Studio "AI" buttons ("Generate with AI", "Fill Missing Answers", "Extract") use **local heuristics** (`aiQuestions`, `defaultAnswerFor` in `src/features/studio/QuestionRow.tsx`), not a model. `AiButton` (`src/features/studio/components.tsx`) just takes a `disabled` prop.
- **Mobile:** same pattern — `lib/features/coach/coach_screen.dart` placeholder; `lib/features/writing/writing_results_screen.dart` shows `sampleWritingResult`; speaking results sample-based. `lib/services/api_client.dart` has no AI methods.
- **Test:** `backend/.../HttpContractTest.aiEndpointsAreDisabled` asserts `/api/ai/coach` → 501 `comingSoon:true`. This test must be updated when endpoints go live.

There is a `claude-api` **skill** available in the session (Anthropic API / model-id / pricing / streaming / tool-use reference) — load it before doing the LLM integration.

---

## 1. Foundation (build first — everything else depends on it)

- [x] **Choose provider + model.** Project default is Claude (latest: Opus 5 / Sonnet 5 / Haiku 4.5). Add the SDK or an HTTP client to the Spring backend. (Load the `claude-api` skill for exact model ids, params, streaming, and token/cost details — don't answer from memory.)
- [x] **Config + secrets.** API key via env var (e.g. `ANTHROPIC_API_KEY` / a `fluenta.ai.*` block in `application.yml`), never committed. **Feature flag**: when the key/service is absent, endpoints degrade to the current held behavior (501/`comingSoon`) so demos still work.
- [x] **`AiService` abstraction** — one place that builds prompts, calls the model, parses/validates responses; with timeouts, retries, error mapping (LLM error → clean API error), basic rate limiting, and cost/token awareness.
- [x] **Replace the placeholder `AiController`** with real per-feature endpoints (below), each `requireAdmin()`-free for student features but gated appropriately (Coach/feedback are student-facing; Studio generate/extract are admin — the role gating already exists via `CurrentUser.requireAdmin()`).
- [x] **Response contracts (DTOs)** for each feature so web + mobile consume a stable shape. Writing/Speaking feedback MUST match the existing result shapes (see feature 2/3) so the current result screens can render real data with minimal change.
- [x] **Safety:** treat user essays / chat as untrusted (prompt-injection), consider moderation, cap input/output tokens.

---

## 2. The five AI features

### 2a. Writing feedback — `/api/ai/writing-feedback` (RECOMMENDED FIRST)
**Status: DONE** — Live with Claude grader + offline heuristic fallback; toggleable server-side persistence.
- **Why first:** highest value + self-contained + text-only (no audio). Makes the just-shipped Writing runner actually graded.
- **Held today:** submit shows `sampleWritingResult`.
- **Build:** given the essay text + task prompt/criteria, return **overall band + 4 IELTS criteria** (task response, coherence & cohesion, lexical resource, grammatical range/accuracy) **+ inline annotations** (quoted span → note, per criterion).
- **Output shape (match existing):** web `WritingResult` / `WritingCriterion` / `WritingAnnotation` in `src/mock/types.ts`; mobile `WritingResult`/`WritingCriterionKey` in `lib/models/models.dart`. Keep the same fields so `WritingResultsPage` / `writing_results_screen` render real data.
- **UI:** replace the `sampleWritingResult` path in web `WritingEditorPage.submit` → `GradingModal` → `WritingResultsPage`, and mobile `writing_editor_screen._submit` → `writing_results_screen`. Add loading/error/timeout states; keep the sample as an offline/held fallback.

### 2b. Coach chat — `/api/ai/coach`
- **Held today:** placeholder page, input disabled.
- **Build:** an IELTS/English tutor chat. Decide request/response vs **streaming** (streaming is nicer but more work — SSE from Spring; the web/mobile clients then stream). System prompt = coach persona (brand `coachName`). Conversation history handling (client-sent history vs server session).
- **UI:** web `src/features/coach/CoachPage.tsx`, mobile `lib/features/coach/coach_screen.dart` — enable input, render streamed/returned messages, errors.

### 2c. Studio Generate / Extract / Fill-answers (admin authoring)
- **Held today:** local heuristics (`aiQuestions`, `defaultAnswerFor`), not a model.
- **Build:** real LLM generation for the Content Studio — generate questions from a passage/topic, extract a passage/questions from pasted text, fill missing answers. Admin-only (already behind the admin role + `/studio` guard).
- **UI:** `src/features/studio/components.tsx` (`AiButton`), `src/features/studio/QuestionRow.tsx`, and the skill editors (`ListeningEditor`, `ReadingEditor`, etc.). Wire the buttons to `/api/ai/studio-*` endpoints; keep the local heuristic as a fallback.

### 2d. Speaking feedback — `/api/ai/speaking-feedback`
- **Held today:** submit disabled; results sample-based.
- **Dependency:** the Speaking recorder is **simulated** ("Real audio capture for Speaking" is a separate roadmap item). So either (i) do **real audio capture first** and feed audio/transcript, or (ii) start with a transcript-only version.
- **Build:** band + 4 speaking criteria (fluency & coherence, lexical resource, grammar, pronunciation). Enables scored Speaking + the **full-exam Speaking band** (currently the full-exam orchestrator holds Speaking).

### 2e. Live Interview — real-time examiner (MOST COMPLEX, do LAST)
- **Held today:** "coming soon" screen (`src/features/simulation/LiveInterviewPage.tsx`).
- **Build:** real-time examiner — turn-taking, likely **voice** (STT + LLM + TTS) and streaming. Its own sub-phase; scope separately.

---

## 3. Cross-cutting work (applies across features)

- [ ] **Web client:** add an `api.ai` group in `src/lib/api.ts` (`coach`, `writingFeedback`, `speakingFeedback`, `studio*`); enable the currently-disabled `AiButton`s / submit actions; replace sample results with real responses + loading/error/timeout UI.
- [ ] **Mobile client:** matching methods in `lib/services/api_client.dart`; wire coach + writing/speaking results to the real endpoints; keep sample fallback for offline/held.
- [ ] **Prompt engineering + eval:** IELTS-rubric fidelity for band accuracy; a small eval set to sanity-check bands/criteria before shipping.
- [ ] **Ops:** cost/latency budgets, token caps, retries/timeouts, optional response caching; observability/logging (without logging PII/essays inappropriately).
- [ ] **Tests:** backend contract tests with the LLM **mocked** (deterministic); **update `HttpContractTest.aiEndpointsAreDisabled`** once endpoints return real responses.
- [ ] **Loop closure:** the Writing runner's `seed-w1` is a draft — publishing a writing exam + real feedback closes the end-to-end writing loop; likewise a published listening/speaking exam for those.
- [ ] After any code change, **refresh graphify** for the touched codebases (standing rule) and update the two `docs/ROADMAP.md` files (flip the AI items from held → done as they land).

---

## 4. Suggested phasing (dependency-ordered)

1. **Foundation** (§1) + **Writing feedback** (§2a) — self-contained, text-only, highest value.
2. **Coach chat** (§2b).
3. **Studio Generate / Extract / Fill** (§2c) — admin authoring.
4. **Real audio capture for Speaking**, then **Speaking feedback** (§2d).
5. **Live Interview** (§2e) — realtime, most complex.

---

## 5. Key file pointers

**Backend (`backend/src/main/java/com/fluenta/api/`)**
- `web/AiController.java` — the placeholder to replace with real endpoints.
- `src/main/resources/application.yml` — add `fluenta.ai.*` config + key env var.
- new `service/AiService.java` (+ provider client).
- `src/test/java/com/fluenta/api/HttpContractTest.java::aiEndpointsAreDisabled` — update when live.

**Web (`src/`)**
- `lib/api.ts` — add the `api.ai` group.
- `features/coach/CoachPage.tsx` — coach chat UI.
- `features/writing/WritingEditorPage.tsx`, `features/writing/WritingResultsPage.tsx`, `features/exam-runner/GradingModal.tsx` — writing feedback flow; `mock/data.ts` (`sampleWritingResult`).
- `features/simulation/SpeakingPage.tsx` / speaking results + `features/simulation/LiveInterviewPage.tsx`.
- `features/studio/components.tsx` (`AiButton`), `features/studio/QuestionRow.tsx` (`aiQuestions`, `defaultAnswerFor`), the skill editors under `features/studio/editors/`.

**Mobile (`fluenta-mobile/lib/`)**
- `services/api_client.dart` — add AI methods.
- `features/coach/coach_screen.dart`.
- `features/writing/writing_results_screen.dart` (`sampleWritingResult`), speaking result/results screen.
- `models/models.dart` — `WritingResult` / `WritingCriterionKey` shapes to keep in sync with the backend DTOs.

---

## 6. How to start the fresh session
Open a new session in `D:\personal\fluenta-web`, and hand it this file plus:
> "Build the Gen AI / LLM MVP per `docs/ai-llm-mvp-pending.md`. Start with the Foundation (§1) + Writing feedback (§2a). Load the `claude-api` skill for the LLM integration, brainstorm the design first, then spec → plan → build."
The project's workflow this session has been: brainstorm → spec → implementation plan → subagent-driven build with per-task + final reviews → merge/push → refresh graphify. Follow the same.
