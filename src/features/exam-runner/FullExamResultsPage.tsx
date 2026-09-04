import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, BookOpen, Headphones, Mic, PenLine, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/ProgressRing";
import { EmptyState } from "@/components/common/EmptyState";
import { useFullExam, fullExamStore, FULL_SKILL_ORDER, type FullSkill } from "@/features/simulation/fullexam-store";
import { certStore, blankCert, avgBand, cefrFor } from "@/features/certificates/store";
import { bandTone, cn, formatBand } from "@/lib/utils";

const META: Record<FullSkill, { label: string; icon: typeof Headphones; tint: string }> = {
  listening: { label: "Listening", icon: Headphones, tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  reading: { label: "Reading", icon: BookOpen, tint: "bg-success/12 text-success" },
  writing: { label: "Writing", icon: PenLine, tint: "bg-info/12 text-info" },
  speaking: { label: "Speaking", icon: Mic, tint: "bg-primary/12 text-primary" },
};

export function FullExamResultsPage() {
  const navigate = useNavigate();
  const results = useFullExam();
  const complete = FULL_SKILL_ORDER.every((k) => results[k] != null);

  if (!complete) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState
          icon={Trophy}
          title="Full exam not finished"
          description="Complete all four sections to see your overall band and generate a Test Report."
          action={<Button onClick={() => navigate("/simulation/full-exam")}>Back to the full exam</Button>}
        />
      </div>
    );
  }

  const scores = {
    listening: results.listening!,
    reading: results.reading!,
    writing: results.writing!,
    speaking: results.speaking!,
  };
  const overall = avgBand(scores);
  const cefr = cefrFor(overall);

  function generateCertificate() {
    const rec = { ...blankCert(), title: "Full Practice Test", scores, overall, cefr, status: "issued" as const };
    certStore.upsert(rec);
    navigate(`/certificate/${rec.id}`);
  }

  function retake() {
    fullExamStore.reset();
    navigate("/simulation/full-exam");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/progress")}>
        <ArrowLeft className="size-4" /> Back to progress
      </Button>

      {/* hero */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <ProgressRing value={(overall / 9) * 100} size={112} stroke={11} label={formatBand(overall)} sublabel="overall" />
            <div>
              <Badge variant="success" className="mb-1">
                <BadgeCheck className="size-3" /> Full exam complete
              </Badge>
              <h1 className="text-2xl font-extrabold">Your IELTS practice result</h1>
              <p className="text-sm text-muted-foreground">
                Overall band {formatBand(overall)} · CEFR <span className="font-bold">{cefr}</span> · averaged across all four skills.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" onClick={retake}>
              <RefreshCw className="size-4" /> Retake
            </Button>
            <Button onClick={generateCertificate}>
              <BadgeCheck className="size-4" /> Generate certificate
            </Button>
          </div>
        </div>
      </Card>

      {/* per-skill bands */}
      <h2 className="mb-3 text-lg font-bold">Band by skill</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FULL_SKILL_ORDER.map((k) => {
          const m = META[k];
          const band = scores[k];
          return (
            <Card key={k} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={cn("grid size-9 place-items-center rounded-xl", m.tint)}>
                  <m.icon className="size-4" />
                </span>
                <span className="text-sm font-bold">{m.label}</span>
              </div>
              <div className={cn("text-3xl font-extrabold tabular-nums", bandTone(band))}>{formatBand(band)}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
