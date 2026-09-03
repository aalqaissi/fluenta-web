import { useNavigate } from "react-router-dom";
import { Headphones, BookOpen, PenLine, Mic, Clock, ArrowRight, GraduationCap, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const sections = [
  { skill: "Listening", icon: Headphones, minutes: 30, detail: "4 sections · 40 questions", to: "/simulation/listening", tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  { skill: "Reading", icon: BookOpen, minutes: 60, detail: "3 passages · 40 questions", to: "/simulation/reading", tint: "bg-success/12 text-success" },
  { skill: "Writing", icon: PenLine, minutes: 60, detail: "Task 1 & Task 2", to: "/simulation/writing", tint: "bg-info/12 text-info" },
  { skill: "Speaking", icon: Mic, minutes: 15, detail: "3 parts · recorded", to: "/simulation/speaking", tint: "bg-primary/12 text-primary" },
];

export function FullExamPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("full-exam");
  const total = sections.reduce((n, s) => n + s.minutes, 0);

  return (
    <div>
      <PageHeader title="Full IELTS exam" subtitle="A complete timed mock across all four sections, graded by AI." />
      {locked && <UpgradeBanner feature="The full IELTS exam" />}

      <Card className="mb-6 overflow-hidden border-0 bg-warm-gradient p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
              <GraduationCap className="size-7" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Complete mock exam</h2>
              <p className="text-sm text-white/85">Sit all four sections back-to-back under real timing.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm text-white/85">
              <Clock className="size-4" /> Approx. {Math.floor(total / 60)}h {total % 60}m
            </div>
            <Button variant="secondary" className="mt-2" onClick={() => navigate("/simulation/listening")}>
              Begin full exam <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <Card key={s.skill} className="flex items-center gap-4 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
              {i + 1}
            </span>
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", s.tint)}>
              <s.icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{s.skill}</h3>
                {i === 0 && <Badge variant="success"><CheckCircle2 className="size-3" /> Starts here</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
            <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
              <Clock className="size-4" /> {s.minutes} min
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(s.to)}>
              Open
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
