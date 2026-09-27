# Plan — Sub-project C mobile parity

Spec: `docs/superpowers/specs/2026-09-27-ielts-spec-C-practice-vs-exam-mode-design.md` ("Mobile — full parity"). Repo `fluenta-mobile`, branch `feat/mobile-exam-mode-parity`.

1. TDD pure logic: `exam_mode.dart` + `RunnerTimer` (exam mandatory/expire-once, practice off + never submits, paused phases) and the 4-skill `FullExamStore` (order, writing T1+T2 weighting, overall).
2. Router + loaders carry `mode`; `pushWithMode` sheet at entry points.
3. Listening runner phases; Reading runner timer; Writing editor timers + full chain; Speaking caps/prep/one take/full.
4. Full exam screen (order lock, resume Task 2) + results (all four scored).
5. Widget tests: writing timer modes, full-exam order lock; analyze + full test suite; merge + push; graphify.
