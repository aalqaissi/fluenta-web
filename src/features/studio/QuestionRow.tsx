import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionOption, QuestionType } from "@/mock/types";
import type { StudioQuestion } from "./store";
import { answerLetters, answerMatches, TEXT_ANSWER_TYPES } from "@/lib/answerMatch";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** How many letters a multi-select question asks for: its `choose`, else inferred from its answer (2 or 3). */
export function chooseCount(q: { choose?: number; answer?: string }): 2 | 3 {
  if (q.choose) return q.choose >= 3 ? 3 : 2;
  return answerLetters(q.answer).length >= 3 ? 3 : 2;
}

/** How many question numbers (and marks) a question takes — a "Choose TWO" takes 2. */
export function questionSpan(q: { type?: QuestionType; choose?: number; answer?: string }, inheritType: QuestionType): number {
  return (q.type ?? inheritType) === "multi-select" ? chooseCount(q) : 1;
}
const CHOICE_ANSWERS: Partial<Record<QuestionType, string[]>> = {
  "true-false-notgiven": ["TRUE", "FALSE", "NOT GIVEN"],
  "yes-no-notgiven": ["YES", "NO", "NOT GIVEN"],
};
const TEXT_TYPES = TEXT_ANSWER_TYPES;

/**
 * A single authored question, rendered with the fields appropriate to its
 * (effective) type — shared by the Reading and Listening editors.
 * `typeOptions` is the per-question type dropdown list for that skill.
 */
/** Does the key (with any "(optional)" words included) itself satisfy the word limit? */
function fitsLimit(answer: string, wordLimit: number, type: string) {
  const full = answer.replace(/[()]/g, "");
  return answerMatches(full, { answer: full, wordLimit, type });
}

/**
 * Comma-separated accepted variants. Edited as free text and committed on blur, so typing a comma
 * doesn't get normalised away mid-word.
 */
function AcceptedInput({ value, onCommit }: { value?: string[]; onCommit: (v: string[] | undefined) => void }) {
  const joined = (value ?? []).join(", ");
  const [text, setText] = useState(joined);
  useEffect(() => setText(joined), [joined]);
  return (
    <Input
      className="flex-1"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const list = text.split(",").map((a) => a.trim()).filter(Boolean);
        onCommit(list.length ? list : undefined);
      }}
      placeholder="e.g. color, 4 — comma-separated; write (the) library for optional words"
      aria-label="Also accept these answers"
    />
  );
}

