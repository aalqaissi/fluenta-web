import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Mic, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { getSpeakingExam } from "@/lib/mockApi";
import { studioStore } from "@/features/studio/store";
import { studioSpeakingToExam } from "@/features/studio/convert";
import { getLastSpeaking } from "@/store/attempt-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/ProgressRing";
import { EmptyState } from "@/components/common/EmptyState";
import { bandTone, cn, formatBand } from "@/lib/utils";

export function SpeakingResultsPage() {
  const navigate = useNavigate();
  const attempt = getLastSpeaking();
  const authored = attempt ? studioStore.get().find((e) => e.id === attempt.examId && e.skill === "speaking") : undefined;
  const exam = authored && (authored.parts?.length ?? 0) > 0 ? studioSpeakingToExam(authored) : getSpeakingExam();

  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState
          icon={Trophy}
          title="No recent attempt"
          description="Finish a speaking exam to see your AI feedback here."
          action={<Button onClick={() => navigate("/simulation/speaking")}>Start a speaking exam</Button>}
        />
      </div>
    );
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
            <ProgressRing value={(attempt.overall / 9) * 100} size={104} stroke={10} label={formatBand(attempt.overall)} sublabel="overall" />
            <div>
              <Badge variant="success" className="mb-1">
                <Sparkles className="size-3" /> Graded by AI
              </Badge>
              <h1 className="text-2xl font-extrabold">Your speaking, reviewed</h1>
              <p className="text-sm text-muted-foreground">
                {exam.parts.length} parts · {attempt.partsRecorded} recorded · scored across all four criteria.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/simulation/speaking")}>
              <RefreshCw className="size-4" /> Retake
            </Button>
            <Button onClick={() => navigate("/coach")}>
              <Bot className="size-4" /> Ask Yalla Coach
            </Button>
          </div>
        </div>
      </Card>

      {/* criteria */}
      <h2 className="mb-3 text-lg font-bold">Feedback by criterion</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {attempt.feedback.map((f) => (
          <Card key={f.key} className="p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Mic className="size-4 text-primary" /> {f.label}
              </span>
              <span className={cn("text-lg font-extrabold", bandTone(f.band))}>{formatBand(f.band)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{f.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
