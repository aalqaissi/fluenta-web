import { delay } from "./utils";
import { readingExam } from "@/mock/passages";
import { listeningExam } from "@/mock/listening";
import { sampleWritingResult, speakingParts, sampleSpeakingFeedback } from "@/mock/data";
import type { WritingResult, ReadingExam, ListeningExam, QuestionGroup, SpeakingExam, SpeakingFeedback } from "@/mock/types";

export interface GradingStep {
  label: string;
  atProgress: number;
}

export const gradingSteps: GradingStep[] = [
  { label: "Analyzing your response…", atProgress: 10 },
  { label: "Evaluating grammar and vocabulary…", atProgress: 35 },
  { label: "Calculating band score…", atProgress: 60 },
  { label: "Preparing detailed feedback…", atProgress: 85 },
  { label: "Grading complete!", atProgress: 100 },
];

export function getReadingExam() {
  return readingExam;
}

export function getListeningExam() {
  return listeningExam;
}

export function getSpeakingExam(): SpeakingExam {
  return { id: "speak-skills", title: "Speaking Mock — Skills & Learning", scope: "global", parts: speakingParts, attempts: 0 };
}

/** Mock per-criterion speaking feedback (no real audio is graded in the prototype). */
export function getSpeakingFeedback(): SpeakingFeedback[] {
  return sampleSpeakingFeedback;
}

/** IELTS-style overall = mean of the four criteria, rounded to the nearest 0.5. */
export function speakingOverall(feedback: SpeakingFeedback[]): number {
  if (!feedback.length) return 0;
  const avg = feedback.reduce((s, f) => s + f.band, 0) / feedback.length;
  return Math.round(avg * 2) / 2;
}

/** Simulate AI grading with progress callbacks. Returns after ~ the given duration. */
export async function runAiGrading(onProgress: (pct: number, label: string) => void, totalMs = 3200) {
  const ticks = 40;
  for (let i = 1; i <= ticks; i++) {
    await delay(totalMs / ticks);
    const pct = Math.round((i / ticks) * 100);
    const step = [...gradingSteps].reverse().find((s) => pct >= s.atProgress) ?? gradingSteps[0];
    onProgress(pct, step.label);
  }
}

/** Count correct/total across a set of question groups (skill-agnostic). */
export function scoreGroups(groups: QuestionGroup[], answers: Record<string, string>) {
  let correct = 0;
  let total = 0;
  for (const g of groups) {
    for (const q of g.questions) {
      total++;
      const given = (answers[q.id] ?? "").trim().toLowerCase();
      if (given && given === q.correct.trim().toLowerCase()) correct++;
    }
  }
  return { correct, total };
}

/** Mock reading score for ANY reading exam (built-in or Studio-authored). */
export function scoreExam(exam: ReadingExam, answers: Record<string, string>) {
  const groups = exam.passages.flatMap((p) => p.groups);
  const { correct, total } = scoreGroups(groups, answers);
  return { correct, total, band: rawToBand(correct) };
}

/** Mock listening score for ANY listening exam (built-in or Studio-authored). */
export function scoreListening(exam: ListeningExam, answers: Record<string, string>) {
  const groups = exam.sections.map((s) => s.group);
  const { correct, total } = scoreGroups(groups, answers);
  return { correct, total, band: bandFromAccuracy(correct, total) };
}

/** Mock reading score against the built-in exam. */
export function scoreReading(answers: Record<string, string>) {
  return scoreExam(readingExam, answers);
}

/**
 * Accuracy → IELTS-style band. Used for listening (and other skills with a
 * variable question count) so a strong run isn't capped by a fixed raw table.
 */
export function bandFromAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  const pct = correct / total;
  const table: [number, number][] = [
    [0.97, 9], [0.9, 8.5], [0.82, 8], [0.75, 7.5], [0.67, 7],
    [0.58, 6.5], [0.5, 6], [0.42, 5.5], [0.33, 5], [0.25, 4.5], [0.15, 4],
  ];
  for (const [min, band] of table) if (pct >= min) return band;
  return 3.5;
}

/** Rough IELTS Academic Reading raw→band mapping (out of ~40). */
function rawToBand(raw: number): number {
  const table: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
    [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4],
  ];
  for (const [min, band] of table) if (raw >= min) return band;
  return 3.5;
}

export async function gradeWriting(_answer: string): Promise<WritingResult> {
  await delay(200);
  return sampleWritingResult;
}
