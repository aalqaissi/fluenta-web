import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Flag, Sparkles } from "lucide-react";
import { writingTasks, sampleWritingResult } from "@/mock/data";
import { setLastWriting } from "@/store/attempt-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GradingModal } from "@/features/exam-runner/GradingModal";
import { pad2, cn } from "@/lib/utils";

export function WritingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const task = writingTasks.find((t) => t.id === id) ?? writingTasks[0];

  const [text, setText] = useState(sampleWritingResult.answer);
  const [timeLeft, setTimeLeft] = useState(task.durationSec);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const enough = words >= task.minWords;

  function submit() {
    setLastWriting({ taskId: task.id, answer: text, wordCount: words });
    setGrading(true);
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1000px] items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-bold">Writing · Task {task.taskNumber}</h1>
            <p className="text-xs text-muted-foreground">{task.kind}</p>
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums", timeLeft < 120 ? "bg-destructive/10 text-destructive" : "bg-muted")}>
            <Clock className="size-4" /> {pad2(mins)}:{pad2(secs)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
        <div className="mb-4 rounded-2xl border border-border bg-warm-soft p-5">
          <Badge variant="info" className="mb-2">
            <Sparkles className="size-3" /> Prompt
          </Badge>
          <p className="text-[15px] font-medium leading-relaxed">{task.prompt}</p>
          <p className="mt-2 text-xs text-muted-foreground">Write at least {task.minWords} words.</p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          placeholder="Start writing your response here…"
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

      <GradingModal open={grading} onDone={() => navigate(`/results/writing/${task.id}`)} />
    </div>
  );
}
