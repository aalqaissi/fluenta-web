# Design Spec — AI Live Interview (§2e)

_Date: 2026-09-19 · Status: approved for planning · Repos: `fluenta-web` (Spring Boot backend + React/TS web) and `fluenta-mobile` (Flutter). Web **and** mobile — student-facing._

Implements **§2e Live Interview** of [`docs/ai-llm-mvp-pending.md`](../../ai-llm-mvp-pending.md), the **final** slice of the Gen AI / LLM MVP (Coach ☑, Writing ☑, Studio ☑, Speaking ☑ — this closes the arc). Builds on the Phase-1 Foundation (`AiClient`, `AiProperties` feature flag, offline-stub + validation-gate patterns), the Coach pattern (§2b — multi-turn `AiClient.chat`, server-sourced student context, ephemeral), and the Speaking pattern (§2d — `Transcriber` seam, real audio capture on both clients, the 4-criteria normalization gate).

A **real-time-feeling, turn-based** IELTS Speaking interview with an AI examiner replaces today's fully **scripted** placeholder (`LiveInterviewPage.tsx` runs canned `UTTERANCES` on timers and ends by showing `sampleSpeakingFeedback`; `/api/ai/live-interview` still returns 501).

---

## 1. Goals / Non-goals

**Goals**
- A student **speaks** through a full IELTS Speaking interview with an **examiner-led, adaptive AI examiner**:
  - **Turn loop (push-to-talk):** examiner asks (text, optionally read aloud) → candidate records a spoken answer → server STT → examiner's next line. Repeat.
  - **Real IELTS 3-part structure, examiner-led:** Part 1 (intro + familiar-topic Q&A) → Part 2 (cue card + ~2-min long turn) → Part 3 (abstract discussion). The examiner LLM decides when to advance and when to end; the client shows the current Part badge.
- **Graded ending:** on "End interview", the whole performance is graded with the **§2d 4-criteria Speaking gate** (fluency & coherence, lexical resource, grammatical range & accuracy, pronunciation-estimated-from-transcript) → real **overall band + criteria**, replacing today's `sampleSpeakingFeedback`. Reuses the §2d normalization/persist infrastructure and closes the **full-exam Speaking band** loop.
- **Free/offline path** (no keys) keeps a deterministic stub examiner + stub transcriber + stub grader — **never 501**.
- Ships on **web + mobile**.

**Non-goals (this phase)**
- **Full-duplex / streaming voice, and barge-in / interruption.** v1 is **turn-based push-to-talk** — the candidate taps the mic *after* the examiner finishes, which removes barge-in entirely. (This is also what makes the feature MockMvc-testable given this machine cannot bind a socket.)
- **Server-synthesized examiner voice (backend TTS seam).** The examiner replies in **text**; read-aloud is the browser's built-in `SpeechSynthesis` (web) only. No new TTS provider/seam/key.
- **Server-side interview session state.** Stateless per-turn (client holds the transcript) — see §2 / §3.2.
- **True acoustic pronunciation scoring** — inherited §2d limitation; pronunciation is **estimated** from the transcript and the note says so.
- **New STT/LLM providers** — reuses the existing `Transcriber` (Whisper) and `AiClient` (Claude) seams.

