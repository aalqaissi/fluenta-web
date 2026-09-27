# Sub-project C — Practice Mode vs Full Exam Mode

_Source: owner's IELTS Assessment & Exam Specifications — "Core Platform Modes", §1, §2, §3–§6, §8 (2026-09-27). Part 3 of 4 (A → B → **C** → D)._

## Requirements
- Practice (question-type / passage / practice mock) and Full Exam are **separate modes** in the UI, timer logic, database and scoring workflow.
- **Practice:** the timer is optional (the student may finish without one). Listening audio may be replayed. Writing and Speaking conditions are flexible.
- **Exam:** the official component timer runs and cannot be turned off.
  - Listening: the recording plays **once**, then a **2-minute answer-check period** in which answers can be reviewed and edited, then auto-submit.
  - Reading: **60 minutes**, no transfer time.
  - Writing: Task 1 ≈20 min / 150 words, Task 2 ≈40 min / 250 words. Task 2 carries **twice the weight** of Task 1.
  - Speaking: Part 1 ≈4–5 min; Part 2 has **exactly 1 minute of preparation** (notes allowed), then up to **2 minutes** of speaking, stopped at the limit; Part 3 ≈4–5 min.

## Design (web)
- **Mode resolution** (`exam-runner/examMode.ts`): `?mode=exam` or the existing `?full=1` means `exam`; anything else is `practice`. `EXAM_TIMING` constants hold the official limits. `writingBand(t1, t2) = roundHalf((t1 + 2·t2) / 3)`.
- **Launching:** a `ModeLaunch` pair of buttons ("Practice" / "Exam conditions") replaces the single Start button on the Listening, Reading and Writing hubs. The Speaking standard intro gets the same choice and passes it through to the runner.
- **Timer** (`useRunnerTimer` + `TimerControl`):
  - **exam** — mandatory countdown, no toggle, `onExpire` auto-submits;
  - **practice** — off by default. A "Timer" toggle starts an informational countdown that never auto-submits and shows "Time's up — keep going".
- **Reading:** exam uses a fixed 60:00 (ignoring the authored `timeLimit`); practice uses the authored time for the optional timer.
- **Listening:**
  - Practice: free navigation, replayable audio, optional timer.
  - Exam runs in phases:
    - *listening* — only the current part is shown; the audio plays once; when it ends, or can't play, the runner advances to the next part (a "Next part" button appears after the audio ends, for simulated audio);
    - *check* — after the last part's audio, a 2:00 countdown; every part can be revisited and edited; auto-submits at 0.
  - `AudioPlayer` gains `onEnded`.
- **Writing:**
  - Exam: countdown equal to the task's time (20 / 40 min) that auto-submits at 0. An empty essay is recorded as band 0 without an API call.
  - Practice: optional timer.
  - Full exam: the orchestrator runs **Task 1 then Task 2** (`?full=1&step=t1|t2`). The store keeps `writingT1` and `writingT2` and derives `writing = writingBand(t1, t2)`.
- **Speaking:**
  - Exam: per-part recording caps of 5:00 / 2:00 / 5:00. Part 2 starts with a **1:00 preparation countdown** and a notes box; recording starts automatically when prep ends, and the student can start early. Re-recording is disabled. The runner auto-advances when a cap is hit.
  - Practice: a 5:00 cap per part, re-record allowed; the Part 2 prep timer is optional ("Start 1-min prep" / skip).
- **Full exam orchestrator:** sections unlock **strictly in order**, with no per-section redo (only "Reset" of the whole run). Writing shows "Task 1 + Task 2 · 60 min" and the weighted band.

## Design (backend)
- `AttemptEntity.mode` (`practice|exam`, default `practice`); `AttemptRequest.mode`, `AttemptDto.mode`. Unknown values fall back to `practice`. Hibernate `ddl-auto: update` adds the column; old rows read as `practice`.

## Mobile (parity, reduced)
- Attempts send `mode`.
- The Listening runner in practice allows replay (exam keeps play-once).
- The Reading runner in exam mode uses 60:00.
- The runners read the mode from the route query (`full=1` or `mode=exam`).

## Out of scope
A backend-persisted full-exam session and server-side timer enforcement: timers are client-side, as today.

## Testing
- Backend: attempt round-trips `mode`, and an unknown value becomes `practice`.
- Web: `npm run build`, plus browser checks of the Listening exam phases, the practice timer toggle, the Speaking Part 2 prep and the full-exam order.
- Mobile: `flutter analyze` and tests.
