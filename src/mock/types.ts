// ============================================================
// Fluenta mock domain types (frontend-only, no backend)
// ============================================================

export type SkillKey = "reading" | "writing" | "listening" | "speaking";
export type PlanTier = "free" | "pro";

export interface FluentaUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  plan: PlanTier;
  planLabel: string; // "Pro Monthly" | "Pro Trial" | "Free"
  renewsInDays: number;
  targetBand: number;
  examDate: string | null; // ISO date
  saveHistory: boolean;
  streak: { current: number; best: number; last30: number[] }; // last30: 0..3 intensity
}

export type ExamStatus = "not-started" | "in-progress" | "completed";

export interface SectionSummary {
  skill: SkillKey;
  band: number | null;
  tests: number;
}

// ---- Questions ---------------------------------------------------

export type QuestionType =
  | "true-false-notgiven"
  | "yes-no-notgiven"
  | "multiple-choice"
  | "matching-information"
  | "matching-headings"
  | "matching-features"
  | "matching-sentence-endings"
  | "sentence-completion"
  | "summary-completion"
  | "diagram-label"
  | "short-answer";

export interface QuestionOption {
  key: string; // "A", "True", ...
  text: string;
}

export interface Question {
  id: string;
  number: number;
  prompt: string; // the statement / stem / sentence-start
  correct: string; // used only by mock scorer
  wordLimit?: string; // completion / short-answer hint
}

export interface QuestionGroup {
  id: string;
  type: QuestionType;
  rangeLabel: string; // "Questions 1–6"
  instructions: string;
  /** shared choices for choice/matching types (e.g. the A–I box) */
  sharedOptions?: QuestionOption[];
  questions: Question[];
}

export interface Passage {
  id: string;
  title: string;
  headline: string; // the passage's own heading
  label: string; // "Academic"
  passageNumber: number;
  totalPassages: number;
  paragraphs: string[];
  groups: QuestionGroup[];
}

export interface ReadingExam {
  id: string;
  title: string;
  scope: "global" | "user";
  passages: Passage[];
  durationSec: number;
  questionTypes: QuestionType[];
  attempts: number;
}

// ---- Writing -----------------------------------------------------

export type WritingVisual = "bar" | "line" | "pie" | "process" | "map" | "table" | null;

export interface WritingTask {
  id: string;
  taskNumber: 1 | 2;
  kind: string; // "Opinion Essay", "Report", "Letter"
  module: "academic" | "general" | "both";
  prompt: string;
  minWords: number;
  durationSec: number;
  /** Academic Task 1 visual prompt (rendered as an uploaded image stand-in) */
  visual?: WritingVisual;
  /** bullet points for GT letters */
  bullets?: string[];
}

export type WritingCriterionKey = "task" | "coherence" | "lexical" | "grammar";

export interface WritingCriterion {
  key: WritingCriterionKey;
  label: string;
  band: number;
  summary: string;
}

export interface WritingAnnotation {
  id: string;
  criterion: WritingCriterionKey;
  quote: string;
  note: string;
}

export interface WritingResult {
  overall: number;
  wordCount: number;
  criteria: WritingCriterion[];
  answer: string;
  annotations: WritingAnnotation[];
}

// ---- Listening / Speaking ---------------------------------------

export interface ListeningSection {
  id: string;
  number: number;
  context: string;
  questionCount: number;
  type: QuestionType;
}

/** Runtime listening exam consumed by the student runner (mirrors ReadingExam). */
export interface ListeningSectionRun {
  id: string;
  number: number;
  context: string;
  difficulty: "Easy" | "Medium" | "Hard";
  /** length of the (simulated) section audio in seconds */
  audioDurationSec: number;
  transcript?: string;
  group: QuestionGroup;
}

export interface ListeningExam {
  id: string;
  title: string;
  scope: "global" | "user";
  durationSec: number;
  sections: ListeningSectionRun[];
  attempts: number;
}

export interface SpeakingPart {
  id: string;
  number: 1 | 2 | 3;
  title: string;
  durationSec: number;
  cueCard?: string;
  bullets?: string[];
  questions: string[];
}

export interface SpeakingFeedback {
  key: "fluency" | "lexical" | "grammar" | "pronunciation";
  label: string;
  band: number;
  note: string;
}

/** Runtime speaking exam consumed by the student runner. */
export interface SpeakingExam {
  id: string;
  title: string;
  scope: "global" | "user";
  parts: SpeakingPart[];
  attempts: number;
}

// ---- Plans / billing --------------------------------------------

export interface Plan {
  id: string;
  name: string;
  badge?: string;
  price: string;
  cadence: string;
  detail: string;
  highlight?: boolean;
}

// ---- Coach -------------------------------------------------------

export interface CoachMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  createdAt: string;
}

// ---- Lessons / library ------------------------------------------

export interface Lesson {
  id: string;
  title: string;
  skill: SkillKey | "general";
  level: "Foundation" | "Intermediate" | "Advanced";
  minutes: number;
  kind: "Video" | "Article" | "Drill";
  summary: string;
  progress: number; // 0..100
}

// ---- Achievements / certificates --------------------------------

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  earned: boolean;
  progress?: number; // 0..100 when locked
  earnedOn?: string;
}

export interface Certificate {
  id: string;
  title: string;
  band: number; // overall
  issuedOn: string;
  skill: SkillKey | "overall";
  module: "academic" | "general";
  scores: { listening: number; reading: number; writing: number; speaking: number };
  cefr: string;
}

// ---- Recent exams (progress) ------------------------------------

export interface RecentExam {
  id: string;
  skill: SkillKey;
  title: string;
  status: ExamStatus;
  isMock: boolean;
  date: string; // ISO
  sectionsDone: number;
  sectionsTotal: number;
  band?: number;
}

// ---- Feedback ----------------------------------------------------

export type FeedbackType = "Suggestion" | "Bug" | "Praise" | "Question";
