# Fluenta — Feature Inventory v2 (Enrichment)

> New scope from the **product-vision PDF** (`Yalla English Practice`) + two screen recordings (2026-09-03, ~27 & ~29 min).
> This **expands** [`01-feature-inventory.md`](01-feature-inventory.md). The core idea shifts from "a set of IELTS tests" to a **scalable, reusable practice + learning + testing engine**.

---

## 0. The big shift (from the PDF)

- **Not fixed tests — a Practice Platform / reusable engine.** IELTS is the first product; the architecture must let us add TOEFL/PTE later without a rebuild. Conceptual path the engine must express:
  `Exam → Module (Academic/General) → Skill → Question Type → Strategy Lesson → Quick Tips → Practice N → Results` — and also `Exam → Full Mock → Skill`.
- **Content-independent** (not tied to Cambridge/a publisher); all content is authorable by an admin.
- **Learning + Practice + Testing**, not exams only.
- **Fully responsive** (desktop/tablet/mobile).
- Everything below is still **frontend-only / mock data** for this validation round.

## 1. Academic vs General Training
- A module switch (Academic / General Training) that changes Reading & Writing content (GT adds Writing Task 1 **letters**).

## 2. Two modes per skill (student)
For **Reading & Listening** (and later Speaking):
- **Full Test** — timed, computer-delivered-IELTS-like (already built for Reading).
- **Practice by Question Type** — pick a weak type (Matching Headings, TFNG, MCQ, Sentence/Summary Completion, Matching Information, Labelling, Form/Note Completion, Map/Plan/Diagram…) → **Watch Strategy → Quick Tips → Practice 10 Questions → View Results**.
- Draws from a **Question Bank** (questions tagged by skill / module / type / difficulty), reused across practice sets and full tests.

## 3. Learning layer (Lessons & Library, + inline)
- Before any question-type practice: a **Strategy** step (short video or text) + **Quick Tips**, then Practice, then Results. A reusable `Strategy → Tips → Practice → Results` stepper.

## 4. Reading (student)
- Full Test (built). **Practice by Question Type** (new). Passage may include a **diagram/map/process image**.

## 5. Listening (student)
- Full Listening Test + Practice by type. Audio player (single play), transcript (optional), section images/maps/diagrams. Types: MCQ, Form/Note Completion, Matching, Map/Plan/Diagram Labelling, etc.

## 6. Writing (student)
- **Academic Task 1** with **visual prompts uploaded as images** (line/bar/pie charts, tables, maps, processes, diagrams, mixed) shown beside the editor.
- **General Training Task 1** = letters. **Task 2** essays (both modules).
- Writing area + **timer + word count + autosave** + Submit. Extensible assessment criteria (AI grading later).

## 7. Speaking (student)
- **Full Speaking Simulation** Part 1/2/3 with the **admin's own examiner audio** (student hears the question, then records). Part 2 cue card + prep + answer timers. Part 3 follow-ups.
- **"Choose Your Speaking Practice"** — practice by Part / Topic (not only full mock).
- Recordings saved to the student's account; **"Submit for review?"** confirm. Manual/AI feedback later.

## 8. Full Exam orchestrator (student)
- Sequential L→R→W→S with an **Overall Progress** bar, per-section status, and section timers.

## 9. Certificates — IELTS-style Test Report Form
- Student view + shareable **Certificate / Test Report Form**: Candidate Details + **Test Results (Listening / Reading / Writing / Speaking / Overall / CEFR)** + comments + stamps + **QR**, **Verification page** (Download PDF / Print).
- **Rebrand & safety:** Fluenta branding only — **no British Council/idp marks**; clearly labelled *"Practice Test Report — not an official IELTS result; scores are AI-generated estimates for learning."*

## 10. Admin / Content Studio (NEW — major)
An authoring area (seen under "Mock Exam & Self Improvement", per-skill) so the owner adds content **without a developer**:
- **Reading editor:** passage text, per-passage **question type**, **diagram/map/process image upload** (PNG/JPEG/WebP ≤5MB), questions list (**+ Add question**, **Generate with AI**, **Fill Missing Answers with AI**), exam title.
- **Writing editor:** task type (Academic T1 / GT letter / T2), **visual-prompt image upload**, prompt text, criteria.
- **Listening editor:** **audio upload + player**, time limit, plan/map/diagram image, "**upload a photo of the printed question sheet**", questions, **Save Part**.
- **Speaking editor:** parts, **examiner audio upload**, cue card, topics.
- **Full Mock builder:** pick a published Reading/Writing/Listening/Speaking part each, status badges (**Draft/Published**), **Review & publish** with "publish parts first" gating → **Publish Full Mock Exam**.
- **Certificate editor** (§9).
- Lifecycle everywhere: **Create · Edit · Duplicate · Draft · Preview · Publish · Unpublish**.

## 11. Student account, progress & access
- Dashboard: available tests, attempts, grades, progress (built). **Strengths & Weaknesses** breakdown → suggested practice for weak types.
- **Access control / plans:** e.g. *Diamond* = full access for a year; monthly subscription; per-content access windows (frontend representation of tiers).

## 12. Scalable architecture (represented in UI)
- User sees **IELTS only** now, but IA/nav modelled as `Exam category → modules → skills → question types` so TOEFL/PTE could slot in later. Data models keyed generically (examCategory, module, skill, questionType, difficulty).

---

### What's already built (web) vs new
**Built:** dashboard, reading full-test runner (11 types) + AI grading + results, writing editor + AI feedback, listening, speaking (basic), full-exam page, mock-exams list, progress, coach, lessons, achievements, basic certificates, checkout, settings, login.
**New in v2:** Practice-by-Question-Type + Strategy/Tips/Practice/Results learning flow · Academic/GT switch · **Admin Content Studio** (reading/writing/listening/speaking editors + full-mock builder + media/audio/chart upload + AI-generate + draft/publish) · **Certificate/Test Report Form** (+ verification) · Full-Exam progress orchestrator · Speaking practice-by-part/topic + examiner audio + record + submit-for-review · Writing Task 1 visual prompts · Strengths & Weaknesses · plan/access tiers.
