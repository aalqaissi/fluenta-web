# §2e Live Interview — new-session kickoff

_Prepared 2026-09-19. Paste the block below as the first message of a fresh session to build §2e Live Interview (the last Gen AI/LLM MVP feature). It starts at brainstorming, because §2e has no spec/plan yet. See the two notes at the bottom before you start — the transport decision is the biggest lever._

---

Design and build §2e Live Interview (real-time AI examiner) — the LAST feature of the Gen AI/LLM MVP for the Yalla English Hub project. Start from scratch and follow the same workflow used for §2c Studio and §2d Speaking: brainstorm the design first → spec → implementation plan → subagent-driven build (per-task spec+quality reviews + a final whole-branch review, apply findings) → merge/push → refresh graphify. Run the build phase autonomously to completion without checking back; only stop for a genuine BLOCKER.

WHERE
- Primary repo: D:\personal\fluenta-web (Spring Boot backend + React/TS web). Mobile repo D:\personal\fluenta-mobile if voice/mobile is in scope.
- Feature: §2e in docs/ai-llm-mvp-pending.md; the "AI: Live Interview" row in docs/ROADMAP.md; today it's a "coming soon" screen (src/features/simulation/LiveInterviewPage.tsx). Builds on the Foundation (AiClient, AiProperties, AnthropicAiClient, AiController, AiDtos) and the §2a–2d patterns (a seam interface + offline stub that NEVER 501s + a validation/normalization gate + student-auth endpoints).

WORKFLOW (do not skip a stage)
1. superpowers:brainstorming FIRST — this is the MOST COMPLEX, realtime/voice feature; resolve the big open decisions WITH ME before writing anything: transport (full-duplex WebSocket streaming vs a turn-based push-to-talk request/response loop like Coach chat vs SSE), STT + TTS providers (reuse the §2d Transcriber seam? add a TTS seam?), voice vs text-only v1, barge-in/interruption + latency budget, web-only vs web+mobile, end-of-interview scoring (reuse the Speaking 4-criteria gate?) vs pure conversation, and how it replaces the LiveInterviewPage placeholder. Get design approval, write the spec to docs/superpowers/specs/YYYY-MM-DD-ai-live-interview-design.md, commit.
2. superpowers:writing-plans → docs/superpowers/plans/YYYY-MM-DD-ai-live-interview.md, commit.
3. superpowers:subagent-driven-development → fresh subagent per task; per-task spec+quality review; final whole-branch review on the most capable model; apply findings in scoped fix waves.
4. Wrap-up: create/merge branch feat/ai-live-interview → main (both repos if mobile is touched), verify green, push origin main, delete the branch, then refresh graphify.

MODEL SELECTION (set explicitly on every dispatch): sonnet floor for implementers/reviewers; haiku for pure transcription tasks and tiny re-reviews; opus for the final whole-branch review.

CRITICAL ENVIRONMENT FACTS (hard-won — honor these)
- Backend CANNOT bind a socket on this machine (Java NIO loopback blocked by a local proxy). Verify ONLY with `mvn -q test -DforkCount=0` (in-process MockMvc). NEVER start the live server. This bites §2e hardest: any WebSocket/streaming transport cannot be run or integration-tested locally AT ALL — design so the core turn/session logic is unit/MockMvc-testable behind seams, and treat the live realtime path as ship-on-mocks + off-machine verification. This is a strong reason to prefer a turn-based v1 over full-duplex streaming.
- No ANTHROPIC_API_KEY, no OPENAI_API_KEY, no microphone here → the live LLM/STT/TTS/voice paths CANNOT be verified. Ship them verified only by mocked-seam tests + the offline stub + the validation gate, and say so plainly — do NOT claim the live path was tested.
- Offline (no key / props not live) must NEVER 501 — degrade to a deterministic stub / held-friendly behavior, matching §2a–2d.
- Known dev-DB flake: tests share a gitignored on-disk SQLite file (backend/data/fluenta.db). AdminUsersContractTest fails on RE-runs; fix = delete backend/data/fluenta.db* and re-run. ALWAYS reset it before the final merged-main verification run.
- Seeded demo user u1/Sara (sara.hamzeh@example.com, password yalla-demo) is an ADMIN. Live Interview is student-facing → use CurrentUser.require() (not requireAdmin); test 401 unauth with no token and 200 with any authenticated user. /api/media is already student-writable (relaxed in §2d), so reuse the §2d audio-capture + Transcriber seam if voice is in scope.
- Every commit body ends EXACTLY with: Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com> — instruct every subagent to use that literal trailer and NOT substitute its own model name (a subagent slipped once in §2d).
- Web gate: npm run lint + npm run build. Mobile gate: flutter analyze.

GRAPHIFY (final step, standing project rule): refresh graphify CODE-ONLY (deterministic AST, no LLM subagents) via `GRAPHIFY_MAX_WORKERS=1 <interpreter> -m graphify update .` for each touched codebase (interpreter path is in <repo>/graphify-out/.graphify_python). Web + backend graphs are on-disk only (gitignored — NO commit). Mobile's graph IS committed (a `chore: refresh graphify graph (mobile) ...` commit staging only graphify-out/GRAPH_REPORT.md, graph.html, graph.json).

When done, give a concise summary: what shipped, notable review findings/fixes, merge/push SHAs, graphify node counts, and any deferred items — and be explicit about which paths could NOT be verified on this machine.

---

## Notes before you start

1. **This starts at brainstorming**, not at an approved plan (unlike the §2c/§2d kickoffs), because §2e has no spec or plan yet. The new session needs your input on the transport/voice decisions before it can write the spec.
2. **The biggest design lever is transport.** Because this machine can't bind a socket, a full-duplex WebSocket streaming interview is essentially unverifiable locally, whereas a **turn-based push-to-talk loop** (record a turn → STT → examiner LLM reply → optional TTS, reusing the §2d Transcriber seam) is MockMvc-testable and a far safer v1. Steer the brainstorm toward that unless you specifically want the streaming version.

## Where §2d left off (context for the brainstorm)
- Speaking feedback (§2d) shipped a `Transcriber` seam (`WhisperTranscriber` live + `StubTranscriber` offline), a student `POST /api/ai/speaking-feedback`, real audio capture on web (`MediaRecorder`) and mobile (`record` package), and a 4-criteria normalization gate. Live Interview can reuse the Transcriber seam and the audio-capture patterns, and likely wants a new TTS seam for the examiner's voice.
- The AI/LLM MVP is now 4 of 5 done (Coach, Writing, Studio, Speaking live); §2e is the final one.
