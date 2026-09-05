// Export the frontend's built-in mock content into backend seed JSON.
//
// This bundles the pure-data mock modules with esbuild (they only `import type`, so nothing
// runtime is pulled in), reads their exports, and writes backend/src/main/resources/seed/*.json.
// Run: `npm run seed:export` (see package.json). Re-run whenever the built-in content changes.

import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const srcDir = path.join(root, "src");
const seedDir = path.join(root, "backend", "src", "main", "resources", "seed");

const entry = `
  export { readingExam } from "@/mock/passages";
  export { listeningExam } from "@/mock/listening";
  export {
    currentUser, speakingParts, writingTasks, lessons, achievements,
    plans, planIncludes, sectionSummaries, recentExams, certificates,
  } from "@/mock/data";
`;

async function loadMocks() {
  const out = await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "seed-entry.js", loader: "js" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    alias: { "@": srcDir },
  });
  const tmp = path.join(os.tmpdir(), `fluenta-seed-${Date.now()}.mjs`);
  await writeFile(tmp, out.outputFiles[0].text, "utf8");
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    await rm(tmp, { force: true });
  }
}

// The 4 Studio seed exams (fixed ids for deterministic scoring/testing). Content holds only the
// nested authoring payload; top-level fields map to exam columns.
function studioSeeds() {
  return [
    {
      id: "seed-r1", skill: "reading", title: "The History of Glass", module: "academic",
      status: "published", scope: "global", timeLimit: 20, format: "studio",
      content: {
        passages: [{
          id: "sr1-p1", title: "The History of Glass", inputMode: "type",
          text: "Glass is one of the most versatile substances on Earth, used for a wide variety of purposes.\n\nThe first man-made glass dates back to around 3500 BC, with fragments found in Egypt and eastern Mesopotamia.",
          imageName: null, questionType: "true-false-notgiven",
          questions: [
            { id: "sr1-q1", prompt: "Glass has been made for thousands of years.", answer: "TRUE" },
            { id: "sr1-q2", prompt: "The earliest glass was manufactured in Europe.", answer: "FALSE" },
            { id: "sr1-q3", prompt: "Glass is the most widely used material on Earth.", answer: "NOT GIVEN" },
          ],
        }],
      },
    },
    {
      id: "seed-l1", skill: "listening", title: "Joining a Photography Club", module: "academic",
      status: "published", scope: "global", timeLimit: 30, format: "studio",
      content: {
        sections: [{
          id: "sl1-s1", title: "Section 1", audioName: "photography-club.mp3", imageName: null,
          transcript: "", questionType: "sentence-completion",
          questions: [
            { id: "sl1-q1", prompt: "The club meets every __________.", answer: "Tuesday", wordLimit: 1 },
            { id: "sl1-q2", prompt: "Membership costs £__________ per year.", answer: "40", wordLimit: 1 },
          ],
        }],
      },
    },
    {
      id: "seed-w1", skill: "writing", title: "Writing Practice Sep 3, 2026", module: "both",
      status: "draft", scope: "global", timeLimit: 60, format: "studio",
      content: {
        writing: {
          academicT1: { imageName: "internet-access.png", chartType: "line-graph", imageDescription: "Percentage of households with internet access in three countries, 2000–2020.", prompt: "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020.", minWords: 150, timeMinutes: 20, idealAnswer: "" },
          generalT1: { imageName: null, formality: "formal", prompt: "", minWords: 150, timeMinutes: 20, idealAnswer: "" },
          task2: { imageName: null, prompt: "Some people think technology has made our lives too complex. To what extent do you agree or disagree?", minWords: 250, timeMinutes: 40, idealAnswer: "" },
        },
      },
    },
    {
      id: "seed-s1", skill: "speaking", title: "Speaking Full Mock — Work & Study", module: "both",
      status: "published", scope: "global", timeLimit: 14, format: "studio",
      content: {
        parts: [
          { id: "ss1-p1", number: 1, title: "Introduction & interview", cueCard: "", topic: "Work & study",
            questions: [{ id: "ss1-q1", text: "Do you work or are you a student?", audioName: null },
                        { id: "ss1-q2", text: "What do you enjoy most about it?", audioName: null }] },
          { id: "ss1-p2", number: 2, title: "Individual long turn", cueCard: "Describe a skill you would like to learn.", topic: "Skills", questions: [] },
          { id: "ss1-p3", number: 3, title: "Two-way discussion", cueCard: "", topic: "Learning",
            questions: [{ id: "ss1-q3", text: "How has the way people learn changed?", audioName: null }] },
        ],
      },
    },
  ];
}

