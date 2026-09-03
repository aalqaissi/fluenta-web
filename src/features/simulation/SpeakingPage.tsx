import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Sparkles, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app-context";
import { speakingParts, sampleSpeakingFeedback } from "@/mock/data";
import { bandTone, cn, formatBand, pad2 } from "@/lib/utils";

export function SpeakingPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("speaking");
  const [partIdx, setPartIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
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
    setElapsed(0);
  }

  return (
    <div>
      <PageHeader title="Speaking practice" subtitle="Record your answers and get AI feedback on fluency, vocabulary, grammar and pronunciation." />
      {locked && <UpgradeBanner feature="Speaking practice" />}

      <div className="mb-4 flex flex-wrap gap-2">
        {speakingParts.map((p, i) => (
          <button
            key={p.id}
            onClick={() => {
              setPartIdx(i);
              reset();
            }}
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* prompt + recorder */}
        <div className="space-y-4">
          {part.cueCard ? (
            <Card className="border-dashed p-5">
              <Badge variant="secondary" className="mb-2">Cue card</Badge>
              <p className="text-lg font-bold">{part.cueCard}</p>
              <p className="mt-2 text-sm text-muted-foreground">You should say:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                {part.bullets?.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="p-5">
              <Badge variant="info" className="mb-2">Examiner questions</Badge>
              <ul className="space-y-2.5">
                {part.questions.map((q, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="flex flex-col items-center p-6">
            <button
              onClick={() => (recording ? stop() : setRecording(true))}
              className={cn(
                "relative grid size-24 place-items-center rounded-full text-white transition-all",
                recording ? "bg-destructive" : "bg-warm-gradient hover:scale-105"
              )}
            >
              {recording && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />}
              {recording ? <Square className="size-8" /> : <Mic className="size-9" />}
            </button>
            <p className="mt-3 text-sm font-semibold tabular-nums">
              {recording ? "Recording…" : done ? "Recorded" : "Tap to record"} · {pad2(Math.floor(elapsed / 60))}:{pad2(elapsed % 60)}
            </p>
            {done && (
              <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
                <RotateCcw className="size-4" /> Re-record
              </Button>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Microphone is simulated in this preview.</p>
          </Card>
        </div>

        {/* feedback */}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-4 text-primary" /> AI feedback
          </h3>
          {!done ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Record your answer to see a band estimate and coaching notes for each speaking criterion.
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
    </div>
  );
}
