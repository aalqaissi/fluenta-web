# Student-Facing "Take Exam" Runners — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Source: clicking **Take Exam** on Global mocks → `/exam/mock/<skill>/:mockId`.
> Companion docs: the `*-mock-authoring-spec.md` files + `full-exam-simulation-spec.md`.
> Runners were entered but **never submitted** — abandoning leaves 0 attempts (attempts persist only on submit).

---

## Route pattern & launch
- **`/exam/mock/reading/:mockId`**, **`/exam/mock/listening/:mockId`**, **`/exam/mock/writing/:mockId`**, **`/exam/mock/speaking/:mockId`**
- **Take Exam** goes **straight into the runner** (shows "Starting your exam…" briefly) — no intro/config screen (unlike the Full Exam at `/exam/full`).
- Runner is a **full-screen** view (no app sidebar).

## Shared runner shell (all skills)
- **Header:** mock title · skill badge · position indicator (`Passage N of 3` / `Section N of 4` / `Task N of 2` / `Part N`, `3 parts`).
- **Countdown timer** per passage/section/task/part (mm:ss).
- **Tips panel:** "Show <skill> tips" toggle → a strategies card.
- **`beforeunload` guard:** leaving mid-exam triggers a native "Leave site? — unsaved changes" dialog. (The Full Exam additionally forbids tab-switch/minimize/close.)
- **Primary action:** `Submit Answers` / `Complete Section & Continue` / `Submit Task` / record + `Next Part`.
- On submit → AI grading → band scores + improvement suggestions (per Full Exam intro; not captured — not submitted).
- **Backend note:** media (e.g. listening audio) is served from **Supabase storage** (`*.supabase.co/storage/...`). `mocking-exam` is frontend-only, so this is just an infra hint.

---

## 1. Reading runner (`/exam/mock/reading/:id`)
Two-pane layout: **passage (left)** / **questions (right)**.

- Header badges: `Reading` · `Academic` (or General) · `Passage 1 of 3`.
- **Passage pane:**
  - **"Find text…"** search box (search within passage).
  - **Highlighter toolbar:** 5 colour swatches + **Legend** (Color Legend) + **Clear all**.
  - **Color Legend:** Keywords (yellow) · Evidence (green) · Topic (blue) · Definitions (pink) · Contrast (purple).
  - Passage title + body text.
- **Questions pane:**
  - **Progress** counter (e.g. `0/13`) + countdown timer (~20:00 per passage).
  - Question groups ("Questions 1-6", "Questions 7-13").
  - Each question numbered, with a **type badge** (True/False/Not Given, Short Answer, …).
  - Inputs by type: radio (True / False / Not Given), text inputs with word limits ("Type your answer (max N words)").
- Footer: **`Submit Answers`**.

## 2. Listening runner (`/exam/mock/listening/:id`)
- Header: `Listening` · `Section 1 of 4`.
- **Section metadata card:** type badge (e.g. "Social Interaction") · difficulty ("Easy") · audio length ("~0:57 audio") · "10 questions" · one-line description ("Conversation between two people in an everyday social context").
- **"Show IELTS Listening Tips"** → **"Listening Success Strategies"** (7 tips: read questions first; listen for keywords/synonyms; signpost words; write as you listen; check spelling; use context; don't leave blank).
- **Audio player:** custom big **`Play Audio`** button (no native controls); **play limited to once** — "Audio played 0 of 1 time".
- Per-section countdown (10:00).
- Answer inputs: "Type your answer (max N words)".
- Footer: **`Complete Section & Continue`** (advances through the 4 sections).

## 3. Writing runner (`/exam/mock/writing/:id`)
- Header: `Writing` · `Task 1 of 2`.
- **"WRITING TASK 1 — You should spend about 20 minutes on this task."** + countdown (20:00).
- **"Show writing tips"** → 6 tips (overview sentence; precise data vocabulary; specific numbers/percentages; logical organization; don't give opinions; aim 150-180 words).
- **Prompt** text (for GT letters includes bullets + "Begin your letter as follows: Dear Sir or Madam,").
- **Response textarea** ("Write your response here…") with **live word counter** ("Words: 0 · 150 minimum").
- Footer: **`Submit Task`** → Task 2 → …

## 4. Speaking runner (`/exam/mock/speaking/:id`)
- Header: `Speaking` · `3 parts`.
- **"SPEAKING PART 1 — Introduction & Interview"** + one-line description + part countdown (~8:00).
- **"Show speaking tips"**.
- All part questions listed together with instruction: *"The examiner will ask you these questions one after another — answer them all in a single recording."*
- **Recording control:** timer **"0:00 / 2:30"** (max length), red **`Start Recording`** (microphone), status "Recording 1 of 3 · 0 completed".
- Nav: **`Previous`** / **`Next Part`** (one recording per part → 3 total).

---

## 5. Suggested data model (attempts)

```ts
type ExamSkill = 'reading' | 'listening' | 'writing' | 'speaking';

interface AnswerValue {
  questionId: string;
  value: string | string[];     // text / choice(s)
}

interface RunnerAttempt {
  id: string;
  mockId: string;
  skill: ExamSkill;
  startedAt: string;
  submittedAt?: string;         // attempts count only once submitted
  currentIndex: number;         // passage/section/task/part cursor
  answers: AnswerValue[];       // reading/listening/writing
  recordings?: string[];        // speaking: one audio blob per part
  timeRemainingSec?: number;
  // reading-only:
  highlights?: Array<{ passage: number; color: 'keywords'|'evidence'|'topic'|'definitions'|'contrast'; range: string }>;
  // listening-only:
  audioPlaysUsed?: number;      // capped at 1 per section
  result?: { overallBand?: number; perItem?: Record<string, {band?: number; feedback?: string}> };
}
```

## 6. Not captured (would require submitting / recording / consuming credits)
- Post-submit **results / band-score** screens and the **certificate**.
- Live **microphone recording** and speaking playback/grading.
- Exact tips copy for Reading/Writing/Speaking panels (Listening's 7 tips are captured above).
