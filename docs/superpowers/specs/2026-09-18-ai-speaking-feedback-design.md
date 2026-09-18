# Design Spec — AI Speaking Feedback (§2d)

_Date: 2026-09-18 · Status: approved for planning · Repos: `fluenta-web` (Spring Boot backend + React/TS web) and `fluenta-mobile` (Flutter). Web **and** mobile — student-facing._

Implements **§2d Speaking feedback** of [`docs/ai-llm-mvp-pending.md`](../../ai-llm-mvp-pending.md), the fourth slice of the Gen AI / LLM MVP. Builds on the Phase-1 Foundation (`AiClient`, `AiProperties` feature flag, offline-stub + validation-gate patterns) and the Writing-feedback pattern (§2a), and adds a **server-side speech-to-text (STT)** capability plus **real audio capture** on both clients.

This slice absorbs the roadmap's separate **"Real audio capture for Speaking"** item — the recorder is simulated today (`SpeakingRunnerPage` just runs a timer; *"Microphone is simulated in this preview"*), and this spec replaces it with real capture.

---

## 1. Goals / Non-goals

**Goals**
- Real IELTS Speaking feedback (student-facing) replacing the mock:
  - **Capture** — record the student's spoken answer for each of the 3 parts (real `MediaRecorder` on web, a mic package on mobile).
  - **Transcribe** — server-side STT turns each clip into text (Claude's API grades text, not audio).
  - **Grade** — Claude returns an **overall band + 4 IELTS speaking criteria** (fluency & coherence, lexical resource, grammatical range & accuracy, pronunciation) grounded in the transcripts and the part prompts.
- Output slots into the existing `SpeakingFeedback`/`SpeakingResult` model behind a **normalization/validation gate** (same approach as writing feedback).
- **Free/offline path** (no keys) keeps a deterministic stub — never 501.
- Enables the **full-exam Speaking band** (the orchestrator already records it via `fullExamStore.record("speaking", band)`).

**Non-goals (this phase)**
- **Live Interview** (§2e) — realtime turn-taking examiner is a separate, later slice.
- **True acoustic pronunciation scoring** — a transcript loses phonetics; pronunciation is **estimated** from transcript signals (see §3.4). A dedicated pronunciation-assessment provider (e.g. Azure) is out of scope.
- Streaming/partial transcription — one clip per part, transcribed after the student finishes; non-streaming.
- Studio authoring of speaking exams via AI (that is Studio's domain; unchanged here).

---

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | Backend **+ web + mobile**; **student-facing** (`CurrentUser.require()` → 401 if unauthenticated; not admin). |
| Transcription | **Server-side STT.** Both clients upload audio; the backend transcribes. (Chosen so mobile and web share one code path — Flutter cannot use a browser speech API.) |
| STT provider | **OpenAI Whisper (`whisper-1`)** as the default live implementation, behind a swappable `Transcriber` seam. New config `fluenta.ai.transcribe.*` + a second provider key. |
| Audio flow | **Two-step:** client uploads each part's clip via the existing `POST /api/media`, then POSTs `{examId, parts:[{number, prompt, audioUrl}]}` to `POST /api/ai/speaking-feedback` (clean JSON, reuses the proven media pipeline). |
| Audio retention | **Stored, gated by `fluenta.ai.persist`** (same toggle Writing uses). When on: audio file (in `./data/media`) + transcript + result are kept; off: ephemeral. |
| Structured output | Prompt-instructed JSON + Jackson parse + **normalization/validation gate** to the 4-criteria `SpeakingFeedback` shape (bands clamped 0–9 in 0.5 steps). |
| Offline/free path | `StubTranscriber` (deterministic placeholder transcript) + `StubSpeakingGrader` (deterministic bands); never 501. |
| Model | Reuses `props.model()` (default `claude-sonnet-5`) for grading. |
| Verification | Live STT + live grade + real audio **can't run here** (no keys/socket/mic) → mocked-`Transcriber` + mocked-`AiClient` tests + the normalization gate; a real check needs a keyed host + mic. |

---

## 3. Backend architecture

New/changed under `backend/src/main/java/com/fluenta/api/`, reusing Phase-1/§2a patterns.

```
service/ Transcriber.java              NEW: interface { String transcribe(byte[] audio, String mediaType) }
         WhisperTranscriber.java       NEW: live STT (OpenAI Whisper REST); offline never instantiated
         speaking/StubTranscriber.java NEW: offline deterministic placeholder transcript
         speaking/StubSpeakingGrader.java NEW: offline deterministic 4-criteria bands
         speaking/ClaudeSpeakingGrader.java NEW: live grade (AiClient.complete) + parse
         SpeakingFeedbackService.java  NEW: validate → transcribe → grade → normalize → persist
         MediaStorageService.java      EXTEND: accept audio/webm (browser MediaRecorder) + wav
config/  AiProperties.java             EXTEND: nested transcribe config (see §3.5)
         application.yml               EXTEND: fluenta.ai.transcribe.*
dto/     AiDtos.java                   EXTEND: SpeakingPartInput, SpeakingFeedbackRequest,
                                        SpeakingCriterionDto, SpeakingPartResult, SpeakingResult
domain/  SpeakingFeedbackEntity.java   NEW: persistence (mirrors WritingFeedbackEntity)
repo/    SpeakingFeedbackRepository.java NEW
web/     AiController.java             ADD: POST /speaking-feedback, GET /speaking-feedback/{id} (student)
```

### 3.1 `Transcriber` seam

```java
public interface Transcriber {
    /** Audio bytes + IANA media type (e.g. "audio/webm", "audio/mp4") -> plain transcript text. */
    String transcribe(byte[] audio, String mediaType);
}
```

- `WhisperTranscriber` (live): POST multipart to the OpenAI audio-transcriptions endpoint (`model=whisper-1`, `language=en`, `response_format=json`), reusing an OkHttp/`java.net.http` client. Base URL + key + model from `fluenta.ai.transcribe.*`. Maps provider/network failure → friendly `ApiException(BAD_GATEWAY, …)` (same discipline as `AnthropicAiClient`).
- `StubTranscriber` (offline, `@Component`): returns a deterministic placeholder (e.g. `"[offline transcript placeholder — connect the speech service to transcribe your recording]"`). No network. Used whenever `!transcribe.live()`.

### 3.2 `SpeakingFeedbackService`

Twin of `WritingFeedbackService`.

- **generate(userId, SpeakingFeedbackRequest)** → `SpeakingResult`:
  1. **Validate:** ≥1 part, ≤3 parts; each part has a resolvable `audioUrl`; total audio bytes ≤ `transcribe.maxAudioBytes()`; reject empties → `ApiException.badRequest`.
  2. **Offline** (`!transcribe.live() || !props.live()`): `StubTranscriber` for each part + `StubSpeakingGrader` → deterministic `SpeakingResult`. Never 501.
  3. **Live:** for each part, resolve `audioUrl` → local file under the media store, read bytes, `Transcriber.transcribe(...)`. Build the grading prompt (part number + prompt/questions + transcript for each part) → `ClaudeSpeakingGrader.grade(...)` (calls `AiClient.complete`) → parse JSON.
  4. **Normalize** (§3.3) → `SpeakingResult`.
  5. **Persist/retain, gated by `props.persist()`:** the two-step flow always writes each clip to `./data/media` at upload time, so retention is enforced at grade time — **when `persist` is on**, save a `SpeakingFeedbackEntity` (transcripts + result JSON) and keep the audio files; **when off**, delete the part audio files after grading and persist nothing (ephemeral). Return the result with its `id` (a transient id when not persisted).
- **get(userId, id)** → `SpeakingResult` (owner-scoped read, mirrors `WritingFeedbackService.get`).
- `resolveAudioUrl`: the media pipeline serves files at `/media/**` from `./data/media`; the service maps a stored `audioUrl` back to its on-disk path (reusing `MediaStorageService`), rejecting any path that escapes the media root.

### 3.3 Normalization / validation gate (`SpeakingResult`)

Every graded result is normalized before leaving the server:
- **criteria:** exactly the 4 canonical criteria, in order, with fixed keys + labels (drop/ignore extras, fill missing):
  - `fluency` → "Fluency & Coherence"
  - `lexical` → "Lexical Resource"
  - `grammar` → "Grammatical Range & Accuracy"
  - `pronunciation` → "Pronunciation"
- **band (per criterion + overall):** numeric, clamped to `[0, 9]` and snapped to the nearest 0.5.
- **overall:** if the model omits/!∈range, recompute = mean of the 4 criterion bands, rounded to nearest 0.5 (matches the web `speakingOverall`).
- **note (per criterion):** non-blank string; coerce blank → a short generic note.
- **parts:** echo `{number, transcript, note?}` per input part (transcript is what the STT produced; empty allowed offline).
- **source:** `"claude"` (live) or `"offline"` (stub), like `WritingResult.source`.

### 3.4 Pronunciation (honest limitation)

A transcript cannot measure phonetics. v1 still returns a `pronunciation` band, **estimated** from transcript-visible signals (fluency/coherence markers, filler density, self-correction) and, where the STT exposes it, average word confidence as a weak proxy. The grading prompt instructs the model to state in the pronunciation `note` that it is estimated from a transcript, not measured acoustically. True acoustic scoring is a future enhancement.

### 3.5 Config (`fluenta.ai.transcribe.*`)

A **sibling** `@ConfigurationProperties("fluenta.ai.transcribe")` record (`TranscribeProperties`) — deliberately NOT new components on the `AiProperties` canonical constructor, to avoid re-rippling the positional `new AiProperties(...)` test call sites (a known cost in §2c/SB1). Fields:
```
fluenta.ai.transcribe.enabled      (default true)
fluenta.ai.transcribe.api-key      (env: OPENAI_API_KEY or a dedicated var; default "")
fluenta.ai.transcribe.base-url     (default the OpenAI audio endpoint)
fluenta.ai.transcribe.model        (default "whisper-1")
fluenta.ai.transcribe.max-audio-bytes    (default 25_000_000 — Whisper's ~25 MB request cap)
fluenta.ai.transcribe.max-audio-seconds  (soft cap per clip; informational/validation)
```
`transcribe.live()` = `enabled && api-key non-blank` (mirrors `AiProperties.live()`). The key is redacted in `toString()`. The speaking **live path requires both** `transcribe.live()` (STT) and `props.live()` (grading); if either is missing, the whole request degrades to the offline stub.

---

## 4. API contract

`POST /api/ai/speaking-feedback` — **student-auth** (`CurrentUser.require()` → 401 unauth). Not admin.

```
POST /api/ai/speaking-feedback
  { "examId": "speak-skills",
    "parts": [
      { "number": 1, "prompt": "Let's talk about your hometown. Where are you from? …", "audioUrl": "/media/ab12.webm" },
      { "number": 2, "prompt": "Describe a skill you learned. You should say: …",       "audioUrl": "/media/cd34.webm" },
      { "number": 3, "prompt": "Let's discuss learning in general. …",                   "audioUrl": "/media/ef56.webm" }
    ] }
  → { "id": "...", "source": "claude", "overall": 6.5,
      "criteria": [ { "key":"fluency","label":"Fluency & Coherence","band":6.5,"note":"…" }, …4 total ],
      "parts": [ { "number":1, "transcript":"…", "note":"…" }, … ] }

GET /api/ai/speaking-feedback/{id}   → the same SpeakingResult (owner-scoped)
```

**DTOs (`AiDtos`)**: `SpeakingPartInput(Integer number, String prompt, String audioUrl)`; `SpeakingFeedbackRequest(String examId, List<SpeakingPartInput> parts)`; `SpeakingCriterionDto(String key, String label, double band, String note)`; `SpeakingPartResult(Integer number, String transcript, String note)`; `SpeakingResult(String id, String source, double overall, List<SpeakingCriterionDto> criteria, List<SpeakingPartResult> parts)`.

**Retained catch-all**: `POST /api/ai/{feature}` stays 501 for `live-interview` (§2e). The literal `/speaking-feedback` route takes precedence.

**Media store change**: `POST /api/media` (existing) must accept the recorded MIME types. Extend `MediaStorageService`'s allow-list with `audio/webm` (→ `.webm`) for browser `MediaRecorder`; `audio/mp4`/`audio/aac`/`audio/x-m4a` (Safari + mobile) are already allowed. Whisper accepts webm/mp4/m4a/mp3/aac/wav.

---

## 5. Web wiring (`fluenta-web`)

- `src/lib/api.ts`: types + `api.ai.speakingFeedback(req)` (POST `/ai/speaking-feedback`) and `getSpeakingFeedback(id)` (GET). Reuses `api.media.upload(file)` for the clips.
- `src/features/exam-runner/SpeakingRunnerPage.tsx`: replace the simulated recorder with real capture:
  - `getUserMedia({ audio: true })` + `MediaRecorder` (prefer `audio/webm;codecs=opus`, fall back to `audio/mp4` on Safari), keeping the existing 2:30 `RECORD_CAP` and per-part re-record.
  - On stop, hold the `Blob` per part; on **Submit**, upload each part's blob via `api.media.upload` → collect `audioUrl`s → `api.ai.speakingFeedback({ examId, parts })` → drive `GradingModal` → `SpeakingResultsPage`.
  - **On error/offline → fall back to the existing `getSpeakingFeedback()` mock** (never dead-ends), matching the Studio pattern. Loading state on Submit while in flight.
  - Mic-permission denied → a clear inline message + the mock fallback.
- Full-exam mode (`?full=`) already calls `fullExamStore.record("speaking", overall)` — unchanged, now fed the real band.
- `SpeakingResultsPage` already renders `SpeakingFeedback[]` — feed the real `result.criteria`.

## 6. Mobile wiring (`fluenta-mobile`, Flutter)

Mirror the coach/writing wiring already shipped:
- A mic/recording package (e.g. `record`) with runtime **microphone permission** handling; record each part to `m4a/aac` (already an accepted media type).
- Upload each clip to `POST /api/media` via the existing media client, then call the new `/api/ai/speaking-feedback` from `lib/services/api_client.dart`.
- Render the returned criteria/overall in `speaking_results_screen`; keep the sample as the offline/error fallback.
- Server URL config is already editable (parity project); no new client config beyond the recording package + permissions.

---

## 7. Safety / ops

- **Student-auth** endpoint; inputs are student audio → capped (max audio bytes/duration, ≤3 parts).
- **Structured normalization gate** contains malformed model output (never emits an out-of-range band or a non-canonical criterion).
- **PII / privacy:** never log audio bytes or transcripts at info level. Audio + transcript are stored **only** when `fluenta.ai.persist` is on; the Speaking page's "your recordings stay yours" promise holds (owner-scoped reads; no cross-user access).
- **Cost/latency:** STT (~$0.006/min) + a grading call per submission; non-streaming; student volume. Reuses Sonnet 5 for grading.
- **Second provider key** (`fluenta.ai.transcribe.api-key`) is required for the live STT path — the accepted cost of server-side transcription.

---

## 8. Tests & verification

- **Backend (MockMvc, `mvn -q test -DforkCount=0`)**:
  - `SpeakingFeedbackService` unit tests with a **mocked `Transcriber` + mocked `AiClient`** (canned transcript, canned JSON grade) → assert the normalization gate: 4 canonical criteria in order, bands clamped/snapped to 0–9/0.5, overall recomputed when the model omits it, part transcripts echoed.
  - `StubTranscriber` + `StubSpeakingGrader` tests → deterministic offline output; valid shape; no network.
  - Oversize-audio rejection (> `maxAudioBytes`) → `ApiException`.
  - `MediaStorageService` test: `audio/webm` now accepted (→ `.webm`); an unsupported type still rejected.
  - Contract tests: a logged-in **student** → `POST /api/ai/speaking-feedback` (offline) → **200 + 4 criteria + overall**; **unauthenticated → 401**. Asserts the route is live (not 501).
  - `WhisperTranscriber` request mapping exercised where practical (the live HTTP call is integration-only).
- **Web**: `npm run lint` + `npm run build` clean; the error/offline fallback (record → API fails → mock) is exercisable without a backend.
- **Mobile**: `flutter analyze` + build; recording/permission flow is device-verified off-machine.

---

## 9. Risks / open items

- **Live STT + live grade + real audio unverifiable here** (no keys, no socket, no mic) — exercised via mocked `Transcriber`/`AiClient`; a real record→transcribe→grade check needs a keyed host with a microphone.
- **Recorded audio format**: browser `MediaRecorder` emits `audio/webm;opus` (Chrome/Firefox) or `audio/mp4` (Safari); mobile emits `m4a/aac`. The media store must accept all of these (§4); Whisper accepts all of them. Confirm Safari's actual output MIME during web QA.
- **Whisper 25 MB request cap**: three ≤2:30 clips at opus bitrates are well under it; `maxAudioBytes` guards the edge. If a longer format is ever used, chunking would be needed (out of scope).
- **Pronunciation** is estimated, not measured (§3.4) — set expectations in the note; a future acoustic-assessment provider can slot behind the same result shape.
- **Provider swap**: the `Transcriber` seam lets Deepgram/Groq/self-hosted replace Whisper without touching `SpeakingFeedbackService`.
- **Graphify + ROADMAP**: after the build, refresh graphify (web + backend + mobile — mobile is touched this slice) and flip §2d and the "Real audio capture for Speaking" item held→done in the pending doc + `docs/ROADMAP.md`.

---

## 10. File change summary

**backend** — add: `service/Transcriber.java`, `service/WhisperTranscriber.java`, `service/speaking/StubTranscriber.java`, `service/speaking/StubSpeakingGrader.java`, `service/speaking/ClaudeSpeakingGrader.java`, `service/SpeakingFeedbackService.java`, `domain/SpeakingFeedbackEntity.java`, `repo/SpeakingFeedbackRepository.java`, tests (`SpeakingFeedbackServiceTest`, `StubSpeakingGraderTest`/`StubTranscriberTest`, `HttpContractTest` speaking cases, `MediaStorageService` webm case); edit: `config/AiProperties.java` (+transcribe config), `resources/application.yml`, `dto/AiDtos.java` (+speaking records), `service/MediaStorageService.java` (+webm/wav), `web/AiController.java` (+2 speaking routes).

**web** — edit: `src/lib/api.ts` (+speaking types/methods), `src/features/exam-runner/SpeakingRunnerPage.tsx` (real capture + wiring + fallback). (`SpeakingResultsPage.tsx` already renders the shape.)

**mobile** — edit: `lib/services/api_client.dart` (+speaking method), the speaking runner screen (real recording + permission + upload), `speaking_results_screen` (render real result); add a recording package + mic permission.
