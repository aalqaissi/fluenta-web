# Yalla English Hub — AI English & IELTS Prep

An AI English & IELTS preparation platform — a rebranded, visually elevated evolution of the
"EinsteinAI" product. A real **client/server app**: a React frontend wired to a **Spring Boot
(Java 21) + SQLite** backend. AI features (writing/speaking feedback, coach chat, live interview)
are **held for a later stage** — their buttons are disabled ("coming soon") and their endpoints
return `501`. Everything else is real and persisted.

**This build** (Einstein-style dashboard):
- **Login-first** flow → a 4-step **onboarding** wizard (exam, purpose, date, level + target band) → dashboard.
- **Overview** dashboard: **Practice by Skill** (6 skills — Reading, Writing, Listening, Speaking,
  Vocabulary, Grammar; Vocabulary/Grammar are dashboard-tracked, practice "coming soon"),
  **Progress Report** (target progress, per-skill tabs, band-over-time graph, tests/average/gap),
  **Strengths & Weaknesses** (bar chart + strongest/weakest + per-skill list), **My Feedback**,
  **Recent Activity**, Plan, Exam Countdown, Study Streak. (Progress is merged here — no separate page.)
- **Feedback** domain: students submit feedback (statuses new → under review → completed); admins use
  the **Feedback Review** queue to reply and move status.
- **Certificates** list (Standard / IELTS Report types, verification numbers) and **Achievements**
  (categories, tiers, points, status filters).
- **Program tracks** (IELTS active; General/Business English, TOEFL, PTE, English for Kids scaffolded
  with a switcher and backend `track` field).
- Server-side reading/listening scoring; Content Studio authoring.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for pending/held items to prioritize.

- **Brand:** Yalla English Hub · warm & encouraging design (edit `src/config/brand.ts` to rebrand).
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui-style components (Radix) + React Router.
- **Backend:** Spring Boot 3.3 + Java 21 + SQLite (single embedded file). See [`backend/README.md`](backend/README.md).

## Run locally

Backend (terminal 1):

```bash
cd backend
run.cmd
```

`backend/run.cmd` auto-detects a JDK 21 (your PATH `java` may be another version), sets `JAVA_HOME`
for you, and starts the API on **http://localhost:8080** — open that URL to see a health page. On
first run it seeds the SQLite database. (Cross-platform / no wrapper script: `mvnw spring-boot:run`
with `JAVA_HOME` pointing at a JDK 21.)

Frontend (terminal 2):

```bash
npm install
npm run dev
```

Open http://localhost:5173. **Login is a prototype** (no password): "Continue with Google" signs in
as the seeded demo user (Sara, already onboarded → straight to the dashboard); entering a **new
email** creates a fresh account that goes through onboarding first. The API base URL is
`VITE_API_URL` (default `http://localhost:8080/api`, see `.env.example`).

> **Heads-up — if the backend won't start** with *"Unable to establish loopback connection"*: a
> local loopback-intercepting proxy (seen: `mscopilot_proxy.exe`) breaks Java's NIO selector — it's
> not a bug in this code. **Fix:** quit that proxy (Task Manager → End task) and re-run, **or** run
> the backend in Docker/WSL/another host. Until the API is up, the frontend shows a clear
> "Can't reach the API" screen with Retry. More detail in [`backend/README.md`](backend/README.md).

## Build

```bash
npm run build      # type-checks then builds to dist/
npm run preview    # serve the production build locally
```

## Deploy to Netlify

The repo includes `netlify.toml` and `public/_redirects` (SPA fallback so deep links work).

- **Netlify UI:** New site → import repo → it auto-detects the settings below.
- **Netlify CLI:**
  ```bash
  npm run build
  npx netlify deploy --prod --dir=dist
  ```

| Setting | Value |
|---|---|
| Build command | `npm run build:app` |
| Publish directory | `dist` |
| Node version | 22 (set in `netlify.toml`) |

## What’s inside

**Screens:** Login → Onboarding → Overview dashboard · Reading/Listening runners (server-scored) +
results/review · Writing & Speaking runners (AI submit held) · Full Exam · Content Studio (admin
authoring) + Feedback Review (admin) · Lessons & Library · Achievements · Certificates ·
Subscription/Checkout · Account settings · Yalla Coach (AI, held) · Feedback / Set-exam-date / confirm
modals. _(Progress is merged into Overview; "Mock Exam & Self Improvement" is hidden this stage — see
`docs/ROADMAP.md`.)_

**Demo controls**
- **Preview free tier** — in the profile menu (bottom-left). Flips the app to the free/locked experience: sidebar shows Pro locks and upsell banners appear, **but every feature stays fully usable** (real screens, not upgrade walls) so the product can be evaluated in full.

## Project layout

```
src/
  config/brand.ts        # brand name + copy (single source of truth)
  theme / index.css      # warm design tokens (CSS variables)
  mock/                  # typed fixtures + reading passages/questions
  lib/mockApi.ts         # simulated grading + scoring
  components/ui|common|layout|modals
  features/<area>/       # one folder per screen area
  App.tsx                # routes
```

> Real backend + persistence now exist (Spring Boot + SQLite) with server-side reading/listening
> scoring. Still prototype-level / held for a later stage: real password auth, payments, audio
> capture, and all AI features (writing & speaking feedback, coach chat, live interview).
