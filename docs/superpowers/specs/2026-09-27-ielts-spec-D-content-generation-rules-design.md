# Sub-project D — Content generation rules (Content Studio AI)

_Source: owner's IELTS Assessment & Exam Specifications §1, §2 and §8 (2026-09-27). Part 4 of 4 (A → B → C → **D**)._

## Requirements
- **Academic and General Training Reading are generated and stored separately.** GT is **not** an easier Academic passage:
  - GT Section 1 uses everyday/social-survival texts (notices, adverts, schedules, instructions);
  - GT Section 2 uses workplace texts (job descriptions, policies, contracts, training material, staff information, procedures);
  - GT Section 3 is one longer, more complex text on a topic of general interest.
  - Academic texts are academic-style: descriptive, factual, discursive, argumentative or analytical, and may include visuals.
- **True/False/Not Given vs Yes/No/Not Given** are generated and marked for their different purposes:
  - TFNG tests factual information;
  - YNNG tests the writer's views or claims;
  - NOT GIVEN means the passage cannot confirm or contradict the statement;
  - no outside knowledge, assumptions or common sense.
- **Full Reading mock = 40 questions, Yalla distribution 13 + 13 + 14** (a full-mock configuration, not imposed on practice sets).
- **Full Listening = 4 parts × 10 = 40.** The parts are:
  1. social conversation;
  2. social monologue;
  3. educational/training conversation;
  4. academic lecture.
- Supported question types include **note, table, flow-chart and form completion**, alongside the existing types.

## Design
### Backend (`StudioAiService`)
- `TYPES` / `TEXT_TYPES` gain `note-completion`, `table-completion`, `flow-chart-completion` and `form-completion`.
- `GEN_SYSTEM` and `FILL_SYSTEM` gain explicit TFNG vs YNNG definitions, the no-outside-knowledge rule, and completion guidance (answers copied from the text, within the word limit).
- `StudioGenerateRequest` += `module` (`academic|general`), `section` (passage/part number) and `skill` (`reading|listening`). The user prompt gains a CONTEXT line from `ContentRules.context(skill, module, section)`. GT reading context names the section's source type; Academic says academic register; listening names the part's context.
- **New** `POST /api/ai/studio-passage` with `StudioPassageRequest(module, section, topic)` returns `StudioPassageReply(title, text)`.
  - The prompt comes from `ContentRules.passageBrief(module, section)`: Academic ≈ 700–900 words, lettered paragraphs A–G; GT S1 = two or three short everyday texts; GT S2 = workplace texts; GT S3 = one longer general-interest text (≈ 700–900 words). All carry the explicit "not a simplified Academic passage" rule.
  - Offline stub: a deterministic placeholder text that names the section brief.
  - Gate: non-blank text, capped at `maxEssayChars`.
- `ContentRules` (pure) holds the briefs, the full-mock distributions (`READING_FULL = [13, 13, 14]`, `LISTENING_FULL = [10, 10, 10, 10]`) and the listening part contexts.

### Web (Content Studio)
- Types: labels, strategies, instructions and the text-input sets for the four new completion types (shared `TEXT_ANSWER_TYPES` from `answerMatch.ts`). Listening offers all four; Reading offers note/table/flow-chart but not form.
- Reading editor:
  - generate calls send `module` + `section`;
  - a **"Write passage with AI"** action per passage (optional topic) fills the passage text, following the module rules;
  - a module note on each passage describes the expected source type for GT sections.
- Listening editor: each part shows its expected context (Part 1 social conversation …); generate sends `skill: listening` + `section`.
- **Full-mock check** panel on the Reading and Listening editors: passage/part count and per-passage question counts against 13/13/14 (reading) or 10×4 (listening), total 40. It shows ✓ or the gap, and says clearly that practice sets needn't match.

### Mobile
- The `QuestionType` enum gains the four completion types (labels, wire keys, parsing, text input, word limits).

## Testing
- `ContentRulesTest`: GT section briefs differ from Academic and contain the section source types; the distributions sum to 40.
- `StudioAiServiceTest`:
  - the generate prompt carries the module/section context and the TFNG/YNNG definitions (captured prompt);
  - the new types normalise with word limits;
  - the passage endpoint uses the brief, and the offline stub returns non-blank text.
- Web `npm run build`; mobile analyze + tests.
