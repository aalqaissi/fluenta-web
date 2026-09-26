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
