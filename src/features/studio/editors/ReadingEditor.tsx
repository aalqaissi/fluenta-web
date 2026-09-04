import { Plus, Trash2, Type, Image as ImageIcon, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { MediaDrop, AiButton, Field } from "../components";
import { newPassage, newQuestion, type StudioExam, type StudioPassage } from "../store";
import { cn } from "@/lib/utils";

export function ReadingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const passages = exam.passages ?? [];

  const setP = (idx: number, np: Partial<StudioPassage>) =>
    patch({ passages: passages.map((p, i) => (i === idx ? { ...p, ...np } : p)) });

  return (
    <div className="space-y-5">
      {passages.map((p, idx) => (
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
                  {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
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
                      questions: [...p.questions, ...aiQuestions(p.questionType)],
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">Questions ({p.questions.length})</p>
              <div className="flex gap-2">
                <AiButton label="Generate with AI" onClick={() => setP(idx, { questions: [...p.questions, ...aiQuestions(p.questionType)] })} />
                <AiButton label="Fill missing answers" onClick={() => setP(idx, { questions: p.questions.map((q) => (q.answer ? q : { ...q, answer: "True" })) })} />
                <Button variant="outline" size="sm" onClick={() => setP(idx, { questions: [...p.questions, newQuestion()] })}>
                  <Plus className="size-4" /> Add
                </Button>
              </div>
            </div>
            {p.questions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              <div className="space-y-2">
                {p.questions.map((q, qi) => (
                  <div key={q.id} className="flex items-start gap-2">
                    <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{qi + 1}</span>
                    <Input
                      className="flex-[2]"
                      value={q.prompt}
                      onChange={(e) => setP(idx, { questions: p.questions.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)) })}
                      placeholder="Question / statement"
                    />
                    <Input
                      className="flex-1"
                      value={q.answer}
                      onChange={(e) => setP(idx, { questions: p.questions.map((x) => (x.id === q.id ? { ...x, answer: e.target.value } : x)) })}
                      placeholder="Answer"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setP(idx, { questions: p.questions.filter((x) => x.id !== q.id) })}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}

      <Button variant="outline" onClick={() => patch({ passages: [...passages, newPassage(passages.length + 1)] })}>
        <Plus className="size-4" /> Add passage
      </Button>
    </div>
  );
}

function aiQuestions(type: QuestionType) {
  const base = type === "true-false-notgiven" || type === "yes-no-notgiven" ? "True" : type === "multiple-choice" ? "B" : "sample";
  return [
    { id: Math.random().toString(36).slice(2, 9), prompt: "AI-generated question about the passage.", answer: base },
    { id: Math.random().toString(36).slice(2, 9), prompt: "Another AI-generated question.", answer: base },
  ];
}
