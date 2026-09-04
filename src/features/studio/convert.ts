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
} from "@/mock/types";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { StudioExam } from "./store";

const TFNG: QuestionOption[] = [
  { key: "True", text: "True" },
  { key: "False", text: "False" },
  { key: "Not Given", text: "Not Given" },
];
const YNNG: QuestionOption[] = [
  { key: "Yes", text: "Yes" },
  { key: "No", text: "No" },
  { key: "Not Given", text: "Not Given" },
];

/**
 * Convert an admin-authored Studio reading exam into the shape the student
 * runner consumes. Choice types (TF/NG, YN/NG) keep their pills; other types
 * (which the quick editor captures as prompt+answer only) render as short-answer
 * text inputs so the authored content is still fully playable & scorable.
 */
export function studioReadingToExam(e: StudioExam): ReadingExam {
  const passages = e.passages ?? [];
  let counter = 1;
  const converted: Passage[] = passages.map((p, pi) => {
    const isChoice = p.questionType === "true-false-notgiven" || p.questionType === "yes-no-notgiven";
    const renderType: QuestionType = isChoice ? p.questionType : "short-answer";
    const shared =
      p.questionType === "true-false-notgiven" ? TFNG : p.questionType === "yes-no-notgiven" ? YNNG : undefined;

    const questions: Question[] = p.questions.map((q) => ({
      id: q.id,
      number: counter++,
      prompt: q.prompt,
      correct: q.answer,
      wordLimit: isChoice ? undefined : "Type your answer",
    }));

    const group: QuestionGroup = {
      id: p.id + "-g",
      type: renderType,
      rangeLabel: `Questions (${QUESTION_TYPE_LABEL[p.questionType]})`,
      instructions: isChoice
        ? "Do the following statements agree with the passage? Choose the correct option."
        : `Answer the questions below (${QUESTION_TYPE_LABEL[p.questionType]}).`,
      sharedOptions: shared,
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
    const isChoice = s.questionType === "true-false-notgiven" || s.questionType === "yes-no-notgiven";
    const renderType: QuestionType = isChoice ? s.questionType : "short-answer";
    const shared =
      s.questionType === "true-false-notgiven" ? TFNG : s.questionType === "yes-no-notgiven" ? YNNG : undefined;

    const questions: Question[] = s.questions.map((q) => ({
      id: q.id,
      number: counter++,
      prompt: q.prompt,
      correct: q.answer,
      wordLimit: isChoice ? undefined : "Type your answer",
    }));

    const group: QuestionGroup = {
      id: s.id + "-g",
      type: renderType,
      rangeLabel: `Questions (${QUESTION_TYPE_LABEL[s.questionType]})`,
      instructions: isChoice
        ? "Do the following statements agree with the recording? Choose the correct option."
        : `Answer the questions below (${QUESTION_TYPE_LABEL[s.questionType]}).`,
      sharedOptions: shared,
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
