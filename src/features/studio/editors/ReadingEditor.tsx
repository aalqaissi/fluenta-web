import { Plus, Trash2, Type, Image as ImageIcon, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { MediaDrop, AiButton, Field } from "../components";
import { newPassage, newQuestion, type StudioExam, type StudioPassage, type StudioQuestion } from "../store";
import { cn } from "@/lib/utils";

const READING_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];
const LETTERS = ["A", "B", "C", "D", "E"];
const CHOICE_ANSWERS: Partial<Record<QuestionType, string[]>> = {
  "true-false-notgiven": ["TRUE", "FALSE", "NOT GIVEN"],
  "yes-no-notgiven": ["YES", "NO", "NOT GIVEN"],
};
const TEXT_TYPES = new Set<QuestionType>(["sentence-completion", "summary-completion", "diagram-label", "short-answer"]);

function QuestionRow({
  q,
  n,
  passageType,
  onChange,
  onDelete,
}: {
  q: StudioQuestion;
  n: number;
  passageType: QuestionType;
  onChange: (patch: Partial<StudioQuestion>) => void;
  onDelete: () => void;
}) {
  const type = q.type ?? passageType;
  const isMC = type === "multiple-choice";
  const isMS = type === "multi-select";
  const isChoice = type === "true-false-notgiven" || type === "yes-no-notgiven";
  const isText = TEXT_TYPES.has(type);
  const isMatch = type.startsWith("matching");
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
              {READING_TYPES.map((t) => (
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
            {(isText || isMatch) && isText && (
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

export function ReadingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const passages = exam.passages ?? [];

  const setP = (idx: number, np: Partial<StudioPassage>) =>
    patch({ passages: passages.map((p, i) => (i === idx ? { ...p, ...np } : p)) });

  return (
    <div className="space-y-5">
      {passages.map((p, idx) => {
        const patchQ = (qid: string, np: Partial<StudioQuestion>) =>
          setP(idx, { questions: p.questions.map((q) => (q.id === qid ? { ...q, ...np } : q)) });
        const setCount = (target: number) => {
          const cur = p.questions.length;
          if (target > cur) setP(idx, { questions: [...p.questions, ...Array.from({ length: target - cur }, () => newQuestion())] });
          else if (target < cur && target >= 1) setP(idx, { questions: p.questions.slice(0, target) });
        };
        const fillDisabled = p.questionType === "multi-select";

        return (
          <Card key={p.id} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Passage {idx + 1}</h3>
              {passages.length > 1 && (
                <Button variant="ghost" size="icon-sm" onClick={() => patch({ passages: passages.filter((_, i) => i !== idx) })}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              )}
            </div>

            {/* input mode */}
            <div className="mb-4 inline-flex flex-wrap rounded-lg border border-border p-1">
              {(["type", "upload", "extract"] as const).map((m) => {
                const meta = {
                  type: { icon: Type, label: "Type / Paste" },
                  upload: { icon: ImageIcon, label: "Upload from image" },
                  extract: { icon: Sparkles, label: "Extract with AI" },
                }[m];
                const Icon = meta.icon;
                return (
                  <button
                    key={m}
                    onClick={() => setP(idx, { inputMode: m })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                      p.inputMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="size-3.5" /> {meta.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Passage title (optional)">
                <Input value={p.title} onChange={(e) => setP(idx, { title: e.target.value })} placeholder="e.g. The History of Glass" />
              </Field>
              <Field label="Question type for this passage">
                <Select value={p.questionType} onValueChange={(v) => setP(idx, { questionType: v as QuestionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {READING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-4">
              {p.inputMode === "type" ? (
                <Field label="Passage text">
                  <Textarea value={p.text} onChange={(e) => setP(idx, { text: e.target.value })} rows={6} placeholder="Paste or type the full reading passage here…" />
                </Field>
              ) : p.inputMode === "upload" ? (
                <Field label="Passage image">
                  <MediaDrop kind="image" value={p.imageName} onChange={(name) => setP(idx, { imageName: name })} />
                </Field>
              ) : (
                <Field label="Passage photos" hint="Upload photos of the passage and question sheet — AI reads them and fills the form.">
                  <div className="space-y-2">
                    <MediaDrop kind="image" value={p.imageName} onChange={(name) => setP(idx, { imageName: name })} />
                    <AiButton
                      label="Extract passage & questions"
                      onClick={() => setP(idx, {
                        text: p.text || "Extracted passage text (AI). The full reading passage read from your photos would appear here for review.",
                        questions: [...p.questions, newQuestion(), newQuestion()],
                      })}
                    />
                  </div>
                </Field>
              )}
            </div>

            <div className="mt-4">
              <Field label="Diagram / Map / Process image (optional)">
                <MediaDrop kind="image" value={p.inputMode === "type" ? p.imageName : null} onChange={(name) => setP(idx, { imageName: name })} />
              </Field>
            </div>

            {/* questions */}
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">Questions ({p.questions.length})</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-16"
                    value={p.questions.length}
                    onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Number of questions"
                  />
                  <AiButton label="Generate with AI" onClick={() => setP(idx, { questions: [...p.questions, ...aiQuestions(p.questionType)] })} />
                  <AiButton
                    label="Fill Missing Answers with AI"
                    disabled={fillDisabled}
                    onClick={() => setP(idx, { questions: p.questions.map((q) => (q.answer ? q : { ...q, answer: defaultAnswerFor(q.type ?? p.questionType) })) })}
                  />
                  <Button size="sm" onClick={() => setP(idx, { questions: [...p.questions, newQuestion()] })}>
                    <Plus className="size-4" /> Add question
                  </Button>
                </div>
              </div>
              {p.questions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No questions yet.</p>
              ) : (
                <div className="space-y-3">
                  {p.questions.map((q, qi) => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      n={qi + 1}
                      passageType={p.questionType}
                      onChange={(np) => patchQ(q.id, np)}
                      onDelete={() => setP(idx, { questions: p.questions.filter((x) => x.id !== q.id) })}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <Button variant="outline" onClick={() => patch({ passages: [...passages, newPassage(passages.length + 1)] })}>
        <Plus className="size-4" /> Add passage
      </Button>
    </div>
  );
}

function defaultAnswerFor(type: QuestionType): string {
  if (type === "true-false-notgiven") return "TRUE";
  if (type === "yes-no-notgiven") return "YES";
  if (type === "multiple-choice" || type === "multi-select") return "A";
  return "sample";
}

function aiQuestions(type: QuestionType): StudioQuestion[] {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const opts = type === "multi-select" ? ["", "", "", "", ""] : type === "multiple-choice" ? ["", "", "", ""] : undefined;
  return [
    { id: uid(), prompt: "AI-generated question about the passage.", answer: defaultAnswerFor(type), options: opts, wordLimit: 2 },
    { id: uid(), prompt: "Another AI-generated question.", answer: defaultAnswerFor(type), options: opts, wordLimit: 2 },
  ];
}
