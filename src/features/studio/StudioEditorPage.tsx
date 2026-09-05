import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, ArrowRight, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge, StepDots, Field } from "./components";
import { studioStore, useStudioExamsState, type StudioExam } from "./store";
import { ReadingEditor } from "./editors/ReadingEditor";
import { WritingEditor } from "./editors/WritingEditor";
import { ListeningEditor } from "./editors/ListeningEditor";
import { SpeakingEditor } from "./editors/SpeakingEditor";
import { FullMockEditor } from "./editors/FullMockEditor";

export function StudioEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exams, loading } = useStudioExamsState();
  const source = id ? exams.find((e) => e.id === id) : undefined;
  const [draft, setDraft] = useState<StudioExam | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Initialise (or switch) the editable draft once the exam is available from the store/API.
  useEffect(() => {
    if (source && (!draft || draft.id !== source.id)) setDraft(structuredClone(source));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (!draft) {
    if (loading) {
      return (
        <div className="mx-auto grid max-w-2xl place-items-center py-24 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading exam…</p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState icon={FileWarning} title="Content not found" action={<Button onClick={() => navigate("/studio")}>Back to Studio</Button>} />
      </div>
    );
  }

  const patch = (p: Partial<StudioExam>) => setDraft((d) => (d ? { ...d, ...p } : d));

  function save(status: "draft" | "published") {
    if (!draft) return;
    studioStore.update(draft.id, { ...draft, status });
    toast.success(status === "published" ? "Published" : "Draft saved", {
      description: status === "published" ? "Students can now see this content." : "Your changes are saved.",
    });
    if (status === "published") navigate("/studio");
  }

  const skillLabel = draft.skill === "full" ? "Full Mock" : draft.skill.replace(/^\w/, (c) => c.toUpperCase());
  // writing chooses its module via task tabs and sets time per task, so it hides the exam-level module/time
  const showMeta = draft.skill !== "full" && draft.skill !== "writing";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/studio")}>
          <ArrowLeft className="size-4" /> Content Studio
        </Button>
        <div className="flex items-center gap-2">
          <StatusBadge status={draft.status} />
          <Button variant="outline" size="sm" onClick={() => save("draft")}>
            <Save className="size-4" /> Save draft
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Edit {skillLabel} Exam</h1>
        <div className="mt-3"><StepDots step={step} /></div>
      </div>

      {/* meta — writing has no module/time here (the tabs choose the module, and time is per task) */}
      <Card className="mb-5 p-5">
        <div className={showMeta ? "grid gap-4 sm:grid-cols-[2fr_1fr_1fr]" : "grid gap-4"}>
          <Field label="Exam title">
            <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Academic Reading — Nature & Science" />
          </Field>
          {showMeta && (
            <>
              <Field label="Module">
                <Select value={draft.module} onValueChange={(v) => patch({ module: v as StudioExam["module"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="general">General Training</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Time limit (min)">
                <Input type="number" value={draft.timeLimit} onChange={(e) => patch({ timeLimit: Number(e.target.value) })} />
              </Field>
            </>
          )}
        </div>
      </Card>

      {step === 1 ? (
        <>
          {draft.skill === "reading" && <ReadingEditor exam={draft} patch={patch} />}
          {draft.skill === "writing" && <WritingEditor exam={draft} patch={patch} />}
          {draft.skill === "listening" && <ListeningEditor exam={draft} patch={patch} />}
          {draft.skill === "speaking" && <SpeakingEditor exam={draft} patch={patch} />}
          {draft.skill === "full" && <FullMockEditor exam={draft} patch={patch} />}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => save("draft")}>
              <Save className="size-4" /> Save draft
            </Button>
            <Button onClick={() => setStep(2)}>
              Review &amp; publish <ArrowRight className="size-4" />
            </Button>
          </div>
        </>
      ) : (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-success/12 text-success">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">Ready to publish?</h2>
              <p className="text-sm text-muted-foreground">Review the summary, then make it live for your students.</p>
            </div>
          </div>
          <div className="grid gap-2 rounded-xl border border-border p-4 text-sm">
            <Row label="Title" value={draft.title || "Untitled"} />
            <Row label="Type" value={skillLabel} />
            {showMeta && <Row label="Module" value={draft.module} />}
            <Row label="Summary" value={summary(draft)} />
          </div>
          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" /> Back to editing
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save("draft")}>
                <Save className="size-4" /> Save as draft
              </Button>
              <Button onClick={() => save("published")}>
                <Upload className="size-4" /> Publish
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold capitalize">{value}</span>
    </div>
  );
}

function summary(e: StudioExam): string {
  if (e.skill === "reading") return `${e.passages?.length ?? 0} passages · ${e.passages?.reduce((n, p) => n + p.questions.length, 0) ?? 0} questions`;
  if (e.skill === "listening") return `${e.sections?.length ?? 0} sections · ${e.sections?.reduce((n, s) => n + s.questions.length, 0) ?? 0} questions`;
  if (e.skill === "speaking") return `${e.parts?.length ?? 0} parts`;
  if (e.skill === "full") { const p = e.full; const n = p ? [p.reading, p.writing, p.listening, p.speaking].filter(Boolean).length : 0; return `${n}/4 parts selected`; }
  return "Task 1 & Task 2";
}
