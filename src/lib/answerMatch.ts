/**
 * The single answer-key marking rule for objective (reading/listening) questions — the web mirror of
 * the backend `AnswerMatcher.java` (authoritative score) and mobile `answer_match.dart`. All three are
 * pinned by `backend/src/test/resources/answer-match-vectors.json`.
 *
 * 1. Normalise case, quotes, whitespace and edge punctuation.
 * 2. For text (completion / short-answer) questions, an answer over the stated word/number limit is
 *    wrong even if it contains the right words.
 * 3. The answer, or any accepted variant, matches — with `(parenthesised)` words optional.
 */
export interface AnswerKey {
  answer: string;
  accepted?: string[];
  wordLimit?: number | string | null;
  type?: string | null;
}

/** Question types whose answers are typed words, so the word/number limit applies. */
export const TEXT_ANSWER_TYPES = new Set([
  "sentence-completion", "summary-completion", "note-completion", "table-completion",
  "flow-chart-completion", "form-completion", "diagram-label", "short-answer",
]);

const NUMBER = /^[£$€]?\d[\d,.:/]*(%|st|nd|rd|th|am|pm)?$/;
const COUNT = /\b(\d+|ONE|TWO|THREE|FOUR|FIVE)\b/;
const OPTIONAL = /\(([^)]*)\)/;
const EDGE = ".,;:!?\"'";
const WORD_COUNTS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export function normalizeAnswer(s: string | null | undefined): string {
  if (!s) return "";
  let out = s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  let start = 0;
  let end = out.length;
  while (start < end && EDGE.includes(out[start])) start++;
  while (end > start && EDGE.includes(out[end - 1])) end--;
  out = out.slice(start, end).trim();
  return out;
}

function gated(type?: string | null) {
  return !type || !type.trim() || TEXT_ANSWER_TYPES.has(type);
}

function withinLimit(given: string, limit?: number | string | null): boolean {
  if (limit === null || limit === undefined || limit === "") return true;
  let words = 0;
  let numbers = 0;
  for (const t of given.split(" ")) {
    if (!t) continue;
    if (NUMBER.test(t)) numbers++;
    else words++;
  }
  if (typeof limit === "number") return limit <= 0 || words + numbers <= limit;
  const label = limit.toUpperCase();
  const hasWord = label.includes("WORD");
  const hasNumber = label.includes("NUMBER");
  if (!hasWord && hasNumber) return words === 0 && numbers <= 1;
  const m = COUNT.exec(label);
  if (!hasWord || !m) return true;
  const max = WORD_COUNTS[m[1]] ?? parseInt(m[1], 10);
  if (hasNumber && label.includes("AND/OR")) return words <= max && numbers <= 1;
  return words + numbers <= max;
}

/** Expand `(optional)` words into every with/without combination, normalised. */
function expand(raw: string): string[] {
  const m = OPTIONAL.exec(raw);
  if (!m) return [normalizeAnswer(raw)];
  const before = raw.slice(0, m.index);
  const after = raw.slice(m.index + m[0].length);
  const out: string[] = [];
  for (const rest of expand(after)) {
    out.push(normalizeAnswer(`${before} ${rest}`));
    out.push(normalizeAnswer(`${before} ${m[1]} ${rest}`));
  }
  return out;
}

export function answerMatches(given: string | null | undefined, key: AnswerKey): boolean {
  const g = normalizeAnswer(given);
  if (!g || !key || key.answer == null) return false;
  if (gated(key.type) && !withinLimit(g, key.wordLimit)) return false;
  const candidates = [key.answer, ...(key.accepted ?? [])].flatMap((a) => (a == null ? [] : expand(a)));
  return candidates.some((c) => c !== "" && c === g);
}

/** Convenience for runtime questions (`correct` + group type fallback). */
export function isQuestionCorrect(
  given: string | null | undefined,
  q: { correct: string; accepted?: string[]; wordLimit?: string | number; type?: string },
  groupType?: string,
): boolean {
  return answerMatches(given, { answer: q.correct, accepted: q.accepted, wordLimit: q.wordLimit, type: q.type ?? groupType });
}
