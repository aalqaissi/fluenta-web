# Fluenta — Frontend Prototype Design Spec

**Date:** 2026-09-02
**Status:** Approved & built (Round 1 prototype complete — all 18 areas implemented and running)
**Goal:** A clickable, **frontend-only** (no backend, mock data) prototype of an AI-powered IELTS prep web app — a rebranded, visually elevated evolution of the "EinsteinAI" product captured in the source recording/screenshots. Built to **validate every screen** before real implementation.

Source of truth for features: [`docs/01-feature-inventory.md`](../../01-feature-inventory.md).

---

## 1. Brand & Design System

**Name:** Fluenta · **Tagline:** "Your AI coach to your target band." (both live in `src/config/brand.ts` — rebrand = one file).
**Personality:** warm, encouraging, reassuring, but grown-up and credible (audience = adult test-takers, often anxious). Not childish.

### Color tokens (warm & encouraging)
Defined as CSS variables in `src/theme/tokens.css`, mapped in `tailwind.config`. Light mode is primary; a warm dark mode is a stretch goal.

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#EF6C57` (warm coral) | Brand, primary CTAs |
| `--primary-strong` | `#E14B34` | Hover/active |
| `--secondary` | `#F5A524` (amber) | Secondary actions, highlights, streaks |
| `--success` | `#16A34A` (growth green) | Correct answers, band gains, "achieved" |
| `--info` | `#0EA5A4` (soft teal) | AI/Coach moments, informational |
| `--background` | `#FDF8F3` (warm cream) | App background |
| `--surface` | `#FFFFFF` | Cards |
| `--foreground` | `#292524` (warm charcoal) | Text |
| `--muted` | `#F5EEE7` (warm sand) | Muted surfaces |
| `--muted-foreground` | `#78716C` | Secondary text |
| `--border` | `#EBE1D6` | Borders/dividers |
| `--destructive` | `#DC2626` | Delete/danger |
| `--ring` | `#EF6C57` | Focus rings |

Band-score scale colors: 0–4 amber-red, 5–6 amber, 6.5–7.5 teal, 8–9 green (for progress bars/tiles).

