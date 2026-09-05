import type {
  ReadingExam,
  Passage,
  QuestionGroup,
  Question,
  QuestionOption,
  QuestionType,
  ListeningExam,
  ListeningSectionRun,
  SpeakingExam,
  SpeakingPart,
  WritingTask,
  WritingVisual,
} from "@/mock/types";
import { QUESTION_TYPE_LABEL, writingTasks } from "@/mock/data";
import { studioStore, type StudioExam, type ChartType, type Formality } from "./store";

/**
 * Convert an admin-authored Studio reading exam into the shape the student
 * runner consumes. Choice types (TF/NG, YN/NG) keep their pills; other types
 * (which the quick editor captures as prompt+answer only) render as short-answer
 * text inputs so the authored content is still fully playable & scorable.
 */
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const TEXT_TYPES = new Set(["sentence-completion", "summary-completion", "short-answer", "diagram-label"]);

function readingInstructions(type: QuestionType): string {
  switch (type) {
    case "true-false-notgiven":
      return "Do the following statements agree with the information in the passage? Choose True, False or Not Given.";
    case "yes-no-notgiven":
      return "Do the following statements agree with the writer's views? Choose Yes, No or Not Given.";
    case "multiple-choice":
      return "Choose the correct letter for each question.";
    case "multi-select":
      return "Choose TWO (or THREE) correct letters for each question.";
    case "sentence-completion":
    case "summary-completion":
    case "diagram-label":
      return "Complete each sentence. Write no more than the stated number of words.";
    case "short-answer":
      return "Answer the questions. Write no more than the stated number of words.";
    default:
      return `Answer the questions below (${QUESTION_TYPE_LABEL[type]}).`;
  }
}

export function studioReadingToExam(e: StudioExam): ReadingExam {
  const passages = e.passages ?? [];
  let counter = 1;
  const converted: Passage[] = passages.map((p, pi) => {
    const questions: Question[] = p.questions.map((q) => {
      const qType: QuestionType = q.type ?? p.questionType;
      const isList = qType === "multiple-choice" || qType === "multi-select";
      const options: QuestionOption[] | undefined = isList
        ? (q.options ?? []).map((t, i) => ({ key: LETTERS[i], text: t || `Option ${LETTERS[i]}` }))
        : undefined;
      const wordLimit = TEXT_TYPES.has(qType) && q.wordLimit ? `Max ${q.wordLimit} word${q.wordLimit === 1 ? "" : "s"}` : undefined;
      return { id: q.id, number: counter++, prompt: q.prompt, correct: q.answer, type: qType, options, wordLimit };
    });

    const group: QuestionGroup = {
      id: p.id + "-g",
      type: p.questionType,
      rangeLabel: `Questions (${QUESTION_TYPE_LABEL[p.questionType]})`,
      instructions: readingInstructions(p.questionType),
      questions,
    };

    return {
      id: p.id,
      title: `Passage ${pi + 1}`,
      headline: p.title || `Passage ${pi + 1}`,
      label: e.module === "general" ? "General Training" : "Academic",
      passageNumber: pi + 1,
      totalPassages: passages.length,
      paragraphs: (p.text || "This passage was authored in the Content Studio.").split(/\n{2,}/).filter(Boolean),
      groups: [group],
    };
  });

  return {
    id: e.id,
    title: e.title,
    scope: "user",
    passages: converted.length ? converted : [],
    durationSec: (e.timeLimit || 60) * 60,
    questionTypes: Array.from(new Set(passages.map((p) => p.questionType))),
    attempts: 0,
  };
}

/**
 * Convert an admin-authored Studio listening exam into the runner shape.
 * Follows the same rule as reading: choice types keep their pills, everything
 * else the quick editor captures (prompt+answer) renders as short-answer.
 */
