import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { MediaDrop, AiButton, Field } from "../components";
import { newSection, newQuestion, type StudioExam, type StudioSection } from "../store";

const LISTENING_TYPES: QuestionType[] = [
  "multiple-choice", "sentence-completion", "summary-completion", "matching-features", "matching-information", "diagram-label", "short-answer",
];

export function ListeningEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const sections = exam.sections ?? [];
  const setS = (idx: number, ns: Partial<StudioSection>) =>
    patch({ sections: sections.map((s, i) => (i === idx ? { ...s, ...ns } : s)) });

  return (
    <div className="space-y-5">
      {sections.map((s, idx) => (
        <Card key={s.id} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Section {idx + 1}</h3>
            {sections.length > 1 && (
              <Button variant="ghost" size="icon-sm" onClick={() => patch({ sections: sections.filter((_, i) => i !== idx) })}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <Field label="Section audio" hint="You'll be able to upload your own original recordings.">
              <MediaDrop kind="audio" value={s.audioName} onChange={(name) => setS(idx, { audioName: name })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Section title">
                <Input value={s.title} onChange={(e) => setS(idx, { title: e.target.value })} placeholder="e.g. Booking a community hall" />
              </Field>
              <Field label="Question type">
                <Select value={s.questionType} onValueChange={(v) => setS(idx, { questionType: v as QuestionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTENING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Plan / Map / Diagram image (optional)">
              <MediaDrop kind="image" value={s.imageName} onChange={(name) => setS(idx, { imageName: name })} />
            </Field>
            <Field label="Transcript (optional)" hint="Used for AI grading, or auto-transcribed from the audio if left blank.">
              <Textarea value={s.transcript} onChange={(e) => setS(idx, { transcript: e.target.value })} rows={3} placeholder="Paste the audio transcript here…" />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Questions ({s.questions.length})</p>
                <div className="flex gap-2">
                  <AiButton label="Generate with AI" onClick={() => setS(idx, { questions: [...s.questions, newQuestion(), newQuestion()] })} />
                  <Button variant="outline" size="sm" onClick={() => setS(idx, { questions: [...s.questions, newQuestion()] })}>
                    <Plus className="size-4" /> Add
                  </Button>
                </div>
              </div>
              {s.questions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No questions yet.</p>
              ) : (
                <div className="space-y-2">
                  {s.questions.map((q, qi) => (
                    <div key={q.id} className="flex items-start gap-2">
                      <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{qi + 1}</span>
                      <Input className="flex-[2]" value={q.prompt} onChange={(e) => setS(idx, { questions: s.questions.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)) })} placeholder="Question / note with a gap __________" />
                      <Input className="flex-1" value={q.answer} onChange={(e) => setS(idx, { questions: s.questions.map((x) => (x.id === q.id ? { ...x, answer: e.target.value } : x)) })} placeholder="Answer" />
                      <Button variant="ghost" size="icon" onClick={() => setS(idx, { questions: s.questions.filter((x) => x.id !== q.id) })}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={() => patch({ sections: [...sections, newSection(sections.length + 1)] })}>
        <Plus className="size-4" /> Add section
      </Button>
    </div>
  );
}
