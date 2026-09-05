import { useEffect, useSyncExternalStore } from "react";
import type { QuestionType } from "@/mock/types";
import { api, ApiError, type ExamDto } from "@/lib/api";

export type StudioSkill = "reading" | "writing" | "listening" | "speaking" | "full";
export type PubStatus = "draft" | "published";

export interface StudioQuestion {
  id: string;
  prompt: string;
  answer: string;
  /** per-question type override; undefined = inherit the passage's question type */
  type?: QuestionType;
  /** option texts for Multiple Choice (A–D) / Multi-Select (A–E) */
  options?: string[];
  /** word limit for completion / short-answer types */
  wordLimit?: number;
}
export interface StudioPassage {
  id: string;
  title: string;
  inputMode: "type" | "upload" | "extract";
  text: string;
  imageName: string | null; // diagram/map/process
  questionType: QuestionType;
  questions: StudioQuestion[];
}
export interface StudioSection {
  id: string;
  title: string;
  audioName: string | null;
  imageName: string | null;
  transcript: string;
  questionType: QuestionType;
  questions: StudioQuestion[];
}
export interface StudioSpeakingQ {
  id: string;
  text: string;
  audioName: string | null; // examiner audio
}
export interface StudioSpeakingPart {
  id: string;
  number: 1 | 2 | 3;
  title: string;
  cueCard: string;
  topic: string;
  questions: StudioSpeakingQ[];
}
export type ChartType =
  | "bar-chart"
  | "diagram"
  | "line-graph"
  | "maps"
  | "multiple-graph"
  | "pie-chart"
  | "process-diagram"
  | "table";
export type Formality = "formal" | "informal" | "semi-formal";

interface WritingTaskBase {
  imageName: string | null;
  prompt: string;
  minWords: number;
  timeMinutes: number;
  idealAnswer: string;
}
export interface WritingParts {
  academicT1: WritingTaskBase & { chartType: ChartType; imageDescription: string };
  generalT1: WritingTaskBase & { formality: Formality };
  task2: WritingTaskBase;
}
export interface FullParts {
  reading: string | null;
  writing: string | null;
  listening: string | null;
  speaking: string | null;
}