### Typography
**Plus Jakarta Sans** throughout (friendly, modern, professional; rounded terminals give warmth without looking like a kids' app). Weights 400/500/600/700. Base 16px, line-height 1.5, headings 600–700. Optional numeric warmth via same family.

### Style & motion
- **Soft UI:** `rounded-2xl`/`rounded-3xl` cards, soft layered shadows (not heavy clay), warm subtle gradients on hero/CTAs.
- **Micro-interactions:** gentle scale-on-press (0.97), hover lift, 150–300ms transitions, staggered card reveals (`back.out` easing). `prefers-reduced-motion` respected.
- **Encouraging copy & empty states** everywhere (e.g. "You've got this — start your first Reading set").
- **Icons:** Lucide (SVG only, never emoji).
- **Accessibility:** contrast ≥4.5:1, visible focus, keyboard nav, 44px touch targets, aria labels.

---

## 2. Architecture & Tech

- **Stack:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui-style primitives (Radix + cva) + React Router + lucide-react. Toasts via `sonner`.
- **No backend.** A `src/mock/` layer holds typed fixtures; a `mockApi` module returns Promises with small artificial delays to simulate loading/AI-grading. Nothing hits the network.
- **Deploy:** Netlify-ready — `netlify.toml` (build `vite build`, publish `dist/`) + SPA redirect (`/* -> /index.html`) so React Router deep links work. User runs locally first, then deploys.

### Gating (important)
Every section is built as a **real, fully-designed feature** — the owner must evaluate actual screens, **not** "Upgrade to unlock" dead-ends. The free/Pro lock + upsell UI from the source is preserved as a **demonstrable visual state** behind a dev **plan toggle** (in the profile menu), defaulting to **full access** so all features are visible by default.
- **State:**
  - App context (`AppProvider`): current user, plan (free/pro), sidebar collapsed, theme.
  - Exam session: `useReducer` store (answers, current passage/question, timer, highlights/annotations).
  - Everything else: local component state.
- **Routing (client-side):**

| Path | Screen |
|---|---|
| `/login` | Login / landing (Google sign-in mock) |
| `/` | Dashboard (Overview) |
| `/simulation/reading` | Reading practice hub |
| `/simulation/writing` | Writing hub |
| `/simulation/listening` | Listening hub |
| `/simulation/speaking` | Speaking hub |
| `/simulation/full-exam` | Full IELTS exam orchestrator |
| `/exam/:skill/:id` | Exam runner (shared) |
| `/results/:skill/:id` | Results view (shared) |
| `/mock-exams` | My Mock Exams (tabs, filter, upload, delete) |
| `/progress` | Progress |
| `/lessons` | Lessons & Library |
| `/lessons/:id` | Lesson detail |
| `/achievements` | Achievements |
| `/certificates` | Certificates |
| `/coach` | Fluenta Coach (AI chat) |
| `/checkout` | Subscription / checkout |
| `/settings/account` | Account & settings |

- **Overlay components (not routes):** Set Exam Date, Share Feedback, AI Grading, Clear Annotations, Delete Exam, Delete Account confirm.

### Folder structure
```
src/
  config/brand.ts            # name, tagline, plan copy
  theme/tokens.css
  mock/                      # users, exams, passages, questions, progress, plans, lessons, achievements
  lib/mockApi.ts
  components/
    layout/                  # AppShell, Sidebar, Topbar, ProfileCard, MobileNav
    ui/                      # shadcn primitives
    common/                  # PlanBadge, LockBadge, EmptyState, StatTile, ProgressRing, StreakHeatmap, BandBar
  features/
    dashboard/  reading/  writing/  listening/  speaking/  full-exam/
    exam-runner/             # PassagePane, QuestionPane, HighlightToolbar, Timer, GradingModal, ResultsView,
                             #   questions/  (11 renderers)
    mock-exams/  progress/  coach/  lessons/  achievements/  certificates/  checkout/  settings/  auth/
  App.tsx  main.tsx
```

### The 11 IELTS question renderers (shared engine)
TrueFalseNotGiven · YesNoNotGiven · MultipleChoice · MatchingInformation · MatchingHeadings · MatchingFeatures · MatchingSentenceEndings · SentenceCompletion · SummaryCompletion · DiagramLabelCompletion · ShortAnswer. One `<QuestionRenderer type=...>` switch drives both practice and mock exams.

---

## 3. Full Screen Map (what gets built)

**From the recording/screenshots (faithful in structure, elevated in look):**
1. App shell — sidebar (collapsible), topbar, profile card, plan/lock gating.
2. Dashboard — welcome banner, IELTS-journey hero + upsell variant, Quick Start cards, Full-Exam CTA, Coach CTA, Progress Report (target bar + tabs), Current Plan, Exam Countdown, Study Streak (+ heatmap), My Feedback.
3. Set Exam Date modal · Share Feedback modal.
4. Reading practice + shared exam runner (2-pane, highlight toolbar, find-text, timer, progress) → AI Grading modal → Reading results.
5. Writing results (criteria tabs, Original/Feedback toggle, inline annotations, coach handoff).
6. My Mock Exams (tabs, type filter, exam cards, Upload Mock, delete).
7. Progress (strongest/needs-improvement, per-section band tiles, recent exams).
8. Subscription / checkout (plan list, summary, promo, WhatsApp support, What-You'll-Get).
9. Account & settings (email, Google login, save-history toggle, danger zone + confirm).

**Designed fresh (not in recording — from IELTS conventions + Fluenta patterns):**
10. Writing editor — prompt, timer, essay textarea + live word count, submit → grading → results.
11. Listening — audio player, section tabs, question pane, review/transcript after grading.
12. Speaking — Parts 1/2/3, cue card, mock record UI, AI feedback (fluency, pronunciation, lexical, grammar).
13. Full Exam — sequential 4-section orchestrator with section overview + combined score.
14. Fluenta Coach — AI chat UI: message bubbles, suggested prompts, result-context chips, practice-exercise cards.
15. Lessons & Library — filterable lesson/resource grid by skill & topic + lesson detail.
16. Achievements — badge grid (earned/locked) with progress.
17. Certificates — earned certificates, preview, mock download.
18. Login / landing — Google sign-in mock, value props.

---

## 4. Build Phasing (deliver-and-validate)

Delivered as one running app that fills in; you validate increments rather than waiting for all 18 areas.

- **Phase 0 — Foundation:** scaffold, tokens/theme, brand config, app shell + routing, mock-data types, shadcn setup. → **Send for a design-direction gut-check before going wide.**
- **Phase 1 — Dashboard & account:** Dashboard (all cards) + Set Exam Date + Feedback modals + Settings + Checkout.
- **Phase 2 — Exam engine:** shared runner + Reading practice + all 11 question renderers + AI grading + Reading results.
- **Phase 3 — Other skills:** Writing (editor+results), Listening, Speaking, Full Exam.
- **Phase 4 — Management:** My Mock Exams (tabs/filter/upload/delete) + Progress.
- **Phase 5 — Engagement:** Fluenta Coach chat, Lessons & Library, Achievements, Certificates, Login.
- **Phase 6 — Polish:** `impeccable`/`improve-ui` pass — responsive (375/768/1024/1440), empty/loading/error states, micro-interactions, consistency sweep.

---

## 5. Explicitly out of scope (this round)
- Any backend, real auth, real payments, real audio recording/transcription, real AI grading (all mocked with fixtures + timed placeholders). Locked features are still fully **designed and interactive** — only the data/AI behind them is mocked.
- Data persistence across reloads (mock/in-memory; optional `localStorage` for niceties).
- Real content licensing — passages/lessons are illustrative placeholders.

---

## 6. Open questions / assumptions
- **Assumption:** desktop-first (source is a desktop web app) but responsive down to mobile. Full mobile-native polish is Phase 6.
- **Assumption:** English-only UI this round (i18n-ready structure, not translated).
- **Assumption:** "Fluenta Coach" replaces "Einstein Coach"; WhatsApp support pattern kept as-is (mock link).
