# Results / Band Score + Certificate — Feature Spec

> Reverse-engineered from the live EinsteinAI app (`einsteinai.io`) to replicate in `mocking-exam`.
> Sources: submitting a Reading mock → grading overlay → `/results/:id`; and `/profile/certificates` +
> `/certificate/edit/:id`. Companion docs: the `*-mock-authoring-spec.md` files, `take-exam-runners-spec.md`,
> `full-exam-simulation-spec.md`.

---

## 1. Submission & AI grading overlay

- The runner's submit button doubles as "advance" per passage/section; on the **last** one it opens a
  confirm dialog: **"Submit for review? Submit your Reading answers? You won't be able to change them after this."** → `Keep working` / `Yes, submit`.
- After confirming, a full-screen **grading overlay** appears:
  - Title **"AI is Grading Your Work"**, animated **Progress %**.
  - Staged status lines: *Analyzing your response… → Evaluating grammar and vocabulary… → Calculating band score… → Preparing detailed feedback… → Grading complete!*
  - Footer: *"This usually takes 15-30 seconds. Please don't close this window."*
- On completion it routes to **`/results/:resultId`**.

---

## 2. Results / band-score screen (`/results/:resultId`)

Header: 🏆 **Exam Results** · "<Skill> Exam" · timestamp (e.g. "September 3, 2026 at 05:32 PM").

- Card title: **"IELTS <Skill> Test Results"**.
- **Score block:** big **Overall Band Score** `X.X/9.0` + **CEFR Level** (e.g. `A1`).
- **Performance by Passage** (Reading) — a **radar chart** (axes 0/25/50/75/100 for Passage 1/2/3) + overall accuracy % + "Passage summary" (Passage 1: 0%, 2: 0%, 3: 0%). *(Listening would be "by Section"; Writing/Speaking "by Task/Part".)*
- **Performance by Question Type** — second chart.
- **Per-passage review**, tabbed (`Passage 1` / `Passage 2` / `Passage 3`), with an **`Original` / `Feedback`** toggle and **"Your Answer"** shown per question.
- **AI feedback sections:** `Strengths`, `Weakness`, `Area Improvement`.
- Actions: **`Back to Dashboard`**, **`Practice Again`**.
- Charts are inline **SVG** (≈14 SVGs on the reading result — radar + bars).

> Note: band score is derived even from an all-blank submission (yielded Overall **1.0/9.0**, CEFR **A1**).
> Reading grading still runs through the AI-grading overlay (not just raw scoring).

---

## 3. Certificates

### 3.1 My Certificates list (`/profile/certificates`)
- Header **"My Certificates"** + explainer: *"Certificates are created from your completed **full mock exam** results. Open a result page, generate your certificate there, then return here to edit or download it."*
- **"Your certificates (N)"** grid. Each card:
  - Candidate name (e.g. "A Al-Qaissi")
  - **Verification number** — format `EIELTS-<year>-<6 digits>` (e.g. `EIELTS-2026-049464`)
  - **Band X** + date (e.g. "9/3/2026")
  - Actions: **`Edit & Download`** · **`View results`** · **`Verify`**
- `Back to Dashboard`.

> Certificates come **only** from completing the **Full Exam** (`/exam/full`), not single-skill mocks.

### 3.2 Certificate editor / preview (`/certificate/edit/:certId`)
Header: **"Edit Certificate Details"** — *"Update your personal information and certificate details. Click on any field below to edit."* · `Back` · `Save Changes` · **`Generate Certificate PDF`**.

Two columns: a live **Certificate Preview** (an **IELTS™ Test Report Form** replica) and an **Editable Fields** panel.

**Certificate Preview = IELTS Test Report Form (TRF):**
- Branding: "IELTS™ Test Report Form".
- **Candidate Details:** Family Name · First Name · **Candidate ID** (read-only, e.g. `83EB1EEC`) · Date of Birth · Sex (M/F) · **Scheme Code** = "Online Practice Test" · Country or Region of Origin · Country of Nationality · First Language · **Photo**.
- **Test Results** row: **Listening · Reading · Writing · Speaking · Overall · CEFR** (e.g. `1.0 / 1.0 / 0.0 / 0.0 / 0.5 / A1`).
- **Administrator Comments** (disclaimer): *"This certificate validates the completion of a comprehensive IELTS General Training practice examination. The scores are AI-generated estimates for learning purposes."*
- **Centre stamp** (Einstein/brand logo, circular) · **Validation stamp** (QR code) · **Administrator's Signature** · **Date** (e.g. `03/SEP/2026`) · **Test Report** number (`EIELTS-…`).

**Editable Fields panel (grouped):**
| Group | Fields |
|-------|--------|
| Names | Family Name (text), First Name (text) |
| Date of Birth & Country of Origin | DOB (DD/MM/YYYY picker), Country or Region of Origin (text) |
| Sex | M / F |
| Country & Language | Country of Nationality (text), First Language (text) |
| Photo | image upload (file) |

Actions: **Save Changes**, **Generate Certificate PDF** (downloadable).

### 3.3 Verify
- Each certificate has a **`Verify`** action and a **QR "Validation stamp"** encoding a public verification URL keyed by the **verification number** (`EIELTS-YYYY-NNNNNN`).
- Purpose: public verification of a certificate's authenticity by its unique number.
- ⚠️ Exact verify-page route not confirmed (the button uses an internal handler; `/verify/:number` rendered blank). Confirm when building.

---

## 4. Suggested data model

```ts
interface ExamResult {
  id: string;                       // /results/:id
  attemptId: string;
  skill: 'reading'|'listening'|'writing'|'speaking'|'full';
  createdAt: string;
  overallBand: number;              // x.5 steps, 0–9
  cefr: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2';
  bySegment: Array<{ label: string; accuracyPct: number }>;   // per passage/section/task/part
  byQuestionType: Array<{ type: string; accuracyPct: number }>;
  perQuestion: Array<{ id: string; yourAnswer: string; correct?: boolean; feedback?: string }>;
  strengths: string[];
  weaknesses: string[];
  areasForImprovement: string[];
}

interface Certificate {
  id: string;                       // /certificate/edit/:id
  verificationNumber: string;       // EIELTS-2026-049464
  resultId: string;                 // full-exam result it was generated from
  candidate: {
    familyName: string; firstName: string;
    candidateId: string;            // read-only, system-generated
    dateOfBirth?: string; sex?: 'M'|'F';
    countryOfOrigin?: string; countryOfNationality?: string; firstLanguage?: string;
    photoUrl?: string;
  };
  schemeCode: 'Online Practice Test';
  bands: { listening:number; reading:number; writing:number; speaking:number; overall:number; cefr:string };
  adminComments: string;            // disclaimer: AI-generated estimates for learning
  issuedDate: string;               // 03/SEP/2026
  createdAt: string;                // 9/3/2026
}
```

---

## 5. Important notes for replication
- The certificate is an **IELTS TRF look-alike** and must keep the visible **disclaimer** ("practice examination … AI-generated estimates for learning purposes") + brand centre stamp so it never reads as an official IELTS document.
- Grading is AI-driven with a staged progress overlay (~15–30s) — model an async grading job + polling.
- Certificates gate on **full-exam** completion; single-skill mocks produce results only.
