# Yalla English Hub — AI English & IELTS Prep

An AI English & IELTS preparation platform — a rebranded, visually elevated evolution of the
"EinsteinAI" product. A real **client/server app**: a React frontend wired to a **Spring Boot
(Java 21) + SQLite** backend. AI features (writing/speaking feedback, coach chat, live interview,
Studio generation) are **enabled but run on mock/simulated data** — the real AI backend isn't built
yet (`/api/ai/*` returns `501`, and the UI uses local demo content). Everything else is real and
persisted.

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

## Set up on a new laptop (step by step)

These steps set up the app from scratch on a fresh **Windows** laptop. If you're doing this over
**AnyDesk**, connect to the target laptop and **take control** first, then run everything below on
that remote machine (its own terminals and browser — not yours). Use AnyDesk's file-transfer only if
you need to move a file; the code comes from GitHub in step 2.

### 1. Install the prerequisites

You need three tools: **Git**, **Node.js 22 LTS**, and **JDK 21 (Temurin)**. Maven is **not** required
— the repo ships the `mvnw` wrapper. Pick **Option A** (fastest) or **Option B** (manual).

#### Option A — winget (built into Windows 10/11, fastest)

Open **PowerShell as Administrator** (Start → type "PowerShell" → right-click → *Run as administrator*)
and run:

```bash
winget install --id Git.Git -e --source winget
```
```bash
winget install --id OpenJS.NodeJS.LTS -e --source winget
```
```bash
winget install --id EclipseAdoptium.Temurin.21.JDK -e --source winget
```

Accept any prompts. If `winget` isn't recognized, install **"App Installer"** from the Microsoft
Store (that provides winget), or use Option B. When done, **close and reopen** the terminal, then jump
to **Verify** below.

#### Option B — manual installers

**Git**
1. Open https://git-scm.com/download/win — the 64-bit installer downloads automatically.
2. Run `Git-*-64-bit.exe`. Click **Next** through every screen — the defaults are correct. The one
   screen that matters, **"Adjusting your PATH environment"**, must stay on
   **"Git from the command line and also from 3rd-party software"** (the default).
3. Click **Install**, then **Finish**.

**Node.js 22 LTS**
1. Open https://nodejs.org and download the **LTS** Windows Installer (`.msi`, 64-bit).
2. Run it → **Next** → accept the license → **Next** → keep the default install folder → **Next**.
3. On **Custom Setup**, leave everything selected (npm and **"Add to PATH"** are on by default) → **Next**.
   The **"Tools for Native Modules"** checkbox is **not** needed — leave it unchecked → **Next**.
4. **Install** → **Finish**.

**JDK 21 (Eclipse Temurin)**
1. Open https://adoptium.net/temurin/releases/?version=21 → set **Operating System: Windows**,
   **Architecture: x64**, **Package Type: JDK**, and download the **`.msi`**.
2. Run the installer → **Next** → accept the license → **Next**.
3. On the **Custom Setup** screen, click the drop-downs for **"Set JAVA_HOME variable"** and
   **"Add to PATH"** and choose **"Will be installed on local hard drive"** (these are off by
   default — turn them on) → **Next**.
4. **Install** → **Finish**.

#### Verify (open a NEW terminal after installing)

```bash
git --version
node -v
npm -v
java -version
```

Expected: Git 2.x, Node **v22.x**, npm 10.x, Java **21**. `git`, `node`, and `npm` must be on PATH.
Java only needs to be **version 21 present on the machine** — `backend\run.cmd` auto-detects a JDK 21
even if `java -version` prints a different version.

### 2. Get the code

Open **PowerShell** (or Windows Terminal), pick a folder, and clone:

```bash
cd D:\personal
git clone https://github.com/aalqaissi/fluenta-web.git
cd fluenta-web
```

(If the repo is private, sign in when Git prompts, or use a GitHub personal access token as the
password.)

### 3. Start the backend — terminal 1

```bash
cd backend
.\run.cmd
```

- Auto-detects JDK 21, **seeds a local SQLite database** (`backend/data/fluenta.db`) on first run, and
  serves the API at **http://localhost:8080** (open that URL — you should see a small health JSON).
- The **first** run downloads Maven + dependencies (a few minutes); later runs are fast.
- Leave this terminal running. (PowerShell needs `.\run.cmd`; `cmd.exe` accepts plain `run.cmd`.)

### 4. Start the frontend — terminal 2

```bash
cd D:\personal\fluenta-web
npm install
npm run dev
```

- `npm install` is only needed the first time (a few minutes). It serves the app at
  **http://localhost:5173**. Leave this terminal running.

### 5. Open the app

Browse to **http://localhost:5173**. Sign in with **"Continue with Google"** (demo user → straight to
the dashboard) or type a **new email** (→ onboarding wizard → dashboard). No password needed
(prototype login).

### Troubleshooting

- **Backend stops with `Unable to establish loopback connection`** — a local proxy (seen:
  `mscopilot_proxy.exe`) intercepts loopback and breaks Java's NIO selector. **Fix:** quit that
  process (Task Manager → Details → End task) and re-run `.\run.cmd`; or run the backend in Docker/WSL.
- **`run.cmd` "is not recognized" in PowerShell** — run it as `.\run.cmd` (path prefix required).
- **`No JDK 21 found`** — install Temurin 21 (step 1) or set `JAVA_HOME` to a JDK 21, then re-run.
- **Port already in use (8080 or 5173)** — stop whatever is using it, or change the port (backend:
  `server.port` in `backend/src/main/resources/application.yml`; frontend: `npm run dev -- --port 5174`).
- **App shows "Can't reach the API"** — the backend isn't up yet. Start it (step 3) and click **Retry**.
- **Reset the database** — stop the backend and delete `backend/data/fluenta.db`; it re-seeds on next start.

### Run again later (once installed)

Two terminals: `cd backend; .\run.cmd` and, in the repo root, `npm run dev`. Then open
http://localhost:5173.

## Configuration

- **`VITE_API_URL`** (frontend) — API base URL, default `http://localhost:8080/api`. Copy
  `.env.example` to `.env` to override (e.g. when the backend is hosted elsewhere).
- **Backend port** — `server.port` in `backend/src/main/resources/application.yml` (default 8080).
- **Database** — SQLite at `backend/data/fluenta.db`, created + seeded on first run.

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
