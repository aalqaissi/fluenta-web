# Reading Mock Exam Authoring — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Source pages inspected: `/my-mocks/reading` (library) and `/my-mocks/edit/reading/:uuid` (editor).
> Companion docs: `docs/writing-mock-authoriing-spec.md`, `docs/listening-mock-authoring-spec.md`.
> The editor was inspected via a new (unsaved) draft — nothing persisted.

---

## Routes

| Page   | URL                               | Title / subtitle |
|--------|-----------------------------------|------------------|
| Library | `/my-mocks/reading`              | **My Mock Exams** — *Upload, manage, and take your own mock exams.* |
| Editor  | `/my-mocks/edit/reading/:uuid`   | **Edit Reading Exam** — *Paste passage text and questions, then publish for your students.* |

---

## 1. Library page (`/my-mocks/reading`)

- **Filter chips:** `Mock Test` · `Part 1` · `Part 2` · `Part 3` (3 passages)
- **Count label:** e.g. "10 Reading exams"
- **Create CTA:** `Upload Reading Mock` / "Create a new exam" → routes to editor (draft not persisted until Save).
- **Cards:** title · scope badge (`Global`) · status (`Draft` / `Ready to Take`) · `N Attempts` · action (`Edit` / `Take Exam`) · draft kebab (**Edit · Publish · Make Global · Delete**).
- Titles bundle the three passage topics, e.g.:
  - `The Evolution of Human Languages, Decision-Making Neuroscience & Human Enhancement Ethics`
  - `The Evolution of Social Media, AI Ethics & Consciousness`
  - `Climate Change, the Gut Microbiome & Neuroplasticity in Language Learning`
  - `Oceanic Plastic Pollution, Dark Matter & the Fermi Paradox`
  - `Pivotal Inventions, Quantum Cryptography & Ancient Trade Routes`
  - `The History of the Olympic Games`

---

## 2. Editor page (`/my-mocks/edit/reading/:uuid`)

Four **mode tabs**: `Part 1` · `Part 2` · `Part 3` · `Full Exam`, plus an **exam-level `Academic` / `General Training` toggle**.

### Wizards
| Tab | Steps |
|-----|-------|
| Part 1–3 (each) | 2: `Part N (Passage & questions)` → `Review (Publish)` |
| Full Exam | 4: `Part 1` → `Part 2` → `Part 3` → `Review (Publish)` |

All parts are labelled **"Passage & questions"**.

### 2.1 Passage input — 3-way mode switch (per passage)
| Mode | Behaviour |
|------|-----------|
| **Type / Paste** | Textarea: *"Paste or type the full reading passage here…"* |
| **Upload from Image** | Image dropzones — *"Upload photos, AI fills the form"*, **Passage (required)**, PNG/JPEG/WebP; "Drag & drop an image, or click to browse" |
| **Extract with AI** | Same image-upload flow; AI extracts passage + questions into the form |

### 2.2 Fields per passage

| Field | Type | Notes / copy |
|-------|------|--------------|
| **Passage title (optional)** | text | placeholder "The History of Glass" |
| **Question type for this passage** | dropdown | button "Choose a question type..." (12 options below) |
| **Questions** (count) | number | `min 1, default 20` |
| **Time limit (minutes)** | number | in **Advanced** accordion |
| **Diagram / Map / Process Image (optional)** | file | for diagram-label questions |
| **Generate with AI** | button | disabled until content seeded |
| **Exam title** | text | default `Reading Practice <date>` |

### 2.3 Question type options (dropdown)
1. Multiple Choice
2. Multi-Select (Choose TWO/THREE)
3. True / False / Not Given
4. Yes / No / Not Given
5. Matching Information
6. Matching Headings
7. Matching Features
8. Matching Sentence Endings
9. Sentence Completion
10. Summary Completion
11. Diagram Label Completion
12. Short Answer

### 2.4 Review / Publish step
- Per-passage summary.
- **"Mark as \"Recommended\" on the student library"** checkbox — default **off**.
- **`Publish Mock Exam`** + `Back`.
- Per-step `Save Part N`.

---

## 3. Key differences vs. Writing / Listening

- Passage-driven: three passages (Parts 1–3); text-first (paste/type) **plus** image-upload + AI-extract paths.
- Exam-level **Academic / General Training** variant toggle.
- 12 IELTS reading question types (one type selected **per passage**).
- Optional **Diagram/Map/Process image** for diagram-labelling questions.
- Default question count **20**.

---

## 4. Suggested data model additions

```ts
type ReadingPart = 1 | 2 | 3;
type ReadingVariant = 'academic' | 'general-training';
type ReadingInputMode = 'type-paste' | 'upload-image' | 'extract-ai';
type ReadingQuestionType =
  | 'multiple-choice'
  | 'multi-select'
  | 'true-false-notgiven'
  | 'yes-no-notgiven'
  | 'matching-information'
  | 'matching-headings'
  | 'matching-features'
  | 'matching-sentence-endings'
  | 'sentence-completion'
  | 'summary-completion'
  | 'diagram-label-completion'
  | 'short-answer';

interface ReadingPassage {
  part: ReadingPart;
  title?: string;
  passageText?: string;          // type/paste mode
  passageImages?: string[];      // upload/extract mode (AI fills form)
  questionType: ReadingQuestionType;
  questionCount: number;         // default 20
  timeLimitMinutes: number;      // Advanced
  diagramImageUrl?: string;      // optional
}

interface ReadingMock {
  id: string;
  title: string;                 // default "Reading Practice <date>"
  variant: ReadingVariant;       // Academic / General Training
  mode: 'part-1' | 'part-2' | 'part-3' | 'full-exam';
  passages: ReadingPassage[];    // 1 for single-part, 3 for full-exam
  status: 'draft' | 'ready';
  scope: 'private' | 'global';
  recommended: boolean;
  attempts: number;
}
```

---

## 5. Not observed (needs data entry / live server actions)
- Per-question authoring UI once a question type is chosen.
- Generate-with-AI / Extract-with-AI output and validation.
- Student-facing Take Exam runner.
