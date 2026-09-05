import type {
  Achievement,
  Certificate,
  CoachMessage,
  FluentaUser,
  Lesson,
  ListeningSection,
  Plan,
  QuestionType,
  RecentExam,
  SectionSummary,
  SpeakingFeedback,
  SpeakingPart,
  WritingResult,
  WritingTask,
} from "./types";

export const currentUser: FluentaUser = {
  id: "u1",
  name: "Sara Hamzeh",
  email: "sara.hamzeh@example.com",
  initials: "SH",
  plan: "pro",
  planLabel: "Pro Monthly",
  renewsInDays: 7,
  targetBand: 7,
  examDate: "2026-12-01",
  saveHistory: true,
  streak: {
    current: 4,
    best: 11,
    // 30 days of intensity 0..3
    last30: [0, 1, 0, 2, 1, 3, 2, 0, 0, 1, 2, 3, 3, 1, 0, 2, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 2, 3, 2, 3],
  },
};

export const sectionSummaries: SectionSummary[] = [
  { skill: "listening", band: null, tests: 0 },
  { skill: "reading", band: 6.5, tests: 3 },
  { skill: "writing", band: 5.5, tests: 1 },
  { skill: "speaking", band: null, tests: 0 },
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  "true-false-notgiven": "True / False / Not Given",
  "yes-no-notgiven": "Yes / No / Not Given",
  "multiple-choice": "Multiple Choice",
  "multi-select": "Multi-Select (Choose TWO/THREE)",
  "matching-information": "Matching Information",
  "matching-headings": "Matching Headings",
  "matching-features": "Matching Features",
  "matching-sentence-endings": "Matching Sentence Endings",
  "sentence-completion": "Sentence Completion",
  "summary-completion": "Summary Completion",
  "diagram-label": "Diagram Label Completion",
  "short-answer": "Short Answer",
};

export interface MockExamCard {
  id: string;
  title: string;
  scope: "global" | "user";
  part: 1 | 2 | 3;
  primaryType: QuestionType;
  attempts: number;
  ready: boolean;
  playableId?: string; // links to readingExam if playable
}

export const mockExams: MockExamCard[] = [
  { id: "m1", title: "The Origins of Coffee Culture", scope: "global", part: 1, primaryType: "true-false-notgiven", attempts: 0, ready: true, playableId: "read-languages" },
  { id: "m2", title: "The History of Cartography", scope: "global", part: 1, primaryType: "true-false-notgiven", attempts: 2, ready: true, playableId: "read-languages" },
  { id: "m3", title: "Renewable Energy Transitions", scope: "global", part: 2, primaryType: "matching-headings", attempts: 0, ready: true },
  { id: "m4", title: "The Science of Sleep", scope: "global", part: 2, primaryType: "summary-completion", attempts: 1, ready: true },
  { id: "m5", title: "Ancient Trade Routes", scope: "global", part: 3, primaryType: "matching-sentence-endings", attempts: 0, ready: true },
  { id: "m6", title: "Urban Beekeeping (my upload)", scope: "user", part: 1, primaryType: "multiple-choice", attempts: 0, ready: true },
];

export const recentExams: RecentExam[] = [
  { id: "r1", skill: "reading", title: "Reading Exam", status: "in-progress", isMock: true, date: "2026-09-02", sectionsDone: 0, sectionsTotal: 1 },
  { id: "r2", skill: "reading", title: "Reading Exam", status: "in-progress", isMock: true, date: "2026-09-02", sectionsDone: 0, sectionsTotal: 1 },
  { id: "r3", skill: "reading", title: "Reading Exam", status: "completed", isMock: false, date: "2026-09-01", sectionsDone: 1, sectionsTotal: 1, band: 6.5 },
  { id: "r4", skill: "writing", title: "Writing Task 2", status: "completed", isMock: false, date: "2026-08-30", sectionsDone: 1, sectionsTotal: 1, band: 5.5 },
];

// ---- Billing / plans --------------------------------------------

export const plans: Plan[] = [
  { id: "starter", name: "Starter Plan", price: "Free", cadence: "", detail: "Reading & Writing practice with limits." },
  { id: "trial", name: "7-Day Trial", badge: "NEW USERS", price: "$4.99", cadence: "today", detail: "$4.99 today, then $19.99/month after day 7.", highlight: true },
  { id: "monthly", name: "Monthly", badge: "STANDARD", price: "$19.99", cadence: "/month", detail: "$19.99 after a 3-day free trial, then $19.99/month." },
  { id: "sixmonth", name: "6-Month", badge: "BEST VALUE", price: "$49.99", cadence: "/6 months", detail: "$49.99 after a 3-day free trial." },
  { id: "yearly", name: "Yearly", badge: "SAVE 77%", price: "$54.99", cadence: "/year", detail: "Best price for committed learners." },
];

