import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, PlayCircle, Lightbulb, ListChecks, Trophy, Check, Bot, RefreshCw, Sparkles, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/ProgressRing";
import { EmptyState } from "@/components/common/EmptyState";
import { QuestionRenderer } from "@/features/exam-runner/questions/QuestionRenderer";
import { STRATEGIES, getReadingPracticeGroups, countQuestions } from "@/mock/strategies";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType, SkillKey } from "@/mock/types";
import { cn, formatBand } from "@/lib/utils";

type Step = "strategy" | "tips" | "practice" | "results";
const STEPS: { key: Step; label: string; icon: typeof PlayCircle }[] = [
  { key: "strategy", label: "Strategy", icon: PlayCircle },
  { key: "tips", label: "Quick Tips", icon: Lightbulb },
  { key: "practice", label: "Practice", icon: ListChecks },
  { key: "results", label: "Results", icon: Trophy },
];

export function QuestionTypePracticePage() {
  const { skill, type } = useParams();
  const navigate = useNavigate();
  const qType = type as QuestionType;
  const strategy = STRATEGIES[qType];
  const label = QUESTION_TYPE_LABEL[qType] ?? "Practice";

  const groups = useMemo(() => (skill === "reading" ? getReadingPracticeGroups(qType) : []), [skill, qType]);
  const total = countQuestions(groups);

  const [step, setStep] = useState<Step>("strategy");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!strategy) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState icon={GraduationCap} title="Unknown practice type" action={<Button onClick={() => navigate(-1)}>Go back</Button>} />
      </div>
    );
  }

  const correct = groups
    .flatMap((g) => g.questions)
    .filter((q) => (answers[q.id] ?? "").trim().toLowerCase() === q.correct.trim().toLowerCase()).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const band = pct >= 90 ? 8.5 : pct >= 75 ? 7.5 : pct >= 60 ? 6.5 : pct >= 40 ? 5.5 : 4.5;

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate(`/simulation/${skill ?? "reading"}`)}>
        <ArrowLeft className="size-4" /> Back to {skill ?? "reading"}
      </Button>

      {/* header + stepper */}
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="default">{(skill ?? "reading").toString().replace(/^\w/, (c) => c.toUpperCase())}</Badge>
          <Badge variant="muted">Practice by type</Badge>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{label}</h1>
      </div>

      <div className="mb-6 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "grid size-9 place-items-center rounded-full text-sm font-bold transition-colors",
                  i < stepIdx ? "bg-success text-white" : i === stepIdx ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {i < stepIdx ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </div>
              <span className={cn("text-[11px] font-semibold", i === stepIdx ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("mx-2 h-0.5 flex-1 rounded-full", i < stepIdx ? "bg-success" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* STRATEGY */}
      {step === "strategy" && (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="relative flex aspect-video items-center justify-center bg-warm-gradient">
              <button className="grid size-16 place-items-center rounded-full bg-white/90 text-primary shadow-soft-lg transition-transform hover:scale-105">
                <PlayCircle className="size-9" />
              </button>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white">
                <Sparkles className="size-3.5" /> Watch the strategy · {strategy.videoLength}
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 text-base font-bold">How to approach {label}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{strategy.intro}</p>
          </Card>
          <div className="flex justify-end">
            <Button onClick={() => setStep("tips")}>
              Quick tips <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* TIPS */}
      {step === "tips" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
              <Lightbulb className="size-4 text-secondary" /> Quick tips
            </h2>
            <ol className="space-y-2.5">
              {strategy.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-border p-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary/15 text-xs font-bold text-[rgb(var(--on-secondary))]">
                    {i + 1}
                  </span>
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ol>
          </Card>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("strategy")}>
              <ArrowLeft className="size-4" /> Strategy
            </Button>
            <Button onClick={() => setStep("practice")}>
              Start practice{total ? ` · ${total} questions` : ""} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* PRACTICE */}
      {step === "practice" && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Practice bank coming soon for this type"
              description="The strategy and tips above apply. We're adding graded questions for this type next."
              action={<Button onClick={() => setStep("results")}>Finish</Button>}
            />
          ) : (
            <>
              {groups.map((g) => (
                <Card key={g.id} className="p-5">
                  <p className="mb-3 text-sm text-muted-foreground">{g.instructions}</p>
                  <QuestionRenderer group={g} answers={answers} setAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} />
                </Card>
              ))}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep("tips")}>
                  <ArrowLeft className="size-4" /> Tips
                </Button>
                <Button variant="success" onClick={() => setStep("results")}>
                  <Check className="size-4" /> Submit answers
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-5">
              <ProgressRing value={pct} size={96} stroke={10} label={total ? `${correct}/${total}` : "–"} sublabel="correct" />
              <div>
                <Badge variant="success" className="mb-1">
                  <Sparkles className="size-3" /> Practice complete
                </Badge>
                <h2 className="text-xl font-extrabold">Nice work on {label}!</h2>
                <p className="text-sm text-muted-foreground">
                  {total ? `Estimated band for this type: ` : "Review the strategy and tips, then try a full set."}
                  {total ? <span className="font-bold text-foreground">{formatBand(band)}</span> : null}
                </p>
              </div>
            </div>
          </Card>

          {groups.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">Answer review</h3>
              <div className="space-y-4">
                {groups.map((g) => (
                  <QuestionRenderer key={g.id} group={g} answers={answers} setAnswer={() => {}} review />
                ))}
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setAnswers({}); setStep("strategy"); }}>
              <RefreshCw className="size-4" /> Practice again
            </Button>
            <Button onClick={() => navigate("/coach")}>
              <Bot className="size-4" /> Ask Fluenta Coach
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/simulation/${skill ?? "reading"}`)}>
              Back to {skill ?? "reading"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
