# Plan — Sub-project A: Scoring integrity

Spec: `docs/superpowers/specs/2026-09-27-ielts-spec-A-scoring-integrity-design.md`. Branch `feat/scoring-integrity` (web) / `feat/scoring-integrity` (mobile).

1. **Vectors** — write `backend/src/test/resources/answer-match-vectors.json` (normalisation, word limits int/label/AND-OR-number/number-only, choice types not gated, accepted variants, optional parenthesised words, empty answers).
2. **Java TDD** — `AnswerMatcherTest` (reads vectors) → red → implement `service/AnswerMatcher.java` (pure static) → green.
3. **ScoringService** — test: Studio-shaped content with passage `questionType`, per-question `wordLimit`/`accepted`; TFNG `NOT GIVEN` with a stray `wordLimit: 1` still scores. Implement `keys()` with inherited type; `score()` uses `AnswerMatcher`; `answerKey()` kept.
4. **Studio DTO + prompts** — `StudioQuestionDto.accepted`; parse/normalise (≤5 strings) in `StudioAiService`; prompt asks for spelling variants on text answers; stub passes through. Update affected tests.
5. **Web** — `src/lib/answerMatch.ts`; types (`Question.accepted`, `StudioQuestion.accepted`, api.ts); `convert.ts` copies `accepted`; replace the 4 equality checks; `QuestionRow` "Also accept" input; AI request/response mapping carries `accepted`. Check with a scratch esbuild+node vector run and `npm run build`.
6. **Writing full-exam bug** — record `res.overall`.
7. **Mobile** — `lib/utils/answer_match.dart` + model `accepted`/`type` fields + review use; copy vectors; `flutter test`.
8. `mvn -DforkCount=0 test`, `npm run build`, `flutter test` / `flutter analyze`; merge → main, push; graphify refresh (web, backend, mobile).