export const planIncludes = [
  "Full access to all features",
  "All 4 IELTS sections",
  "Unlimited AI grading & feedback",
  "Fluenta Coach conversations",
  "Mock exams & self-improvement tools",
];

// ---- Writing -----------------------------------------------------

export const writingTasks: WritingTask[] = [
  {
    id: "w-task1",
    taskNumber: 1,
    kind: "Report",
    module: "academic",
    visual: "line",
    prompt:
      "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    minWords: 150,
    durationSec: 20 * 60,
  },
  {
    id: "w-gt-task1",
    taskNumber: 1,
    kind: "Letter",
    module: "general",
    prompt:
      "You recently stayed at a hotel and were unhappy with the service. Write a letter to the hotel manager. In your letter:",
    bullets: [
      "explain why you were staying at the hotel",
      "describe the problems you experienced",
      "say what you would like the manager to do",
    ],
    minWords: 150,
    durationSec: 20 * 60,
  },
  {
    id: "w-task2",
    taskNumber: 2,
    kind: "Opinion Essay",
    module: "both",
    prompt:
      "More companies now place carbon-footprint labels on products so consumers can make environmentally informed choices. Do the advantages of carbon labelling outweigh the disadvantages?",
    minWords: 250,
    durationSec: 40 * 60,
  },
];

export const sampleWritingResult: WritingResult = {
  overall: 5.0,
  wordCount: 64,
  answer:
    "Nowadays, companies around the world are switching to a more eco-friendly labelling system to be applied to their products. This essay will explore how the benefits of this phenomenon outweighs its drawbacks by explaing that looking after the environment is essential and has more benefits compared to the only cons that is high cost. On the one hand. On the other hand. In conclusion.",
  criteria: [
    { key: "task", label: "Task Achievement", band: 5, summary: "The essay does not fully address both sides or reach a clear position within the word count." },
    { key: "coherence", label: "Coherence & Cohesion", band: 5, summary: "Paragraphing is signposted but bodies are empty; ideas are not developed." },
    { key: "lexical", label: "Lexical Resource", band: 5, summary: "Some good topic vocabulary, but repetition and a few word-choice slips." },
    { key: "grammar", label: "Grammatical Range & Accuracy", band: 4, summary: "Frequent errors in subject–verb agreement and spelling reduce clarity." },
  ],
  annotations: [
    { id: "a1", criterion: "task", quote: "This essay will explore how the benefits of this phenomenon outweighs its drawbacks", note: "State your own position clearly and make sure both advantages and disadvantages are actually discussed in the body paragraphs." },
    { id: "a2", criterion: "grammar", quote: "the benefits of this phenomenon outweighs", note: "Subject–verb agreement: “benefits … outweigh” (plural subject)." },
    { id: "a3", criterion: "lexical", quote: "explaing", note: "Spelling: “explaining”. Proofread for common spelling slips." },
    { id: "a4", criterion: "coherence", quote: "On the one hand. On the other hand. In conclusion.", note: "These are empty discourse markers — each needs a developed idea with an example." },
  ],
};

// ---- Listening ---------------------------------------------------

export const listeningSections: ListeningSection[] = [
  { id: "l1", number: 1, context: "A conversation about booking a community hall.", questionCount: 10, type: "sentence-completion" },
  { id: "l2", number: 2, context: "A monologue giving information about a museum tour.", questionCount: 10, type: "multiple-choice" },
  { id: "l3", number: 3, context: "A discussion between two students and a tutor.", questionCount: 10, type: "matching-features" },
  { id: "l4", number: 4, context: "A university lecture on marine biology.", questionCount: 10, type: "summary-completion" },
];

// ---- Speaking ----------------------------------------------------

export const speakingParts: SpeakingPart[] = [
  {
    id: "s1",
    number: 1,
    title: "Introduction & interview",
    durationSec: 5 * 60,
    questions: [
      "Let’s talk about your home town. Where is it and what is it like?",
      "Do you prefer to spend time indoors or outdoors? Why?",
      "How often do you read in English?",
    ],
  },
  {
    id: "s2",
    number: 2,
    title: "Individual long turn",
    durationSec: 4 * 60,
    cueCard: "Describe a skill you would like to learn.",
    bullets: ["what the skill is", "why you want to learn it", "how you would learn it", "and explain how it would help you"],
    questions: [],
  },
  {
    id: "s3",
    number: 3,
    title: "Two-way discussion",
    durationSec: 5 * 60,
    questions: [
      "Do you think schools should teach more practical skills? Why?",
      "How has technology changed the way people learn new skills?",
      "Is it ever too late to learn something new?",
    ],
  },
];

