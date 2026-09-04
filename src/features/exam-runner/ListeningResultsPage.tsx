import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Headphones, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { getListeningExam } from "@/lib/mockApi";
import { studioStore } from "@/features/studio/store";
import { studioListeningToExam } from "@/features/studio/convert";
import { getLastAttempt } from "@/store/attempt-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/ProgressRing";
import { QuestionRenderer } from "./questions/QuestionRenderer";
import { EmptyState } from "@/components/common/EmptyState";
import { bandTone, formatBand, pad2 } from "@/lib/utils";

export function ListeningResultsPage() {
  const navigate = useNavigate();
  const attempt = getLastAttempt();
  const authored = attempt ? studioStore.get().find((e) => e.id === attempt.examId && e.skill === "listening") : undefined;
  const exam = authored && (authored.sections?.length ?? 0) > 0 ? studioListeningToExam(authored) : getListeningExam();

  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState
          icon={Trophy}
          title="No recent attempt"
          description="Finish a listening exam to see your AI-graded results here."
          action={<Button onClick={() => navigate("/simulation/listening")}>Start a listening exam</Button>}
        />
      </div>
    );
  }

  const pct = Math.round((attempt.correct / attempt.total) * 100);
  const mins = Math.floor(attempt.durationUsedSec / 60);
  const secs = attempt.durationUsedSec % 60;

  const perSection = exam.sections.map((s) => {
    const total = s.group.questions.length;
    const correct = s.group.questions.filter(
      (q) => (attempt.answers[q.id] ?? "").trim().toLowerCase() === q.correct.trim().toLowerCase()
    ).length;
    return { id: s.id, number: s.number, context: s.context, correct, total };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/progress")}>
        <ArrowLeft className="size-4" /> Back to progress
      </Button>

      {/* score hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-4 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-5">
            <ProgressRing value={pct} size={104} stroke={10} label={formatBand(attempt.band)} sublabel="band" />
            <div>
              <Badge variant="success" className="mb-1">
                <Sparkles className="size-3" /> Graded by AI
              </Badge>
              <h1 className="text-2xl font-extrabold">Nice work!</h1>
              <p className="text-sm text-muted-foreground">
                You answered{" "}
                <span className={bandTone(attempt.band) + " font-bold"}>
                  {attempt.correct}/{attempt.total}
                </span>{" "}
                correctly in {pad2(mins)}:{pad2(secs)}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/simulation/listening")}>
              <RefreshCw className="size-4" /> Retake
            </Button>
            <Button onClick={() => navigate("/coach")}>
              <Bot className="size-4" /> Ask Fluenta Coach
            </Button>
          </div>
        </div>
      </Card>

      {/* performance by section */}
      <h2 className="mb-3 text-lg font-bold">Performance by section</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {perSection.map((s) => {
          const spct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
          return (
            <Card key={s.id} className="p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                <Headphones className="size-4 text-primary" /> Section {s.number}
              </div>
              <div className="text-2xl font-extrabold tabular-nums">{spct}%</div>
              <div className="text-xs text-muted-foreground">
                {s.correct}/{s.total} correct
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${spct}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* review */}
      <h2 className="mb-3 text-lg font-bold">Answer review</h2>
      <div className="space-y-6">
        {exam.sections.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="muted">Section {s.number}</Badge>
              <h3 className="font-bold">{s.context}</h3>
            </div>
            <QuestionRenderer group={s.group} answers={attempt.answers} setAnswer={() => {}} review />
          </Card>
        ))}
      </div>
    </div>
  );
}
