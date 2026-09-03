import { Check, X } from "lucide-react";
import type { QuestionGroup, QuestionOption } from "@/mock/types";
import { mcOptions } from "@/mock/passages";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  group: QuestionGroup;
  answers: Record<string, string>;
  setAnswer: (qid: string, val: string) => void;
  review?: boolean;
}

const CHOICE_TYPES = new Set(["true-false-notgiven", "yes-no-notgiven"]);
const SELECT_TYPES = new Set([
  "matching-headings",
  "matching-features",
  "matching-information",
  "matching-sentence-endings",
]);
const TEXT_TYPES = new Set(["sentence-completion", "summary-completion", "short-answer", "diagram-label"]);

export function QuestionRenderer({ group, answers, setAnswer, review }: Props) {
  return (
    <div className="space-y-5">
      {/* shared reference box for matching types */}
      {SELECT_TYPES.has(group.type) && group.sharedOptions && (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <ul className="space-y-1.5 text-sm">
            {group.sharedOptions.map((o) => (
              <li key={o.key} className="flex gap-2">
                <span className="font-bold text-primary">{o.key}</span>
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-3">
        {group.questions.map((q) => {
          const val = answers[q.id] ?? "";
          const correct = review ? val.trim().toLowerCase() === q.correct.trim().toLowerCase() : undefined;

          return (
            <li
              key={q.id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                review
                  ? correct
                    ? "border-success/40 bg-success/[0.06]"
                    : "border-destructive/40 bg-destructive/[0.05]"
                  : "border-border bg-card"
              )}
            >
              <div className="flex gap-3">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    review ? (correct ? "bg-success text-white" : "bg-destructive text-white") : "bg-primary/10 text-primary"
                  )}
                >
                  {review ? correct ? <Check className="size-3.5" /> : <X className="size-3.5" /> : q.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-relaxed">{q.prompt}</p>
                  {q.wordLimit && (
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {q.wordLimit}
                    </p>
                  )}

                  <div className="mt-3">
                    {CHOICE_TYPES.has(group.type) && (
                      <ChoicePills options={group.sharedOptions ?? []} value={val} onChange={(v) => setAnswer(q.id, v)} disabled={review} />
                    )}
                    {group.type === "multiple-choice" && (
                      <ChoiceList options={mcOptions[q.id] ?? []} value={val} onChange={(v) => setAnswer(q.id, v)} disabled={review} />
                    )}
                    {SELECT_TYPES.has(group.type) && (
                      <div className="max-w-xs">
                        <Select value={val} onValueChange={(v) => setAnswer(q.id, v)} disabled={review}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(group.sharedOptions ?? []).map((o) => (
                              <SelectItem key={o.key} value={o.key}>
                                {o.key} — {o.text.length > 40 ? o.text.slice(0, 40) + "…" : o.text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {TEXT_TYPES.has(group.type) && (
                      <Input
                        value={val}
                        disabled={review}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder="Type your answer"
                        className="max-w-xs"
                      />
                    )}
                  </div>

                  {review && !correct && (
                    <p className="mt-2 text-xs font-semibold text-success">Correct answer: {q.correct}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChoicePills({
  options,
  value,
  onChange,
  disabled,
}: {
  options: QuestionOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          disabled={disabled}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all disabled:cursor-default",
            value === o.key
              ? "border-primary bg-primary text-primary-foreground shadow-soft"
              : "border-border bg-surface hover:bg-muted"
          )}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

function ChoiceList({
  options,
  value,
  onChange,
  disabled,
}: {
  options: QuestionOption[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <button
          key={o.key}
          disabled={disabled}
          onClick={() => onChange(o.key)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all disabled:cursor-default",
            value === o.key ? "border-primary bg-primary/[0.06]" : "border-border bg-surface hover:bg-muted"
          )}
        >
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
              value === o.key ? "border-primary bg-primary text-primary-foreground" : "border-border"
            )}
          >
            {o.key}
          </span>
          <span>{o.text}</span>
        </button>
      ))}
    </div>
  );
}
