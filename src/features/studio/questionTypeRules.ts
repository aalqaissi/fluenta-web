// What each IELTS question type tests and how it is built — after the official IELTS task-type
// descriptions and the owner spec (TFNG vs YNNG). Shown to admins in the Studio; the backend mirror
// (service/studio/QuestionTypeRules.java) feeds the same rules to the AI item writer.
import type { QuestionType } from "@/mock/types";

export interface TypeRule {
  /** the skill the type assesses */
  aim: string;
  /** how items are built, in one line */
  format: string;
  /** questions follow the order of the information in the text */
  textOrder: boolean;
}

export const QUESTION_TYPE_RULES: Partial<Record<QuestionType, TypeRule>> = {
  "multiple-choice": {
    aim: "Detailed understanding of specific points, or the overall main points.",
    format: "4 options (A–D), one correct; distractors plausible but wrong.",
    textOrder: true,
  },
  "multi-select": {
    aim: "Detailed understanding of specific points, or the overall main points.",
    format: "Choose TWO from 5 (A–E) or THREE from 7 (A–G); one mark per correct letter.",
    textOrder: true,
  },
  "true-false-notgiven": {
    aim: "Recognising points of FACTUAL information in the text.",
    format: "TRUE agrees · FALSE contradicts · NOT GIVEN: the text neither confirms nor contradicts.",
    textOrder: true,
  },
  "yes-no-notgiven": {
    aim: "Recognising the WRITER'S views, opinions or claims (argumentative texts).",
    format: "YES agrees with the writer · NO contradicts · NOT GIVEN: the writer's view can't be established.",
    textOrder: true,
  },
  "matching-information": {
    aim: "Scanning for specific information: a detail, example, reason, description, comparison or explanation.",
    format: "Match each statement to a lettered paragraph; letters may repeat; not every paragraph is used.",
    textOrder: false,
  },
  "matching-headings": {
    aim: "Recognising the main idea of each paragraph and telling it from supporting detail.",
    format: "Headings numbered i, ii, iii…; more headings than paragraphs; each heading used once.",
    textOrder: false,
  },
  "matching-features": {
    aim: "Recognising relationships between facts in the text, and opinions or theories.",
    format: "Match statements to a lettered list (people, places, dates…); letters may repeat or go unused.",
    textOrder: false,
  },
  "matching-sentence-endings": {
    aim: "Understanding the main ideas within a sentence.",
    format: "Sentence beginnings + a list of endings; more endings than questions; each ending used once.",
    textOrder: true,
  },
  "sentence-completion": {
    aim: "Locating detail and specific information.",
    format: "Words copied unchanged from the text, within the word limit.",
    textOrder: true,
  },
  "summary-completion": {
    aim: "Understanding details and/or main ideas of one part of the text.",
    format: "A summary with gaps, filled by words from the text within the word limit.",
    textOrder: false,
  },
  "note-completion": {
    aim: "Understanding details and/or main ideas of one part of the text.",
    format: "Notes with gaps, filled by words from the text within the word limit.",
    textOrder: false,
  },
  "table-completion": {
    aim: "Understanding details and/or main ideas of one part of the text.",
    format: "A table with gaps, filled by words from the text within the word limit.",
    textOrder: false,
  },
  "flow-chart-completion": {
    aim: "Understanding a process or sequence described in the text.",
    format: "Flow-chart stages filled by words from the text within the word limit.",
    textOrder: false,
  },
  "form-completion": {
    aim: "Recording specific factual details (Listening).",
    format: "Form fields filled by words or numbers heard, within the word limit.",
    textOrder: true,
  },
  "diagram-label": {
    aim: "Relating a detailed description in the text to a diagram.",
    format: "Labels filled by words from the text within the word limit.",
    textOrder: false,
  },
  "short-answer": {
    aim: "Locating and understanding precise factual information.",
    format: "Words or numbers copied from the text, within the word limit.",
    textOrder: true,
  },
};

/** "Tests: …  ·  Format …  ·  Questions follow the text order." — or "" for an unknown type. */
export function typeRuleLine(type: QuestionType): string {
  const r = QUESTION_TYPE_RULES[type];
  if (!r) return "";
  return `${r.aim} ${r.format} ${r.textOrder ? "Questions follow the order of the text." : "Questions need not follow the text order."}`;
}
