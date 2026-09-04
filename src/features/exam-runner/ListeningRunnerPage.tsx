import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, Clock, Flag, Headphones, Lightbulb } from "lucide-react";
import { getListeningExam, scoreListening } from "@/lib/mockApi";
import { studioStore } from "@/features/studio/store";
import { studioListeningToExam } from "@/features/studio/convert";
import { setLastAttempt } from "@/store/attempt-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "./AudioPlayer";
import { QuestionRenderer } from "./questions/QuestionRenderer";
import { GradingModal } from "./GradingModal";
import { pad2, cn } from "@/lib/utils";

const TIPS = [
  "Read the questions before the audio starts so you know what to listen for.",
  "Listen for keywords and synonyms — the recording rarely uses the exact words in the question.",
  "Pay attention to signpost words (however, although, in addition) that mark a change.",
  "Write answers as you listen — don't wait until the end.",
  "Check your spelling — an incorrectly spelled answer is marked wrong.",
  "Use the context to predict the kind of answer (a number, a day, a name).",
  "Never leave a blank — make an educated guess if you're unsure.",
];

export function ListeningRunnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exam = useMemo(() => {
    const authored = id ? studioStore.get().find((e) => e.id === id && e.skill === "listening") : undefined;
    return authored && (authored.sections?.length ?? 0) > 0 ? studioListeningToExam(authored) : getListeningExam();
  }, [id]);

  const [sIdx, setSIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durationSec);
  const [grading, setGrading] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const section = exam.sections[sIdx];
  const totalQ = useMemo(
    () => exam.sections.reduce((n, s) => n + s.group.questions.length, 0),
    [exam]
  );
  const answered = Object.values(answers).filter((v) => v.trim()).length;

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (timeLeft === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const low = timeLeft < 120;

  function setAnswer(qid: string, val: string) {
    setAnswers((a) => ({ ...a, [qid]: val }));
  }

  function submit() {
    const { correct, band } = scoreListening(exam, answers);
    setLastAttempt({
      examId: exam.id,
      answers,
      correct,
      total: totalQ,
      band,
      durationUsedSec: exam.durationSec - timeLeft,
    });
    setGrading(true);
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center gap-4 px-4 py-3 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              Listening · Section {section.number} of {exam.sections.length}
            </p>
          </div>
          <Badge variant="muted" className="hidden sm:inline-flex">
            {answered}/{totalQ} answered
          </Badge>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums",
              low ? "bg-destructive/10 text-destructive" : "bg-muted"
            )}
          >
            <Clock className="size-4" /> {pad2(mins)}:{pad2(secs)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-6">
        {/* section header */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary/15 text-[rgb(var(--on-secondary))]">
            <Headphones className="size-4" />
          </span>
          <h2 className="text-base font-bold">Section {section.number}</h2>
          <Badge variant="outline">{section.difficulty}</Badge>
          <Badge variant="muted">{section.group.questions.length} questions</Badge>
          <span className="w-full text-sm text-muted-foreground sm:w-auto">{section.context}</span>
        </div>

        {/* tips */}
        <div className="mb-4 rounded-2xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
            aria-expanded={showTips}
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" /> {showTips ? "Hide" : "Show"} listening tips
            </span>
            <ChevronDown className={cn("size-4 transition-transform", showTips && "rotate-180")} />
          </button>
          {showTips && (
            <ul className="ml-1 list-disc space-y-1.5 px-6 pb-4 pl-8 text-sm text-muted-foreground">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>

        {/* audio — remounts per section so play-once state resets */}
        <div className="mb-5">
          <AudioPlayer key={section.id} durationSec={section.audioDurationSec} playOnce />
        </div>

        {/* questions */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold">{section.group.rangeLabel}</h3>
            <Badge variant="outline" className="shrink-0">
              {section.group.type.replace(/-/g, " ")}
            </Badge>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{section.group.instructions}</p>
          <QuestionRenderer group={section.group} answers={answers} setAnswer={setAnswer} />
        </section>

        {/* footer nav */}
        <div className="sticky bottom-0 z-10 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-soft-md backdrop-blur">
          <Button variant="outline" disabled={sIdx === 0} onClick={() => setSIdx((i) => i - 1)}>
            <ArrowLeft className="size-4" /> Previous
          </Button>
          <div className="hidden gap-1.5 sm:flex">
            {exam.sections.map((_, i) => (
              <button
                key={i}
                onClick={() => setSIdx(i)}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  i === sIdx ? "bg-primary" : "bg-border hover:bg-muted-foreground/40"
                )}
                aria-label={`Section ${i + 1}`}
              />
            ))}
          </div>
          {sIdx < exam.sections.length - 1 ? (
            <Button onClick={() => setSIdx((i) => i + 1)}>
              Complete section &amp; continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button variant="success" onClick={submit}>
              <Flag className="size-4" /> Submit for grading
            </Button>
          )}
        </div>
      </div>

      <GradingModal open={grading} onDone={() => navigate(`/results/listening/${exam.id}`)} />
    </div>
  );
}
