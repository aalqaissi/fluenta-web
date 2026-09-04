import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MediaDrop, Field } from "../components";
import { newSpeakingQ, type StudioExam, type StudioSpeakingPart } from "../store";

export function SpeakingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const parts = exam.parts ?? [];
  const setPart = (idx: number, np: Partial<StudioSpeakingPart>) =>
    patch({ parts: parts.map((p, i) => (i === idx ? { ...p, ...np } : p)) });

  return (
    <div className="space-y-5">
      {parts.map((p, idx) => (
        <Card key={p.id} className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="default">Part {p.number}</Badge>
            <Input className="max-w-xs" value={p.title} onChange={(e) => setPart(idx, { title: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Topic (for practice-by-topic)">
              <Input value={p.topic} onChange={(e) => setPart(idx, { topic: e.target.value })} placeholder="e.g. Work & Study" />
            </Field>
            {p.number === 2 && (
              <Field label="Cue card">
                <Input value={p.cueCard} onChange={(e) => setPart(idx, { cueCard: e.target.value })} placeholder="Describe a skill you would like to learn." />
              </Field>
            )}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">Examiner questions ({p.questions.length})</p>
              <Button variant="outline" size="sm" onClick={() => setPart(idx, { questions: [...p.questions, newSpeakingQ()] })}>
                <Plus className="size-4" /> Add question
              </Button>
            </div>
            {p.questions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              <div className="space-y-3">
                {p.questions.map((q, qi) => (
                  <div key={q.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{qi + 1}</span>
                      <Textarea
                        rows={2}
                        className="flex-1"
                        value={q.text}
                        onChange={(e) => setPart(idx, { questions: p.questions.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)) })}
                        placeholder="Examiner question…"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setPart(idx, { questions: p.questions.filter((x) => x.id !== q.id) })}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="mt-2 pl-8">
                      <MediaDrop kind="audio" label="Examiner audio (your voice)" value={q.audioName} onChange={(name) => setPart(idx, { questions: p.questions.map((x) => (x.id === q.id ? { ...x, audioName: name } : x)) })} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
