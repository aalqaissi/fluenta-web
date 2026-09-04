# Speaking Mock Exam Authoring — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Source pages inspected: `/my-mocks/speaking` (library) and `/my-mocks/edit/speaking/:uuid` (editor).
> Companion docs: `writing-mock-authoriing-spec.md`, `listening-mock-authoring-spec.md`, `reading-mock-authoring-spec.md`.
> Inspected via fresh (unsaved) drafts — nothing persisted.

---

## Routes

| Page   | URL                                | Title / subtitle |
|--------|------------------------------------|------------------|
| Library | `/my-mocks/speaking`              | **My Mock Exams** — *Upload, manage, and take your own mock exams.* |
| Editor  | `/my-mocks/edit/speaking/:uuid`   | **Edit Speaking Exam** — subtitle varies by mode (see §2.1) |

---

## 1. Library page (`/my-mocks/speaking`)

- **Filter chips:** `Mock Test` · `Part 1` · `Part 2` · `Part 3` — these both **filter the list** and **set the creation mode** for the next "Create a new exam".
- **Count label:** e.g. "10 Speaking exams"
- **Create CTA:** `Upload Speaking Mock` / "Create a new exam" → routes to editor in the mode implied by the active chip (draft not persisted until Save).
- **Cards:** title · `Global` · `Ready to Take` · `N Attempts` · `Take Exam` · draft kebab (**Edit · Publish · Make Global · Delete**).
- Themed titles, e.g.:
  - `Speaking Full Mock — Technology & Communication`
  - `Speaking Full Mock — Environment & Nature`
  - `Speaking Full Mock — Food & Health`
  - `Speaking Full Mock — Work & Study`
  - `Speaking Full Mock — Hobbies & Free Time`
  - `Speaking Full Mock 5 — Weather & Role Models`
  - `Speaking Full Mock 4 — Technology`
  - `Speaking Full Mock 3 — Food & Learning Skills`

---

## 2. Editor page (`/my-mocks/edit/speaking/:uuid`)

Four **mode tabs**: `Part 1` · `Part 2` · `Part 3` · `Full Exam`.

> ⚠️ **Mode locking:** on a **fresh** draft the tabs are switchable; once you start editing / after saving, the mode **locks** — banner: *"Editing a Part N-only practice item. Mode can't be changed after saving."* So the mode is effectively a create-time choice.

### 2.1 Subtitle per mode
| Mode | Subtitle |
|------|----------|
| Part 1 | "Type prompts for Part 1 only, then publish it as a standalone practice item." |
| Part 2 | "Type prompts for Part 2 only, then publish it as a standalone practice item." |
| Part 3 | "Type prompts for Part 3 only, then publish it as a standalone practice item." |
| Full Exam | "Type Part 1, 2, and 3 prompts, then publish a full mock test for your students." |

### 2.2 Wizards
| Mode | Steps |
|------|-------|
| Part 1 / 2 / 3 (each) | 2: `Part N` → `Review (Publish)` |
| Full Exam | 4: `Part 1 (Intro questions)` → `Part 2 (Cue card)` → `Part 3 (Discussion)` → `Review (Publish)` |

### 2.3 Part structures

**Part 1 — Introduction & Interview**
- Helper: *"Short questions on familiar topics (home, work, studies, interests). Add as many as you like."*
- Repeatable **question list** via **"Add question"**; each row = question textarea (placeholder e.g. *"Do you work or are you a student?"*) + **Speaking time (seconds)** number (default **30**).
- Empty state: "No prompts yet."

**Part 2 — Cue Card**
- Helper: *"One topic card. Include the bullet points as plain text."*
- **"Add cue card"**; each = cue-card textarea (topic + bullets as plain text; placeholder is a full "Describe a book you recently read. You should say: …" cue) + **Speaking time (seconds)** number (default **120**).

**Part 3 — Discussion**
- Helper: *"Follow-up discussion questions related to the Part 2 topic. Add as many as you like."*
- Repeatable **question list** via **"Add question"**; each = textarea (placeholder e.g. *"How have reading habits changed in your country in recent years?"*) + **Speaking time (seconds)** number (default **45**).

### 2.4 Common controls (all parts)
- **Generate from a photo** → "Prompt sheet" (file upload; OCR the printed prompt sheet to auto-fill).
- **Generate with AI** (enabled — generates prompts).
- **Exam title** (text; default `Speaking Practice <date>`).
- Per-step `Save Part N`; `Back` (disabled on step 1).

### 2.5 Review / Publish step
- Per-part summary.
- **"Mark as \"Recommended\" on the student library"** checkbox — default **off**.
- **`Publish Mock Exam`** + `Back`.

---

## 3. Key differences vs. other skills
- **No media upload of a "correct" answer** — Speaking is prompt-only; students record answers in the runner (not inspected here).
- Everything is a **repeatable list of prompts** (questions / cue cards) with a **per-prompt Speaking time (seconds)**.
- No question-type dropdown; the "type" is fixed by the Part (intro Qs / cue card / discussion Qs).
- **Mode is a create-time choice and locks after save** (unlike Writing/Reading tabs which stay switchable).
- Default speaking times: Part 1 **30s**, Part 2 **120s**, Part 3 **45s**.

---

## 4. Suggested data model additions

```ts
type SpeakingPart = 1 | 2 | 3;
type SpeakingMode = 'part-1' | 'part-2' | 'part-3' | 'full-exam';

interface SpeakingPrompt {
  text: string;                 // question, or cue card (topic + bullets as plain text)
  speakingTimeSeconds: number;  // default 30 (P1) / 120 (P2) / 45 (P3)
}

interface SpeakingSection {
  part: SpeakingPart;           // 1 = intro Qs, 2 = cue card, 3 = discussion Qs
  prompts: SpeakingPrompt[];    // "Add question" / "Add cue card"
}

interface SpeakingMock {
  id: string;
  title: string;                // default "Speaking Practice <date>"
  mode: SpeakingMode;           // chosen at create, locked after save
  sections: SpeakingSection[];  // 1 for single-part, 3 for full-exam
  status: 'draft' | 'ready';
  scope: 'private' | 'global';
  recommended: boolean;
  attempts: number;
}
```

---

## 5. Not observed (needs data entry / live server actions)
- Generate-with-AI / Generate-from-photo output and validation.
- Student-facing Take Exam runner (recording flow, timers).
