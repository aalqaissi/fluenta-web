import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Square, Sparkles, Bot, Loader2, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sampleSpeakingFeedback } from "@/mock/data";
import { speakingOverall } from "@/lib/mockApi";
import { api } from "@/lib/api";
import type { SpeakingFeedback } from "@/mock/types";
import { brand } from "@/config/brand";
import { bandTone, cn, formatBand, pad2 } from "@/lib/utils";

type Line = { who: "examiner" | "you"; text: string };
// Note: unlike the scripted mock this replaces, there is no separate "the examiner is
// speaking" stage — the examiner's line lands in the transcript and is read aloud as
// soon as a turn/grade reply arrives, so "thinking" covers connecting-to-reply time.
type Stage = "connecting" | "answer" | "recording" | "thinking" | "grading" | "ended";

export function LiveInterviewPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("connecting");
  const [lines, setLines] = useState<Line[]>([]);
  const [part, setPart] = useState(1);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<{ overall: number; criteria: SpeakingFeedback[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mutedRef = useRef(false);
  // history is the running transcript sent to the server each turn; answersRef tracks
  // which part each candidate answer belongs to, for grouping at grade time.
  const historyRef = useRef<{ role: "examiner" | "candidate"; text: string }[]>([]);
  const answersRef = useRef<{ part: number; text: string }[]>([]);
  const doneRef = useRef(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  function speak(text: string) {
    if (mutedRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      synth.speak(u);
    } catch { /* unsupported — text is authoritative */ }
  }

  // Opening turn only: no candidate audio yet, so there's nothing to record/upload.
  async function sendTurn(audioUrl?: string) {
    setStage("thinking");
    try {
      const reply = await api.ai.liveInterview.turn({
        part,
        history: historyRef.current,
        answerAudioUrl: audioUrl ?? null,
      });
      // the interview may already have been ended (manual End / a done elsewhere) while
      // this request was in flight — treat this reply as stale and drop it.
      if (doneRef.current) return;
      historyRef.current = [...historyRef.current, { role: "examiner", text: reply.reply }];
      setLines((l) => [...l, { who: "examiner", text: reply.reply }]);
      setPart(reply.part);
      speak(reply.reply);
      if (reply.done) { doneRef.current = true; setStage("grading"); await gradeInterview(); }
      else setStage("answer");
    } catch {
      // API/offline error — degrade to a short scripted close so the demo never dead-ends.
      fallbackClose();
    }
  }

  function pickMime(): string {
    const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return c.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
  }
  function extFor(type: string): string { return type.includes("mp4") ? "m4a" : "webm"; }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        void uploadAnswer(blob);
      };
      recRef.current = rec;
      rec.start();
      setStage("recording");
    } catch {
      // mic denied — record a placeholder "you" turn and continue the loop
      void uploadAnswer(null);
    }
  }
  function stopRecording() {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  async function uploadAnswer(blob: Blob | null) {
    const answeredPart = part;
    setLines((l) => [...l, { who: "you", text: "🎙️ (your spoken response)" }]);
    let audioUrl: string | undefined;
    try {
      if (blob) {
        const file = new File([blob], `turn-${Date.now()}.${extFor(blob.type)}`, { type: blob.type || "audio/webm" });
        const up = await api.media.upload(file);
        audioUrl = up.url;
      }
    } catch { audioUrl = undefined; }
    // optimistic candidate turn; the server returns the real transcript which we substitute
    historyRef.current = [...historyRef.current, { role: "candidate", text: "(spoken answer)" }];
    setStage("thinking");
    try {
      const reply = await api.ai.liveInterview.turn({ part: answeredPart, history: historyRef.current.slice(0, -1), answerAudioUrl: audioUrl ?? null });
      // the interview may already have been ended (manual End / a done elsewhere) while
      // this request was in flight — treat this reply as stale and drop it.
      if (doneRef.current) return;
      // record the transcript for grading + replace the optimistic placeholder
      historyRef.current[historyRef.current.length - 1] = { role: "candidate", text: reply.transcript || "(spoken answer)" };
      answersRef.current = [...answersRef.current, { part: answeredPart, text: reply.transcript || "" }];
      historyRef.current = [...historyRef.current, { role: "examiner", text: reply.reply }];
      setLines((l) => [...l, { who: "examiner", text: reply.reply }]);
      setPart(reply.part);
      speak(reply.reply);
      if (reply.done) { doneRef.current = true; await gradeInterview(); } else setStage("answer");
    } catch { fallbackClose(); }
  }

  async function gradeInterview() {
    doneRef.current = true; // mark the session over before any await, so late turn replies no-op
    setStage("grading");
    // concatenate candidate transcripts per part (1..3), in order
    const byPart = new Map<number, string[]>();
    for (const a of answersRef.current) {
      if (!a.text) continue;
      byPart.set(a.part, [...(byPart.get(a.part) ?? []), a.text]);
    }
    const parts = [...byPart.entries()]
      .sort(([a], [b]) => a - b)
      .map(([number, texts]) => ({ number, transcript: texts.join(" "), note: "" }));
    try {
      if (parts.length === 0) throw new Error("no answers");
      const res = await api.ai.liveInterview.grade({ examId: "live-interview", parts });
      setResult({ overall: res.overall, criteria: res.criteria as SpeakingFeedback[] });
    } catch {
      setResult({ overall: speakingOverall(sampleSpeakingFeedback), criteria: sampleSpeakingFeedback });
    }
    setStage("ended");
  }

  function fallbackClose() {
    if (doneRef.current) return; // already ending/ended elsewhere — don't re-grade
    setLines((l) => [...l, { who: "examiner", text: "Thank you, that's the end of the speaking interview." }]);
    doneRef.current = true;
    void gradeInterview();
  }

  function endInterview() {
    doneRef.current = true; // set before any await so in-flight turn replies see the session as over
    stopRecording();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    void gradeInterview();
  }

  // exam clock
  useEffect(() => {
    if (stage === "connecting" || stage === "ended") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // open the interview: fetch the examiner's first question
  useEffect(() => {
    void sendTurn(undefined);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoscroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const examinerActive = stage === "thinking";
  const listening = stage === "recording";
  const statusLabel =
    stage === "connecting" ? "Connecting…" :
    stage === "answer" ? "Your turn — tap to answer" :
    stage === "recording" ? "Listening…" :
    stage === "thinking" || stage === "grading" ? "Thinking…" :
    "Interview complete";

  const overall = result?.overall ?? speakingOverall(sampleSpeakingFeedback);
  const criteria = result?.criteria ?? sampleSpeakingFeedback;

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
          {stage !== "ended" && <Badge variant="muted">Part {part} of 3</Badge>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute examiner" : "Mute examiner"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* examiner avatar + status */}
      <Card className="mb-4 flex flex-col items-center gap-2 p-6">
        <div className={cn(
          "relative grid size-20 place-items-center rounded-full text-white transition-all",
          examinerActive ? "bg-warm-gradient scale-105 shadow-glow" : "bg-warm-gradient"
        )}>
          {examinerActive && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
          {stage === "connecting" || stage === "thinking" || stage === "grading" ? <Loader2 className="size-8 animate-spin" /> : <Bot className="size-9" />}
        </div>
        <div className="text-center">
          <p className="font-extrabold">{brand.name} Interviewer</p>
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Live IELTS interview — your answers are transcribed to grade your speaking.</p>
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
              <p>{ln.text}</p>
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
            {criteria.map((f) => (
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
            <Button onClick={() => navigate(0)}><Bot className="size-4" /> New interview</Button>
            <Button variant="outline" onClick={() => navigate("/coach")}>Discuss with Coach</Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-6">
          <button
            onClick={() => {
              if (stage === "answer") startRecording();
              else if (stage === "recording") stopRecording();
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
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={endInterview}
            disabled={stage === "grading"}
          >
            <PhoneOff className="size-4" /> End interview
          </Button>
        </Card>
      )}
    </div>
  );
}
