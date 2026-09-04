# Writing Mock Exam Authoring — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Source pages inspected: `/my-mocks/writing` (library) and `/my-mocks/edit/writing/:uuid` (editor).
> The inspected record was a **blank Draft** ("Writing Practice Sep 4, 2026"), so this documents the
> UI/feature structure rather than populated content.

---

## Routes

| Page   | URL                                | Title / subtitle |
|--------|------------------------------------|------------------|
| Library | `/my-mocks/writing`               | **My Mock Exams** — *Upload, manage, and take your own mock exams.* |
| Editor  | `/my-mocks/edit/writing/:uuid`    | **Edit Writing Exam** — *Upload a Task 1 diagram and Task 2 prompt, then publish for your students.* |

---

## 1. Library page (`/my-mocks/writing`)

**Header:** "My Mock Exams" + subtitle above.

**Filter chips:** `Mock Test` · `Academic Task 1` · `General Task 1` · `Task 2`

**Count label:** e.g. "7 Writing exams"

**Create CTA:** `Upload Writing Mock` / "Create a new exam" → opens the editor for a new draft.

### Exam cards
Each card shows:
- **Title**
- **Scope badge** — `Global`
- **Status badge** — `Draft` or `Ready to Take`
- **Attempts** — `N Attempts`
- **Primary action** — `Edit` (drafts) or `Take Exam` (ready)
- **"More options" kebab (⋮)** — present on **Draft** cards only

#### Kebab menu (Draft cards)
| Item | Notes |
|------|-------|
| Edit | opens editor |
| Publish | Draft → Ready to Take |
| Make Global | sets scope to Global |
| **Delete** | destructive (red) |

Published/`Global` `Ready to Take` cards have **no kebab** — only `Take Exam` (read-only for the student flow).

### Example data (naming conventions to mirror)
- `Writing Practice Sep 4, 2026` — Draft, 0 attempts
- `Academic Writing Mock Test — Town Development & Automation's Impact on Jobs` — Global, Ready to Take
- `General Training Mock Test — Gym Membership Cancellation & Public Transport`
- `Academic Writing Mock Test — Household Energy Sources & Practical Skills in Schools`
- `General Training Mock Test — Noisy Neighbour & Public Libraries`
- `Academic Writing Mock Test — Population Growth & Urban Development`

---

## 2. Editor page (`/my-mocks/edit/writing/:uuid`)

Four **mode tabs** across the top, each driving its own wizard:

| Tab | Wizard steps | Task 1 kind |
|-----|--------------|-------------|
| **Academic Task 1** | 2: `Task 1 (Diagram / chart)` → `Review (Publish)` | chart/diagram |
| **General Task 1**  | 2: `Task 1` → `Review (Publish)` | letter |
| **Task 2**          | 2: `Task 2 (Essay prompt)` → `Review (Publish)` | essay |
| **Full Exam**       | 3: `Task 1 (Diagram / chart)` → `Task 2 (Essay prompt)` → `Review (Publish)` | Academic **or** General (toggle) |

### 2.1 Field matrix per mode

| Field | Academic T1 | General T1 | Task 2 | Full Exam |
|-------|:-----------:|:----------:|:------:|:---------:|
| **Image / photo upload** | Chart image | "Generate from a photo" | "Generate from a photo" | per step |
| **Question** (textarea, required) | Task 1 Question * | Task 1 Question * | Task 2 Question * | both tasks |
| **Image Description *** (textarea) | ✅ (Advanced) | — | — | Academic step only |
| **Chart type** dropdown | ✅ | — | — | Academic step |
| **Formality** dropdown | — | ✅ | — | General step |
| **Minimum words** (number) | 150 (Advanced) | 150 (Advanced) | **250** (inline) | 150 / 250 |
| **Time (minutes)** (number) | 20 (Advanced) | 20 (Advanced) | **40** (inline) | 20 / 40 |
| **Add an ideal answer** (collapsible textarea) | ✅ | ✅ | ✅ | ✅ |
| **Generate with AI** button | ✅ | ✅ | ✅ | ✅ |
| **Exam title** (text) | ✅ | ✅ | ✅ | ✅ |

**Structural quirk:** for **Task 1** (Academic/General) the word-count + time live inside an **"Advanced"** accordion (along with Image Description + chart type). For **Task 2** they are shown **inline** (no accordion).

### 2.2 Field details / copy