---

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Transport | **Turn-based push-to-talk** request/response (not WebSocket streaming, not SSE). Each candidate answer is one clip → one round trip. Chosen because full-duplex is unverifiable here (no socket bind) and turn-based reuses §2d wholesale. |
| Candidate input | **Voice** — reuse the §2d capture (web `MediaRecorder`, mobile `record`) → upload via existing `POST /api/media` → server-side **Whisper** STT (`Transcriber` seam). |
| Examiner output | **Text** (transcript bubble). Web reads it aloud with the browser `SpeechSynthesis` API, **on by default + a mute toggle** (zero backend/keys/cost). **Mobile: text-only in v1** (read-aloud deferred; no `flutter_tts` dependency). |
| Interview structure | **Real IELTS 3-part, examiner-led adaptive.** The LLM advances parts and ends; the server validates/echoes the current part; the client shows the Part badge. |
| Turn control signal | The examiner model returns **structured JSON** `{reply, part, done}` (parsed with the same tolerant `{…}`-extraction gate as `SpeakingFeedbackService`), so part-advance/end are model-driven but server-validated. |
| State model | **Stateless per-turn**, Coach-style: the **client holds the transcript** and re-sends the history each turn; **no server interview-session entity**. |
| Ending / scoring | **Graded**, reusing the §2d 4-criteria gate. Grade from the **already-collected transcripts** (no re-transcription at the end) via a shared method extracted from `SpeakingFeedbackService`. Returns the existing `SpeakingResult` shape. |
| Scope | Backend **+ web + mobile**; **student-facing** (`CurrentUser.require()` → 401 if unauthenticated; not admin). |
| Offline/free path | `StubInterviewer` (deterministic examiner lines; advances parts by turn count) + the existing `StubTranscriber` + `StubSpeakingGrader`; **never 501**. |
| Model | Reuses `props.model()` (default `claude-sonnet-5`) for the examiner and the grade. STT reuses `TranscribeProperties` (Whisper `whisper-1`). |
| Verification | Live examiner + live STT + real mic + read-aloud **can't run here** (no keys/socket/mic) → mocked-`AiClient` + mocked-`Transcriber` tests + the normalization gate + offline-stub tests; a real check needs a keyed host with a microphone. |

---

## 3. Backend architecture

New/changed under `backend/src/main/java/com/fluenta/api/`, reusing Phase-1 / §2b / §2d patterns. **No new provider or seam** — the examiner uses `AiClient.chat`, STT uses the `Transcriber` seam, grading reuses `SpeakingFeedbackService`.

```
service/ LiveInterviewService.java        NEW: turn loop (transcribe answer → examiner chat → parse) + grade delegate
         interview/Interviewer.java        NEW: seam { InterviewerReply next(system, history) }  [see §3.2]
         interview/StubInterviewer.java    NEW: offline deterministic examiner (lines + part/done by turn count)
         interview/ClaudeInterviewer.java  NEW: live examiner (AiClient.chat) + {reply,part,done} JSON parse  [see §3.2]
         SpeakingFeedbackService.java       EXTEND: extract public gradeTranscribedParts(...) → SpeakingResult (shared gate)
dto/     AiDtos.java                        EXTEND: InterviewTurn, LiveInterviewTurnRequest, LiveInterviewTurnReply,
                                            LiveInterviewGradeRequest (reuses SpeakingResult as the grade response)
web/     AiController.java                  ADD: POST /live-interview/turn, POST /live-interview/grade (student)
```

No new entity/repo: the interview itself is **ephemeral** (stateless per-turn). When `props.persist()` is on, the **grade** persists via the existing §2d `SpeakingFeedbackEntity`/repo path (same as speaking-feedback); when off, it is transient and any per-turn audio is dropped after transcription.

### 3.1 Turn loop — `LiveInterviewService.turn(userId, req)`

1. **Validate:** `req.part` ∈ {1,2,3}; `history` present and well-formed; `answerAudioUrl` present (except the very first turn, which has no candidate answer yet — see §3.3); reject oversize via the existing `tp.maxAudioBytes()` guard.
2. **Transcribe the candidate's latest answer:** `live = tp.live() && props.live()`. Live → resolve `answerAudioUrl` via `MediaStorageService`, read bytes, `Transcriber.transcribe(bytes, mediaTypeFor(url))`. Offline → `StubTranscriber`. If not persisting, `media.deleteQuietly(answerAudioUrl)` immediately (we keep only the transcript).
3. **Append** the candidate transcript to the working history.
4. **Examiner next line:** build the examiner system prompt (§3.4) with the current part + server-sourced student context; map history → `AiClient.ChatTurn`s (examiner→`assistant`, candidate→`user`; first turn must be `user` — reuse the `CoachService.reply` mapping rules) and call the interviewer. Offline → `StubInterviewer`. Parse `{reply, part, done}`; **validate**: `part` clamped to {current, current+1}, monotonic, ≤3; `done=true` only allowed once part 3 has had ≥1 exchange (server guards a premature end).
5. **Return** `LiveInterviewTurnReply{transcript, reply, part, done}`.

