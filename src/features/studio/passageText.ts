// Shared rules for turning an authored Studio reading passage into what students see.
// Mirrored in the mobile app (lib/services/exam_convert.dart) — keep the two in step.
import type { QuestionOption, QuestionType } from "@/mock/types";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Matching types whose answers are picked from a lettered list the admin writes in the Studio. */
export const AUTHORED_OPTION_TYPES = new Set<QuestionType>(["matching-headings", "matching-features", "matching-sentence-endings"]);
/** Matching types whose answers are the passage's paragraph letters. */
export const PARAGRAPH_OPTION_TYPES = new Set<QuestionType>(["matching-information"]);

// A line holding only a paragraph letter: "A", "B.", "(C)", "Paragraph D".
const LABEL_LINE = /^\s*(?:paragraph\s+)?\(?([A-Z])[.):]?\s*$/i;

export interface ParsedPassage {
  paragraphs: string[];
  /** Letter for each paragraph, when the admin labelled them (IELTS "A", "B", … style). */
  labels?: string[];
}

/**
 * Split passage text into paragraphs. A line containing only a letter labels the paragraph
 * below it (the text up to the next label is one paragraph). Unlabelled text splits on blank
 * lines, or on single line breaks when the text has no blank lines at all.
 */
export function parsePassageText(text: string): ParsedPassage {
  const lines = (text ?? "").replace(/\r\n?/g, "\n").split("\n");
  if (lines.some((l) => LABEL_LINE.test(l))) {
    const paragraphs: string[] = [];
    const labels: string[] = [];
    let body: string[] = [];
    let label: string | null = null;
    const flush = () => {
      const t = body.join(" ").replace(/\s+/g, " ").trim();
      if (t) {
        paragraphs.push(t);
        labels.push(label ?? "");
      }
      body = [];
    };
    for (const line of lines) {
      const m = line.match(LABEL_LINE);
      if (m) {
        flush();
        label = m[1].toUpperCase();
      } else body.push(line);
    }
    flush();
    return { paragraphs, labels };
  }
  const t = (text ?? "").replace(/\r\n?/g, "\n");
  const chunks = /\n\s*\n/.test(t) ? t.split(/\n\s*\n/) : t.split("\n");
  return { paragraphs: chunks.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean) };
}

/** Title of the lettered list a matching type chooses from, as printed on the IELTS paper. */
export function optionListTitle(type: QuestionType): string {
  switch (type) {
    case "matching-sentence-endings":
      return "Sentence endings";
    case "matching-headings":
      return "List of headings";
    case "matching-information":
      return "Paragraphs";
    default:
      return "List of options";
  }
}

/** "A–H" for a list of options (or "A" for one). */
export function letterRange(options: QuestionOption[] | undefined, type?: QuestionType): string {
  if (!options?.length) return "";
  const first = optionLabel(type, options[0].key);
  return options.length === 1 ? first : `${first}–${optionLabel(type, options[options.length - 1].key)}`;
}

/** Types whose answers each name a different list entry (IELTS: each heading/ending used at most once). */
export const LETTERS_ONCE_TYPES = new Set<QuestionType>(["matching-headings", "matching-sentence-endings"]);

const ROMAN: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
/** 1 → "i", 4 → "iv", 12 → "xii" (lower case, as on the IELTS paper). */
export function toRoman(n: number): string {
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

/** "iv" → 4 (0 when not a valid lower-case Roman numeral). */
export function fromRoman(s: string): number {
  const v: Record<string, number> = { i: 1, v: 5, x: 10 };
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = v[s[i]] ?? 0;
    const nxt = v[s[i + 1]] ?? 0;
    n += cur < nxt ? -cur : cur;
  }
  return toRoman(n) === s ? n : 0;
}

/**
 * How a list key is shown. Matching Headings are numbered i, ii, iii… on the IELTS paper (paragraphs
 * already use letters); the stored key stays A, B, C… so answers and scoring are unchanged.
 */
