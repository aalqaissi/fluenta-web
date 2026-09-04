# Listening Mock Exam Authoring — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Source pages inspected: `/my-mocks/listening` (library) and `/my-mocks/edit/listening/:uuid` (editor).
> A blank draft was created to inspect the editor (see note at bottom).
> Companion doc: `docs/writing-mock-authoriing-spec.md`.

---

## Routes

| Page   | URL                                 | Title / subtitle |
|--------|-------------------------------------|------------------|
| Library | `/my-mocks/listening`              | **My Mock Exams** — *Upload, manage, and take your own mock exams.* |
| Editor  | `/my-mocks/edit/listening/:uuid`   | **Edit Listening Exam** — *Upload section audio and questions, then publish for your students.* |

---

## 1. Library page (`/my-mocks/listening`)

Same shell as the Writing library.

- **Filter chips:** `Mock Test` · `Part 1` · `Part 2` · `Part 3` · `Part 4`
- **Count label:** e.g. "5 Listening exams"
- **Create CTA:** `Upload Listening Mock` / "Create a new exam" — **immediately creates a draft record** and routes to `/my-mocks/edit/listening/:uuid`.
- **Exam cards:** title · scope badge (`Global`) · status badge (`Draft` / `Ready to Take`) · `N Attempts` · action (`Edit` for drafts / `Take Exam` for ready) · kebab (⋮) on drafts.
  - Draft kebab (same as Writing): **Edit · Publish · Make Global · Delete** (Delete destructive).
  - Global `Ready to Take` cards: `Take Exam` only, no kebab.

### Example data (naming convention)
- `Listening Full Mock 5 — Holiday Booking, Customer Feedback Review, Nutrition Labels & Restaurant Waste`
- `Listening Full Mock 4 — Hotel Booking, Student Accommodation, Climate Change & AI in Society`
- `Listening Full Mock 3 — Apartment Viewing, Internship Induction, AI Ethics & Language Acquisition`
- `Listening Full Mock 2 — Job Interview, Heritage Walk, Social Media & Sleep…`
- `Listening Full Mock 1 — …`

---

## 2. Editor page (`/my-mocks/edit/listening/:uuid`)

Five **mode tabs**: `Part 1` · `Part 2` · `Part 3` · `Part 4` · `Full Exam`.

### Wizards
| Tab | Steps |
|-----|-------|
| Part 1–4 (each) | 2: `Part N` → `Review (Publish)` |
| Full Exam | 5: `Part 1` → `Part 2` → `Part 3` → `Part 4` → `Review (Publish)` |

### Part descriptions (IELTS-accurate, shown under each step)
| Part | Description |
|------|-------------|
| Part 1 | Everyday conversation (2 speakers) |
| Part 2 | Social monologue (1 speaker) |
| Part 3 | Academic discussion (2–4 speakers) |
| Part 4 | Academic lecture (1 speaker) |

### 2.1 Fields per Part (same structure for all four parts)

| Field | Type | Notes / copy |
|-------|------|--------------|
| **Section Audio** | file | "Drag & drop the section audio, or click to browse" · **MP3, WAV, or OGG · up to 20MB** |
| **Question type** | dropdown | button label "Choose a type..." (see options below) |
| **Questions** | number | `min 1, max 20, default 10` |
| **Section Transcript** | textarea + **"Upload .txt"** file | helper: *"Uses your transcript, or transcribes the audio automatically."* |
| **Time limit (minutes)** | number | `min 1, default 10` — inside **Advanced** accordion |
| **Plan / Map / Diagram Image (optional)** | file | "Drag & drop an image, or click to browse" · **PNG, JPEG, or WebP · up to 5MB** (for map/diagram-labelling questions) |
| **Question sheet** — "Or upload a photo of the printed question sheet" | file | OCR path to auto-read the questions |
| **Generate with AI** | button | disabled until content is seeded |
| **Exam title** | text | default value observed: `Listening Practice Sep 4, 2026` |

### 2.2 Question type options (dropdown)
1. Multiple Choice
2. Multiple Choice (Select Multiple)
3. Matching
4. Plan/Map/Diagram Labelling
5. Form Completion
6. Sentence Completion
7. Short Answer
8. Table Completion

### 2.3 Review / Publish step
- Per-part summary.
- **"Mark as \"Recommended\" on the student library"** checkbox — default **off**.
- **`Publish Mock Exam`** button + `Back`.
- Wizard `Back` (disabled on step 1) and per-step `Save Part N`.

---

## 3. Key differences vs. Writing editor

- Upload target is **audio** (MP3/WAV/OGG ≤20MB), not an image.
- Each part carries a **Question type** selector + **Questions count** (1–20).
- A **Section Transcript** field (paste or upload `.txt`) that AI uses for grading, or auto-transcribes from the audio.
- Optional **Plan/Map/Diagram image** for map-labelling questions.
- Optional **printed question-sheet photo** OCR path.
- Four **Parts** (vs. Writing's Task 1 / Task 2), with IELTS-accurate section descriptions.

---

## 4. Suggested data model additions

```ts
type ListeningPart = 1 | 2 | 3 | 4;
type ListeningQuestionType =
  | 'multiple-choice'
  | 'multiple-choice-multi'
  | 'matching'
  | 'plan-map-diagram-labelling'
  | 'form-completion'
  | 'sentence-completion'
  | 'short-answer'
  | 'table-completion';

interface ListeningSection {
  part: ListeningPart;                 // description derived from part number
  audioUrl?: string;                   // MP3/WAV/OGG <= 20MB
  questionType: ListeningQuestionType;
  questionCount: number;               // 1..20, default 10
  transcript?: string;                 // pasted or uploaded .txt; else auto-transcribed
  timeLimitMinutes: number;            // default 10 (Advanced)
  mapImageUrl?: string;                // optional, PNG/JPEG/WebP <= 5MB
  questionSheetImageUrl?: string;      // optional OCR source
}

interface ListeningMock {
  id: string;
  title: string;                       // default "Listening Practice <date>"
  mode: 'part-1' | 'part-2' | 'part-3' | 'part-4' | 'full-exam';
  sections: ListeningSection[];        // 1 for single-part, 4 for full-exam
  status: 'draft' | 'ready';
  scope: 'private' | 'global';
  recommended: boolean;
  attempts: number;
}
```

---

## 5. Cleanup note
Inspecting the editor required a draft, so the "Create a new exam" flow generated:
- **`Listening Practice Sep 4, 2026`** — draft `13c86b51-13fb-44f2-baf3-109640d5a434`

It can be removed via the library card kebab → **Delete** if not wanted.

## 6. Not observed (needs data entry / live server actions)
- Per-question-type authoring UI (how you enter the actual questions/answers per type).
- Generate-with-AI output and save/publish validation.
- Student-facing Take Exam runner.