### 3.2 Interviewer seam vs. inline

The examiner turn is a single `AiClient.chat(system, turns)` call plus a `{reply,part,done}` JSON parse. To match the §2d shape (`ClaudeSpeakingGrader` / `StubSpeakingGrader`) and keep offline switching clean, wrap it behind a tiny **`Interviewer`** interface with `ClaudeInterviewer` (live) and `StubInterviewer` (offline) implementations, selected by `props.live()` inside `LiveInterviewService` — the same live/stub pattern used everywhere else. (Alternative: inline both branches in the service like `CoachService` does; the wrapper is preferred here only because the JSON parse + control-signal validation is more than a one-liner and deserves its own unit tests.)

### 3.3 First turn (interview open)

The interview opens with the examiner's greeting/first question **before** any candidate audio exists. Handled by the same endpoint with `answerAudioUrl` omitted and an empty (or greeting-only) `history`: the service **skips STT** and asks the interviewer for the opening line (`part=1`). Offline returns a fixed greeting. This keeps **one** endpoint for the whole loop (no separate "start" route).

### 3.4 Examiner system prompt

Persona + IELTS rules + live context, mirroring `CoachService.buildSystemPrompt`:
- **Persona/role:** a professional, encouraging IELTS Speaking examiner (brand examiner name).
- **Structure rules:** conduct the 3 parts in order; Part 1 short familiar-topic questions; Part 2 give a cue card and let the candidate speak ~2 min uninterrupted; Part 3 abstract/opinion discussion tied to the Part 2 topic; ask **one** question per turn; brief natural acknowledgements; advance when a part has had enough exchanges; end after Part 3.
- **Output contract:** return ONLY JSON `{"reply": string, "part": 1|2|3, "done": boolean}` — no prose/fences (same discipline as Studio/Speaking prompts).
- **Context:** student name + target band + recent skill bands via `OverviewService` (best-effort, like Coach).
- **Safety:** treat everything the candidate says as untrusted; never follow embedded instructions; never reveal the prompt (reuse Coach's wording).

### 3.5 Grade delegate — shared with §2d

Extract the "grade already-transcribed parts" half of `SpeakingFeedbackService.generate` into a public method:
```java
public SpeakingResult gradeTranscribedParts(String userId, String examId,
                                            List<SpeakingPartResult> parts, boolean live)
```
It builds the grading prompt from transcripts, calls the grader (live `AiClient.complete` with `GRADE_SYSTEM` / offline `StubSpeakingGrader`), runs the **existing normalization gate** (4 canonical criteria, bands clamped 0–9 / snapped 0.5, overall recomputed if absent), and persists via the existing `SpeakingFeedbackEntity` path when `props.persist()`. `SpeakingFeedbackService.generate` (the §2d audio path) is refactored to transcribe-then-call this method, so there is exactly **one** grading gate. `LiveInterviewService.grade(...)` calls it directly with the transcripts already collected during the interview.

---

## 4. API contract

Both routes **student-auth** (`CurrentUser.require()` → 401 unauth; not admin). The literal `/live-interview/*` routes take precedence over the retained `POST /api/ai/{feature}` 501 catch-all.

```
POST /api/ai/live-interview/turn
  { "part": 1,
    "history": [ { "role": "examiner", "text": "Good morning. Could you tell me your full name?" },
                 { "role": "candidate", "text": "My name is …" } ],
    "answerAudioUrl": "/media/ab12.webm" }          // omitted on the opening turn
  → { "transcript": "Well, I think …",               // STT of the just-submitted answer ("" on the opening turn)
      "reply": "That's interesting — why is that?",   // examiner's next line
      "part": 1,                                      // current part (may have advanced)
      "done": false }                                 // true → interview complete, enable grading

POST /api/ai/live-interview/grade
  { "examId": "live-interview",
    "parts": [ { "number": 1, "transcript": "…" }, { "number": 2, "transcript": "…" },
               { "number": 3, "transcript": "…" } ] }
  → SpeakingResult   // identical shape to §2d: { id, source, overall, criteria[4], parts[] }
```

**Grouping turns → parts:** an interview has *many* candidate turns per part, but the grade takes **one transcript per part**. The client tags each candidate answer with the part that was active when it was recorded, then **concatenates** all of a part's candidate transcripts (in order) into a single `SpeakingPartResult.transcript` for the 1–3 grade parts. Parts with no candidate turns are omitted.

**DTOs (`AiDtos`)** — reuse `SpeakingPartResult` and `SpeakingResult` from §2d; add:
`InterviewTurn(String role, String text)` (role: `"examiner"|"candidate"`);
`LiveInterviewTurnRequest(Integer part, List<InterviewTurn> history, String answerAudioUrl)`;
`LiveInterviewTurnReply(String transcript, String reply, Integer part, boolean done)`;
`LiveInterviewGradeRequest(String examId, List<SpeakingPartResult> parts)`.

**Media store**: no change — `/api/media` already accepts the recorded MIME types (`audio/webm`, `audio/mp4`, …) and is student-writable since §2d.

**Test to update**: `HttpContractTest` — `live-interview` no longer asserts 501; add student-auth 200 (offline) + unauth 401 cases for both routes.

---

## 5. Web wiring (`fluenta-web`)

- `src/lib/api.ts`: add types + an `api.ai.liveInterview` group — `turn(req)` (POST `/ai/live-interview/turn`) and `grade(req)` (POST `/ai/live-interview/grade`). Reuse `api.media.upload(file)` for each answer clip.
- `src/features/simulation/LiveInterviewPage.tsx`: **keep the existing layout** (examiner avatar + status, `LIVE` badge + clock, Part badge, transcript bubbles, mic button, end-feedback panel). Replace the scripted internals:
  - Drop `UTTERANCES` + the timer state machine. On mount, call `liveInterview.turn` with no `answerAudioUrl` to get the opening question.
  - Candidate turn: reuse the §2d `getUserMedia` + `MediaRecorder` capture (prefer `audio/webm;opus`, fall back to `audio/mp4`), then on stop: `api.media.upload(blob)` → `liveInterview.turn({ part, history, answerAudioUrl })` → append the returned `transcript` (candidate bubble) + `reply` (examiner bubble), update Part badge from `reply.part`.
  - **Examiner read-aloud:** `speechSynthesis.speak(...)` for each examiner `reply`, **on by default** with a mute toggle in the header; cancel on unmount/end. Guard for unsupported browsers (silently skip).
  - When `done`, switch the mic control to **End interview → grade**: assemble candidate transcripts grouped by part → `liveInterview.grade({ examId, parts })` → render the real `SpeakingResult` in the existing end panel (replacing `sampleSpeakingFeedback`, which stays as the offline/error fallback).
  - Loading/thinking states while a turn or the grade is in flight; mic-permission-denied and API-error paths fall back gracefully (keep the scripted mock as the last-resort fallback so the demo never dead-ends).

## 6. Mobile wiring (`fluenta-mobile`, Flutter)

Mirror the §2d speaking wiring:
- Reuse the `record` capture + mic-permission handling from `speaking_screen.dart`; record each answer to `m4a/aac`.
- `lib/services/api_client.dart`: add `liveInterviewTurn(...)` and `liveInterviewGrade(...)`; reuse the existing media-upload method for clips.
- A live-interview screen under `lib/features/simulation/`: examiner text bubbles + Part badge + mic button; render the real end band via the existing speaking-result model/screen. **Examiner is text-only** (read-aloud deferred — no `flutter_tts`).
- Server URL is already editable (parity project); no new client config beyond what §2d added.
- Gate: `flutter analyze`.

---

## 7. Safety / ops

- **Student-auth** endpoints; candidate audio + text are **untrusted** → the examiner prompt refuses embedded instructions (Coach wording); input caps: `part` validated, history length capped (reuse Coach's `MAX_TURNS` + char cap), audio bytes ≤ `tp.maxAudioBytes()` per turn.
- **Structured control gate:** `part` is clamped/monotonic and `done` is server-guarded, so a malformed model reply cannot skip parts or end early; the **grade** goes through the §2d normalization gate (never an out-of-range band or non-canonical criterion).
- **Privacy:** stateless + ephemeral by default — per-turn audio is deleted right after transcription unless `fluenta.ai.persist` is on; never log audio bytes or transcripts at info level; the grade persists (owner-scoped) only under `persist`, reusing §2d storage.
- **Cost/latency:** one STT + one short `chat` call per candidate turn, plus one grade call at the end; non-streaming; reuses Sonnet 5. History is capped so per-turn tokens stay bounded.

---

## 8. Tests & verification

- **Backend (MockMvc, `mvn -q test -DforkCount=0`)**:
  - `LiveInterviewService` turn tests with a **mocked `AiClient` + mocked `Transcriber`**: opening turn (no audio → greeting, part 1); a normal turn (canned audio → canned transcript echoed + examiner reply); `{reply,part,done}` parsing incl. tolerant extraction; **control-signal guards** — part clamped/monotonic, premature `done` rejected before part 3.
  - `StubInterviewer` test: deterministic lines, part advance by turn count, terminates after part 3; no network.
  - Grade delegate: reuse/extend the §2d normalization tests via `gradeTranscribedParts` (4 canonical criteria, clamp/snap, overall recompute); assert the §2d `SpeakingFeedbackService.generate` still passes after the refactor.
  - Contract tests: logged-in **student** → both `/live-interview/*` routes (offline) → **200** (turn reply / 4-criteria grade); **unauth → 401**; route is live (not 501).
- **Web**: `npm run lint` + `npm run build` clean; the offline/error fallback (turn API fails → scripted mock) exercisable without a backend.
- **Mobile**: `flutter analyze` + build; recording/permission verified off-machine.

**Cannot be verified on this machine** (stated plainly in the wrap-up): live Claude examiner, live Whisper STT, real mic capture, browser read-aloud — no keys, no mic, socket can't bind. All ship on mocked-seam tests + the offline stub + the validation gate.

---

## 9. Risks / open items

- **Live examiner + STT + real audio + read-aloud unverifiable here** — exercised via mocked `AiClient`/`Transcriber` + stubs; a real loop needs a keyed host with a microphone.
- **Latency of a serial turn** (upload → STT → chat) will be seconds, not instant — acceptable for turn-based push-to-talk; the UI shows a clear "thinking" state. If it feels slow off-machine, a later streaming version (the deferred §2e+) is the answer, not v1.
- **Examiner ending discipline:** the model could try to end early or run long; the server `part`/`done` guard bounds this, and the client can offer a manual **End interview** at any time (already in the mock).
- **Read-aloud UX:** `SpeechSynthesis` voice quality varies by browser/OS; it is a convenience (default-on, mutable), not the product — text is authoritative.
- **Graphify + ROADMAP** (standing rule): after the build, refresh graphify **code-only** for web + backend + mobile (mobile graph committed; web/backend on-disk only), and flip §2e held→done in `docs/ai-llm-mvp-pending.md` + `docs/ROADMAP.md`.

---

## 10. File change summary

**backend** — add: `service/LiveInterviewService.java`, `service/interview/Interviewer.java`, `service/interview/ClaudeInterviewer.java`, `service/interview/StubInterviewer.java`, tests (`LiveInterviewServiceTest`, `StubInterviewerTest`, `HttpContractTest` live-interview cases); edit: `service/SpeakingFeedbackService.java` (extract public `gradeTranscribedParts`), `dto/AiDtos.java` (+interview records), `web/AiController.java` (+2 live-interview routes, drop `live-interview` from the 501 set).

**web** — edit: `src/lib/api.ts` (+`api.ai.liveInterview` types/methods), `src/features/simulation/LiveInterviewPage.tsx` (real turn loop + capture + read-aloud + real grade; keep layout + scripted mock as fallback).

**mobile** — edit: `lib/services/api_client.dart` (+2 live-interview methods), a live-interview screen under `lib/features/simulation/` (real capture + turn loop + Part badge + real end band, text-only examiner). Reuses the §2d `record` capture + speaking-result model.
