# Sub-project A — Scoring integrity (answer-key marking)

_Source: owner's "Yalla English Hub — IELTS Assessment & Exam Specifications" (artifact PDF, 2026-09-27), §1 Listening + §2 Reading marking + §7 scoring architecture. Part 1 of 4 (A scoring → B AI assessment → C practice/full mode → D content generation). Autonomous run approved by the user._

## Requirements (from the owner spec)
1. Listening & Reading objective questions are marked **against the approved answer key** — no AI judgement.
2. **Completion and short-answer tasks enforce the stated word/number limit exactly**; an answer over the limit is **incorrect** even if it contains the right words.
3. **Accepted spelling/answer variants live in the answer key** (not decided by AI).

Plus a bug found in the gap analysis: a full-exam Writing section records the *sample* band instead of the student's real grade (`WritingEditorPage.afterGrading`).

## Current state
- Server `ScoringService.score` and every client review view compare `trim().toLowerCase()` for equality. `wordLimit` is display-only. There is a single `answer`/`correct` string per question.

## Design
One pure matching rule, implemented identically in three places and pinned by one shared test-vector file:

| Place | File | Used for |
|---|---|---|
| Backend (authoritative score) | `service/AnswerMatcher.java` | `ScoringService.score` |
| Web (review colouring, practice page, per-section tallies) | `src/lib/answerMatch.ts` | QuestionRenderer, ListeningResultsPage, QuestionTypePracticePage, mockApi.scoreGroups |
| Mobile (review colouring) | `lib/utils/answer_match.dart` | question_group_view |

Vectors: `backend/src/test/resources/answer-match-vectors.json` (copied verbatim to `fluenta-mobile/test/fixtures/`), each `{answer, accepted?, wordLimit?, type?, given, expect}`.

### Matching rule `matches(given, key)`
`key = {answer, accepted: string[], wordLimit: number|string|null, type: string|null}`
1. **Normalise** both sides: lower-case; curly quotes → straight; collapse internal whitespace; trim; strip leading/trailing punctuation `. , ; : ! ? " '`. Empty given → wrong.
2. **Word-limit gate** (only when the effective type is a *text* type — sentence/summary/note/table/flow-chart/form completion, diagram-label, short-answer — or the type is unknown): count tokens of the given answer; a token is a **number** if it matches `^[£$€]?\d[\d,.:/]*(%|st|nd|rd|th|am|pm)?$`, otherwise a **word** (hyphenated words count as one). Parse the limit:
   - integer `N` or label `Max N words` → words + numbers ≤ N;
   - label containing `AND/OR A NUMBER` → words ≤ N and numbers ≤ 1;
   - `WORD/NUMBER` / `WORD OR A NUMBER` → words + numbers ≤ N;
   - `A NUMBER` / `NUMBER ONLY` with no `WORD` → numbers ≤ 1, words = 0;
   - N parsed from `ONE…FIVE` or digits; unparseable label → no gate.
   Over the limit → **incorrect**, regardless of content. Choice types (TFNG/YNNG/MC/matching) are never gated (their keys like `NOT GIVEN` are tokens, not words).
3. **Candidates** = `answer` + each `accepted[]` entry, each expanded for **optional parenthesised words** (IELTS answer-key convention: `(the) library` accepts `library` and `the library`). Match if the normalised given equals any normalised candidate.

### Data model
- Studio question gains `accepted?: string[]` (web `StudioQuestion`, `api.ts`, backend `StudioQuestionDto`). Runtime `Question` gains `accepted?: string[]` and keeps `wordLimit` label; `convert.ts` copies `accepted`.
- `ScoringService.answerKey` collects `answer|correct`, `accepted`, `wordLimit`, and the effective `type` (question `type`, else nearest ancestor `type`/`questionType`) while walking the content JSON. Public `answerKey()` map shape (`id→answer`) is kept for `VerifyRunner`; a new `keys()` returns full entries.
- Studio editor (`QuestionRow`): text-type questions get an **"Also accept"** input (comma-separated → `accepted`), with a hint about `(optional)` words.
- Studio AI generate/fill prompt asks for `accepted` spelling variants on text answers (admin reviews them before publishing); the normaliser keeps up to 5 non-blank strings.

### Bug fix
`WritingEditorPage.afterGrading(result)` records the real `res.overall` into the full-exam store.

## Out of scope
Practice/full mode (C), AI prompts (B), new question types (D). No new DB column: per-question marks are recomputed client-side with the same rule.

## Testing
- Java: `AnswerMatcherTest` runs every vector; `ScoringService` test for word-limit + accepted + inherited type through Studio-shaped JSON.
- Web: `tsc -b`, and a scratch node run of `answerMatch.ts` against the same vectors (no web test runner exists).
- Mobile: `flutter test test/utils/answer_match_test.dart` over the copied vectors.
