import { useRef, useState } from "react";
import { FullMockCheck, READING_FULL, WritePassageWithAi, generationModule, passageBrief } from "../ContentRules";
import { Plus, Trash2, Type, Image as ImageIcon, Sparkles, ClipboardPaste } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { toast } from "sonner";
import { api, ApiError, type AiStudioQuestion } from "@/lib/api";
import { MediaDrop, AiButton, Field } from "../components";
import { QuestionRow, aiQuestions, defaultAnswerFor, GenerateCountInput, GenerateChooseSelect, GENERATE_DEFAULT, questionSpan, marksOf, questionsLabel } from "../QuestionRow";
import { newPassage, newQuestion, type StudioExam, type StudioPassage, type StudioQuestion } from "../store";
import { cn } from "@/lib/utils";
import {
  AUTHORED_OPTION_TYPES,
  LETTERS_ONCE_TYPES,
  LETTERS,
  PARAGRAPH_OPTION_TYPES,
  authoredOptions,
  matchingInstructions,
  matchingOptionsFor,
  optionLabel,
  optionListTitle,
  paragraphOptions,
  parseOptionList,
  parsePassageText,
} from "../passageText";
import { readingInstructions } from "../convert";
import { typeRuleLine } from "../questionTypeRules";

/**
 * The lettered list the AI works from for a matching type: the admin's list (blank rows included,
 * for the AI to write) or, for Matching Information, the passage's paragraphs. Undefined otherwise.
 */
function aiListFor(type: QuestionType, p: StudioPassage): string[] | undefined {
  if (AUTHORED_OPTION_TYPES.has(type)) return p.options ?? [];
  if (PARAGRAPH_OPTION_TYPES.has(type)) return parsePassageText(p.text).paragraphs;
  return undefined;
}

const OPTION_NOUN: Partial<Record<QuestionType, string>> = {
  "matching-sentence-endings": "Ending",
  "matching-headings": "Heading",
};

/**
 * The lettered list under a block of matching questions, laid out like the IELTS paper
 * ("Sentence endings / A. … / B. …"). Headings / Features / Sentence Endings are typed or pasted
 * here; it is one list per passage, shared by every block of that type in the passage.
 */
function OptionListEditor({
  type,
  passage: p,
  answers,
  onOptions,
  onFillWithAi,
  filling,
  numbered,
}: {
  type: QuestionType;
  passage: StudioPassage;
  answers: string[];
  /** this type's questions with their exam-wide numbers, for the each-letter-once check */
  numbered?: { n: number; answer: string }[];
  onOptions: (options: string[]) => void;
  /** AI writes the empty rows (filled ones are kept). */
  onFillWithAi: (options: string[]) => void;
  filling?: boolean;
}) {
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState("");
  const options = p.options?.length ? p.options : ["", "", ""];
  const set = (i: number, v: string) => onOptions(options.map((o, j) => (j === i ? v : o)));
  const blanks = options.filter((o) => !o.trim()).length;
  // Grow with empty rows; shrink only by dropping empty rows from the end (never a written one).
  const setRowCount = (n: number) => {
    const target = Math.max(1, Math.min(LETTERS.length, n));
    if (target >= options.length) return onOptions([...options, ...Array(target - options.length).fill("")]);
    const next = [...options];
    while (next.length > target && !next[next.length - 1].trim()) next.pop();
    onOptions(next);
  };
  const defined = new Set(authoredOptions(p.options).map((o) => o.key));
  const missing = [...new Set(answers.map((a) => a.trim().toUpperCase()).filter((a) => a && !defined.has(a)))]
    .sort()
    .map((k) => optionLabel(type, k));

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">{optionListTitle(type)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            Number of {(OPTION_NOUN[type] ?? "option").toLowerCase()}s
            <Input
              type="number"
              min={1}
              max={LETTERS.length}
              className="h-8 w-16"
              value={options.length}
              onChange={(e) => setRowCount(Math.floor(Number(e.target.value)) || 1)}
              aria-label={`Number of ${(OPTION_NOUN[type] ?? "option").toLowerCase()}s`}
            />
          </label>
          <AiButton label="Fill with AI" disabled={blanks === 0} loading={filling} onClick={() => onFillWithAi(options)} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(authoredOptions(p.options).map((o) => `${optionLabel(type, o.key)}. ${o.text}`).join("\n"));
              setPasting((v) => !v);
            }}
          >
            <ClipboardPaste className="size-4" /> {pasting ? "Edit one by one" : "Paste list"}
          </Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Set how many {(OPTION_NOUN[type] ?? "option").toLowerCase()}s ({LETTERS[0]}–{LETTERS[options.length - 1]}), type any you want to
        keep, and let AI write the empty ones. Then “Generate with AI” writes questions answered from this list — or add questions
        yourself and pick each one's letter.
      </p>

      {pasting ? (
        <div className="space-y-2">
          <Textarea
            rows={8}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={"A. expose errors that professionals would prefer not to make visible.\nB. prevent one noticeable feature from having excessive influence.\n…"}
          />
          <p className="text-xs text-muted-foreground">One option per line, starting with its letter (A. / A) / (A)). Lines without a letter take the next one.</p>
          <Button
            size="sm"
            onClick={() => {
              onOptions(parseOptionList(draft));
              setPasting(false);
            }}
          >
            Use this list
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-sm font-bold text-primary">{optionLabel(type, LETTERS[i])}.</span>
                <Input value={o} onChange={(e) => set(i, e.target.value)} placeholder={`${OPTION_NOUN[type] ?? "Option"} ${optionLabel(type, LETTERS[i])}`} />
                {options.length > 1 && (
                  <Button variant="ghost" size="icon-sm" title="Remove" onClick={() => onOptions(options.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {options.length < LETTERS.length && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onOptions([...options, ""])}>
              <Plus className="size-4" /> Add {LETTERS[options.length]}
            </Button>
          )}
        </>
      )}

      {LETTERS_ONCE_TYPES.has(type) && (
        <LettersOnceWarnings type={type} numbered={numbered ?? []} listSize={defined.size} />
      )}

      {missing.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-destructive">
          {missing.length === 1 ? `Answer ${missing[0]} isn't` : `Answers ${missing.join(", ")} aren't`} in this list yet — students can't see what{" "}
          {missing.length === 1 ? "it means" : "they mean"}.
        </p>
      )}
    </div>
  );
}

