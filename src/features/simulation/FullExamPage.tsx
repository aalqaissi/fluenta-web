import { useNavigate } from "react-router-dom";
import { Headphones, BookOpen, PenLine, Mic, Clock, ArrowRight, GraduationCap, CheckCircle2, RotateCcw, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/store/app-context";
import { getReadingExam, getListeningExam, getSpeakingExam } from "@/lib/mockApi";
import { writingTasks } from "@/mock/data";
import { useFullExam, fullExamStore, type FullSkill } from "./fullexam-store";
import { cn, formatBand } from "@/lib/utils";

const writingId = (writingTasks.find((t) => t.taskNumber === 2) ?? writingTasks[0]).id;

const SECTIONS: {
  key: FullSkill;
  skill: string;
  icon: typeof Headphones;
  minutes: number;
  detail: string;
  to: string;
  tint: string;
}[] = [
  { key: "listening", skill: "Listening", icon: Headphones, minutes: 30, detail: "4 sections · 40 questions", to: `/exam/listening/${getListeningExam().id}?full=1`, tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  { key: "reading", skill: "Reading", icon: BookOpen, minutes: 60, detail: "3 passages · 40 questions", to: `/exam/reading/${getReadingExam().id}?full=1`, tint: "bg-success/12 text-success" },
  { key: "writing", skill: "Writing", icon: PenLine, minutes: 60, detail: "Task 2 essay", to: `/exam/writing/${writingId}?full=1`, tint: "bg-info/12 text-info" },
  { key: "speaking", skill: "Speaking", icon: Mic, minutes: 15, detail: "3 parts · recorded", to: `/exam/speaking/${getSpeakingExam().id}?full=1`, tint: "bg-primary/12 text-primary" },
];

export function FullExamPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("full-exam");
  const results = useFullExam();
  const total = SECTIONS.reduce((n, s) => n + s.minutes, 0);

  const doneCount = SECTIONS.filter((s) => results[s.key] != null).length;
  const pct = Math.round((doneCount / SECTIONS.length) * 100);
  const nextIdx = SECTIONS.findIndex((s) => results[s.key] == null);
  const allDone = doneCount === SECTIONS.length;

  return (
    <div>
      <PageHeader
        title="Full IELTS exam"
        subtitle="A complete timed mock across all four sections — Listening, Reading, Writing, Speaking — graded by AI."
        actions={doneCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => fullExamStore.reset()}><RotateCcw className="size-4" /> Reset</Button>
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
            <p className="text-sm text-muted-foreground">
              {doneCount} of {SECTIONS.length} sections complete · approx. {Math.floor(total / 60)}h {total % 60}m total
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-2xl font-extrabold">{pct}%</div>
          </div>
        </div>
        <Progress value={pct} indicatorClassName={allDone ? "bg-success" : undefined} />

        {/* section stepper */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTIONS.map((s, i) => {
            const band = results[s.key];
            const isDone = band != null;
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
                <div className="text-[11px] text-muted-foreground">
                  {isDone ? `Band ${formatBand(band)}` : isNext ? "Up next" : `${s.minutes} min`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          {allDone ? (
            <Button className="w-full" variant="success" onClick={() => navigate("/results/full")}>
              <BadgeCheck className="size-4" /> View results &amp; certificate
            </Button>
          ) : (
            <Button className="w-full" onClick={() => nextIdx >= 0 && navigate(SECTIONS[nextIdx].to)}>
              {doneCount === 0 ? "Begin full exam" : "Continue"} · {SECTIONS[nextIdx]?.skill} <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* section list */}
      <div className="space-y-3">
        {SECTIONS.map((s, i) => {
          const band = results[s.key];
          const isDone = band != null;
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
                  {isDone && <Badge variant="success"><CheckCircle2 className="size-3" /> Band {formatBand(band)}</Badge>}
                  {!isDone && i === nextIdx && <Badge variant="default">Up next</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </div>
              <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                <Clock className="size-4" /> {s.minutes} min
              </div>
              <Button variant={isDone ? "outline" : "primary"} size="sm" onClick={() => navigate(s.to)}>
                {isDone ? "Redo" : "Start"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
