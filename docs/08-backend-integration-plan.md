# Fluenta — Backend API + Frontend Wiring Plan

_Created 2026-09-05. Stage: turn the frontend-only prototype into a real client/server app._

## Goal

Add a real **Spring Boot (Java 21)** backend and wire the existing React/Vite frontend to it,
replacing the in-memory / mock data layer. **All AI functions are held this stage** — their
buttons are disabled ("Coming soon"), and their endpoints are stubbed (`501 Not Implemented`).
Every non-AI flow (auth, authoring, listing, taking reading/listening exams, scoring, results,
progress, certificates, profile, lessons/achievements/plans) becomes real, persisted, server-owned.

If the owner requests changes later, we update **both** frontend and backend to match.

## Toolchain (verified on this machine)

- JDK 21 at `D:\java\jdk-21.0.2` (user-preferred). A second JDK 21 (Adoptium 21.0.4) is the current
  `JAVA_HOME`; both are Java 21 and build-compatible.
- Maven 3.8.8 at `D:\apache-maven-3.8.8` (on PATH). A Maven wrapper (`mvnw`) is added for portability.
- To force the preferred JDK: `set JAVA_HOME=D:\java\jdk-21.0.2` before `mvnw spring-boot:run`.

## Architecture

```
fluenta-web/
  backend/                       # NEW — Spring Boot app (com.fluenta.api)
    src/main/java/com/fluenta/api/
      FluentaApiApplication.java
      config/     (CORS, Jackson, security filter, seed loader)
      domain/     (JPA entities: UserEntity, ExamEntity, AttemptEntity, CertificateEntity, SessionEntity)
      dto/        (records mirroring the FE TS types)
      repo/       (Spring Data JPA repositories)
      service/    (ScoringService, ExamService, AttemptService, UserService, CertificateService, ContentService, AuthService)
      web/        (REST controllers + GlobalExceptionHandler)
    src/main/resources/
      application.yml
      seed/*.json               # generated from the FE mock modules (see scripts/export-seed.mjs)
    data/                        # H2 file DB (gitignored)
  src/                           # existing frontend
    lib/api.ts                   # NEW — typed fetch client (base URL from VITE_API_URL)
    lib/auth.ts                  # NEW — token storage + current-user bootstrap
    ...stores refactored to call the API...
  scripts/export-seed.mjs        # NEW — esbuild-bundles src/mock/* → backend seed JSON
```

### Persistence model (document-style, pragmatic)

The authoring content (`StudioExam`) is deeply nested and still evolving, so exams are stored as a
JSON `content` column rather than a large normalised schema. This keeps FE/BE in sync cheaply (add a
field = add it to the JSON, no migration) and matches how the FE already treats a `StudioExam` as one
object.

- **ExamEntity**: `id, skill, title, module, status, scope, timeLimit, updatedAt, format, content(JSON)`.
  `format` is `studio` (StudioExam authoring shape) or `runner` (ReadingExam/ListeningExam runtime shape,
  used for the built-in demo exams which already carry `correct` answers).
- **AttemptEntity**: `id, userId, examId, skill, answers(JSON), correct, total, band, durationUsedSec, createdAt`.
- **CertificateEntity**: flat TRF columns + `scores(JSON)`.
- **UserEntity**: flat profile columns + `streak(JSON)`. (JSON columns are `text`, bound as plain
  strings — the SQLite driver has no CLOB support.)
- **SessionEntity**: `token → userId` (simple bearer auth for the prototype).
- Reference content (lessons, achievements, plans, section summaries, recent exams) is seeded and
  served read-only.

Database: **SQLite** (`./data/fluenta.db`) — a single embedded file, no DB engine/server to
install (chosen per the "keep it light / SQL Light" request). Uses `org.xerial:sqlite-jdbc` +
Hibernate community `SQLiteDialect`; Hikari pool pinned to 1 connection (SQLite is single-writer).
JPA-based, so switching to Postgres is a config change (documented, not done this stage).

