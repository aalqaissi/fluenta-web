# Fluenta — AI IELTS Prep (frontend prototype)

A clickable, **frontend-only** prototype of an AI-powered IELTS preparation platform — a rebranded, visually elevated evolution of the "EinsteinAI" product. Built for **stakeholder validation** before real implementation. **No backend**: all data is mocked and AI grading is simulated.

- **Brand:** Fluenta · warm & encouraging design (edit `src/config/brand.ts` to rebrand).
- **Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui-style components (Radix) + React Router + lucide-react.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Sign-in is mocked — the login screen at `/login` drops you into the dashboard.

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

**Screens (18 areas):** Dashboard · Reading practice + full exam runner (all 11 IELTS question types, highlighting, find-text, timer) · AI grading animation · Reading results + review · Writing editor + AI feedback (criteria + inline annotations) · Listening · Speaking (mock recorder + AI feedback) · Full Exam · Mock Exams (tabs, type filter, upload, delete) · Progress · Fluenta Coach (interactive AI chat) · Lessons & Library · Achievements · Certificates · Subscription/Checkout · Account settings · Login/landing · Feedback / Set-exam-date / confirm modals.

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

> Everything here is a prototype: no real backend, auth, payments, audio capture, or AI. Passages, lessons and results are illustrative placeholders.