export const sampleSpeakingFeedback: SpeakingFeedback[] = [
  { key: "fluency", label: "Fluency & Coherence", band: 6, note: "Generally steady pace with occasional self-correction; use more linking phrases." },
  { key: "lexical", label: "Lexical Resource", band: 6, note: "Good range on familiar topics; stretch toward less common collocations." },
  { key: "grammar", label: "Grammatical Range", band: 5, note: "Simple structures are accurate; complex sentences need more control." },
  { key: "pronunciation", label: "Pronunciation", band: 6, note: "Clear and mostly intelligible; watch word stress on longer words." },
];

// ---- Coach -------------------------------------------------------

export const coachSuggestions = [
  "Why did I get band 5 in Task Achievement?",
  "Give me a 10-minute Reading drill for True/False/Not Given.",
  "How do I improve my Writing coherence?",
  "Explain the difference between skimming and scanning.",
];

export const initialCoachMessages: CoachMessage[] = [
  {
    id: "c0",
    role: "coach",
    text: "Hi Sara! I’m your Fluenta Coach. I’ve looked at your latest Reading and Writing results — want to start with the Grammar feedback from your Task 2, or a quick Reading warm-up?",
    createdAt: "2026-09-02T09:00:00Z",
  },
];

// ---- Lessons -----------------------------------------------------

export const lessons: Lesson[] = [
  { id: "le1", title: "True/False/Not Given, decoded", skill: "reading", level: "Foundation", minutes: 8, kind: "Video", summary: "Stop losing marks on ‘Not Given’ — a reliable 4-step method.", progress: 100 },
  { id: "le2", title: "Task 2: building a clear position", skill: "writing", level: "Intermediate", minutes: 12, kind: "Article", summary: "Turn a prompt into a thesis and a plan in under three minutes.", progress: 40 },
  { id: "le3", title: "Skimming vs scanning", skill: "reading", level: "Foundation", minutes: 6, kind: "Video", summary: "Read faster without losing comprehension.", progress: 0 },
  { id: "le4", title: "Linking words that actually help", skill: "writing", level: "Intermediate", minutes: 9, kind: "Drill", summary: "Cohesion beyond ‘firstly, secondly, finally’.", progress: 0 },
  { id: "le5", title: "Listening: predicting answers", skill: "listening", level: "Intermediate", minutes: 10, kind: "Video", summary: "Use the questions to anticipate what you’ll hear.", progress: 0 },
  { id: "le6", title: "Speaking Part 2: the cue card", skill: "speaking", level: "Intermediate", minutes: 11, kind: "Video", summary: "Structure a 2-minute long turn with confidence.", progress: 20 },
  { id: "le7", title: "Paraphrasing under pressure", skill: "general", level: "Advanced", minutes: 14, kind: "Article", summary: "The core skill behind every band-7+ answer.", progress: 0 },
  { id: "le8", title: "Matching Headings without panic", skill: "reading", level: "Advanced", minutes: 9, kind: "Drill", summary: "A paragraph-mapping routine that saves time.", progress: 0 },
];

// ---- Achievements ------------------------------------------------

export const achievements: Achievement[] = [
  { id: "ac1", title: "First Steps", description: "Complete your first practice section.", icon: "Footprints", earned: true, earnedOn: "2026-08-28" },
  { id: "ac2", title: "Warm-Up Streak", description: "Practice 3 days in a row.", icon: "Flame", earned: true, earnedOn: "2026-08-31" },
  { id: "ac3", title: "Reading Rookie", description: "Finish 3 Reading exams.", icon: "BookOpen", earned: true, earnedOn: "2026-09-01" },
  { id: "ac4", title: "Feedback Fan", description: "Read your AI feedback in full 5 times.", icon: "MessageSquareHeart", earned: false, progress: 60 },
  { id: "ac5", title: "Band Climber", description: "Improve any section by 0.5.", icon: "TrendingUp", earned: false, progress: 30 },
  { id: "ac6", title: "All-Rounder", description: "Attempt all four skills.", icon: "Sparkles", earned: false, progress: 50 },
  { id: "ac7", title: "Marathoner", description: "Complete a full mock exam.", icon: "Medal", earned: false, progress: 0 },
  { id: "ac8", title: "Coach’s Favourite", description: "Have 10 coaching conversations.", icon: "Bot", earned: false, progress: 10 },
];

// ---- Certificates ------------------------------------------------

export const certificates: Certificate[] = [
  { id: "cert1", title: "Full Practice Test — Academic", band: 6.5, issuedOn: "2026-09-01", skill: "overall", module: "academic", scores: { listening: 6.5, reading: 6.5, writing: 6.0, speaking: 6.5 }, cefr: "B2" },
  { id: "cert2", title: "Foundation Reading Course", band: 6, issuedOn: "2026-08-25", skill: "reading", module: "academic", scores: { listening: 6.0, reading: 6.5, writing: 5.5, speaking: 6.0 }, cefr: "B2" },
];