> **Environment note:** on the build machine the embedded Tomcat can't start because Java's NIO
> selector self-pipe (loopback) is blocked by local software (`mscopilot_proxy.exe` / endpoint
> protection). Verified instead via in-process MockMvc + a non-web verify profile. See
> `backend/README.md` for the cause and how to run the server (allow `java.exe` loopback, or use
> Docker/WSL/another host).

### Scoring (moves to the server — this is deterministic, not AI)

Port `src/lib/mockApi.ts` scoring to Java `ScoringService`:
- collect `id → correctAnswer` from the exam content (works for both `studio` and `runner` formats),
- compare submitted answers (trim + case-insensitive),
- band: reading → `rawToBand`, listening → `bandFromAccuracy`.
The FE runner keeps its **display** shaping (`convert.ts`) but submits `{examId, answers, durationUsedSec}`;
the server scores and returns the graded attempt. Results pages read the attempt back from the server.

## API surface (v1)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | `{email,password?}` → `{token, user}` (prototype: any credentials map to the seeded user) |
| POST | `/api/auth/logout` | invalidate token |
| GET | `/api/me` | current user |
| PATCH | `/api/me` | update profile (targetBand, examDate, saveHistory, plan, name) |
| GET | `/api/exams?skill=&status=&scope=` | list exams (studio home, mock-exams, hubs) |
| GET | `/api/exams/{id}` | one exam (raw content + format) — used by studio editor & runner |
| POST | `/api/exams` | create (studio) |
| PUT | `/api/exams/{id}` | update (studio) |
| DELETE | `/api/exams/{id}` | delete |
| POST | `/api/exams/{id}/duplicate` | duplicate |
| POST | `/api/exams/{id}/status` | `{status}` publish/unpublish |
| POST | `/api/attempts` | `{examId, skill, answers, durationUsedSec}` → server-scored attempt |
| GET | `/api/attempts/{id}` | fetch a graded attempt (results page) |
| GET | `/api/attempts?examId=` | latest attempt for an exam |
| GET | `/api/progress` | section summaries + recent exams |
| GET | `/api/certificates` / POST / PUT `/{id}` / DELETE `/{id}` | certificate CRUD |
| GET | `/api/lessons` · `/api/achievements` · `/api/plans` | seeded reference content |
| POST | `/api/ai/*` (coach, writing-feedback, speaking-feedback, live) | **501 Not Implemented** (held) |

CORS allows `http://localhost:5173`. Auth via `Authorization: Bearer <token>`; unauthenticated
requests to non-`/api/auth` endpoints get `401` (the FE bootstraps a token via login).

## AI held this stage (buttons disabled, endpoints stubbed)

- Writing "Submit for AI feedback" (`WritingEditorPage`) → disabled.
- Speaking submit/feedback (`SpeakingRunnerPage`, `SpeakingResultsPage`) → disabled.
- Fluenta Coach chat (`CoachPage`) → input + send disabled.
- Live Interview (`LiveInterviewPage`) → disabled / "Coming soon".
- Studio "Generate with AI" / "Extract with AI" / "Fill missing answers" → disabled.
- Reading/Listening **scoring is kept** (deterministic, server-side) — the "AI grading" overlay
  becomes an honest "Scoring…" step.

## Execution order

1. Scaffold backend (pom, wrapper, application.yml, main class, CORS/Jackson). ✅ runs.
2. Domain entities + repositories + JSON converters.
3. `scripts/export-seed.mjs` → seed JSON; `SeedLoader` imports on first run.
4. Auth (login/logout, bearer filter) + `/api/me`.
5. Exam CRUD (studio) + list + get.
6. Attempt submit + `ScoringService` + get.
7. Progress, certificates, lessons/achievements/plans.
8. AI stub controller (501).
9. Frontend `lib/api.ts` + `lib/auth.ts`; refactor stores/pages feature-by-feature.
10. Disable AI buttons.
11. `README` + this doc + graphify refresh; verify build (`mvn`, `tsc -b`, `vite build`) end-to-end.

## Non-goals this stage

Real password auth/registration, real AI grading/chat, real audio capture/storage, payments,
Postgres/containerisation, deployment of the backend. All are documented follow-ups.
