import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, Flag, Sparkles, Check } from "lucide-react";
import { writingTasks, sampleWritingResult } from "@/mock/data";
import { setLastWriting } from "@/store/attempt-store";
import { fullExamStore } from "@/features/simulation/fullexam-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GradingModal } from "@/features/exam-runner/GradingModal";
import { pad2, cn } from "@/lib/utils";
import { VisualPrompt } from "./VisualPrompt";

export function WritingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const full = sp.get("full");
  const task = writingTasks.find((t) => t.id === id) ?? writingTasks[0];
  const storeKey = `fluenta.writing.${task.id}`;

  const [text, setText] = useState(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved !== null) return saved;
    } catch { /* ignore */ }
    return task.id === "w-task2" ? sampleWritingResult.answer : "";
  });
  const [timeLeft, setTimeLeft] = useState(task.durationSec);
  const [grading, setGrading] = useState(false);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // autosave (debounced) so the answer isn't lost
  useEffect(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(storeKey, text); } catch { /* ignore */ }
      setSaved(true);
    }, 700);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [text, storeKey]);

  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const enough = words >= task.minWords;

  function submit() {
    setLastWriting({ taskId: task.id, answer: text, wordCount: words });
    try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
    setGrading(true);
  }

  function afterGrading() {
    if (full) {
      fullExamStore.record("writing", sampleWritingResult.overall);
      navigate("/simulation/full-exam");
    } else {
      navigate(`/results/writing/${task.id}`);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1040px] items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-bold">Writing · Task {task.taskNumber}</h1>
            <p className="text-xs text-muted-foreground">{task.kind}</p>
          </div>
          <span className={cn("hidden items-center gap-1 text-xs font-semibold sm:flex", saved ? "text-success" : "text-muted-foreground")}>
            {saved ? <><Check className="size-3.5" /> Saved</> : "Saving…"}
          </span>
          <div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums", timeLeft < 120 ? "bg-destructive/10 text-destructive" : "bg-muted")}>
            <Clock className="size-4" /> {pad2(Math.floor(timeLeft / 60))}:{pad2(timeLeft % 60)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1040px] px-4 py-6 md:px-6">
        <div className="mb-4 rounded-2xl border border-border bg-warm-soft p-5">
          <Badge variant="info" className="mb-2">
            <Sparkles className="size-3" /> Prompt
          </Badge>
          <p className="text-[15px] font-medium leading-relaxed">{task.prompt}</p>
          {task.bullets && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-[15px]">
              {task.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Write at least {task.minWords} words.</p>
          {task.visual && (
            <div className="mt-3">
              <VisualPrompt visual={task.visual} />
            </div>
          )}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          placeholder={task.kind === "Letter" ? "Dear Sir or Madam,…" : "Start writing your response here…"}
          className="min-h-[360px] text-[15px] leading-relaxed"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className={cn("text-sm font-semibold", enough ? "text-success" : "text-muted-foreground")}>
            {words} words {enough ? "· minimum reached" : `· ${task.minWords - words} to go`}
          </span>
          <Button variant="success" onClick={submit} disabled={words < 5}>
            <Flag className="size-4" /> Submit for AI feedback
          </Button>
        </div>
      </div>

      <GradingModal open={grading} onDone={afterGrading} />
    </div>
  );
}