export interface StudioExam {
  id: string;
  skill: StudioSkill;
  title: string;
  module: "academic" | "general" | "both";
  status: PubStatus;
  timeLimit: number;
  updatedAt: string; // ISO
  passages?: StudioPassage[];
  sections?: StudioSection[];
  writing?: WritingParts;
  parts?: StudioSpeakingPart[];
  full?: FullParts;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toISOString();

function blankExam(skill: StudioSkill): StudioExam {
  const base = { id: uid(), skill, title: "", module: "academic" as const, status: "draft" as const, timeLimit: skill === "writing" ? 60 : 30, updatedAt: now() };
  switch (skill) {
    case "reading":
      return { ...base, title: "Untitled reading exam", timeLimit: 60, passages: [newPassage(1)] };
    case "listening":
      return { ...base, title: "Untitled listening exam", timeLimit: 30, sections: [newSection(1)] };
    case "writing":
      return {
        ...base,
        title: "Untitled writing exam",
        timeLimit: 60,
        writing: {
          academicT1: { imageName: null, chartType: "bar-chart", imageDescription: "", prompt: "", minWords: 150, timeMinutes: 20, idealAnswer: "" },
          generalT1: { imageName: null, formality: "formal", prompt: "", minWords: 150, timeMinutes: 20, idealAnswer: "" },
          task2: { imageName: null, prompt: "", minWords: 250, timeMinutes: 40, idealAnswer: "" },
        },
      };
    case "speaking":
      return { ...base, title: "Untitled speaking exam", timeLimit: 14, parts: [newSpeakingPart(1), newSpeakingPart(2), newSpeakingPart(3)] };
    case "full":
      return { ...base, title: "Untitled full mock", full: { reading: null, writing: null, listening: null, speaking: null } };
  }
}

export function newPassage(n: number): StudioPassage {
  return { id: uid(), title: `Passage ${n}`, inputMode: "type", text: "", imageName: null, questionType: "true-false-notgiven", questions: [] };
}
export function newSection(n: number): StudioSection {
  return { id: uid(), title: `Section ${n}`, audioName: null, imageName: null, transcript: "", questionType: "sentence-completion", questions: [] };
}
export function newSpeakingPart(n: 1 | 2 | 3): StudioSpeakingPart {
  return {
    id: uid(),
    number: n,
    title: n === 1 ? "Introduction & interview" : n === 2 ? "Individual long turn" : "Two-way discussion",
    cueCard: n === 2 ? "" : "",
    topic: "",
    questions: [],
  };
}
export function newQuestion(): StudioQuestion {
  return { id: uid(), prompt: "", answer: "" };
}
export function newSpeakingQ(): StudioSpeakingQ {
  return { id: uid(), text: "", audioName: null };
}

// ---- API mapping ------------------------------------------------

/** ExamDto (nested content) → flat StudioExam used across the Studio UI. */
export function toStudioExam(d: ExamDto): StudioExam {
  const c = (d.content ?? {}) as Partial<StudioExam>;
  return {
    id: d.id,
    skill: d.skill as StudioSkill,
    title: d.title,
    module: d.module,
    status: d.status,
    timeLimit: d.timeLimit,
    updatedAt: d.updatedAt,
    passages: c.passages,
    sections: c.sections,
    writing: c.writing,
    parts: c.parts,
    full: c.full,
  };
}

/** Flat StudioExam → ExamDto for persistence (authoring content nested under `content`). */
export function toExamDto(e: StudioExam): ExamDto {
  return {
    id: e.id,
    skill: e.skill,
    title: e.title,
    module: e.module,
    status: e.status,
    scope: "user",
    timeLimit: e.timeLimit,
    updatedAt: e.updatedAt,
    format: "studio",
    content: {
      ...(e.passages ? { passages: e.passages } : {}),
      ...(e.sections ? { sections: e.sections } : {}),
      ...(e.writing ? { writing: e.writing } : {}),
      ...(e.parts ? { parts: e.parts } : {}),
      ...(e.full ? { full: e.full } : {}),
    },
  };
}

// ---- reactive, API-backed store ---------------------------------

let exams: StudioExam[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;

// getSnapshot must return a stable reference between emits (useSyncExternalStore contract).
let snapshot: { exams: StudioExam[]; loading: boolean; error: string | null } = { exams, loading, error };
const listeners = new Set<() => void>();
function emit() {
  snapshot = { exams, loading, error };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function ensureLoaded() {
  if (loaded || loading) return;
  loading = true;
  error = null;
  emit();
  api.exams
    .list()
    .then((dtos) => {
      exams = dtos.filter((d) => d.format === "studio").map(toStudioExam);
      loaded = true;
    })
    .catch((e) => {
      error = e instanceof ApiError ? e.message : String((e as any)?.message ?? e);
    })
    .finally(() => {
      loading = false;
      emit();
    });
}

// Debounced per-exam persistence so rapid editor edits collapse into one PUT.
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function scheduleSave(id: string) {
  if (saveTimers[id]) clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(() => {
    const e = exams.find((x) => x.id === id);
    if (e) api.exams.update(id, toExamDto(e)).catch(() => { /* stays optimistic; reload resyncs */ });
  }, 500);
}

const store = {
  subscribe,
  get: () => exams,
  ensureLoaded,
  reload() {
    loaded = false;
    ensureLoaded();
  },
  create(skill: StudioSkill): string {
    const e = blankExam(skill);
    exams = [e, ...exams];
    emit();
    api.exams.create(toExamDto(e)).catch(() => { /* optimistic */ });
    return e.id;
  },
  update(id: string, patch: Partial<StudioExam>) {
    exams = exams.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e));
    emit();
    scheduleSave(id);
  },
  remove(id: string) {
    exams = exams.filter((e) => e.id !== id);
    emit();
    api.exams.remove(id).catch(() => { /* optimistic */ });
  },
  duplicate(id: string) {
    const e = exams.find((x) => x.id === id);
    if (!e) return;
    const copy: StudioExam = { ...structuredClone(e), id: uid(), title: `${e.title} (copy)`, status: "draft", updatedAt: now() };
    exams = [copy, ...exams];
    emit();
    api.exams.create(toExamDto(copy)).catch(() => { /* optimistic */ });
  },
  setStatus(id: string, status: PubStatus) {
    store.update(id, { status });
  },
};

export const studioStore = store;

export interface StudioExamsState {
  exams: StudioExam[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Full state (list + loading/error) — used by the Studio home for proper loading UX. */
export function useStudioExamsState(): StudioExamsState {
  useEffect(() => {
    ensureLoaded();
  }, []);
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return { exams: snap.exams, loading: snap.loading, error: snap.error, reload: store.reload };
}

export function useStudioExams(): StudioExam[] {
  return useStudioExamsState().exams;
}

export function useStudioExam(id: string | undefined): StudioExam | undefined {
  const all = useStudioExams();
  return all.find((e) => e.id === id);
}
