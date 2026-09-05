import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import type { StudioQuestion } from "./store";

const LETTERS = ["A", "B", "C", "D", "E"];
const CHOICE_ANSWERS: Partial<Record<QuestionType, string[]>> = {
  "true-false-notgiven": ["TRUE", "FALSE", "NOT GIVEN"],
  "yes-no-notgiven": ["YES", "NO", "NOT GIVEN"],
};
const TEXT_TYPES = new Set<QuestionType>(["sentence-completion", "summary-completion", "diagram-label", "short-answer"]);

/**
 * A single authored question, rendered with the fields appropriate to its
 * (effective) type — shared by the Reading and Listening editors.
 * `typeOptions` is the per-question type dropdown list for that skill.
 */
export function QuestionRow({
  q,
  n,
  inheritType,
  typeOptions,
  onChange,
  onDelete,
}: {
  q: StudioQuestion;
  n: number;
  inheritType: QuestionType;
  typeOptions: QuestionType[];
  onChange: (patch: Partial<StudioQuestion>) => void;
  onDelete: () => void;
}) {
  const type = q.type ?? inheritType;
  const isMC = type === "multiple-choice";
  const isMS = type === "multi-select";
  const isChoice = type === "true-false-notgiven" || type === "yes-no-notgiven";
  const isText = TEXT_TYPES.has(type);
  const optCount = isMS ? 5 : 4;
  const options = Array.from({ length: optCount }, (_, i) => q.options?.[i] ?? "");

  function setOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    onChange({ options: next });
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-bold">Question {n}</span>
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

      {(isMC || isMS) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-sm font-bold text-muted-foreground">{LETTERS[i]}</span>
              <Input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${LETTERS[i]}`} />
            </div>
          ))}
        </div>
      )}

      {isMS && (
        <p className="mt-2 text-xs text-muted-foreground">
          For a “choose TWO/THREE” question, add one row per correct letter — give each row the same question text and options, and pick that
          row's own correct letter below.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Correct answer</span>
        {isMC || isMS ? (
          <Select value={q.answer || undefined} onValueChange={(v) => onChange({ answer: v })}>
            <SelectTrigger className="h-9 w-28"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {LETTERS.slice(0, optCount).map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    </Card>
  );
}

export function defaultAnswerFor(type: QuestionType): string {
  if (type === "true-false-notgiven") return "TRUE";
  if (type === "yes-no-notgiven") return "YES";
  if (type === "multiple-choice" || type === "multi-select") return "A";
  return "sample";
}

export function aiQuestions(type: QuestionType): StudioQuestion[] {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const opts = type === "multi-select" ? ["", "", "", "", ""] : type === "multiple-choice" ? ["", "", "", ""] : undefined;
  return [
    { id: uid(), prompt: "AI-generated question about the content.", answer: defaultAnswerFor(type), options: opts, wordLimit: 2 },
    { id: uid(), prompt: "Another AI-generated question.", answer: defaultAnswerFor(type), options: opts, wordLimit: 2 },
  ];
}
