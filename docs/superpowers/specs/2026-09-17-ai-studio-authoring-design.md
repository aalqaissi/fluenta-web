# Design Spec — AI Studio Authoring (§2c)

_Date: 2026-09-17 · Status: approved for planning · Repo: `fluenta-web` (Spring Boot backend + React/TS web). Web/admin-only — no mobile._

Implements **§2c Studio Generate / Extract / Fill** of [`docs/ai-llm-mvp-pending.md`](../../ai-llm-mvp-pending.md), the third slice of the Gen AI / LLM MVP. Builds on the Phase-1 Foundation (`AiClient`, `AiProperties` feature flag, offline-stub + validation-gate patterns) and adds a **vision** capability to `AiClient`.

---

## 1. Goals / Non-goals

**Goals**
- Real LLM authoring in the Content Studio (admin-only), replacing the local heuristics:
  - **Generate** — questions from a passage/transcript + question type + count.
  - **Fill** — correct answers for existing question prompts.
  - **Extract (vision)** — from uploaded photo(s): OCR a passage + question sheet into structured questions; **and** when the image is a chart/graph/diagram/map, generate *relevant descriptive text* (a passage/description) + questions grounded in it.
- Output slots into the existing `StudioQuestion` model behind a **validation/normalization gate**.
- **Free/offline path** (no key) keeps the existing local heuristics — never 501.
- Wire the `AiButton`s in the Reading + Listening editors.

**Non-goals (this phase)**
- Mobile (there is no mobile Studio).
- Writing/Speaking/Full-mock editor AI (only Reading + Listening have authoring AI buttons today).
- Server-side image media storage — Extract sends images as **base64 in the request body** (admin, low volume).
- Studio content persistence changes — generated questions flow into the existing Studio store/exam save path unchanged.

---

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | Backend **+ web only**; **admin-gated** (`CurrentUser.requireAdmin()`). |
| Actions | Generate + Fill + Extract. |
| Extract input | **Vision** — base64 image(s) in the request body. Handles both OCR-of-a-sheet and image/graph → relevant-text-and-questions. |
| Foundation growth | `AiClient` gains a **`vision(...)`** method (image content blocks). Generate/Fill reuse the text `complete(...)`. |
| Structured output | Prompt-instructed JSON + Jackson parse + **normalization/validation gate** to the `StudioQuestion` shape (same approach as writing feedback). |
| Offline/free path | Port the local heuristics (`aiQuestions`/`defaultAnswerFor`) to a backend `StubStudioAuthor`; never 501. |
| Model | Reuses `props.model()` (default `claude-sonnet-5`, vision-capable; configurable to Opus for content quality). |
| Verification | Vision + live paths can't run here (no key/socket) → mocked-`AiClient` tests + structural validation; a real check needs a host with a key. |

---

## 3. Backend architecture

New/changed under `backend/src/main/java/com/fluenta/api/`, reusing Phase-1 patterns.

```
service/ AiClient.java              EXTEND: vision(system, userText, List<ImageInput>) + record ImageInput
         AnthropicAiClient.java     EXTEND: implement vision(...) via SDK image content blocks
         StudioAiService.java       NEW: generate / fill / extract; live vs offline; normalization gate
         studio/StubStudioAuthor.java NEW: offline heuristics (ported aiQuestions/defaultAnswerFor)
dto/     AiDtos.java                EXTEND: StudioQuestionDto, StudioGenerateRequest, StudioFillRequest,
                                     StudioExtractRequest, StudioImage, StudioQuestionsReply, StudioExtractResult
web/     AiController.java          ADD: POST /studio-generate, /studio-fill, /studio-extract (admin)
```

### 3.1 `AiClient` vision extension

```java
public interface AiClient {
    String complete(String systemPrompt, String userPrompt);           // Phase 1
    String chat(String systemPrompt, List<ChatTurn> turns);            // Phase 2
    String vision(String systemPrompt, String userText, List<ImageInput> images);  // NEW
    record ChatTurn(String role, String text) {}
    record ImageInput(String base64, String mediaType) {}              // mediaType e.g. "image/jpeg"
}
```

