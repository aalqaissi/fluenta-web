import { useSyncExternalStore } from "react";
import { writingBand } from "@/features/exam-runner/examMode";

// Tracks the bands earned in the current Full Exam run so the orchestrator can
// sequence the four skills and, once all are done, produce a combined result +
// certificate. Persisted to localStorage so it survives full-screen runner nav.
export type FullSkill = "listening" | "reading" | "writing" | "speaking";
export const FULL_SKILL_ORDER: FullSkill[] = ["listening", "reading", "writing", "speaking"];

/** Writing is two tasks; the component band is derived with Task 2 double-weighted. */
export type FullRecordKey = FullSkill | "writingT1" | "writingT2";
export type FullExamResults = Partial<Record<FullRecordKey, number>>;

const KEY = "fluenta.fullexam.results";

function load(): FullExamResults {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(results));
  } catch {
    /* ignore */
  }
}

let results: FullExamResults = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const fullExamStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => results,
  record(key: FullRecordKey, band: number) {
    results = { ...results, [key]: band };
    if (key === "writingT1" || key === "writingT2") {
      const { writingT1, writingT2 } = results;
      // the writing section completes once both tasks are graded
      const { writing: _drop, ...rest } = results;
      results = writingT1 != null && writingT2 != null ? { ...rest, writing: writingBand(writingT1, writingT2) } : rest;
    }
    save();
    emit();
  },
  reset() {
    results = {};
    save();
    emit();
  },
};

export function useFullExam(): FullExamResults {
  return useSyncExternalStore(fullExamStore.subscribe, fullExamStore.get, fullExamStore.get);
}
