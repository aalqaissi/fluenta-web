# Full IELTS Exam (Simulation) — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Source: `/exam/full` (reached via sidebar **Simulation → Full Exam**).
> Companion docs: the four `*-mock-authoring-spec.md` files (Writing / Listening / Reading / Speaking).

---

## What it is

A **student-facing** complete IELTS mock that chains all four skills into one timed, locked simulation.
This is distinct from the per-skill **"Full Exam" tabs** in the authoring editors (which bundle only that
one skill's parts). There is **no** cross-skill full-mock *authoring* page — `/my-mocks/full-exam` is not a
real route (it falls back to the Reading library). The full exam is assembled/run here at `/exam/full`.

## Route
- **`/exam/full`** — the launch/config screen documented below.
- Nav entry: sidebar **Simulation** group → **Full Exam** (SPA button, no href).

---

## 1. Launch / config screen (`/exam/full`)

Header: **"Full IELTS Exam"** — *"Complete practice test with all four sections"*. Top-left `Back`.

### Cards

**Exam Duration**
- **2 hours 45 minutes**

**Exam Structure** (ordered list, numbered badges)
| # | Section | Time |
|---|---------|------|
| 1 | Listening | 30 min |
| 2 | Reading | 60 min |
| 3 | Writing | 60 min |
| 4 | Speaking | 15 min |

**What to Expect** (4 feature rows)
| Feature | Copy |
|---------|------|
| Realistic Exam Experience | "Authentic IELTS format with proper timing and structure" |
| Instant AI Feedback | "Get detailed band scores and improvement suggestions immediately" |
| Progress Tracking | "Your results will be saved and contribute to your overall progress" |
| Achievement Certificate | "Earn a downloadable certificate with a unique verification number upon completion" |

**Simulation Exam Rules**
- "This is a simulation exam. Do not switch tabs, minimize, or close this window once the exam has started."
- "Treat it like the real thing — stay focused, keep your discipline, and stay consistent. Every simulation you complete moves you closer to your goal score."

### Actions
- **`Start Exam`** (primary) — begins the locked, timed run.
- **`Cancel`**
- Footer note: *"Note: This is a practice exam. Take your time and do your best!"*

---

## 2. Flow (inferred from the screen; runner not started)

```
/exam/full (config)
  └─ Start Exam
       ├─ 1. Listening  (30 min, timed)
       ├─ 2. Reading    (60 min, timed)
       ├─ 3. Writing    (60 min, timed)
       └─ 4. Speaking    (15 min, timed)
  └─ AI grading  → band scores + improvement suggestions (immediate)
  └─ Results saved to Progress
  └─ Achievement Certificate (downloadable, unique verification number)
```

- **Anti-cheat / focus lock:** window must stay focused; no tab switching, minimizing, or closing once started (the copy asserts this; enforcement mechanism not verified).
- The four sections reuse the same per-skill runner UIs as the standalone Simulation entries
  (Simulation → Listening / Reading / Writing / Speaking) — those are the building blocks to model.

> ⚠️ **Not captured:** the in-exam runner UI and the results/certificate screens. `Start Exam` launches a
> ~2h45m locked attempt and creates a persistent attempt record, so it was deliberately **not** started
> during inspection. If needed, we can start a run and capture the first section, then abandon it.

---

## 3. Suggested data model

```ts
type ExamSectionKind = 'listening' | 'reading' | 'writing' | 'speaking';

interface FullExamSectionConfig {
  order: 1 | 2 | 3 | 4;
  kind: ExamSectionKind;
  timeLimitMinutes: number;   // 30 / 60 / 60 / 15
}

const FULL_EXAM_STRUCTURE: FullExamSectionConfig[] = [
  { order: 1, kind: 'listening', timeLimitMinutes: 30 },
  { order: 2, kind: 'reading',   timeLimitMinutes: 60 },
  { order: 3, kind: 'writing',   timeLimitMinutes: 60 },
  { order: 4, kind: 'speaking',  timeLimitMinutes: 15 },
];
// total = 165 min = 2h 45m

interface FullExamAttempt {
  id: string;
  startedAt: string;
  completedAt?: string;
  sectionResults: Array<{
    kind: ExamSectionKind;
    bandScore?: number;         // AI-graded
    feedback?: string;          // improvement suggestions
  }>;
  overallBand?: number;
  certificateId?: string;       // unique verification number
  focusViolations?: number;     // tab-switch / blur tracking (if enforced)
}
```

---

## 4. Open questions to confirm when building
- How the four sections are **sourced** — random Global mocks, a fixed set, or user-selectable?
- Whether **Listening audio** plays once vs. replayable in the timed run.
- Whether **Speaking** records audio and how it's graded in-flow.
- Exact **results screen** layout and the **certificate** format (see also the Certificates feature).
- Focus-lock enforcement (visibilitychange/blur handling, warnings, auto-submit).
