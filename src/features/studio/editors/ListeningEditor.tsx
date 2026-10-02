import { useState } from "react";
import { FullMockCheck, LISTENING_FULL, LISTENING_PART_CONTEXT } from "../ContentRules";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { api, type AiStudioQuestion } from "@/lib/api";
import { MediaDrop, AiButton, Field } from "../components";
import { AudioUpload } from "../AudioUpload";
import { QuestionRow, aiQuestions, defaultAnswerFor, GenerateCountInput, GenerateChooseSelect, GENERATE_DEFAULT, questionSpan, marksOf, questionsLabel } from "../QuestionRow";
import { newSection, newQuestion, type StudioExam, type StudioSection, type StudioQuestion } from "../store";

const LISTENING_TYPES: QuestionType[] = [
  "multiple-choice",
  "multi-select",
  "sentence-completion",
  "summary-completion",
  "matching-features",
  "matching-information",
  "diagram-label",
  "short-answer",
  "form-completion",
  "note-completion",
  "table-completion",
  "flow-chart-completion",
];

const withId = (q: AiStudioQuestion): StudioQuestion => ({
  id: Math.random().toString(36).slice(2, 9),
  prompt: q.prompt,
  answer: q.answer,
  type: q.type as QuestionType | undefined,
  options: q.options,
  wordLimit: q.wordLimit,
  accepted: q.accepted,
  choose: q.choose === 3 ? 3 : q.choose === 2 ? 2 : undefined,
});

export function ListeningEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const sections = exam.sections ?? [];
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setB = (k: string, v: boolean) => setBusy((m) => ({ ...m, [k]: v }));
  // Per section: how many questions the next "Generate with AI" adds (not saved with the exam).
  const [genCount, setGenCount] = useState<Record<string, number>>({});
  // Per section: "Choose TWO" or "THREE" for the next multi-select generation.
  const [chooseFor, setChooseFor] = useState<Record<string, 2 | 3>>({});
  const setS = (idx: number, ns: Partial<StudioSection>) =>
    patch({ sections: sections.map((s, i) => (i === idx ? { ...s, ...ns } : s)) });

  return (
    <div className="space-y-5">
      <FullMockCheck counts={sections.map((s) => marksOf(s.questions, s.questionType))} target={LISTENING_FULL} unit="Part" />
      {sections.map((s, idx) => {
        const patchQ = (qid: string, np: Partial<StudioQuestion>) =>
          setS(idx, { questions: s.questions.map((q) => (q.id === qid ? { ...q, ...np } : q)) });
        const toGenerate = genCount[s.id] ?? GENERATE_DEFAULT;
        // Question numbers within the section (a "Choose TWO" takes two numbers).
        const starts: number[] = [];
        s.questions.reduce((k, q) => (starts.push(k + 1), k + questionSpan(q, s.questionType)), 0);
        const genChoose = chooseFor[s.id] ?? 2;

        return (
          <Card key={s.id} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Section {idx + 1}</h3>
                {LISTENING_PART_CONTEXT[idx + 1] && (
                  <p className="text-xs text-muted-foreground">Expected: {LISTENING_PART_CONTEXT[idx + 1]}</p>
                )}
              </div>
              {sections.length > 1 && (
                <Button variant="ghost" size="icon-sm" onClick={() => patch({ sections: sections.filter((_, i) => i !== idx) })}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <Field label="Section audio" hint="Upload the original recording (MP3 or M4A/AAC).">
                <AudioUpload
                  value={s.audioUrl ? { url: s.audioUrl, name: s.audioName ?? "audio" } : null}
                  onUploaded={(r) => setS(idx, { audioUrl: r.url, audioName: r.name, audioDurationSec: r.durationSec || undefined })}
                  onRemove={() => setS(idx, { audioUrl: null, audioName: null, audioDurationSec: undefined })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Section title">
                  <Input value={s.title} onChange={(e) => setS(idx, { title: e.target.value })} placeholder="e.g. Booking a community hall" />
                </Field>
                <Field label="Question type for this section">
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

              {/* questions */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">Questions ({questionsLabel(s.questions, s.questionType)})</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <GenerateCountInput value={toGenerate} onChange={(n) => setGenCount((m) => ({ ...m, [s.id]: n }))} />
                    {s.questionType === "multi-select" && (
                      <GenerateChooseSelect value={genChoose} onChange={(c) => setChooseFor((m) => ({ ...m, [s.id]: c }))} />
                    )}
                    <AiButton
                      label="Generate with AI"
                      loading={busy[`gen:${s.id}`]}
                      onClick={async () => {
                        setB(`gen:${s.id}`, true);
                        try {
                          const res = await api.ai.studioGenerate({
                            passageText: s.transcript,
                            questionType: s.questionType,
                            count: toGenerate,
                            choose: s.questionType === "multi-select" ? genChoose : undefined,
                            skill: "listening",
                            section: idx + 1,
                          });
                          setS(idx, { questions: [...s.questions, ...res.questions.map(withId)] });
                        } catch {
                          setS(idx, { questions: [...s.questions, ...aiQuestions(s.questionType, toGenerate)] });
                        } finally {
                          setB(`gen:${s.id}`, false);
                        }
                      }}
                    />
                    <AiButton
                      label="Fill Missing Answers with AI"
                      loading={busy[`fill:${s.id}`]}
                      onClick={async () => {
                        setB(`fill:${s.id}`, true);
                        try {
                          const res = await api.ai.studioFill({
                            passageText: s.transcript,
                            questions: s.questions.map((q) => ({ prompt: q.prompt, type: q.type ?? s.questionType, options: q.options, answer: q.answer, wordLimit: q.wordLimit, accepted: q.accepted, choose: q.choose })),
                          });
                          const filled = res.questions;
                          setS(idx, {
                            questions: s.questions.map((q, i) => (q.answer ? q : { ...q, answer: filled[i]?.answer ?? defaultAnswerFor(q.type ?? s.questionType) })),
                          });
                        } catch {
                          setS(idx, { questions: s.questions.map((q) => (q.answer ? q : { ...q, answer: defaultAnswerFor(q.type ?? s.questionType) })) });
                        } finally {
                          setB(`fill:${s.id}`, false);
                        }
                      }}
                    />
                    <Button size="sm" onClick={() => setS(idx, { questions: [...s.questions, newQuestion()] })}>
                      <Plus className="size-4" /> Add question
                    </Button>
                  </div>
                </div>
                {s.questions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No questions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {s.questions.map((q, qi) => (
                      <QuestionRow
                        key={q.id}
                        q={q}
                        n={starts[qi]}
                        inheritType={s.questionType}
                        typeOptions={LISTENING_TYPES}
                        onChange={(np) => patchQ(q.id, np)}
                        onDelete={() => setS(idx, { questions: s.questions.filter((x) => x.id !== q.id) })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      <Button variant="outline" onClick={() => patch({ sections: [...sections, newSection(sections.length + 1)] })}>
        <Plus className="size-4" /> Add section
      </Button>
    </div>
  );
}
