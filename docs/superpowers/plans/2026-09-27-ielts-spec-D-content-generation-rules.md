# Plan — Sub-project D: Content generation rules

Spec: `docs/superpowers/specs/2026-09-27-ielts-spec-D-content-generation-rules-design.md`. Branch `feat/content-generation-rules` (web + mobile).

1. TDD `ContentRules` (GT section briefs vs Academic, listening part contexts, 13+13+14 / 4×10 distributions).
2. TDD `StudioAiService`: context line (module/section/skill) in generate prompts; TFNG vs YNNG + no-outside-knowledge rules in generate/fill prompts; new completion types normalise with word limits; `passage()` + `POST /api/ai/studio-passage` + offline stub.
3. Web: QuestionType + labels + strategies + instructions for note/table/flow-chart/form completion; shared `TEXT_ANSWER_TYPES`; Reading excludes form-completion.
4. Web Studio: `ContentRules.tsx` (brief note, Write passage with AI, FullMockCheck); Reading editor sends module/section, shows GT brief, "both" module note; Listening editor shows part contexts, sends skill/section.
5. Mobile: enum + wire keys + parsing + text input + word limits; round-trip test.
6. Backend suite, web build, browser check (stub), mobile analyze/test; merge + push.
