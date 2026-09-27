# Plan — Sub-project B: AI assessment rules

Spec: `docs/superpowers/specs/2026-09-27-ielts-spec-B-ai-assessment-rules-design.md`. Branch `feat/ai-assessment-rules` (web + mobile).

1. TDD `EssayTypeClassifier` (+ test) — opinion/extent/discussion/adv-disadv/outweigh/problem-solution/cause-solution/two-part/other.
2. TDD `WritingRubric` (+ test) — variant detection from taskNumber/module/kind; labels; per-variant system prompts; coaching keys.
3. DTO `CoachingNote`; `WritingResult` += taskType/essayType/coaching (compat ctor).
4. `StubWritingGrader` variant-aware + heuristic coaching (tests).
5. `ClaudeWritingGrader` uses rubric prompt + essay-type hint; parses new fields (test).
6. `WritingFeedbackService.validate(raw, req)` — labels, criteria-mean overall, essayType normalisation, coaching filter + fallback (tests); persist carries new fields.
7. Speaking: prompt focus + accent rule; overall = mean (test). Live examiner persona timings.
8. Web: types, WritingResultsPage (estimated label, essay-type chip, coaching card), SpeakingResultsPage + live results estimated label. Build.
9. Mobile: model fields, writing results coaching + estimated labels, speaking results label. analyze + test.
10. Full test suites, merge + push both repos.
