# Plan — Sub-project C: Practice vs Full Exam mode

Spec: `docs/superpowers/specs/2026-09-27-ielts-spec-C-practice-vs-exam-mode-design.md`. Branch `feat/practice-vs-exam-mode` (web + mobile).

1. Backend TDD: `HttpContractTest.attemptModeRoundTripsAndDefaultsToPractice` → `AttemptEntity.mode`, `AttemptRequest.mode` (compat ctor), `AttemptDto.mode`, service normalisation.
2. Web shared: `examMode.ts` (mode resolution, `EXAM_TIMING`, `writingBand`), `RunnerTimer.tsx` (`useRunnerTimer` + `TimerControl`), `ModeLaunch`, `ModeBadge`.
3. Reading runner: exam fixed 60:00 auto-submit; practice optional timer; send `mode`.
4. Listening runner: exam phases (listening → 2-min check → auto-submit), `AudioPlayer.onEnded`; practice replay + optional timer.
5. Writing runner: exam task timer + auto-submit (blank → band 0), full-exam Task 1 → Task 2 via `next`; store `writingT1/T2` → weighted `writing`.
6. Speaking runner: exam caps 5/2/5 min, Part 2 1-min auto prep + notes, no re-record, auto-advance; practice optional prep.
7. Full exam page: strict order, no redo, writing T1+T2 (module-aware T1), resume at T2.
8. Hubs: ModeLaunch on Listening/Reading/Writing; Speaking standard intro Practice / Exam buttons.
9. Browser-verify with a Node API stub (Java loopback blocked; a user java.exe owns :8080 so the stub used :8099).
10. Mobile: attempt `mode`; listening replay in practice; exam-only auto-submit; reading 60:00 in full exam.
