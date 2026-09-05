import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, RotateCcw, Sparkles, Bot, Send, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { speakingParts, sampleSpeakingFeedback } from "@/mock/data";
import { getSpeakingExam } from "@/lib/mockApi";
import { ExaminerAudio } from "@/features/exam-runner/ExaminerAudio";
import { bandTone, cn, formatBand, pad2 } from "@/lib/utils";

const MODES = [
  { key: "full", label: "Full Simulation" },
  { key: "part", label: "Practice by Part" },
  { key: "topic", label: "Practice by Topic" },
];
const TOPICS = ["Work & Study", "Hometown", "Technology", "Travel", "Environment", "Hobbies"];

/** The self-paced speaking practice — the core of "Standard Practice" mode. */
export function StandardSpeakingPractice() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("full");
  const [partIdx, setPartIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ref = useRef<number | null>(null);
  const part = speakingParts[partIdx];

  useEffect(() => {
    if (recording) ref.current = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    else if (ref.current) clearInterval(ref.current);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [recording]);

  function stop() {
    setRecording(false);
    setDone(true);
  }
  function reset() {
    setRecording(false);
    setDone(false);
    setSubmitted(false);
    setElapsed(0);
  }

  return (
    <div>
      {mode === "full" && (
        <Card className="mb-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">Sit the full 3-part speaking test</h2>
            <p className="text-sm text-muted-foreground">
              Interview, cue-card long turn, and discussion — recorded in sequence, then AI-reviewed.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate(`/exam/speaking/${getSpeakingExam().id}`)}>
            <Play className="size-4" /> Start full test
          </Button>
        </Card>
      )}

      {/* practice-type chooser */}
      <div className="mb-4 inline-flex rounded-xl border border-border bg-surface p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); reset(); }}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
              mode === m.key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "topic" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {TOPICS.map((t, i) => (
            <button
              key={t}
              onClick={() => reset()}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                i === 0 ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {speakingParts.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { setPartIdx(i); reset(); }}
              className={cn(
                "rounded-xl border px-3.5 py-2 text-left text-sm transition-colors",
                i === partIdx ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-muted"
              )}
            >
              <div className="font-bold">Part {p.number}</div>
              <div className="text-xs text-muted-foreground">{p.title}</div>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {part.cueCard ? (
            <Card className="border-dashed p-5">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="secondary">Cue card</Badge>
                <ExaminerAudio label="Play examiner" />
              </div>
              <p className="text-lg font-bold">{part.cueCard}</p>
              <p className="mt-2 text-sm text-muted-foreground">You should say:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                {part.bullets?.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">1 minute to prepare · up to 2 minutes to speak.</p>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="info">Examiner questions</Badge>
                <span className="text-xs text-muted-foreground">Tap ▶ to hear each question</span>
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

          <Card className="flex flex-col items-center p-6">
            <button
              onClick={() => (recording ? stop() : setRecording(true))}
              disabled={submitted}
              className={cn(
                "relative grid size-24 place-items-center rounded-full text-white transition-all disabled:opacity-60",
                recording ? "bg-destructive" : "bg-warm-gradient hover:scale-105"
              )}
            >
              {recording && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />}
              {recording ? <Square className="size-8" /> : <Mic className="size-9" />}
            </button>
            <p className="mt-3 text-sm font-semibold tabular-nums">
              {recording ? "Recording…" : done ? "Recorded" : "Tap to record"} · {pad2(Math.floor(elapsed / 60))}:{pad2(elapsed % 60)}
            </p>
            {done && !submitted && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="size-4" /> Re-record
                </Button>
                <Button size="sm" onClick={() => setConfirmOpen(true)}>
                  <Send className="size-4" /> Submit for review
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Microphone is simulated in this preview.</p>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-4 text-primary" /> AI feedback
          </h3>
          {!submitted ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Record your answer and submit it for review to see a band estimate and coaching notes for each speaking criterion.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {sampleSpeakingFeedback.map((f) => (
                <div key={f.key} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{f.label}</span>
                    <span className={cn("text-lg font-extrabold", bandTone(f.band))}>{formatBand(f.band)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{f.note}</p>
                </div>
              ))}
              <Button className="w-full" onClick={() => navigate("/coach")}>
                <Bot className="size-4" /> Discuss with Fluenta Coach
              </Button>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit for review?"
        description="Your recording will be saved to your account and sent for AI feedback. You can re-record before submitting."
        confirmLabel="Yes, submit"
        cancelLabel="Keep working"
        destructive={false}
        onConfirm={() => setSubmitted(true)}
      />
    </div>
  );
}
