import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, BookOpen, PenLine, Mic, Clock, ArrowRight, GraduationCap, CheckCircle2, RotateCcw, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const sections = [
  { key: "listening", skill: "Listening", icon: Headphones, minutes: 30, detail: "4 sections · 40 questions", to: "/simulation/listening", tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  { key: "reading", skill: "Reading", icon: BookOpen, minutes: 60, detail: "3 passages · 40 questions", to: "/exam/reading/read-languages", tint: "bg-success/12 text-success" },
  { key: "writing", skill: "Writing", icon: PenLine, minutes: 60, detail: "Task 1 & Task 2", to: "/simulation/writing", tint: "bg-info/12 text-info" },
  { key: "speaking", skill: "Speaking", icon: Mic, minutes: 15, detail: "3 parts · recorded", to: "/simulation/speaking", tint: "bg-primary/12 text-primary" },
];
const STORE = "fluenta.fullexam.progress";

function loadDone(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}

export function FullExamPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("full-exam");
  const total = sections.reduce((n, s) => n + s.minutes, 0);
  const [done, setDone] = useState<string[]>(loadDone);

  const doneCount = done.length;
  const pct = Math.round((doneCount / sections.length) * 100);
  const nextIdx = sections.findIndex((s) => !done.includes(s.key));
  const allDone = doneCount === sections.length;

  function openSection(key: string, to: string) {
    const next = Array.from(new Set([...done, key]));
    setDone(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* ignore */ }
    navigate(to);
  }
  function reset() {
    setDone([]);
    try { localStorage.removeItem(STORE); } catch { /* ignore */ }
  }

  return (
    <div>
      <PageHeader
        title="Full IELTS exam"
        subtitle="A complete timed mock across all four sections, graded by AI."
        actions={doneCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="size-4" /> Reset</Button>
        ) : undefined}
      />
      {locked && <UpgradeBanner feature="The full IELTS exam" />}

      {/* progress orchestrator */}
      <Card className="mb-6 p-6">
        <div className="mb-4 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-warm-gradient text-white shadow-glow">
            <GraduationCap className="size-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold">Full exam progress</h2>
            <p className="text-sm text-muted-foreground">{doneCount} of {sections.length} sections complete · approx. {Math.floor(total / 60)}h {total % 60}m total</p>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-2xl font-extrabold">{pct}%</div>
          </div>
        </div>
        <Progress value={pct} indicatorClassName={allDone ? "bg-success" : undefined} />

        {/* section stepper */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sections.map((s, i) => {
            const isDone = done.includes(s.key);
            const isNext = i === nextIdx;
            return (
              <div
                key={s.key}
                className={cn(
                  "rounded-xl border p-3 text-center transition-colors",
                  isDone ? "border-success/40 bg-success/[0.06]" : isNext ? "border-primary bg-primary/[0.05]" : "border-border"
                )}
              >
                <span className={cn("mx-auto mb-1.5 grid size-9 place-items-center rounded-xl", s.tint)}>
                  {isDone ? <CheckCircle2 className="size-5 text-success" /> : <s.icon className="size-5" />}
                </span>
                <div className="text-sm font-bold">{s.skill}</div>
                <div className="text-[11px] text-muted-foreground">{isDone ? "Complete" : isNext ? "Up next" : `${s.minutes} min`}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          {allDone ? (
            <Button className="w-full" onClick={() => navigate("/certificate/cert1")}>
              <BadgeCheck className="size-4" /> View your Test Report
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => nextIdx >= 0 && openSection(sections[nextIdx].key, sections[nextIdx].to)}
            >
              {doneCount === 0 ? "Begin full exam" : "Continue"} · {sections[nextIdx]?.skill} <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* section list */}
      <div className="space-y-3">
        {sections.map((s, i) => {
          const isDone = done.includes(s.key);
          return (
            <Card key={s.key} className="flex items-center gap-4 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", s.tint)}>
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{s.skill}</h3>
                  {isDone && <Badge variant="success"><CheckCircle2 className="size-3" /> Done</Badge>}
                  {!isDone && i === nextIdx && <Badge variant="default">Up next</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </div>
              <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <Clock className="size-4" /> {s.minutes} min
              </div>
              <Button variant={isDone ? "outline" : "primary"} size="sm" onClick={() => openSection(s.key, s.to)}>
                {isDone ? "Redo" : "Start"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