export function QuestionRow({
  q,
  n,
  inheritType,
  typeOptions,
  onChange,
  onDelete,
  matchOptionsFor,
}: {
  q: StudioQuestion;
  n: number;
  inheritType: QuestionType;
  typeOptions: QuestionType[];
  onChange: (patch: Partial<StudioQuestion>) => void;
  onDelete: () => void;
  /** lettered choices for matching types (from the passage), so the answer is picked from a legend */
  matchOptionsFor?: (type: QuestionType) => QuestionOption[] | undefined;
}) {
  const type = q.type ?? inheritType;
  const matchOptions = matchOptionsFor?.(type);
  const isMC = type === "multiple-choice";
  const isMS = type === "multi-select";
  const isChoice = type === "true-false-notgiven" || type === "yes-no-notgiven";
  const isText = TEXT_TYPES.has(type);
  // Multi-select ("Choose TWO/THREE"): one question with `choose` correct letters among 5 (or 7) options.
  const choose = chooseCount(q);
  const optCount = isMS ? Math.min(LETTERS.length, Math.max(choose === 3 ? 7 : 5, q.options?.length ?? 0)) : 4;
  const options = Array.from({ length: optCount }, (_, i) => q.options?.[i] ?? "");
  const picked = answerLetters(q.answer).filter((l) => LETTERS.indexOf(l) < optCount);
  const span = isMS ? choose : 1;

  function togglePick(l: string) {
    const next = picked.includes(l) ? picked.filter((x) => x !== l) : picked.length < choose ? [...picked, l] : picked;
    onChange({ answer: [...next].sort().join(","), choose });
  }

  function setOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    onChange({ options: next });
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{span > 1 ? `Questions ${n}–${n + span - 1}` : `Question ${n}`}</span>
        <div className="flex items-center gap-2">
          <Select value={q.type ?? "default"} onValueChange={(v) => onChange({ type: v === "default" ? undefined : (v as QuestionType) })}>
            <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default type</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-sm" onClick={onDelete}>
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <Input value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value })} placeholder="Question text…" />

      {isMS && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Students choose</span>
          <Select
            value={String(choose)}
            onValueChange={(v) => {
              const c = v === "3" ? 3 : 2;
              const opts = Array.from({ length: Math.max(c === 3 ? 7 : 5, q.options?.length ?? 0) }, (_, i) => q.options?.[i] ?? "");
              onChange({ choose: c, options: opts, answer: picked.slice(0, c).join(",") });
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">TWO letters</SelectItem>
              <SelectItem value="3">THREE letters</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">Worth {choose} marks — one per correct letter, in any order.</span>
        </div>
      )}

      {(isMC || isMS) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-sm font-bold text-muted-foreground">{LETTERS[i]}</span>
              <Input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${LETTERS[i]}`} />
            </div>
          ))}
          {isMS && optCount < LETTERS.length && (
            <Button variant="outline" size="sm" className="justify-self-start" onClick={() => onChange({ options: [...options, ""] })}>
              <Plus className="size-4" /> Add option {LETTERS[optCount]}
            </Button>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{isMS ? "Correct answers" : "Correct answer"}</span>
        {isMS ? (
          <>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Correct answers">
              {LETTERS.slice(0, optCount).map((l) => {
                const on = picked.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => togglePick(l)}
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border text-sm font-bold transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                    )}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <span className={cn("text-xs font-semibold", picked.length === choose ? "text-success" : "text-destructive")}>
              {picked.length === choose ? `${choose} correct letters set` : `Tick ${choose} correct letters (${picked.length}/${choose})`}
            </span>
          </>
        ) : isMC ? (
          <Select value={q.answer || undefined} onValueChange={(v) => onChange({ answer: v })}>
            <SelectTrigger className="h-9 w-28"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {LETTERS.slice(0, optCount).map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : matchOptions ? (
          matchOptions.length ? (
            <Select value={q.answer || undefined} onValueChange={(v) => onChange({ answer: v })}>
              <SelectTrigger className="h-9 min-w-40 max-w-md flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {/* keep an answer that no longer matches the list visible instead of silently blank */}
                {q.answer && !matchOptions.some((o) => o.key === q.answer) && (
                  <SelectItem value={q.answer}>{q.answer} — not in the answer options</SelectItem>
                )}
                {matchOptions.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.key} — {o.text.length > 60 ? o.text.slice(0, 60) + "…" : o.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">
              {q.answer ? <b className="mr-1 text-foreground">{q.answer}</b> : null}Add the lettered list below these questions first.
            </span>
          )
        ) : isChoice ? (
          <Select value={q.answer || undefined} onValueChange={(v) => onChange({ answer: v })}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(CHOICE_ANSWERS[type] ?? []).map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <>
            <Input className="flex-1" value={q.answer} onChange={(e) => onChange({ answer: e.target.value })} placeholder="Correct answer" />
            {isText && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-muted-foreground">Word limit</span>
                <Input
                  type="number"
                  min={1}
                  className="w-16"
                  value={q.wordLimit ?? 2}
                  onChange={(e) => onChange({ wordLimit: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
            )}
          </>
        )}
      </div>
      {isText && (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-sm font-semibold text-muted-foreground">Also accept</span>
          <AcceptedInput value={q.accepted} onCommit={(accepted) => onChange({ accepted })} />
        </div>
      )}
      {isText && q.answer.trim() && !fitsLimit(q.answer, q.wordLimit ?? 2, type) && (
        <p className="mt-1.5 text-xs font-semibold text-destructive">
          This answer is longer than the word limit — students giving it would be marked wrong. Raise the limit or shorten the answer.
        </p>
      )}
    </Card>
  );
}

/** How many questions "Generate with AI" adds per click — the backend accepts 1–20. */
export const GENERATE_DEFAULT = 5;
export const GENERATE_MAX = 20;

/**
 * The "how many to generate" box beside "Generate with AI". It only sets the size of the next
 * generation (appended to the existing questions) — it never adds or removes questions itself.
 */
export function GenerateCountInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Input
      type="number"
      min={1}
      max={GENERATE_MAX}
      className="w-16"
      value={value}
      onChange={(e) => onChange(Math.min(GENERATE_MAX, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
      aria-label="Number of questions to generate with AI"
      title="Number of new questions “Generate with AI” adds"
    />
  );
}

/** Question numbers (= marks) a list of questions takes — what the IELTS 40-question totals count. */
export function marksOf(questions: { type?: QuestionType; choose?: number; answer?: string }[], inheritType: QuestionType): number {
  return questions.reduce((n, q) => n + questionSpan(q, inheritType), 0);
}

/** "7", or "6 · 7 marks" when a Choose TWO/THREE makes the marks differ from the question count. */
export function questionsLabel(questions: { type?: QuestionType; choose?: number; answer?: string }[], inheritType: QuestionType): string {
  const marks = marksOf(questions, inheritType);
  return marks === questions.length ? String(marks) : `${questions.length} · ${marks} marks`;
}

/** Beside "Generate with AI" for multi-select: should each generated question be "Choose TWO" or "THREE"? */
export function GenerateChooseSelect({ value, onChange }: { value: 2 | 3; onChange: (c: 2 | 3) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(v === "3" ? 3 : 2)}>
      <SelectTrigger className="h-9 w-36 text-xs" aria-label="Letters to choose in generated questions">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="2">Choose TWO</SelectItem>
        <SelectItem value="3">Choose THREE</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** `n` distinct random letters among the first `of`, sorted ("B,E") — so placeholders aren't always A,B. */
function randomLetters(n: number, of: number): string {
  const all = LETTERS.slice(0, of);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n).sort().join(",");
}

export function defaultAnswerFor(type: QuestionType): string {
  if (type === "true-false-notgiven") return "TRUE";
  if (type === "yes-no-notgiven") return "YES";
  if (type === "multi-select") return randomLetters(2, 5);
  if (type === "multiple-choice" || type.startsWith("matching-")) return "A";
  return "sample";
}

/** Offline placeholder questions (used when the AI service can't be reached). */
export function aiQuestions(type: QuestionType, count = 2): StudioQuestion[] {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const opts = type === "multi-select" ? ["", "", "", "", ""] : type === "multiple-choice" ? ["", "", "", ""] : undefined;
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    prompt: i === 0 ? "AI-generated question about the content." : "Another AI-generated question.",
    answer: defaultAnswerFor(type),
    options: opts && [...opts],
    wordLimit: 2,
    ...(type === "multi-select" ? { choose: 2 as const } : {}),
  }));
}
