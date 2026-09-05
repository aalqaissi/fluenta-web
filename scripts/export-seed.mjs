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

  const certificates = m.certificates.map((c) => ({
    id: c.id, title: c.title, candidate: m.currentUser.name, module: c.module,
    centre: "Online Practice", issuedOn: c.issuedOn,
    dateOfBirth: "", sex: "", countryOfOrigin: "", nationality: "", firstLanguage: "",
    schemeCode: "Online Practice Test", scores: c.scores, overall: c.band, cefr: c.cefr,
    comments: "This report confirms completion of a comprehensive practice examination on Fluenta. Scores are AI-generated estimates for learning purposes.",
    status: "issued",
  }));

  const files = {
    "user.json": m.currentUser,
    "exams.json": exams,
    "certificates.json": certificates,
    "lessons.json": m.lessons,
    "achievements.json": m.achievements,
    "plans.json": { plans: m.plans, planIncludes: m.planIncludes },
    "progress.json": { sectionSummaries: m.sectionSummaries, recentExams: m.recentExams },
  };

  for (const [name, data] of Object.entries(files)) {
    await writeFile(path.join(seedDir, name), JSON.stringify(data, null, 2), "utf8");
    console.log("wrote", path.relative(root, path.join(seedDir, name)));
  }
  console.log(`\nSeed export complete: ${exams.length} exams, ${certificates.length} certificates.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
