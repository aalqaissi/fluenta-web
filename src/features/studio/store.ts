import { useSyncExternalStore } from "react";
import type { QuestionType } from "@/mock/types";

export type StudioSkill = "reading" | "writing" | "listening" | "speaking" | "full";
export type PubStatus = "draft" | "published";

export interface StudioQuestion {
  id: string;
  prompt: string;
  answer: string;
}
export interface StudioPassage {
  id: string;
  title: string;
  inputMode: "type" | "upload";
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

export interface WritingParts {
  academicT1: { imageName: string | null; chartType: ChartType; imageDescription: string; prompt: string };
  generalT1: { formality: Formality; prompt: string; bullets: string[] };
  task2: { prompt: string };
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
          academicT1: { imageName: null, chartType: "bar-chart", imageDescription: "", prompt: "" },
          generalT1: { formality: "formal", prompt: "", bullets: ["", "", ""] },
          task2: { prompt: "" },
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
  return { id: uid(), title: `Section ${n}`, audioName: null, imageName: null, questionType: "sentence-completion", questions: [] };
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

// ---- reactive module store -------------------------------------

let exams: StudioExam[] = seed();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function seed(): StudioExam[] {
  return [
    {
      id: "seed-r1", skill: "reading", title: "The History of Glass", module: "academic", status: "published", timeLimit: 20, updatedAt: "2026-09-02T10:00:00Z",
      passages: [{ id: uid(), title: "The History of Glass", inputMode: "type", text: "Glass is one of the most versatile substances on Earth…", imageName: null, questionType: "true-false-notgiven", questions: [{ id: uid(), prompt: "Glass has been made for thousands of years.", answer: "True" }] }],
    },
    {
      id: "seed-l1", skill: "listening", title: "Joining a Photography Club", module: "academic", status: "published", timeLimit: 30, updatedAt: "2026-09-02T11:00:00Z",
      sections: [{ id: uid(), title: "Section 1", audioName: "photography-club.mp3", imageName: null, questionType: "sentence-completion", questions: [{ id: uid(), prompt: "The club meets every __________.", answer: "Tuesday" }] }],
    },
    {
      id: "seed-w1", skill: "writing", title: "Writing Practice Sep 3, 2026", module: "both", status: "draft", timeLimit: 60, updatedAt: "2026-09-03T09:00:00Z",
      writing: { academicT1: { imageName: "internet-access.png", chartType: "line-graph", imageDescription: "Percentage of households with internet access in three countries, 2000–2020.", prompt: "The chart below shows…" }, generalT1: { formality: "formal", prompt: "", bullets: ["", "", ""] }, task2: { prompt: "Some people think…" } },
    },
    {
      id: "seed-s1", skill: "speaking", title: "Speaking Full Mock — Work & Study", module: "both", status: "published", timeLimit: 14, updatedAt: "2026-09-02T12:00:00Z",
      parts: [newSpeakingPart(1), newSpeakingPart(2), newSpeakingPart(3)],
    },
  ];
}

const store = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get() {
    return exams;
  },
  create(skill: StudioSkill) {
    const e = blankExam(skill);
    exams = [e, ...exams];
    emit();
    return e.id;
  },
  update(id: string, patch: Partial<StudioExam>) {
    exams = exams.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e));
    emit();
  },
  remove(id: string) {
    exams = exams.filter((e) => e.id !== id);
    emit();
  },
  duplicate(id: string) {
    const e = exams.find((x) => x.id === id);
    if (!e) return;
    exams = [{ ...structuredClone(e), id: uid(), title: `${e.title} (copy)`, status: "draft", updatedAt: now() }, ...exams];
    emit();
  },
  setStatus(id: string, status: PubStatus) {
    store.update(id, { status });
  },
};

export const studioStore = store;

export function useStudioExams(): StudioExam[] {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
export function useStudioExam(id: string | undefined): StudioExam | undefined {
  const all = useStudioExams();
  return all.find((e) => e.id === id);
}
