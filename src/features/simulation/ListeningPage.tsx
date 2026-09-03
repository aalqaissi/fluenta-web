import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Pause, Play, Volume2, Flag, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app-context";
import { listeningSections } from "@/mock/data";
import { GradingModal } from "@/features/exam-runner/GradingModal";
import { QuestionRenderer } from "@/features/exam-runner/questions/QuestionRenderer";
import type { QuestionGroup } from "@/mock/types";
import { pad2, cn } from "@/lib/utils";

const demoGroup: QuestionGroup = {
  id: "lg1",
  type: "sentence-completion",
  rangeLabel: "Questions 1–5",
  instructions: "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
  questions: [
    { id: "lq1", number: 1, prompt: "The community hall can be booked for up to __________ hours.", correct: "four", wordLimit: "ONE WORD/NUMBER" },
    { id: "lq2", number: 2, prompt: "The deposit is refunded within __________ working days.", correct: "five", wordLimit: "ONE WORD/NUMBER" },
    { id: "lq3", number: 3, prompt: "Tables and __________ are provided free of charge.", correct: "chairs", wordLimit: "ONE WORD" },
    { id: "lq4", number: 4, prompt: "The car park is located behind the __________.", correct: "library", wordLimit: "ONE WORD" },
    { id: "lq5", number: 5, prompt: "Bookings must be confirmed by __________.", correct: "email", wordLimit: "ONE WORD" },
  ],
};

function AudioPlayer() {
  const total = 30 * 60;
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (playing) {
      ref.current = window.setInterval(() => setT((v) => Math.min(total, v + 1)), 1000);
    } else if (ref.current) {
      clearInterval(ref.current);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [playing]);

  const bars = Array.from({ length: 48 });
  const progress = (t / total) * 100;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <Button size="icon" className="size-12 rounded-full" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex h-10 items-end gap-0.5">
            {bars.map((_, i) => {
              const active = (i / bars.length) * 100 <= progress;
              const h = 20 + Math.abs(Math.sin(i * 1.3)) * 70;
              return (
                <div
                  key={i}
                  className={cn("w-full rounded-sm transition-colors", active ? "bg-primary" : "bg-border")}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-medium tabular-nums text-muted-foreground">
            <span>
              {pad2(Math.floor(t / 60))}:{pad2(t % 60)}
            </span>
            <span>
              {pad2(Math.floor(total / 60))}:{pad2(total % 60)}
            </span>
          </div>
        </div>
        <Volume2 className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        In the real test the audio plays once. This is a preview player — playback is simulated.
      </p>
    </Card>
  );
}

export function ListeningPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("listening");
  const [section, setSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState(false);

  return (
    <div>
      <PageHeader title="Listening practice" subtitle="Four sections, played once — just like the real IELTS test." />
      {locked && <UpgradeBanner feature="Listening practice" />}

      <div className="mb-5">
        <AudioPlayer />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {listeningSections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSection(i)}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-left text-sm transition-colors",
              i === section ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-muted"
            )}
          >
            <div className="font-bold">Section {s.number}</div>
            <div className="text-xs text-muted-foreground">{s.questionCount} questions</div>
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary/15 text-[rgb(var(--on-secondary))]">
            <Headphones className="size-4" />
          </span>
          <div>
            <h3 className="font-bold">Section {listeningSections[section].number}</h3>
            <p className="text-sm text-muted-foreground">{listeningSections[section].context}</p>
          </div>
        </div>
        <Badge variant="outline" className="mb-3">
          {demoGroup.rangeLabel}
        </Badge>
        <p className="mb-3 text-sm text-muted-foreground">{demoGroup.instructions}</p>
        <QuestionRenderer group={demoGroup} answers={answers} setAnswer={(q, v) => setAnswers((a) => ({ ...a, [q]: v }))} />

        <div className="mt-5 flex justify-between">
          <Button variant="outline" onClick={() => setAnswers({})}>
            <RotateCcw className="size-4" /> Reset
          </Button>
          <Button variant="success" onClick={() => setGrading(true)}>
            <Flag className="size-4" /> Submit for grading
          </Button>
        </div>
      </Card>

      <GradingModal open={grading} onDone={() => navigate("/progress")} />
    </div>
  );
}