/**
 * IELTS rules for Matching Headings / Sentence Endings: each list entry answers at most one question,
 * and the list is longer than the number of questions (the spare entries are distractors).
 */
function LettersOnceWarnings({ type, numbered, listSize }: { type: QuestionType; numbered: { n: number; answer: string }[]; listSize: number }) {
  const byLetter = new Map<string, number[]>();
  for (const { n, answer } of numbered) {
    const k = answer.trim().toUpperCase();
    if (k) byLetter.set(k, [...(byLetter.get(k) ?? []), n]);
  }
  const repeats = [...byLetter.entries()].filter(([, ns]) => ns.length > 1).sort(([a], [b]) => a.localeCompare(b));
  const noun = type === "matching-headings" ? "heading" : "ending";
  const tooShort = listSize > 0 && numbered.length > 0 && listSize <= numbered.length;
  if (!repeats.length && !tooShort) return null;
  return (
    <div className="mt-3 space-y-1 text-xs font-semibold text-destructive">
      {repeats.map(([k, ns]) => (
        <p key={k}>
          {optionLabel(type, k)} is the answer to Questions {ns.join(" and ")} — in IELTS each {noun} can be used only once.
        </p>
      ))}
      {tooShort && (
        <p>
          IELTS lists have more {noun}s than questions — add at least {numbered.length + 1 - listSize} more {noun}
          {numbered.length + 1 - listSize === 1 ? "" : "s"} so some are left over.
        </p>
      )}
    </div>
  );
}