`AnthropicAiClient.vision(...)` builds one user message containing the image content block(s) + the text, reusing the existing `client()`/`effort()`/model/error-mapping. Confirm the SDK image-block binding at build time (`ImageBlockParam` + a base64 image source, wrapped via `ContentBlockParam.ofImage(...)` and `addUserMessageOfBlockParams(...)`); `javap` if a name differs — do not guess.

### 3.2 `StudioAiService`

- **generate(passageText, questionType, count)** → `List<StudioQuestionDto>`: prompt Claude (text) to produce `count` IELTS-style questions of `questionType` grounded in `passageText`, as JSON. Parse → normalize.
- **fill(passageText, questions)** → `List<StudioQuestionDto>`: given prompts (+ options) and the passage, return the correct `answer` for **each provided question** (preserving prompt/type/options), in the same order. The web applies them only to questions currently missing an answer (matching today's "fill missing" behavior). Parse → normalize.
- **extract(images, hint?)** → `StudioExtractResult(passageText, questions)`: vision. System prompt instructs: if the image is a reading passage / question sheet, transcribe the passage into `passageText` and structure the questions; if the image is a **chart/graph/diagram/map/process**, write a concise *relevant passage/description* into `passageText` and generate grounded questions. Parse → normalize.
- **Live vs offline**: `props.live()` → `AiClient` (text for generate/fill, `vision` for extract); else → `StubStudioAuthor`. Live failure → friendly `ApiException` (web falls back to its local heuristic).
- Caps: `passageText`/pasted input ≤ `props.maxEssayChars()`; total base64 image bytes ≤ a config cap (`fluenta.ai.max-image-bytes`, default ~5 MB); `count` clamped to a sane range (1–20).

### 3.3 Normalization / validation gate (`StudioQuestionDto`)

Every returned question is normalized to the `StudioQuestion` contract before leaving the server:
- `type`: a valid `QuestionType`; if missing/unknown, fall back to the request's `questionType` (generate/fill) or a sensible default (extract).
- `prompt`: non-blank (drop blank-prompt questions).
- `options`: for `multiple-choice` (4) / `multi-select` (5) ensure that many option strings (pad/truncate); omit for other types.
- `answer`: type-appropriate — `multiple-choice`/`multi-select` → a letter within range (A–D / A–E); `true-false-notgiven` → one of TRUE/FALSE/NOT GIVEN; `yes-no-notgiven` → YES/NO/NOT GIVEN; text types (`sentence-completion`/`summary-completion`/`diagram-label`/`short-answer`) → non-blank string; coerce/clamp invalid values.
- `wordLimit`: for text types default to 2 if absent.

### 3.4 `StubStudioAuthor` (offline)

Ports `aiQuestions(type)` (2 placeholder questions with type-appropriate options + `defaultAnswerFor`) and `defaultAnswerFor(type)` into Java. `extract` offline returns a placeholder passage + 2 questions. Deterministic; no model call.

---

## 4. API contract

All three are **admin-only** (`CurrentUser.requireAdmin()` → 401 unauth / 403 non-admin).

```
POST /api/ai/studio-generate
  { "passageText": "...", "questionType": "true-false-notgiven", "count": 4 }
  → { "questions": [ { "prompt","type","options"?,"answer","wordLimit"? }, ... ] }

POST /api/ai/studio-fill
  { "passageText": "...", "questions": [ { "prompt","type","options"? }, ... ] }
  → { "questions": [ { "prompt","type","options"?,"answer","wordLimit"? }, ... ] }

POST /api/ai/studio-extract
  { "images": [ { "base64":"...", "mediaType":"image/jpeg" } ], "hint"?: "reading passage" }
  → { "passageText": "...", "questions": [ ... ] }
```

**DTOs (`AiDtos`)**: `StudioQuestionDto(String prompt, String type, List<String> options, String answer, Integer wordLimit)`; `StudioGenerateRequest(String passageText, String questionType, Integer count)`; `StudioFillRequest(String passageText, List<StudioQuestionDto> questions)`; `StudioImage(String base64, String mediaType)`; `StudioExtractRequest(List<StudioImage> images, String hint)`; `StudioQuestionsReply(List<StudioQuestionDto> questions)`; `StudioExtractResult(String passageText, List<StudioQuestionDto> questions)`. (No `id` — the web assigns ids when merging into the store.)

**Retained catch-all**: `POST /api/ai/{feature}` stays 501 for Speaking/Live-Interview. The literal `/studio-*` routes take precedence.

---

## 5. Web wiring (`fluenta-web`)

- `src/lib/api.ts`: types + `api.ai.studioGenerate(req)`, `studioFill(req)`, `studioExtract(req)`.
- `src/features/studio/editors/ReadingEditor.tsx` + `ListeningEditor.tsx`: wire the `AiButton`s:
  - **Generate with AI** → `studioGenerate({ passageText: p.text (or s.transcript), questionType: p.questionType, count })`; append returned questions (assign `id`s).
  - **Fill Missing Answers** → `studioFill({ passageText, questions })`; merge answers into questions missing them.
  - **Extract passage & questions** → read the selected photo(s) as base64 → `studioExtract({ images })`; set `p.text` + append questions.
  - Loading/disabled state on each button while in flight; **on error, fall back to the existing local heuristic** (`aiQuestions`/`defaultAnswerFor`/placeholder) so authoring never dead-ends. Keep those helpers as the fallback.
- `AiButton` gains an optional `loading` state (spinner) — small extension in `components.tsx`.

---

## 6. Safety / ops

- **Admin-only** endpoints. Inputs are admin-authored but still capped (text chars, image bytes, question count).
- **Structured normalization gate** contains malformed model output (never emits an invalid `QuestionType`/answer into the authoring form).
- **Cost/latency**: vision is pricier; admin low-volume; reuse Sonnet 5 (configurable to Opus). Non-streaming.
- **Logging/PII**: don't log passage text or image bytes at info level.

---

## 7. Tests & verification

- **Backend (MockMvc, `mvn -q test -DforkCount=0`)**:
  - `StudioAiService` unit tests with a **mocked `AiClient`** (canned JSON for generate/fill; canned JSON from `vision` for extract) → assert the normalization gate (valid types, options for MC/MS, type-appropriate answers, count clamp).
  - `StubStudioAuthor` test → offline generate/fill/extract return valid `StudioQuestion`-shaped output; deterministic.
  - Contract tests: the seeded demo user **`u1`/Sara is an admin** (SeedLoader forces `role="admin"`), so login-as-Sara → `POST /api/ai/studio-generate` (offline) → **200 + questions** is directly testable. A **403** is asserted with a **freshly registered user** (role defaults to student). Both assert the routes are live (not 501).
  - `AnthropicAiClient.vision` mapping exercised where practical (the live SDK image call is integration-only).
- **Web**: `npm run lint` + `npm run build` clean; the error/offline fallback (button → API fails → local heuristic) is exercisable without a backend.

---

## 8. Risks / open items

- **SDK image-block binding** (`ImageBlockParam` / base64 image source) confirmed at build time (javap; don't guess) — same discipline as Phase-1/2.
- **Vision + live paths unverifiable here** — exercised via mocked-`AiClient` canned JSON; a real photo→questions check needs a host with a key.
- **Admin test user**: confirm a seeded admin exists for the MockMvc 200 path; if not, the plan seeds one or relies on the service-layer offline test + the 403 contract test.
- **Image size**: base64-in-body inflates payload ~33%; the `max-image-bytes` cap + `spring.servlet.multipart`/max-request limits must accommodate a few MB (JSON body, not multipart — check the server's max JSON/request size).
- **Graphify + ROADMAP**: after the build, refresh graphify (web + backend) and flip the Studio item held→done in the pending doc + `docs/ROADMAP.md`.

---

## 9. File change summary

**backend** — edit: `service/AiClient.java` (+`vision`/`ImageInput`), `service/AnthropicAiClient.java` (implement `vision`), `dto/AiDtos.java` (+studio records), `web/AiController.java` (+3 studio routes), `test/.../HttpContractTest.java` (studio 403/route tests); add: `service/StudioAiService.java`, `service/studio/StubStudioAuthor.java`, `test/.../StudioAiServiceTest.java`, `test/.../StubStudioAuthorTest.java`.

**web** — edit: `src/lib/api.ts`, `src/features/studio/components.tsx` (AiButton loading), `src/features/studio/editors/ReadingEditor.tsx`, `src/features/studio/editors/ListeningEditor.tsx`.
