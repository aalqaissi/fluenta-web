import type { QuestionType, QuestionGroup } from "./types";
import { readingExam } from "./passages";

export interface Strategy {
  intro: string; // short strategy summary (stands in for a video/lesson)
  videoLength: string; // e.g. "4 min"
  tips: string[];
}

export const STRATEGIES: Record<QuestionType, Strategy> = {
  "true-false-notgiven": {
    intro: "Decide whether each statement agrees with (True), contradicts (False), or is absent from (Not Given) the passage. The trap is choosing False when the text simply doesn't mention it.",
    videoLength: "4 min",
    tips: [
      "Read the statement first, then scan for the matching lines.",
      "Ask: does the text confirm, contradict, or stay silent? Silent = Not Given.",
      "Don't use outside knowledge — only what the passage states.",
      "Watch qualifiers like 'all', 'only', 'always' — they often flip True to False.",
    ],
  },
  "yes-no-notgiven": {
    intro: "Same method as True/False/Not Given, but you're judging the writer's opinions/claims rather than facts.",
    videoLength: "4 min",
    tips: [
      "Look for opinion language: 'the writer believes/argues/suggests'.",
      "Yes = matches the writer's view; No = contradicts it; Not Given = the view isn't expressed.",
      "Beware statements that are true in reality but not claimed by the writer.",
      "Track each claim to a specific sentence before answering.",
    ],
  },
  "multiple-choice": {
    intro: "Pick the option that best matches the passage. Distractors often use words from the text but change the meaning.",
    videoLength: "5 min",
    tips: [
      "Read the stem, predict an answer, then match it to an option.",
      "Eliminate options that are partly true or use absolute language.",
      "Find the exact lines that justify your choice.",
      "Beware 'word-match' traps — same words, different meaning.",
    ],
  },
  "matching-information": {
    intro: "Find which paragraph contains a specific piece of information. Information can appear in any order.",
    videoLength: "5 min",
    tips: [
      "Scan for specific detail (names, numbers, examples), not the main idea.",
      "A paragraph can be used more than once unless told otherwise.",
      "Do the easy, obvious ones first, then narrow the rest.",
      "Underline keywords in the statement before you scan.",
    ],
  },
  "matching-headings": {
    intro: "Match a heading to each paragraph. Headings describe the main idea, not a small detail.",
    videoLength: "6 min",
    tips: [
      "Read the paragraph's first and last sentences for the main idea.",
      "Summarise each paragraph in 3–4 words, then find the closest heading.",
      "Cross out headings as you use them.",
      "Don't be fooled by a heading that matches only one detail.",
    ],
  },
  "matching-features": {
    intro: "Match statements to a list of features (people, categories, dates). Some options may be used more than once.",
    videoLength: "4 min",
    tips: [
      "Scan for the feature names (e.g. researchers) and mark where each appears.",
      "Read around each name to see what is claimed about it.",
      "Some features are used more than once — don't assume one-to-one.",
      "Do the certain matches first to reduce the options.",
    ],
  },
  "matching-sentence-endings": {
    intro: "Complete each sentence-start with the correct ending from a box. Answers must be grammatically and logically correct.",
    videoLength: "4 min",
    tips: [
      "Read the sentence-start and predict the meaning of the ending.",
      "Check grammar — the ending must fit the sentence structure.",
      "Locate the relevant part of the passage to confirm.",
      "There are more endings than questions — some are distractors.",
    ],
  },
  "sentence-completion": {
    intro: "Fill gaps using words from the passage, respecting the word limit.",
    videoLength: "3 min",
    tips: [
      "Note the word limit (e.g. NO MORE THAN TWO WORDS).",
      "Predict the type of word needed (noun, verb, number).",
      "Copy the exact word(s) from the passage — check spelling.",
      "Make sure the completed sentence is grammatical.",
    ],
  },
  "summary-completion": {
    intro: "Complete a summary of part of the passage using words from the text (or a box).",
    videoLength: "4 min",
    tips: [
      "Read the whole summary first for the overall meaning.",
      "Find the matching section of the passage — it's usually in order.",
      "Respect the word limit and copy exactly.",
      "Check the word fits grammatically in the gap.",
    ],
  },
  "diagram-label": {
    intro: "Label a diagram, map or process using words from the passage.",
    videoLength: "3 min",
    tips: [
      "Orient yourself on the diagram before reading.",
      "Follow the description in the order it's given.",
      "Use the exact labels/words from the text.",
      "Mind the word limit for each label.",
    ],
  },
  "short-answer": {
    intro: "Answer questions with short phrases taken from the passage, within the word limit.",
    videoLength: "3 min",
    tips: [
      "Underline the question word (what, where, how many).",
      "Scan for the specific answer, don't read every line.",
      "Keep answers within the word limit.",
      "Copy exactly from the passage.",
    ],
  },
};

/** Build a practice set (list of groups) for a reading question type from the bank. */
export function getReadingPracticeGroups(type: QuestionType): QuestionGroup[] {
  return readingExam.passages.flatMap((p) => p.groups).filter((g) => g.type === type);
}

export function countQuestions(groups: QuestionGroup[]): number {
  return groups.reduce((n, g) => n + g.questions.length, 0);
}
