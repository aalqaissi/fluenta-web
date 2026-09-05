import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Sparkles, CheckCircle2, Loader2, BadgeCheck, TrendingUp, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getSpeakingExam } from "@/lib/mockApi";
import { cn } from "@/lib/utils";

type Step = "intro" | "generating";

const PARTS = [
  "Speaking Part 1 (Introduction & Interview)",
  "Speaking Part 2 (Individual Long Turn)",
  "Speaking Part 3 (Discussion)",
];
const EXPECT = [
  { icon: BadgeCheck, title: "Realistic Exam Experience", note: "Authentic IELTS format with proper timing and structure" },
  { icon: Sparkles, title: "Instant AI Feedback", note: "Detailed band scores and improvement suggestions immediately" },
  { icon: TrendingUp, title: "Progress Tracking", note: "Your results are saved and contribute to your overall progress" },
];

export function SpeakingStandardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [progress, setProgress] = useState(0);

  // simulate AI generating unique content for each of the 3 sections
  useEffect(() => {
    if (step !== "generating") return;
    setProgress(6);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(() => navigate(`/exam/speaking/${getSpeakingExam().id}`), 400);
          return 100;
        }
        return Math.min(100, p + 4);
      });
    }, 120);
    return () => clearInterval(t);
  }, [step]);

  if (step === "generating") {
    const done = Math.floor((progress / 100) * PARTS.length);
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-warm-soft">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <h1 className="text-xl font-extrabold">Generating your speaking practice</h1>
          <p className="mt-1 text-sm text-muted-foreground">Creating unique AI-powered content for each section.</p>

          <div className="mt-5 text-left">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Overall progress · {done} / {PARTS.length} sections</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="mt-5 space-y-2.5 text-left">
            {PARTS.map((label, i) => {
              const complete = progress >= ((i + 1) / PARTS.length) * 100;
              return (
                <div key={label} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {complete ? <CheckCircle2 className="size-4 text-success" /> : <Loader2 className="size-4 animate-spin text-primary" />}
                      {label}
                    </span>
                    <span className={cn("text-xs font-semibold", complete ? "text-success" : "text-muted-foreground")}>
                      {complete ? "Ready" : "Generating…"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Why the wait?</span> The AI creates fresh, authentic IELTS content for each
            section, so you never see the same questions twice.
          </p>
        </Card>
      </div>
    );
  }

  // intro
  return (
    <div className="mx-auto max-w-2xl py-4">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/simulation/speaking")}>
        <ArrowLeft className="size-4" /> Back to modes
      </Button>

      <Card className="p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Speaking practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Three-part speaking test with voice recording.</p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-warm-soft p-4">
          <Clock className="size-5 text-primary" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Exam duration</div>
            <div className="text-lg font-extrabold">11–14 minutes</div>
          </div>
        </div>

        <h2 className="mb-2 mt-6 text-sm font-bold">Exam structure</h2>
        <div className="space-y-2">
          {["Part 1: Introduction", "Part 2: Individual Long Turn", "Part 3: Discussion"].map((s, i) => (
            <div key={s} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
              <span className="text-sm font-semibold">{s}</span>
            </div>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-sm font-bold">What to expect</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXPECT.map((e) => (
            <div key={e.title} className="rounded-xl border border-border p-3">
              <e.icon className="mb-1.5 size-5 text-primary" />
              <div className="text-sm font-bold">{e.title}</div>
              <div className="text-xs text-muted-foreground">{e.note}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-muted/50 p-4 text-sm">
          <p className="font-semibold">Simulation rules</p>
          <p className="mt-1 text-muted-foreground">
            Treat it like the real thing — stay focused and don't switch away once you begin. Every simulation moves you closer to your goal score.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="lg" onClick={() => setStep("generating")}>
            <Play className="size-4" /> Start exam
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/simulation/speaking")}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
