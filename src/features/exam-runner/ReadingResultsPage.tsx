import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Sparkles, Trophy, Loader2 } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { loadReadingExam } from "./loadExam";
import { getLastAttempt } from "@/store/attempt-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/ProgressRing";
import { QuestionRenderer } from "./questions/QuestionRenderer";
import { EmptyState } from "@/components/common/EmptyState";
import { bandTone, formatBand, pad2 } from "@/lib/utils";

export function ReadingResultsPage() {
  const navigate = useNavigate();
  const attempt = getLastAttempt();
  const { data: exam, loading: examLoading } = useAsync(
    () => (attempt ? loadReadingExam(attempt.examId) : Promise.resolve(undefined)),
    [attempt?.examId]
  );

  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState
          icon={Trophy}
          title="No recent attempt"
          description="Finish a reading exam to see your AI-graded results here."
          action={<Button onClick={() => navigate("/simulation/reading")}>Start a reading exam</Button>}
        />
      </div>
    );
  }

  const pct = Math.round((attempt.correct / attempt.total) * 100);
  const mins = Math.floor(attempt.durationUsedSec / 60);
  const secs = attempt.durationUsedSec % 60;

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
                <Sparkles className="size-3" /> Auto-scored
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
            <Button variant="outline" onClick={() => navigate("/simulation/reading")}>
              <RefreshCw className="size-4" /> Retake
            </Button>
          </div>
        </div>
      </Card>

      {/* review */}
      <h2 className="mb-3 text-lg font-bold">Answer review</h2>
      {examLoading || !exam ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading answer review…</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {exam.passages.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="muted">Passage {p.passageNumber}</Badge>
                <h3 className="font-bold">{p.headline}</h3>
              </div>
              <div className="space-y-6">
                {p.groups.map((g) => (
                  <div key={g.id}>
                    <h4 className="mb-2 text-sm font-bold">{g.rangeLabel}</h4>
                    <QuestionRenderer group={g} answers={attempt.answers} setAnswer={() => {}} review />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
