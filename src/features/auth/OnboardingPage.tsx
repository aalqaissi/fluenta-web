import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Sparkles, Clock, CheckCircle2, ChevronLeft, GraduationCap, Target, CalendarDays,
  TrendingUp, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth-context";
import { cn } from "@/lib/utils";

const EXAM_TYPES = [
  { key: "IELTS (Academic/General)", emoji: "🎓" },
  { key: "TOEFL", emoji: "📗" },
  { key: "PTE Academic", emoji: "🏫" },
  { key: "Duolingo English Test", emoji: "🦉" },
  { key: "Cambridge English", emoji: "🎯" },
  { key: "Other English Exam", emoji: "📝" },
];
const PURPOSES = [
  { key: "Study Abroad", emoji: "🎓" },
  { key: "Immigration/PR", emoji: "✈️" },
  { key: "Work Abroad", emoji: "💼" },
  { key: "Local University", emoji: "🏛️" },
  { key: "Career Advancement", emoji: "📈" },
  { key: "I am a Teacher", emoji: "🧑‍🏫" },
];
const LEVELS = [
  { key: "beginner", label: "Beginner", note: "Just starting out", emoji: "🌱" },
  { key: "elementary", label: "Elementary", note: "Basic understanding", emoji: "🌿" },
  { key: "intermediate", label: "Intermediate", note: "Good conversation skills", emoji: "🌳" },
  { key: "upper-intermediate", label: "Upper Intermediate", note: "Confident speaker", emoji: "🌲" },
  { key: "advanced", label: "Advanced", note: "Near-native fluency", emoji: "🌴" },
];
const BANDS = ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { status, user, setUser } = useAuth();
  const [step, setStep] = useState(1); // 1..4
  const [examType, setExamType] = useState("IELTS (Academic/General)");
  const [purpose, setPurpose] = useState("");
  const [examDate, setExamDate] = useState("");
  const [level, setLevel] = useState("");
  const [target, setTarget] = useState("6.5");
  const [saving, setSaving] = useState(false);

  if (status === "unauthed" || (status !== "loading" && !user)) return <Navigate to="/login" replace />;
  if (user?.onboarded) return <Navigate to="/" replace />;

  const daysUntil = examDate
    ? Math.max(0, Math.ceil((new Date(examDate + "T00:00:00").getTime() - Date.now()) / 86400000))
    : null;

  async function complete() {
    setSaving(true);
    try {
      const updated = await api.me.patch({
        examType,
        purpose,
        level,
        targetBand: parseFloat(target),
        examDate: examDate || "",
        track: "ielts",
        onboarded: true,
      });
      setUser(updated);
      navigate("/", { replace: true });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        {step > 1 && (
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" /> Back
            </button>
            <span className="text-sm font-semibold text-muted-foreground">Step {step} of 4</span>
          </div>
        )}
        {step > 1 && (
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        )}

        {step === 1 && (
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft md:p-12">
            <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-warm-soft">
              <span className="grid size-12 place-items-center rounded-full bg-warm-gradient text-xl font-extrabold text-white">
                {brand.shortName?.[0] ?? "Y"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">Welcome to {brand.name}</h1>
            <p className="mt-3 text-muted-foreground">Answer 3 quick questions to personalize your learning experience</p>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" /> Less than 1 minute
            </p>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-success" /> Powered by AI · Trusted by 50,000+ students
            </p>
            <Button size="lg" className="mt-7" onClick={() => setStep(2)}>Let’s get started!</Button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-info/10 text-info">
                <Target className="size-7" />
              </div>
              <h2 className="text-2xl font-extrabold">What exam are you preparing for?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tell us about your English proficiency goals</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {EXAM_TYPES.map((e) => (
                <Choice key={e.key} selected={examType === e.key} emoji={e.emoji} label={e.key} onClick={() => setExamType(e.key)} />
              ))}
            </div>
            <p className="mb-2 mt-6 text-sm font-semibold">Why are you preparing?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PURPOSES.map((p) => (
                <Choice key={p.key} selected={purpose === p.key} emoji={p.emoji} label={p.key} onClick={() => setPurpose(p.key)} />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button size="lg" disabled={!examType || !purpose} onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-warm-soft text-primary">
              <CalendarDays className="size-7" />
            </div>
            <h2 className="text-2xl font-extrabold">When is your exam?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Optional — we’ll create a personalized study schedule for you</p>
            <div className="mx-auto mt-6 max-w-sm text-left">
              <label className="text-sm font-semibold">Exam Date (Optional)</label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1.5" />
              {daysUntil !== null && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-info/30 bg-info/[0.06] px-3 py-2.5 text-info">
                  <Clock className="size-4" />
                  <span><strong>{daysUntil} days</strong> until your exam — let’s make every day count!</span>
                </div>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">You can set your exam date later from your profile settings</p>
            </div>
            <div className="mt-6 flex justify-center">
              <Button size="lg" onClick={() => setStep(4)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-success/10 text-success">
                <TrendingUp className="size-7" />
              </div>
              <h2 className="text-2xl font-extrabold">What’s your current level?</h2>
              <p className="mt-1 text-sm text-muted-foreground">This helps us personalize your learning experience</p>
            </div>
            <div className="mt-6 space-y-3">
              {LEVELS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLevel(l.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                    level === l.key ? "border-success bg-success/[0.06] ring-1 ring-success" : "border-border hover:bg-muted"
                  )}
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <span className="flex-1">
                    <span className="block font-bold">{l.label}</span>
                    <span className="block text-sm text-muted-foreground">{l.note}</span>
                  </span>
                  {level === l.key && <CheckCircle2 className="size-5 text-success" />}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <label className="text-sm font-semibold">Target Band Score (IELTS) or equivalent</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
              >
                {BANDS.map((b) => <option key={b} value={b}>Band {b}</option>)}
              </select>
            </div>
            <div className="mt-7 flex justify-center">
              <Button variant="success" size="lg" disabled={!level || saving} onClick={complete}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Complete setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Choice({ selected, emoji, label, onClick }: { selected: boolean; emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition-all",
        selected ? "border-primary bg-primary/[0.05] ring-1 ring-primary" : "border-border hover:bg-muted"
      )}
    >
      <span className="text-xl">{emoji}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
