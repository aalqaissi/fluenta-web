import { useSearchParams } from "react-router-dom";

/**
 * Practice vs Full Exam mode (owner IELTS spec — "Core Platform Modes"). They are separate modes in
 * the UI, timer logic, the stored attempt and scoring workflow:
 * - practice: timer optional, listening audio replayable, flexible writing/speaking conditions;
 * - exam: official component timing that can't be switched off, audio played once, auto-submit.
 */
export type ExamMode = "practice" | "exam";

/** Official Full Exam timings (seconds). */
export const EXAM_TIMING = {
  readingSec: 60 * 60,
  listeningCheckSec: 2 * 60,
  writingTask1Sec: 20 * 60,
  writingTask2Sec: 40 * 60,
  speakingPrepSec: 60,
  /** recording cap per speaking part in exam mode: Part 1 ≈4–5 min, Part 2 long turn 2 min, Part 3 ≈4–5 min */
  speakingCapSec: { 1: 5 * 60, 2: 2 * 60, 3: 5 * 60 } as Record<number, number>,
  /** flexible practice cap per part */
  speakingPracticeCapSec: 5 * 60,
} as const;

/** `?mode=exam` or the orchestrator's `?full=1` → exam; anything else → practice. */
export function modeFromParams(sp: URLSearchParams): ExamMode {
  return sp.get("mode") === "exam" || sp.get("full") ? "exam" : "practice";
}

export function useExamMode(): { mode: ExamMode; full: boolean } {
  const [sp] = useSearchParams();
  return { mode: modeFromParams(sp), full: !!sp.get("full") };
}

/** Append the mode to a runner path. */
export function withMode(path: string, mode: ExamMode): string {
  return mode === "exam" ? `${path}${path.includes("?") ? "&" : "?"}mode=exam` : path;
}

const roundHalf = (v: number) => Math.round(v * 2) / 2;

/** Writing component band: Task 2 carries twice the weight of Task 1. */
export function writingBand(task1: number, task2: number): number {
  return roundHalf((task1 + 2 * task2) / 3);
}
