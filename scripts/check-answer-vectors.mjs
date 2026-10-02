// Runs the shared answer vectors (backend/src/test/resources) against the web matcher in
// src/lib/answerMatch.ts — the same files pin the Java and Dart mirrors.  npm run test:answers
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = join(tmpdir(), `answerMatch-${process.pid}.mjs`);
await build({ entryPoints: ["src/lib/answerMatch.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const { answerMatches, answerMarks } = await import(pathToFileURL(out).href);

const read = (f) => JSON.parse(readFileSync(`backend/src/test/resources/${f}`, "utf8"));
const failures = [];
for (const v of read("answer-match-vectors.json")) {
  const got = answerMatches(v.given, { answer: v.answer, accepted: v.accepted, wordLimit: v.wordLimit, type: v.type });
  if (got !== v.expect) failures.push(`match: ${v.note} → got ${got}`);
}
for (const v of read("answer-marks-vectors.json")) {
  const m = answerMarks(v.given, { answer: v.answer, wordLimit: v.wordLimit, type: v.type });
  if (m.earned !== v.earned || m.total !== v.total) failures.push(`marks: ${v.note} → got ${m.earned}/${m.total}`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("answer vectors: all pass");
