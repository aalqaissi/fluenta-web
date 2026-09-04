import { useSyncExternalStore } from "react";

// Tracks the bands earned in the current Full Exam run so the orchestrator can
// sequence the four skills and, once all are done, produce a combined result +
// certificate. Persisted to localStorage so it survives full-screen runner nav.
export type FullSkill = "listening" | "reading" | "writing" | "speaking";
export const FULL_SKILL_ORDER: FullSkill[] = ["listening", "reading", "writing", "speaking"];

export type FullExamResults = Partial<Record<FullSkill, number>>;

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
  record(skill: FullSkill, band: number) {
    results = { ...results, [skill]: band };
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
