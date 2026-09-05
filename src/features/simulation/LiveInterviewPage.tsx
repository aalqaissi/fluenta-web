import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Square, Sparkles, Bot, Loader2, PhoneOff, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { speakingParts, sampleSpeakingFeedback } from "@/mock/data";
import { speakingOverall } from "@/lib/mockApi";
import { brand } from "@/config/brand";
import { bandTone, cn, formatBand, pad2 } from "@/lib/utils";

type Utt = { part: number; text: string; adaptive?: boolean; cue?: boolean; bullets?: string[] };

// Scripted examiner turns, assembled from the seed parts (+ a couple of
// "adaptive" follow-ups to convey the real-time, responsive feel).
const UTTERANCES: Utt[] = [
  { part: 1, text: `Good morning. I'm ${brand.name}, your examiner today. Could you tell me your full name, please?` },
  ...speakingParts[0].questions.map((q) => ({ part: 1, text: q })),
  { part: 1, text: "That's interesting — could you expand on that a little?", adaptive: true },
  { part: 2, text: speakingParts[1].cueCard ?? "Describe a skill you would like to learn.", cue: true, bullets: speakingParts[1].bullets },
  { part: 2, text: "Take a moment to prepare, then speak for up to two minutes." },
  ...speakingParts[2].questions.map((q) => ({ part: 3, text: q })),
  { part: 3, text: "Why do you think that is?", adaptive: true },
];

type Line = { who: "examiner" | "you"; text: string; adaptive?: boolean; cue?: boolean; bullets?: string[] };
type Stage = "connecting" | "asking" | "answer" | "recording" | "thinking" | "ended";

export function LiveInterviewPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("connecting");
  const [idx, setIdx] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [secs, setSecs] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const overall = speakingOverall(sampleSpeakingFeedback);
  const current = UTTERANCES[idx];

  // exam clock (counts up while the interview is live)
  useEffect(() => {
    if (stage === "connecting" || stage === "ended") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // connecting -> first question
  useEffect(() => {
    if (stage !== "connecting") return;
    const t = setTimeout(() => setStage("asking"), 1600);
    return () => clearTimeout(t);
  }, [stage]);

  // examiner "speaks" the current utterance, then hands over to the candidate
  useEffect(() => {
    if (stage !== "asking") return;
    setLines((l) => [...l, { who: "examiner", text: current.text, adaptive: current.adaptive, cue: current.cue, bullets: current.bullets }]);
    const t = setTimeout(() => setStage("answer"), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, idx]);

  // examiner "thinks", then asks the next question (or ends)
  useEffect(() => {
    if (stage !== "thinking") return;
    const t = setTimeout(() => {
      if (idx + 1 < UTTERANCES.length) {
        setIdx((i) => i + 1);
        setStage("asking");
      } else {
        setLines((l) => [...l, { who: "examiner", text: "Thank you, that's the end of the speaking interview." }]);
        setStage("ended");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [stage, idx]);

  // autoscroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  function finishAnswer() {
    setLines((l) => [...l, { who: "you", text: "🎙️ (your spoken response)" }]);
    setStage("thinking");
  }

  const examinerActive = stage === "asking";
  const listening = stage === "recording";
  const statusLabel =
    stage === "connecting" ? "Connecting…" :
    stage === "asking" ? "Examiner speaking" :
    stage === "answer" ? "Your turn — tap to answer" :
    stage === "recording" ? "Listening…" :
    stage === "thinking" ? "Thinking…" :
    "Interview complete";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/simulation/speaking")}>
          <ArrowLeft className="size-4" /> Modes
        </Button>
        <div className="flex items-center gap-3">
          {stage !== "connecting" && stage !== "ended" && (
            <Badge variant="destructive" className="gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-current" /> LIVE
            </Badge>
          )}
          <span className="text-sm font-bold tabular-nums text-muted-foreground">{pad2(Math.floor(secs / 60))}:{pad2(secs % 60)}</span>
          {current && stage !== "ended" && <Badge variant="muted">Part {current.part} of 3</Badge>}
        </div>
      </div>

      {/* examiner avatar + status */}
      <Card className="mb-4 flex flex-col items-center gap-2 p-6">
        <div className={cn(
          "relative grid size-20 place-items-center rounded-full text-white transition-all",
          examinerActive ? "bg-warm-gradient scale-105 shadow-glow" : "bg-warm-gradient"
        )}>
          {examinerActive && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
          {stage === "connecting" || stage === "thinking" ? <Loader2 className="size-8 animate-spin" /> : <Bot className="size-9" />}
        </div>
        <div className="text-center">
          <p className="font-extrabold">{brand.name} Interviewer</p>
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Simulated live interview — voice is not captured in this preview.</p>
      </Card>

      {/* transcript */}
      <Card ref={scrollRef} className="mb-4 max-h-[46vh] space-y-3 overflow-y-auto p-5">
        {lines.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Connecting to your interviewer…</p>}
        {lines.map((ln, i) => (
          <div key={i} className={cn("flex gap-2.5", ln.who === "you" && "flex-row-reverse")}>
            <span className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
              ln.who === "examiner" ? "bg-warm-gradient text-white" : "bg-primary/10 text-primary"
            )}>
              {ln.who === "examiner" ? <Bot className="size-4" /> : "You"}
            </span>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              ln.who === "examiner" ? "bg-muted" : "bg-primary/[0.08]"
            )}>
              {ln.adaptive && <Badge variant="info" className="mb-1 gap-1"><Zap className="size-3" /> adaptive follow-up</Badge>}
              {ln.cue && <Badge variant="secondary" className="mb-1">Cue card</Badge>}
              <p>{ln.text}</p>
              {ln.bullets && (
                <ul className="mt-1 list-inside list-disc text-[13px] text-muted-foreground">
                  {ln.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* controls */}
      {stage === "ended" ? (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-4 text-primary" /> Interview feedback · overall band {formatBand(overall)}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {sampleSpeakingFeedback.map((f) => (
              <div key={f.key} className="rounded-xl border border-border p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{f.label}</span>
                  <span className={cn("text-lg font-extrabold", bandTone(f.band))}>{formatBand(f.band)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{f.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate("/simulation/speaking/live")}><Bot className="size-4" /> New interview</Button>
            <Button variant="outline" onClick={() => navigate("/coach")}>Discuss with Coach</Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-6">
          <button
            onClick={() => {
              if (stage === "answer") setStage("recording");
              else if (stage === "recording") finishAnswer();
            }}
            disabled={stage !== "answer" && stage !== "recording"}
            className={cn(
              "relative grid size-20 place-items-center rounded-full text-white transition-all disabled:opacity-40",
              listening ? "bg-destructive" : "bg-warm-gradient hover:scale-105"
            )}
            aria-label={listening ? "Stop answering" : "Start answering"}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />}
            {listening ? <Square className="size-7" /> : <Mic className="size-8" />}
          </button>
          <p className="text-sm font-semibold">
            {stage === "answer" ? "Tap to answer" : stage === "recording" ? "Tap when you've finished" : statusLabel}
          </p>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setStage("ended")}>
            <PhoneOff className="size-4" /> End interview
          </Button>
        </Card>
      )}
    </div>
  );
}
