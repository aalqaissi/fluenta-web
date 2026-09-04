import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Flag, Mic, RotateCcw, Square } from "lucide-react";
import { getSpeakingExam, getSpeakingFeedback, speakingOverall } from "@/lib/mockApi";
import { studioStore } from "@/features/studio/store";
import { studioSpeakingToExam } from "@/features/studio/convert";
import { setLastSpeaking } from "@/store/attempt-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExaminerAudio } from "./ExaminerAudio";
import { GradingModal } from "./GradingModal";
import { pad2, cn } from "@/lib/utils";

export function SpeakingRunnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exam = useMemo(() => {
    const authored = id ? studioStore.get().find((e) => e.id === id && e.skill === "speaking") : undefined;
    return authored && (authored.parts?.length ?? 0) > 0 ? studioSpeakingToExam(authored) : getSpeakingExam();
  }, [id]);

  const [pIdx, setPIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<Record<string, boolean>>({});
  const [grading, setGrading] = useState(false);
  const ref = useRef<number | null>(null);

  const part = exam.parts[pIdx];
  const cap = part.durationSec;
  const completed = Object.values(recorded).filter(Boolean).length;

  useEffect(() => {
    if (!recording) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = window.setInterval(() => {
      setElapsed((v) => {
        if (v + 1 >= cap) {
          if (ref.current) clearInterval(ref.current);
          setRecording(false);
          setRecorded((r) => ({ ...r, [part.id]: true }));
          return cap;
        }
        return v + 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [recording, cap, part.id]);

  function toggleRecord() {
    if (recording) {
      setRecording(false);
      setRecorded((r) => ({ ...r, [part.id]: true }));
    } else {
      setElapsed(0);
      setRecording(true);
    }
  }

  function goToPart(i: number) {
    setRecording(false);
    setElapsed(0);
    setPIdx(i);
  }

  function submit() {
    const feedback = getSpeakingFeedback();
    setLastSpeaking({
      examId: exam.id,
      overall: speakingOverall(feedback),
      feedback,
      partsRecorded: completed,
    });
    setGrading(true);
  }

  const isDone = recorded[part.id];

  return (
    <div className="min-h-dvh bg-background">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1000px] items-center gap-4 px-4 py-3 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              Speaking · Part {part.number} of {exam.parts.length}
            </p>
          </div>
          <Badge variant="muted" className="hidden sm:inline-flex">
            Recording {pIdx + 1} of {exam.parts.length} · {completed} completed
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-4 py-5 md:px-6">
        {/* part header */}
        <div className="mb-4">
          <Badge variant="info" className="mb-1">Part {part.number}</Badge>
          <h2 className="text-lg font-extrabold">{part.title}</h2>
        </div>

        {/* prompt */}
        {part.cueCard ? (
          <Card className="mb-5 border-dashed p-5">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="secondary">Cue card</Badge>
              <ExaminerAudio label="Play examiner" />
            </div>
            <p className="text-lg font-bold">{part.cueCard}</p>
            {part.bullets && part.bullets.length > 0 && (
              <>
                <p className="mt-2 text-sm text-muted-foreground">You should say:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                  {part.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-3 text-xs text-muted-foreground">1 minute to prepare · up to 2 minutes to speak.</p>
          </Card>
        ) : (
          <Card className="mb-5 p-5">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="info">Examiner questions</Badge>
              <span className="text-xs text-muted-foreground">Answer them all in a single recording.</span>
            </div>
            <ul className="space-y-2.5">
              {part.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p>{q}</p>
                    <div className="mt-1.5">
                      <ExaminerAudio label="Play" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* recorder */}
        <Card className="mb-5 flex flex-col items-center p-6">
          <button
            onClick={toggleRecord}
            className={cn(
              "relative grid size-24 place-items-center rounded-full text-white transition-all",
              recording ? "bg-destructive" : "bg-warm-gradient hover:scale-105"
            )}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />}
            {recording ? <Square className="size-8" /> : <Mic className="size-9" />}
          </button>
          <p className="mt-3 text-sm font-semibold tabular-nums">
            {recording ? "Recording…" : isDone ? "Recorded" : "Tap to record"} · {pad2(Math.floor(elapsed / 60))}:{pad2(elapsed % 60)} / {pad2(Math.floor(cap / 60))}:{pad2(cap % 60)}
          </p>
          {isDone && !recording && (
            <Button variant="outline" size="sm" className="mt-3" onClick={toggleRecord}>
              <RotateCcw className="size-4" /> Re-record
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Microphone is simulated in this preview.</p>
        </Card>

        {/* footer nav */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-soft-md backdrop-blur">
          <Button variant="outline" disabled={pIdx === 0} onClick={() => goToPart(pIdx - 1)}>
            <ArrowLeft className="size-4" /> Previous
          </Button>
          <div className="hidden gap-1.5 sm:flex">
            {exam.parts.map((_, i) => (
              <button
                key={i}
                onClick={() => goToPart(i)}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  i === pIdx ? "bg-primary" : "bg-border hover:bg-muted-foreground/40"
                )}
                aria-label={`Part ${i + 1}`}
              />
            ))}
          </div>
          {pIdx < exam.parts.length - 1 ? (
            <Button onClick={() => goToPart(pIdx + 1)}>
              Next part <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button variant="success" onClick={submit}>
              <Flag className="size-4" /> Submit for review
            </Button>
          )}
        </div>
      </div>

      <GradingModal open={grading} onDone={() => navigate(`/results/speaking/${exam.id}`)} />
    </div>
  );
}
