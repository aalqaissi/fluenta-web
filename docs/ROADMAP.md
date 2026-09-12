# Yalla English Hub — Roadmap & Pending Items

A living checklist of deferred / held work. **Pick items by priority and I'll build them.**
Priority column: fill with P0/P1/P2 (or leave blank). Status: ☐ pending · ◐ in progress · ☑ done.

_Last updated 2026-09-12._

## Held this stage (by decision)

| Pri | Status | Item | Notes |
|----|----|----|----|
|  | ☐ | **Vocabulary practice** — full student runner + Content-Studio authoring + scoring | This stage: dashboard-level only (progress, strengths/weaknesses, Practice-by-Skill card). Practice page is "Coming soon". |
|  | ☐ | **Grammar practice** — full student runner + Studio authoring + scoring | Same as Vocabulary. |
|  | ☐ | **AI: Fluenta/Einstein Coach chat** | Held; button disabled, `/api/ai/coach` → 501. Needs real LLM integration. |
|  | ☐ | **AI: Writing feedback** (band + criteria + inline annotations) | Held; submit disabled, `/api/ai/writing-feedback` → 501. |
|  | ☐ | **AI: Speaking feedback** (band + 4 criteria) | Held; submit disabled, `/api/ai/speaking-feedback` → 501. |
|  | ☐ | **AI: Live Interview** (real-time examiner) | Held; page is a "coming soon" screen. |
|  | ☐ | **AI: Studio Generate / Extract / Fill-answers** | Held; buttons disabled centrally in `AiButton`. |

## Future top-level programs (track switcher is live; content not built)

| Pri | Status | Item |
|----|----|----|
|  | ☐ | **General English** track content |
|  | ☐ | **Business English** track content |
|  | ☐ | **TOEFL Preparation** track content |
|  | ☐ | **PTE Preparation** track content |
|  | ☐ | **English for Kids** track content |

_IELTS Preparation is the active track. The switcher shows the others as "coming soon"; the backend `track` field + programs list already support them._

## Cleanup / tech debt

| Pri | Status | Item | Notes |
|----|----|----|----|
|  | ☐ | **Remove "Mock Exam & Self-Improvement"** page/route/components | Hidden from nav this stage (per request), NOT deleted. Files: `src/features/mock-exams/*`, route `/mock-exams`, `MockExamsPage`, `UploadMockModal`. Decide keep vs delete at end of development. |
|  | ☐ | **Password reset / forgot-password** | Needs email delivery (no transactional email sender wired up yet). |
|  | ☐ | **Email verification flow** | Sending + confirming a verification email; once live, login can gate on `emailVerified` (it currently doesn't). |
|  | ☐ | **Google / OAuth sign-in** | Real password auth (Task 1) replaced the old any-email login; social sign-in is a separate follow-up. |
|  | ☐ | **Roles / admin gating** | Lock down the admin surface (incl. the new admin Users page) behind real roles/permissions — currently no access control beyond being logged in. |
|  | ☐ | Payments / real checkout | Checkout is a demo (no real charge). |
|  | ☐ | Real audio capture for Speaking | Recorder is simulated. |
|  | ☐ | Postgres migration option | SQLite now; JPA makes the swap a config change. |
|  | ☐ | **Backend server can't bind on this machine** — Java NIO loopback blocked by a local proxy | Not a code bug. Verified via MockMvc + verify profile. Run via Docker/WSL/another host or allow `java.exe` loopback. See `backend/README.md`. |
|  | ☐ | Code-split the FE bundle (currently one >500 kB chunk) | Vite warns; not urgent. |

## Done (recent)

- ☑ Spring Boot (Java 21) + SQLite backend; FE wired to the API.
- ☑ Rebrand → **Yalla English Hub**.
- ☑ Login-first flow + 4-step onboarding → dashboard.
- ☑ Einstein-style Overview: Practice by Skill (6 skills), Progress Report (target, per-skill tabs, over-time graph, tests/average/gap), Strengths & Weaknesses, My Feedback, Recent Activity, Exam Countdown, Study Streak, Plan.
- ☑ Progress merged into Overview; Progress removed from sidebar.
- ☑ Achievements rebuilt (categories, status filters, tiers, points).
- ☑ Certificates list (Standard / IELTS Report types, verification numbers, table + row actions).
- ☑ Feedback domain (student submit + statuses new/under-review/completed; admin Feedback Review).
- ☑ Track model + switcher (IELTS live).
- ☑ **Listening audio pipeline** — admin uploads MP3/M4A in the Content Studio (`POST /api/media`, stored under an external `./data/media` dir, served publicly at `/media/**` with range support); listening sections carry an optional `audioUrl`; the web runner plays real audio (play-once) with the simulated player as the fallback. Mobile streams the same clips via `just_audio`. Speaking prompt audio remains held.
- ☑ **Real password auth + registration** — register (email/password/name) and login now verify a real BCrypt-hashed password (generic 401 on failure; the old any-email/find-or-create login is gone); plus an admin **Users** page with search, filter, and pagination, and a mark-verified action.