export function studioListeningToExam(e: StudioExam): ListeningExam {
  const secs = e.sections ?? [];
  let counter = 1;
  const sections: ListeningSectionRun[] = secs.map((s, si) => {
    const questions: Question[] = s.questions.map((q) => {
      const qType: QuestionType = q.type ?? s.questionType;
      const isList = qType === "multiple-choice" || qType === "multi-select";
      const options: QuestionOption[] | undefined = isList
        ? (q.options ?? []).map((t, i) => ({ key: LETTERS[i], text: t || `Option ${LETTERS[i]}` }))
        : undefined;
      const wordLimit = TEXT_TYPES.has(qType) && q.wordLimit ? `Max ${q.wordLimit} word${q.wordLimit === 1 ? "" : "s"}` : undefined;
      return { id: q.id, number: counter++, prompt: q.prompt, correct: q.answer, type: qType, options, wordLimit };
    });

    const group: QuestionGroup = {
      id: s.id + "-g",
      type: s.questionType,
      rangeLabel: `Questions (${QUESTION_TYPE_LABEL[s.questionType]})`,
      instructions: readingInstructions(s.questionType),
      questions,
    };

    return {
      id: s.id,
      number: si + 1,
      context: s.title || `Section ${si + 1}`,
      difficulty: "Medium",
      audioDurationSec: 60,
      group,
    };
  });

  return {
    id: e.id,
    title: e.title,
    scope: "user",
    durationSec: (e.timeLimit || 30) * 60,
    sections,
    attempts: 0,
  };
}

const PART_SECONDS: Record<number, number> = { 1: 5 * 60, 2: 4 * 60, 3: 5 * 60 };

/** Convert an admin-authored Studio speaking exam into the runner shape. */
export function studioSpeakingToExam(e: StudioExam): SpeakingExam {
  const parts: SpeakingPart[] = (e.parts ?? []).map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    durationSec: PART_SECONDS[p.number] ?? 5 * 60,
    cueCard: p.number === 2 ? p.cueCard || p.topic || undefined : undefined,
    questions: p.number === 2 ? [] : p.questions.map((q) => q.text).filter(Boolean),
  }));

  return {
    id: e.id,
    title: e.title,
    scope: "user",
    parts,
    attempts: 0,
  };
}

// ---- writing -----------------------------------------------------

const CHART_VISUAL: Record<ChartType, WritingVisual> = {
  "bar-chart": "bar",
  "line-graph": "line",
  "pie-chart": "pie",
  "process-diagram": "process",
  "maps": "map",
  "table": "table",
  "diagram": "process",
  "multiple-graph": "line",
};
const FORMALITY_KIND: Record<Formality, string> = {
  formal: "Formal letter",
  informal: "Informal letter",
  "semi-formal": "Semi-formal letter",
};

/**
 * Convert an admin-authored Studio writing exam into the per-task shape the
 * student runner consumes. One exam yields up to three tasks (Academic Task 1,
 * General Task 1, Task 2); the hub filters by the student's chosen module.
 * Task ids are derived from the exam id so the runner can resolve them back.
 * The Academic "image description" stays out of the student view (it is a
 * grading aid); the chart type drives the visual prompt instead.
 */
export function studioWritingToExam(e: StudioExam): WritingTask[] {
  const w = e.writing;
  if (!w) return [];
  const a = w.academicT1;
  const g = w.generalT1;
  const t2 = w.task2;
  return [
    {
      id: `${e.id}~t1a`,
      taskNumber: 1,
      kind: "Report",
      module: "academic",
      prompt: a.prompt || "Summarise the information shown in the chart.",
      minWords: a.minWords || 150,
      durationSec: (a.timeMinutes || 20) * 60,
      visual: CHART_VISUAL[a.chartType],
    },
    {
      id: `${e.id}~t1g`,
      taskNumber: 1,
      kind: FORMALITY_KIND[g.formality],
      module: "general",
      prompt: g.prompt || "Write a letter as described.",
      minWords: g.minWords || 150,
      durationSec: (g.timeMinutes || 20) * 60,
    },
    {
      id: `${e.id}~t2`,
      taskNumber: 2,
      kind: "Opinion Essay",
      module: "both",
      prompt: t2.prompt || "Discuss the topic and give your own opinion.",
      minWords: t2.minWords || 250,
      durationSec: (t2.timeMinutes || 40) * 60,
    },
  ];
}

/** Resolve a writing-runner route id against studio-authored tasks, then seed. */
export function resolveWritingTask(id: string | undefined): WritingTask {
  const seed = writingTasks.find((t) => t.id === id);
  if (seed) return seed;
  if (id) {
    for (const e of studioStore.get()) {
      if (e.skill !== "writing") continue;
      const t = studioWritingToExam(e).find((t) => t.id === id);
      if (t) return t;
    }
  }
  return writingTasks[0];
}
