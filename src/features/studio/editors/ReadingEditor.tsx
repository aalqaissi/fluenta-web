import { useRef, useState } from "react";
import { Plus, Trash2, Type, Image as ImageIcon, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { api, type AiStudioQuestion } from "@/lib/api";
import { MediaDrop, AiButton, Field } from "../components";
import { QuestionRow, aiQuestions, defaultAnswerFor, GenerateCountInput, GENERATE_DEFAULT } from "../QuestionRow";
import { newPassage, newQuestion, type StudioExam, type StudioPassage, type StudioQuestion } from "../store";
import { cn } from "@/lib/utils";
import {
  AUTHORED_OPTION_TYPES,
  LETTERS,
  PARAGRAPH_OPTION_TYPES,
  matchingOptionsFor,
  paragraphOptions,
  parsePassageText,
} from "../passageText";

const OPTIONS_HELP: Partial<Record<QuestionType, string>> = {
  "matching-headings": "The list of headings students choose from",
  "matching-features": "The list of features (e.g. people, places, dates) students choose from",
  "matching-sentence-endings": "The list of sentence endings students choose from",
};

/**
 * The lettered answer list for a passage's matching questions: editable for Headings / Features /
 * Sentence Endings, and read-only (the detected paragraph letters) for Matching Information.
 * Shown whenever the passage or any of its questions uses one of those types.
 */
function MatchingLegend({ passage: p, onOptions }: { passage: StudioPassage; onOptions: (options: string[]) => void }) {
  const types = new Set<QuestionType>([p.questionType, ...p.questions.map((q) => q.type).filter((t): t is QuestionType => !!t)]);
  const authoredType = [...types].find((t) => AUTHORED_OPTION_TYPES.has(t));
  const needsParagraphs = [...types].some((t) => PARAGRAPH_OPTION_TYPES.has(t));
  if (!authoredType && !needsParagraphs) return null;

  const options = p.options?.length ? p.options : ["", "", ""];
  const set = (i: number, v: string) => onOptions(options.map((o, j) => (j === i ? v : o)));
  const parsed = parsePassageText(p.text);
  const paragraphs = paragraphOptions(parsed);

  return (
    <div className="mt-5 space-y-4">
      {authoredType && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-bold">Answer options</p>
          <p className="mb-3 text-xs text-muted-foreground">
            {OPTIONS_HELP[authoredType]}. Each question's correct answer is one of these letters; students see this list in the exam.
          </p>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-sm font-bold text-primary">{LETTERS[i]}</span>
                <Input value={o} onChange={(e) => set(i, e.target.value)} placeholder={`Option ${LETTERS[i]}`} />
                {options.length > 1 && (
                  <Button variant="ghost" size="icon-sm" title="Remove option" onClick={() => onOptions(options.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {options.length < LETTERS.length && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onOptions([...options, ""])}>
              <Plus className="size-4" /> Add option
            </Button>
          )}
        </div>
      )}
      {needsParagraphs && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-bold">Paragraphs (Matching Information answers)</p>
          {parsed.labels?.some(Boolean) ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {paragraphs.map((o, i) => (
                <span key={o.key} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" title={parsed.paragraphs[i]}>
                  {o.key} · {parsed.paragraphs[i]?.slice(0, 28) ?? ""}…
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              No paragraph letters found — students will see paragraphs lettered A–{paragraphs.at(-1)?.key ?? "A"} in order. To set them
              yourself, put each letter on its own line above its paragraph.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const READING_TYPES = Object.keys(QUESTION_TYPE_LABEL) as QuestionType[];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const withId = (q: AiStudioQuestion): StudioQuestion => ({
  id: Math.random().toString(36).slice(2, 9),
  prompt: q.prompt,
  answer: q.answer,
  type: q.type as QuestionType | undefined,
  options: q.options,
  wordLimit: q.wordLimit,
});

export function ReadingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const passages = exam.passages ?? [];
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setB = (k: string, v: boolean) => setBusy((m) => ({ ...m, [k]: v }));
  // Per passage: how many questions the next "Generate with AI" adds (not saved with the exam).
  const [genCount, setGenCount] = useState<Record<string, number>>({});
  // Keyed by passage id so simultaneous "extract" cards each keep their own file input.
  const extractInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const setP = (idx: number, np: Partial<StudioPassage>) =>
    patch({ passages: passages.map((p, i) => (i === idx ? { ...p, ...np } : p)) });

  return (
    <div className="space-y-5">
      {passages.map((p, idx) => {
        const patchQ = (qid: string, np: Partial<StudioQuestion>) =>
          setP(idx, { questions: p.questions.map((q) => (q.id === qid ? { ...q, ...np } : q)) });
        const toGenerate = genCount[p.id] ?? GENERATE_DEFAULT;
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
                <Field
                  label="Passage text"
                  hint="Put a paragraph letter (A, B, C…) on its own line above each paragraph to label it — students see the letters, and Matching Information uses them as the answers."
                >
                  <Textarea value={p.text} onChange={(e) => setP(idx, { text: e.target.value })} rows={12} placeholder="Paste or type the full reading passage here…" />
                </Field>
              ) : p.inputMode === "upload" ? (
                <Field label="Passage image">
                  <MediaDrop kind="image" value={p.imageName} onChange={(name) => setP(idx, { imageName: name })} />
                </Field>
              ) : (
                <Field label="Passage photos" hint="Upload photos of the passage and question sheet — AI reads them and fills the form.">
                  <div className="space-y-2">
                    <MediaDrop kind="image" value={p.imageName} onChange={(name) => setP(idx, { imageName: name })} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => {
                        if (el) extractInputRefs.current.set(p.id, el);
                        else extractInputRefs.current.delete(p.id);
                      }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setB(`ext:${p.id}`, true);
                        try {
                          const base64 = await fileToBase64(file);
                          const res = await api.ai.studioExtract({ images: [{ base64, mediaType: file.type || "image/jpeg" }] });
                          setP(idx, { text: res.passageText || p.text, questions: [...p.questions, ...res.questions.map(withId)] });
                        } catch {
                          setP(idx, {
                            text: p.text || "Extracted passage text (offline). Connect the AI service to read photos.",
                            questions: [...p.questions, newQuestion(), newQuestion()],
                          });
                        } finally {
                          setB(`ext:${p.id}`, false);
                        }
                      }}
                    />
                    <AiButton
                      label="Extract passage & questions"
                      loading={busy[`ext:${p.id}`]}
                      onClick={() => extractInputRefs.current.get(p.id)?.click()}
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

            <MatchingLegend passage={p} onOptions={(options) => setP(idx, { options })} />

            {/* questions */}
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">Questions ({p.questions.length})</p>
                <div className="flex flex-wrap items-center gap-2">
                  <GenerateCountInput value={toGenerate} onChange={(n) => setGenCount((m) => ({ ...m, [p.id]: n }))} />
                  <AiButton
                    label="Generate with AI"
                    loading={busy[`gen:${p.id}`]}
                    onClick={async () => {
                      setB(`gen:${p.id}`, true);
                      try {
                        const res = await api.ai.studioGenerate({
                          passageText: p.text,
                          questionType: p.questionType,
                          count: toGenerate,
                        });
                        setP(idx, { questions: [...p.questions, ...res.questions.map(withId)] });
                      } catch {
                        setP(idx, { questions: [...p.questions, ...aiQuestions(p.questionType, toGenerate)] });
                      } finally {
                        setB(`gen:${p.id}`, false);
                      }
                    }}
                  />
                  <AiButton
                    label="Fill Missing Answers with AI"
                    disabled={fillDisabled}
                    loading={busy[`fill:${p.id}`]}
                    onClick={async () => {
                      setB(`fill:${p.id}`, true);
                      try {
                        const res = await api.ai.studioFill({
                          passageText: p.text,
                          questions: p.questions.map((q) => ({ prompt: q.prompt, type: q.type ?? p.questionType, options: q.options, answer: q.answer, wordLimit: q.wordLimit })),
                        });
                        const filled = res.questions;
                        setP(idx, {
                          questions: p.questions.map((q, i) => (q.answer ? q : { ...q, answer: filled[i]?.answer ?? defaultAnswerFor(q.type ?? p.questionType) })),
                        });
                      } catch {
                        setP(idx, { questions: p.questions.map((q) => (q.answer ? q : { ...q, answer: defaultAnswerFor(q.type ?? p.questionType) })) });
                      } finally {
                        setB(`fill:${p.id}`, false);
                      }
                    }}
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
                      matchOptionsFor={(t) => matchingOptionsFor(t, p)}
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
