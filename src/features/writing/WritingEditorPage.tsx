import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Flag, Sparkles, Check } from "lucide-react";
import { sampleWritingResult } from "@/mock/data";
import { resolveWritingTask } from "@/features/studio/convert";
import { setLastWriting, setWritingResult } from "@/store/attempt-store";
import { api } from "@/lib/api";
import { fullExamStore } from "@/features/simulation/fullexam-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GradingModal } from "@/features/exam-runner/GradingModal";
import { EXAM_TIMING, useExamMode } from "@/features/exam-runner/examMode";
import { ModeBadge } from "@/features/exam-runner/ModeBadge";
import { TimerControl, useRunnerTimer } from "@/features/exam-runner/RunnerTimer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VisualPrompt } from "./VisualPrompt";

export function WritingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { mode, full } = useExamMode();
  /** full-exam writing runs Task 1 then Task 2: the Task 1 runner carries the Task 2 id */
  const next = sp.get("next");
  const task = resolveWritingTask(id);
  const storeKey = `fluenta.writing.${task.id}`;

  const [text, setText] = useState(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved !== null) return saved;
    } catch { /* ignore */ }
    // the demo sample answer is a practice convenience — exam conditions start from a blank page
    return task.id === "w-task2" && mode === "practice" ? sampleWritingResult.answer : "";
  });
  const [gradeState, setGradeState] = useState<"idle" | "loading" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<number | null>(null);

  // Exam: official task time (Task 1 20 min / Task 2 40 min), auto-submit at 0. Practice: optional timer.
  const timer = useRunnerTimer({
    mode,
    durationSec: mode === "exam" ? (task.taskNumber === 1 ? EXAM_TIMING.writingTask1Sec : EXAM_TIMING.writingTask2Sec) : task.durationSec,
    onExpire: () => {
      if (gradeState === "loading") return;
      if (!text.trim()) {
        toast.info("Time is up — no answer was written for this task.");
        afterGrading(0);
      } else submit();
    },
  });

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

  async function submit() {
    setAttempt((n) => n + 1);
    setLastWriting({ taskId: task.id, answer: text, wordCount: words });
    setGradeState("loading");
    try {
      const res = await api.ai.writingFeedback({
        taskId: task.id,
        taskNumber: task.taskNumber,
        kind: task.kind,
        module: task.module,
        prompt: task.prompt,
        minWords: task.minWords,
        essay: text,
      });
      setWritingResult(res);
      try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
      afterGrading(res.overall);
    } catch {
      setGradeState("error");
    }
  }

  /** Record the real graded band (not a sample) in a full exam; cancel/error leaves it unrecorded. */
  function afterGrading(overall?: number) {
    if (full) {
      if (overall !== undefined) fullExamStore.record(task.taskNumber === 1 ? "writingT1" : "writingT2", overall);
      navigate(next && overall !== undefined ? `/exam/writing/${next}?full=1` : "/simulation/full-exam");
    } else if (overall === 0 && !text.trim()) {
      navigate(-1);
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
          <ModeBadge mode={mode} />
          <TimerControl timer={timer} />
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
          <Button variant="success" onClick={submit} disabled={words < 5 || gradeState === "loading"}>
            <Flag className="size-4" /> Submit for AI feedback
          </Button>
        </div>
      </div>

      <GradingModal
        key={attempt}
        open={gradeState !== "idle"}
        onDone={() => afterGrading()}
        mode="async"
        state={gradeState === "error" ? "error" : "loading"}
        errorText="We couldn't grade your essay right now."
        onRetry={submit}
        onCancel={() => { setWritingResult(null); afterGrading(); }}
      />
    </div>
  );
}
