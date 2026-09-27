# Sub-project B — AI assessment rules (Writing + Speaking)

_Source: owner's IELTS Assessment & Exam Specifications §3–§7 (2026-09-27). Part 2 of 4 (A → **B** → C → D)._

## Requirements
**Writing**
- Separate task logic for **Academic Task 1**, **General Training Task 1** and **Task 2**.
- Task 1 is assessed on **Task Achievement**; Task 2 on **Task Response**. Both also get Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.
- Academic T1: identify/select/report main features, comparisons, overview. Processes/maps adapt language.
- GT T1: clear purpose, all three bullets covered and developed, tone/register suits the situation (informal / semi-formal / formal). Postal addresses are **not** required.
- Task 2: **identify the essay type first** (opinion, to-what-extent, discussion, advantages/disadvantages, advantages-outweigh, problems/solutions, causes/solutions, two-part/direct, other). Check every part is answered, the position is clear, and ideas are relevant and developed.
- **Opinion vs Discussion** confusion must be explicitly flagged.
- **Yalla teaching layer, kept separate from the IELTS layer:** preferred Academic T1 structure and overview opening ("Overall, as can be observed from the given chart, …"); Task 2 PEEL, two-idea maximum, "shopping list trap"; preferred 4-paragraph structure. These appear as **coaching feedback**, never as extra scoring criteria. Any band impact must be justified through an IELTS criterion.
- Results show **Estimated** IELTS bands, criterion by criterion. Not an official result.

**Speaking**
- Four criteria, equally weighted. Pronunciation judged on intelligibility and phonological control; **accent is never penalised**.
- Assessment focus per criterion as listed in the spec (fluency/coherence, lexical, grammar, pronunciation).
- Examiner: Part 1 ≈4–5 min on familiar topics, question count not fixed. Part 2: cue card, 1 min prep with notes, up to 2 min uninterrupted long turn, stop at the limit, then 1–2 short rounding-off questions (≈3–4 min total). Part 3 ≈4–5 min, broader abstract/analytical/speculative, natural follow-ups.
- Results are labelled **Estimated**.

## Design
### Backend
- **`grader/WritingRubric`** (pure): `Variant of(taskNumber, module, kind)` → `ACADEMIC_T1 | GENERAL_T1 | TASK2`; `taskLabel(variant)` ("Task Achievement" / "Task Response"); `systemPrompt(variant)` composes a shared examiner core, a variant-specific assessment section and a variant-specific **Yalla coaching section**, with an explicit rule that coaching never changes criterion bands; `coachingKeys(variant)`.
- **`grader/EssayTypeClassifier`** (pure): keyword classifier over the task prompt → key + label. Used as the offline answer, as a hint to the model, and as the fallback when the model returns an unknown type.
- **DTO** `WritingResult` += `taskType` (`academic-t1|general-t1|task2`), `essayType` (Task 2 only), `coaching: List<CoachingNote(key, title, status good|improve|tip, note)>`. A 7-arg compat constructor keeps existing call sites.
- **Claude grader**: variant prompt. The user prompt includes the classifier's essay-type hint for Task 2. Parses `essayType` and `coaching`.
- **Validation gate** (`WritingFeedbackService.validate(raw, req)`):
  - labels the `task` criterion per variant;
  - **overall = mean of the four criteria rounded to the nearest 0.5** (deterministic, criteria-based);
  - normalises `essayType` (Task 2 only; unknown → classifier);
  - keeps coaching notes whose key is allowed for the variant, whose status is valid and whose note is non-blank, up to 6. If none survive, it falls back to the offline heuristics so the Yalla layer is always present.
- **Stub grader**: variant-aware labels and heuristic coaching.
  - Academic T1: overview present?
  - GT T1: bullets and register reminder.
  - Task 2: essay-type structure tip; PEEL (body paragraphs under 3 sentences); shopping-list trap (3+ enumerating markers in one body paragraph); 4-paragraph structure.
- **Speaking**: `GRADE_SYSTEM` gains the per-criterion focus and the no-accent-penalty rule. Overall is always the equally weighted mean (IELTS rounding).
- **Live examiner** `PERSONA` gains the per-part timings and rules above.

### Web / mobile
- Writing results: the hero ring is labelled "estimated", with the line "Estimated IELTS band — not an official IELTS/Cambridge result". Task 2 shows an essay-type chip. A new **"Yalla strategy coaching"** card lists the coaching notes, marked "Teaching recommendations — they don't change your IELTS criterion bands". Criterion labels come from the server (Task Achievement vs Task Response).
- Speaking results (and live-interview results): "Estimated band" label and disclaimer.
- Mobile writing and speaking results: same labels and coaching list; the model gains the optional fields.

## Out of scope
Combined T1+T2 writing band (Task 2 double weight) → C (the full-exam writing section). Content generation → D.

## Testing
- `WritingRubricTest` (variant detection, labels, prompt contains the variant rules and the "coaching never changes bands" rule).
- `EssayTypeClassifierTest` (each pattern).
- Gate tests: Task Response label for T2; overall = criteria mean; unknown essay type → classifier; coaching filtered, with fallback.
- Stub tests: coaching keys per variant.
- Speaking test: overall = mean even when the model returns a different overall.
- Web `npm run build`; mobile `flutter analyze` + tests.
