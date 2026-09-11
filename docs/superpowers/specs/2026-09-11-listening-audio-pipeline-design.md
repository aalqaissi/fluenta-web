# Listening Audio Pipeline — Design

_Date: 2026-09-11 · Status: approved (brainstorming) → ready for implementation plan_

## Problem

Listening playback is **simulated** in both clients — a `Timer`-driven progress bar with no
sound (mobile [listening_runner_screen.dart](../../../../fluenta-mobile/lib/features/listening/listening_runner_screen.dart);
web [ListeningRunnerPage.tsx](../../src/features/exam-runner/ListeningRunnerPage.tsx)). The backend
serves only `audioDurationSec` per section — **no audio source exists anywhere** in the stack
(`audioUrl` is absent from backend, web types, and mobile models). "Real audio" is therefore
blocked on audio content existing on the server.

## Goal

Real audio end to end: an admin uploads a clip in the Content Studio → the backend stores it on
disk and serves it → the web and mobile Listening runners stream and play it. Built as a **generic,
reusable media pipeline** so Speaking prompt audio (and other media) can plug in later.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| Q1 | **Admin gate:** reuse the existing Content Studio admin surface. Upload requires a valid session (same convention as `POST /api/exams` and the feedback queue). **No new role system** — real roles/auth stay a separate held item. |
| Q2 | **Clients:** wire real playback into **both** the web runner and the mobile app. |
| Q3 | **Scope:** **Listening only** this round; build the upload/storage/serving as a **generic media pipeline** reusable later. |
| Q4 | **Constraints:** MP3 + M4A/AAC only; ≤20 MB per clip; **one clip per section** (re-upload replaces); duration auto-filled **client-side** in Studio (hidden `<audio>`), still editable; runtime players use the real media duration once loaded. **No server-side audio parsing.** |

## Architecture

### Storage & serving (backend)

- **Media dir:** external, writable directory, default `./data/media/`, overridable via
  `FLUENTA_MEDIA_DIR`. Mirrors the SQLite DB at `./data/fluenta.db`. Created on startup if missing.
  Never inside the classpath — [SpaConfig.java](../../backend/src/main/java/com/fluenta/api/config/SpaConfig.java)
  serves the bundled frontend from `classpath:/static/` **inside the JAR** (read-only), so uploads
  cannot live under `dist-app`/the packaged static dir.
- **Serving:** a new `WebMvcConfigurer` resource handler maps `/media/**` → `file:${mediaDir}/`.
  Public (outside `/api`, so [AuthFilter.java](../../backend/src/main/java/com/fluenta/api/config/AuthFilter.java)
  never touches it), read-only. Spring's `ResourceHttpRequestHandler` supports HTTP **range
  requests**, so audio seeking/scrubbing works.

### Upload endpoint (backend)

- `POST /api/media` — multipart, `CurrentUser.require()` (the Q1 gate).
- Validates extension/content-type (`mp3`, `m4a`/`aac`) and size (≤20 MB).
- Writes bytes to `{mediaDir}/{uuid}.{ext}`; returns `{ "url": "/media/{uuid}.{ext}" }`.
- Decoupled from exams → reusable. A `MediaStorageService` owns the filesystem write/validation.
- **Multipart config:** raise `spring.servlet.multipart.max-file-size` / `max-request-size` to
  25 MB (Spring default is 1 MB).

### Data model — where `audioUrl` lives

`audioUrl` (nullable string) is a new field on each Listening **section**, sibling to the existing
`audioDurationSec`, inside the exam's JSON `content` blob. Because
[ExamEntity.java](../../backend/src/main/java/com/fluenta/api/domain/ExamEntity.java) stores content
as opaque JSON and Studio saves the whole payload via the existing `PUT /api/exams/{id}`, **the
backend exam model needs no change** — the field round-trips. Stored as a **relative path**
(`/media/...`); clients resolve it against their origin.

### Web — Studio upload + both runners

- **Studio (admin upload):** in the Listening section editor, an "Audio" control — file picker →
  `POST /api/media` → store returned `url` on the section's `audioUrl` → save exam via existing PUT.
  On file pick, read duration client-side via a hidden `<audio>` element and auto-fill
  `audioDurationSec` (editable). Small preview player + Replace/Remove actions.
- **Runner playback:** [ListeningRunnerPage.tsx](../../src/features/exam-runner/ListeningRunnerPage.tsx)
  uses a real `<audio>` element when `audioUrl` is present (play-once; disabled after finish — the
  current IELTS behavior), falling back to the existing simulated ticker when null.
- **URL resolution:** helper derives origin from `API_BASE` (strip trailing `/api`);
  `resolveMedia(audioUrl)` = origin + path (pass-through if already absolute).

### Mobile — just_audio + runner

- Add `just_audio` dependency. `Section` model + `exam_convert` learn nullable `audioUrl`.
- [listening_runner_screen.dart](../../../../fluenta-mobile/lib/features/listening/listening_runner_screen.dart):
  when `audioUrl != null`, a real `AudioPlayer` streams `{origin}{audioUrl}` (origin = `serverUrl`
  minus `/api`); progress bar/time driven by the player's real position/duration; play-once
  preserved. When null, keep the current `Timer`-based ticker as the fallback, untouched.
- Add a `mediaBase` getter to [app_config.dart](../../../../fluenta-mobile/lib/config/app_config.dart).

## Error handling & edge cases

- **Upload:** wrong type / oversize → clear 400; Studio surfaces the message. Network failure →
  toast, no partial state.
- **Playback failure** (clip 404s or won't load): runner falls back to the ticker (mobile) / shows a
  non-blocking "audio unavailable" state (web) — never blocks the exam.
- **Missing `audioUrl`** (all existing exams): simulated behavior exactly as today. Fully
  backward-compatible.
- **Accepted tradeoff:** `/media/**` is public (exam audio is content, not user data). Noted for
  future hardening (e.g. signed URLs) if needed.

## Testing / verification

This machine **cannot bind the server** (Java NIO loopback blocked by a local proxy — established
repo constraint; verified via MockMvc + verify profile).

- **Backend:** MockMvc tests for `POST /api/media` (happy path, wrong type, oversize,
  unauthenticated → 401) and for `/media/**` serving including a range request. Unit-test
  `MediaStorageService`.
- **Web:** exercise Studio upload + runner against a mocked `/media` via the Vite dev server /
  throwaway Node stub; verify in the browser preview.
- **Mobile:** unit-test `exam_convert` `audioUrl` mapping; widget-test the runner's real-vs-fallback
  branch; manual APK check over WiFi against a host that can bind.

## Out of scope

Speaking prompt audio; real admin roles/auth; server-side duration extraction; multiple clips per
section; transcripts/captions.

## Follow-ups (post-implementation)

- Refresh graphify graphs for all four codebases (standing rule).
- Update `docs/ROADMAP.md`: move the "Real audio for Listening" item toward done for Listening; note
  Speaking prompt audio remains held.