// ---- Overview / analytics seed (6 skills, progress-over-time, recent activity) ----
const OVERVIEW_SKILLS = [
  { key: "listening", band: 6.5, tests: 8 },
  { key: "reading", band: 6.0, tests: 9 },
  { key: "writing", band: 5.5, tests: 5 },
  { key: "speaking", band: 6.0, tests: 4 },
  { key: "vocabulary", band: 6.5, tests: 6 },
  { key: "grammar", band: 5.5, tests: 5 },
];

// Build a rising per-skill + overall series over `points` dates ending today-ish.
function buildSeries(skills, points = 8) {
  const dates = [];
  const start = new Date("2026-08-18T00:00:00Z");
  for (let i = 0; i < points; i++) {
    const d = new Date(start.getTime() + i * 3 * 24 * 3600 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  const series = {};
  for (const s of skills) {
    const startBand = Math.max(3.5, s.band - 2);
    series[s.key] = dates.map((date, i) => ({
      date,
      band: Math.round((startBand + ((s.band - startBand) * i) / (points - 1)) * 2) / 2,
    }));
  }
  series.overall = dates.map((date, i) => {
    const avg = skills.reduce((sum, s) => sum + series[s.key][i].band, 0) / skills.length;
    return { date, band: Math.round(avg * 2) / 2 };
  });
  return series;
}

function overviewSeed() {
  return {
    skills: OVERVIEW_SKILLS,
    testsCompleted: OVERVIEW_SKILLS.reduce((n, s) => n + s.tests, 0),
    series: buildSeries(OVERVIEW_SKILLS),
    recentActivity: [
      { id: "ra1", type: "completed", skill: "reading", title: "Completed Reading Practice", date: "2026-09-04", band: 6.0 },
      { id: "ra2", type: "submitted", skill: "writing", title: "Submitted Writing Task", date: "2026-09-04" },
      { id: "ra3", type: "feedback", skill: "speaking", title: "Received Speaking Feedback", date: "2026-09-03", band: 6.0 },
      { id: "ra4", type: "unfinished", skill: "grammar", title: "Continue Grammar Practice", date: "2026-09-03" },
      { id: "ra5", type: "completed", skill: "listening", title: "Completed Listening Practice", date: "2026-09-02", band: 6.5 },
    ],
  };
}

// ---- Programs / tracks (IELTS active; the rest are future) ----
function tracksSeed() {
  return [
    { key: "ielts", name: "IELTS Preparation", short: "IELTS", status: "active", icon: "GraduationCap", description: "Academic & General Training" },
    { key: "general-english", name: "General English", short: "General", status: "coming-soon", icon: "MessageCircle", description: "Everyday speaking, listening & grammar" },
    { key: "business-english", name: "Business English", short: "Business", status: "coming-soon", icon: "Briefcase", description: "Workplace & professional English" },
    { key: "toefl", name: "TOEFL Preparation", short: "TOEFL", status: "coming-soon", icon: "BookOpen", description: "TOEFL iBT practice & scoring" },
    { key: "pte", name: "PTE Preparation", short: "PTE", status: "coming-soon", icon: "MonitorSmartphone", description: "PTE Academic practice" },
    { key: "kids", name: "English for Kids", short: "Kids", status: "coming-soon", icon: "Baby", description: "Fun, playful lessons for young learners" },
  ];
}

// ---- Achievements (categories, tiers, points, status) matching the einsteinai model ----
function achievementsSeed() {
  const A = (id, title, description, category, tier, points, icon, status, progress = 0, unlockedOn = null) =>
    ({ id, title, description, category, tier, points, icon, status, progress, unlockedOn });
  return [
    // Exams
    A("first-steps", "First Steps", "Complete your first exam", "exams", "bronze", 10, "Footprints", "unlocked", 100, "2026-09-01"),
    A("dedicated-learner", "Dedicated Learner", "Complete 5 exams", "exams", "silver", 50, "BookOpen", "unlocked", 100, "2026-09-03"),
    A("committed-student", "Committed Student", "Complete 10 exams", "exams", "gold", 100, "GraduationCap", "unlocked", 100, "2026-09-03"),
    A("exam-veteran", "Exam Veteran", "Complete 25 exams", "exams", "gold", 150, "Medal", "in_progress", 40),
    A("exam-master", "Exam Master", "Complete 50 exams", "exams", "platinum", 300, "Crown", "locked", 0),
    // Streaks
    A("warming-up", "Warming Up", "Practice 3 days in a row", "streaks", "bronze", 10, "Flame", "unlocked", 100, "2026-09-03"),
    A("on-a-roll", "On a Roll", "Practice 7 days in a row", "streaks", "silver", 50, "Flame", "in_progress", 30),
    A("unstoppable", "Unstoppable", "Practice 14 days in a row", "streaks", "gold", 100, "Flame", "locked", 0),
    A("dedicated", "Dedication", "Practice 30 days in a row", "streaks", "gold", 150, "Flame", "locked", 0),
    A("legendary-streak", "Legendary Streak", "Practice 100 days in a row", "streaks", "platinum", 400, "Flame", "locked", 0),
    // Scores
    A("first-six", "Breaking Six", "Score band 6 in any skill", "scores", "bronze", 20, "TrendingUp", "in_progress", 80),
    A("solid-seven", "Solid Seven", "Score band 7 in any skill", "scores", "silver", 60, "TrendingUp", "locked", 0),
    A("high-achiever", "High Achiever", "Score band 8 in any skill", "scores", "gold", 120, "TrendingUp", "locked", 0),
    A("perfect-nine", "Perfect Nine", "Score band 9 in any skill", "scores", "platinum", 300, "Sparkles", "locked", 0),
    A("all-rounder", "All-Rounder", "Score band 6+ in all four skills", "scores", "gold", 150, "Target", "in_progress", 25),
    // Milestones
    A("hundred-questions", "Century", "Answer 100 questions", "milestones", "bronze", 20, "MessageSquareHeart", "unlocked", 100, "2026-09-02"),
    A("thousand-questions", "Marathoner", "Answer 1,000 questions", "milestones", "gold", 150, "MessageSquareHeart", "in_progress", 35),
    A("first-certificate", "Certified", "Earn your first certificate", "milestones", "silver", 50, "BadgeCheck", "in_progress", 60),
    A("coach-chat", "Curious Mind", "Chat with the AI Coach", "milestones", "bronze", 10, "Bot", "locked", 0),
    // Special
    A("early-bird", "Early Bird", "Practice before 7am", "special", "silver", 40, "Sunrise", "in_progress", 10),
    A("night-owl", "Night Owl", "Practice after 11pm", "special", "silver", 40, "Moon", "locked", 0),
    A("comeback", "Comeback", "Return after a 7-day break", "special", "bronze", 20, "RotateCcw", "locked", 0),
  ];
}

// A built-in exam already in runtime shape (carries `correct` answers) → an exam record.
function runnerExam(skill, exam, module) {
  return {
    id: exam.id, skill, title: exam.title, module, status: "published", scope: "global",
    timeLimit: Math.round((exam.durationSec ?? 1800) / 60), format: "runner", content: exam,
  };
}

async function main() {
  const m = await loadMocks();
  await mkdir(seedDir, { recursive: true });

  // Speaking built-in runner exam (from speakingParts).
  const speakingRunner = {
    id: "speak-skills", title: "Speaking Mock — Skills & Learning", scope: "global",
    parts: m.speakingParts, attempts: 0, durationSec: 14 * 60,
  };

  const exams = [
    ...studioSeeds(),
    runnerExam("reading", m.readingExam, "academic"),
    runnerExam("listening", m.listeningExam, "academic"),
    runnerExam("speaking", speakingRunner, "both"),
  ];

  const vnum = () => `EIELTS-2026-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
  const certificates = m.certificates.map((c, i) => ({
    id: c.id, title: c.title, candidate: m.currentUser.name,
    type: i === 0 ? "ielts-report" : "standard",
    verificationNumber: vnum(),
    module: c.module, centre: "Online Practice", issuedOn: c.issuedOn,
    dateOfBirth: "", sex: "", countryOfOrigin: "", nationality: "", firstLanguage: "",
    schemeCode: "Online Practice Test", scores: c.scores, overall: c.band, cefr: c.cefr,
    comments: "This report confirms completion of a comprehensive practice examination on Yalla English Hub. Scores are AI-generated estimates for learning purposes.",
    status: "issued",
  }));

  const user = {
    ...m.currentUser,
    track: "ielts",
    examType: "IELTS (Academic/General)",
    purpose: "Study Abroad",
    level: "upper-intermediate",
    onboarded: true, // seeded demo user skips onboarding
  };

  const files = {
    "user.json": user,
    "exams.json": exams,
    "certificates.json": certificates,
    "lessons.json": m.lessons,
    "achievements.json": achievementsSeed(),
    "plans.json": { plans: m.plans, planIncludes: m.planIncludes },
    "progress.json": { sectionSummaries: m.sectionSummaries, recentExams: m.recentExams },
    "overview.json": overviewSeed(),
    "tracks.json": tracksSeed(),
  };

  for (const [name, data] of Object.entries(files)) {
    await writeFile(path.join(seedDir, name), JSON.stringify(data, null, 2), "utf8");
    console.log("wrote", path.relative(root, path.join(seedDir, name)));
  }
  console.log(`\nSeed export complete: ${exams.length} exams, ${certificates.length} certificates.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