- **Chart / Diagram image upload** (Academic Task 1):
  - Dropzone: "Drag & drop the chart image, or click to browse"
  - Constraint: "PNG, JPEG, or WebP · up to 5MB"
  - Empty state: "No image added."
  - Helper: *"Upload the chart exactly as students should see it — we'll read the question, chart type, and grading description from it automatically."*
- **Task 1 Question** placeholder (Academic): *"The diagram shows how bricks are manufactured for the building industry. Summarise the process and make comparisons where relevant."*
- **Task 2 Question** placeholder: *"Some people believe that... To what extent do you agree or disagree?"*
- **Image Description *** label suffix: *"(for accurate grading)"*
- **Add an ideal answer** helper: *"A model answer admins can reference when reviewing AI grading later."*
- **Exam title** placeholder: `Practice Test 1` (auto value observed: `Writing Practice Sep 4, 2026`)
- **Number inputs:** `min=0`, no max, no step. Defaults — Task 1: **150 words / 20 min**; Task 2: **250 words / 40 min**.

### 2.3 Dropdown options

- **Chart type** (Academic Task 1): `Bar Chart` · `Diagram` · `Line Graph` · `Maps` · `Multiple Graph` · `Pie Chart` · `Process Diagram` · `Table`
- **Formality** (General Task 1): `Formal` · `Informal` · `Semi Formal`

### 2.4 Full Exam — Task 1 type toggle

A segmented **`Academic` / `General Training`** toggle (default **Academic**) rewrites Step 1:
- **Academic** → chart image upload + "Select chart type" + **Image Description** field.
- **General Training** → "Generate from a photo → Letter prompt" (*"Fills in the letter prompt automatically."*) + "Select formality"; **no** Image Description.

### 2.5 Two distinct AI affordances

1. **Upload / "Generate from a photo"** — user uploads the real chart/prompt image; the app reads it to auto-populate the question (and, for Academic charts, chart type + grading description).
2. **"Generate with AI"** — generates a question from scratch. **Disabled until content is seeded**; button relabels to *"Add some content first"*. (Exact output not observed — would consume credits.)

### 2.6 Review / Publish step

- Per-task **summary card** (e.g. "Task 2 — No question entered.").
- **"Mark as \"Recommended\" on the student library"** — custom checkbox, default **off**.
- **`Publish Mock Exam`** button + `Back`.
- Wizard also has `Back` (disabled on step 1) and per-step `Save Task 1` / `Save Task 2`.

---

## 3. State machine

```
Draft ──Publish──▶ Ready to Take
Draft ──Make Global──▶ Global scope
Draft ──Delete──▶ (removed)
Ready to Take ──Take Exam──▶ student runner (not inspected)
```

- Recommended flag (set at publish) surfaces the exam in the student library as "Recommended".
- Attempts counter tracks student runs per exam.

---

## 4. Not yet observed (needs data entry / server actions on a live account)

- Exact **Generate with AI** output payload/behavior.
- Save/Publish **validation** messages for empty/required fields.
- Student-facing **Take Exam** runner UI.
- Kebab options for `Ready to Take` cards (none exposed to this account — likely managed globally).

---

## 5. Suggested data model (for `mocking-exam`)

```ts
type WritingMockMode = 'academic-task1' | 'general-task1' | 'task2' | 'full-exam';
type ChartType = 'bar-chart' | 'diagram' | 'line-graph' | 'maps'
  | 'multiple-graph' | 'pie-chart' | 'process-diagram' | 'table';
type Formality = 'formal' | 'informal' | 'semi-formal';
type ExamStatus = 'draft' | 'ready';
type ExamScope = 'private' | 'global';

interface WritingTask {
  kind: 'academic-task1' | 'general-task1' | 'task2';
  imageUrl?: string;          // uploaded chart / prompt photo
  question: string;           // required
  imageDescription?: string;  // academic task 1 only — required for grading
  chartType?: ChartType;      // academic task 1 only
  formality?: Formality;      // general task 1 only
  minWords: number;           // default 150 (task1) / 250 (task2)
  timeMinutes: number;        // default 20 (task1) / 40 (task2)
  idealAnswer?: string;       // optional model answer
}

interface WritingMock {
  id: string;
  title: string;              // default "Writing Practice <date>"
  mode: WritingMockMode;
  tasks: WritingTask[];       // 1 for single-task modes, 2 for full-exam
  status: ExamStatus;
  scope: ExamScope;
  recommended: boolean;
  attempts: number;
}
```