/** Read-only paragraph letters under a block of Matching Information questions. */
function ParagraphList({ passage: p }: { passage: StudioPassage }) {
  const parsed = parsePassageText(p.text);
  const paragraphs = paragraphOptions(parsed);
  const labelled = parsed.labels?.some(Boolean);
  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-bold">Paragraphs</p>
      {!labelled && (
        <p className="mb-2 text-xs text-muted-foreground">
          No paragraph letters in the passage text, so they're lettered in order. To set them yourself, put each letter on its own line above
          its paragraph.
        </p>
      )}
      <ul className="mt-1 space-y-1 text-sm">
        {paragraphs.map((o, i) => (
          <li key={o.key} className="flex gap-2">
            <span className="w-6 shrink-0 font-bold text-primary">{o.key}.</span>
            <span className="truncate text-muted-foreground">{parsed.paragraphs[i]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Consecutive questions of the same (effective) type, with their index in the passage. */
function questionRuns(p: StudioPassage): { type: QuestionType; items: { q: StudioQuestion; qi: number }[] }[] {
  const runs: { type: QuestionType; items: { q: StudioQuestion; qi: number }[] }[] = [];
  p.questions.forEach((q, qi) => {
    const type = q.type ?? p.questionType;
    const last = runs.at(-1);
    if (last && last.type === type) last.items.push({ q, qi });
    else runs.push({ type, items: [{ q, qi }] });
  });
  return runs;
}

// form completion is a Listening task type; everything else is valid for Reading
const READING_TYPES = (Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).filter((t) => t !== "form-completion");

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
  accepted: q.accepted,
  choose: q.choose === 3 ? 3 : q.choose === 2 ? 2 : undefined,
});

export function ReadingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const passages = exam.passages ?? [];
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setB = (k: string, v: boolean) => setBusy((m) => ({ ...m, [k]: v }));
  // Per passage: how many questions the next "Generate with AI" adds (not saved with the exam).
  const [genCount, setGenCount] = useState<Record<string, number>>({});
  // Per passage: "Choose TWO" or "THREE" for the next multi-select generation.
  const [chooseFor, setChooseFor] = useState<Record<string, 2 | 3>>({});
  // Keyed by passage id so simultaneous "extract" cards each keep their own file input.
  const extractInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const setP = (idx: number, np: Partial<StudioPassage>) =>
    patch({ passages: passages.map((p, i) => (i === idx ? { ...p, ...np } : p)) });

  return (
    <div className="space-y-5">
      <FullMockCheck counts={passages.map((p) => marksOf(p.questions, p.questionType))} target={READING_FULL} unit="Passage" />
      {exam.module === "both" && (
        <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Academic and General Training reading are written and stored separately — set the exam's module to Academic or General
          Training. AI writing uses the Academic rules until you do.
        </p>
      )}
      {passages.map((p, idx) => {
        const patchQ = (qid: string, np: Partial<StudioQuestion>) =>
          setP(idx, { questions: p.questions.map((q) => (q.id === qid ? { ...q, ...np } : q)) });
        const toGenerate = genCount[p.id] ?? GENERATE_DEFAULT;
        // Questions are numbered across the whole exam, as on the paper.
        const offset = passages.slice(0, idx).reduce((n, x) => n + x.questions.reduce((m, q) => m + questionSpan(q, x.questionType), 0), 0);
        // First question number of each question (a "Choose TWO" takes two numbers).
        const starts: number[] = [];
        p.questions.reduce((k, q) => (starts.push(k + 1), k + questionSpan(q, p.questionType)), offset);
        const genChoose = chooseFor[p.id] ?? 2;
        // The passage's paragraph letters (labelled, else A, B, C… in order) — what Headings questions name.
        const parsedText = parsePassageText(p.text);
        const paragraphKeys = paragraphOptions(parsedText).map((o) => o.key);
        const unlabelled = !parsedText.labels?.some(Boolean);

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
                  <div className="mb-2 space-y-2 rounded-lg bg-muted/40 p-2.5">
                    <p className="text-xs text-muted-foreground">{passageBrief(exam.module, idx + 1)}</p>
                    <WritePassageWithAi
                      module={exam.module}
                      section={idx + 1}
                      onDone={(r) => setP(idx, { text: r.text, title: p.title || r.title })}
                    />
                  </div>
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

            {/* questions */}
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">Questions ({questionsLabel(p.questions, p.questionType)})</p>
                <div className="flex flex-wrap items-center gap-2">
                  <GenerateCountInput value={toGenerate} onChange={(n) => setGenCount((m) => ({ ...m, [p.id]: n }))} />
                  {p.questionType === "multi-select" && (
                    <GenerateChooseSelect value={genChoose} onChange={(c) => setChooseFor((m) => ({ ...m, [p.id]: c }))} />
                  )}
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
                          choose: p.questionType === "multi-select" ? genChoose : undefined,
                          paragraphs: p.questionType === "matching-headings" ? paragraphKeys : undefined,
                          options: aiListFor(p.questionType, p),
                          module: generationModule(exam.module),
                          section: idx + 1,
                          skill: "reading",
                        });
                        setP(idx, {
                          questions: [...p.questions, ...res.questions.map(withId)],
                          // Matching: the AI completed the list first; keep it with the questions it answers.
                          ...(res.options?.length && AUTHORED_OPTION_TYPES.has(p.questionType) ? { options: res.options } : {}),
                        });
                      } catch {
                        setP(idx, { questions: [...p.questions, ...aiQuestions(p.questionType, toGenerate)] });
                      } finally {
                        setB(`gen:${p.id}`, false);
                      }
                    }}
                  />
                  <AiButton
                    label="Fill Missing Answers with AI"
                    loading={busy[`fill:${p.id}`]}
                    onClick={async () => {
                      setB(`fill:${p.id}`, true);
                      try {
                        const res = await api.ai.studioFill({
                          passageText: p.text,
                          questions: p.questions.map((q) => ({ prompt: q.prompt, type: q.type ?? p.questionType, options: aiListFor(q.type ?? p.questionType, p) ?? q.options, answer: q.answer, wordLimit: q.wordLimit, accepted: q.accepted, choose: q.choose })),
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
                <div className="space-y-4">
                  {/* One block per run of same-type questions, laid out like the paper:
                      "Questions 32–36 / instruction / questions / Sentence endings A–H". */}
                  {questionRuns(p).map((run) => {
                    const lastQ = run.items[run.items.length - 1];
                    const first = starts[run.items[0].qi];
                    const last = starts[lastQ.qi] + questionSpan(lastQ.q, p.questionType) - 1;
                    const opts = matchingOptionsFor(run.type, p);
                    return (
                      <div key={run.items[0].q.id} className="rounded-xl border border-border p-4">
                        <p className="text-sm font-bold">
                          {first === last ? `Question ${first}` : `Questions ${first}–${last}`}
                          <span className="font-semibold text-muted-foreground"> · {QUESTION_TYPE_LABEL[run.type]}</span>
                        </p>
                        <p className="mt-0.5 text-sm italic text-muted-foreground">
                          {matchingInstructions(run.type, opts) ?? readingInstructions(run.type)}
                        </p>
                        {typeRuleLine(run.type) && (
                          <p className="mb-3 mt-1.5 rounded-lg bg-info/[0.06] px-2.5 py-1.5 text-xs text-info">
                            <span className="font-bold">IELTS — what this tests: </span>
                            {typeRuleLine(run.type)}
                          </p>
                        )}
                        <div className="space-y-3">
                          {run.items.map(({ q, qi }) => (
                            <QuestionRow
                              key={q.id}
                              q={q}
                              n={starts[qi]}
                              inheritType={p.questionType}
                              typeOptions={READING_TYPES}
                              matchOptionsFor={(t) => matchingOptionsFor(t, p)}
                              paragraphChoices={paragraphKeys}
                              onChange={(np) => patchQ(q.id, np)}
                              onDelete={() => setP(idx, { questions: p.questions.filter((x) => x.id !== q.id) })}
                            />
                          ))}
                        </div>
                        {AUTHORED_OPTION_TYPES.has(run.type) && (
                          <OptionListEditor
                            type={run.type}
                            passage={p}
                            answers={p.questions.filter((x) => (x.type ?? p.questionType) === run.type).map((x) => x.answer)}
                            numbered={p.questions.flatMap((x, i) =>
                              (x.type ?? p.questionType) === run.type ? [{ n: starts[i], answer: x.answer }] : [],
                            )}
                            onOptions={(options) => setP(idx, { options })}
                            filling={busy[`opt:${p.id}`]}
                            onFillWithAi={async (options) => {
                              setB(`opt:${p.id}`, true);
                              try {
                                // count 0: only write the empty rows of the list.
                                const res = await api.ai.studioGenerate({ passageText: p.text, questionType: run.type, count: 0, options });
                                if (res.options?.length) setP(idx, { options: res.options });
                              } catch (err) {
                                toast.error(err instanceof ApiError ? err.message : "AI is unavailable right now — type the list yourself.");
                              } finally {
                                setB(`opt:${p.id}`, false);
                              }
                            }}
                          />
                        )}
                        {PARAGRAPH_OPTION_TYPES.has(run.type) && <ParagraphList passage={p} />}
                        {run.type === "matching-headings" && unlabelled && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            No paragraph letters in the passage text, so questions name paragraphs A–{paragraphKeys.at(-1) ?? "A"} in order.
                            Put each letter on its own line above its paragraph to set them.
                          </p>
                        )}
                      </div>
                    );
                  })}
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
