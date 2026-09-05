import { Plus, Trash2, Type, Image as ImageIcon, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { MediaDrop, AiButton, Field } from "../components";
import { QuestionRow, aiQuestions, defaultAnswerFor } from "../QuestionRow";
import { newPassage, newQuestion, type StudioExam, type StudioPassage, type StudioQuestion } from "../store";
import { cn } from "@/lib/utils";

const READING_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];

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
                      inheritType={p.questionType}
                      typeOptions={READING_TYPES}
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