export function optionLabel(type: QuestionType | undefined, key: string): string {
  // Only a stored capital letter is translated — keys already written as numerals ("i", "ii" in the
  // built-in exams) are shown as they are.
  if (type !== "matching-headings" || !/^[A-Z]$/.test(key.trim())) return key;
  return toRoman(LETTERS.indexOf(key.trim()) + 1);
}

/** IELTS-style instruction for a matching group, naming the letter range when known. */
export function matchingInstructions(type: QuestionType, options: QuestionOption[] | undefined): string | undefined {
  const r = letterRange(options, type);
  const range = r ? `, ${r}` : "";
  switch (type) {
    case "matching-sentence-endings":
      return `Complete each sentence with the correct ending${range}.`;
    case "matching-headings":
      return `Choose the correct heading for each paragraph from the list of headings${range ? ` (${r})` : ""}.`;
    case "matching-features":
      return `Match each statement with the correct option${range}. You may use any letter more than once.`;
    case "matching-information":
      return `Which paragraph contains the following information? Write the correct letter${range}. You may use any letter more than once.`;
    default:
      return undefined;
  }
}

/**
 * Read a pasted list such as "A. expose errors…\nB) prevent…" (or plain lines) into option texts,
 * placing lettered lines at their letter's position.
 */
export function parseOptionList(text: string): string[] {
  const out: string[] = [];
  let next = 0;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    // "A. text", "A) text", "(A) text", "A: text", "A - text" — a bare "A text" is left alone,
    // since a plain line can start with the word "A".
    const m = line.match(/^\(?([A-Z])\s*[.):\-–]\s*(.*)$/);
    // Headings lists are numbered i, ii, iii… on the paper — accept lower-case Roman numerals too.
    const r = m ? null : line.match(/^\(?([ivx]+)\s*[.):\-–]\s*(.*)$/);
    const at = m ? LETTERS.indexOf(m[1]) : r ? fromRoman(r[1]) - 1 : next;
    const body = (m ? m[2] : r ? r[2] : line).trim();
    if (at < 0 || at >= LETTERS.length) continue;
    while (out.length < at) out.push("");
    out[at] = body;
    next = at + 1;
  }
  return out;
}

/** Lettered options from the admin's list (empty rows are skipped, letters stay positional). */
export function authoredOptions(options: string[] | undefined): QuestionOption[] {
  return (options ?? []).map((text, i) => ({ key: LETTERS[i], text: text.trim() })).filter((o) => o.text);
}

/** "Paragraph A", "Paragraph B", … for the passage's labelled (or counted) paragraphs. */
export function paragraphOptions(parsed: ParsedPassage): QuestionOption[] {
  const keys = parsed.labels?.filter(Boolean).length ? parsed.labels.filter(Boolean) : parsed.paragraphs.map((_, i) => LETTERS[i]);
  return keys.map((k) => ({ key: k, text: `Paragraph ${k}` }));
}

/** The choices a matching question of `type` offers for this passage (undefined = not a matching type). */
export function matchingOptionsFor(type: QuestionType, passage: { text: string; options?: string[] }): QuestionOption[] | undefined {
  if (PARAGRAPH_OPTION_TYPES.has(type)) return paragraphOptions(parsePassageText(passage.text));
  if (AUTHORED_OPTION_TYPES.has(type)) return authoredOptions(passage.options);
  return undefined;
}

/**
 * What students choose from: the passage's options, or — for an exam authored before the Studio
 * captured an answer list — bare letters A…(highest letter used in the answers), so the questions
 * stay answerable. Bare letters have empty text.
 */
export function studentOptionsFor(
  type: QuestionType,
  passage: { text: string; options?: string[] },
  answers: string[],
): QuestionOption[] | undefined {
  const opts = matchingOptionsFor(type, passage);
  if (!opts || opts.length || !AUTHORED_OPTION_TYPES.has(type)) return opts;
  const highest = Math.max(-1, ...answers.map((a) => LETTERS.indexOf(a.trim().toUpperCase())));
  return LETTERS.slice(0, Math.max(highest + 1, 4)).map((key) => ({ key, text: "" }));
}
