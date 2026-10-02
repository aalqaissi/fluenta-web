import { answeredSlots, questionSlots } from "@/lib/answerMatch";
import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ChevronDown, Flag, Headphones, Lightbulb } from "lucide-react";
import { api, ApiError, resolveMedia } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { loadListeningExam } from "./loadExam";
import { setLastAttempt } from "@/store/attempt-store";
import { fullExamStore } from "@/features/simulation/fullexam-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "./AudioPlayer";
import { QuestionRenderer } from "./questions/QuestionRenderer";
import { GradingModal } from "./GradingModal";
import { RunnerLoading, RunnerError } from "./RunnerStates";
import { cn } from "@/lib/utils";
import { EXAM_TIMING, useExamMode } from "./examMode";
import { ModeBadge } from "./ModeBadge";
import { TimerControl, useRunnerTimer } from "./RunnerTimer";
import type { ListeningExam } from "@/mock/types";

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
  const { data: exam, loading, error, reload } = useAsync(() => loadListeningExam(id!), [id]);

  if (loading) return <RunnerLoading />;
  if (error || !exam) return <RunnerError message={error ?? "Exam not found"} onRetry={reload} onBack={() => navigate(-1)} />;
  return <ListeningRunner exam={exam} />;
}

/**
 * Exam mode runs in two phases (owner spec §1): "listening" — one part at a time, each recording
 * played once, advancing when it ends — then "check" — 2 minutes to review/edit every answer, after
 * which the test submits automatically. Practice mode has free navigation, replayable audio and an
 * optional timer.
 */
type Phase = "listening" | "check";

function ListeningRunner({ exam }: { exam: ListeningExam }) {
  const navigate = useNavigate();
  const { mode, full } = useExamMode();
  const isExam = mode === "exam";
  const [sIdx, setSIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gradedBand, setGradedBand] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [heard, setHeard] = useState<Record<number, boolean>>({});
  const [phase, setPhase] = useState<Phase>("listening");
  const startedAt = useRef(Date.now());

  const section = exam.sections[sIdx];
  const last = exam.sections.length - 1;
  const totalQ = useMemo(
    () => exam.sections.reduce((n, s) => n + s.group.questions.reduce((k, q) => k + questionSlots(q), 0), 0),
    [exam]
  );
  // Question numbers answered (a Choose TWO counts its picked letters).
  const answered = exam.sections.reduce((n, s) => n + s.group.questions.reduce((k, q) => k + answeredSlots(answers[q.id], q), 0), 0);
  const listeningPhase = isExam && phase === "listening";

  const timer = useRunnerTimer({
    mode,
    durationSec: isExam ? EXAM_TIMING.listeningCheckSec : exam.durationSec,
    running: !isExam || phase === "check",
    onExpire: () => submit(),
  });

  function onSectionEnded(i: number) {
    setHeard((h) => ({ ...h, [i]: true }));
    if (i < last) {
      window.setTimeout(() => setSIdx((cur) => (cur === i ? i + 1 : cur)), 1500);
    } else {
      setPhase("check");
    }
  }

  function setAnswer(qid: string, val: string) {
    setAnswers((a) => ({ ...a, [qid]: val }));
  }

  async function submit() {
    if (submitting || grading) return;
    setSubmitting(true);
    try {
      const a = await api.attempts.submit({
        examId: exam.id,
        skill: "listening",
        answers,
        durationUsedSec: Math.round((Date.now() - startedAt.current) / 1000),
        mode,
      });
      setGradedBand(a.band);
      setLastAttempt({
        examId: exam.id,
        answers,
        correct: a.correct,
        total: a.total,
        band: a.band,
        durationUsedSec: a.durationUsedSec,
      });
      setGrading(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not submit your exam. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  function afterGrading() {
    if (full) {
      fullExamStore.record("listening", gradedBand);
      navigate("/simulation/full-exam");
    } else {
      navigate(`/results/listening/${exam.id}`);
    }
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
              Listening · Part {section.number} of {exam.sections.length}
            </p>
          </div>
          <Badge variant="muted" className="hidden sm:inline-flex">
            {answered}/{totalQ} answered
          </Badge>
          <ModeBadge mode={mode} />
          {listeningPhase ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-sm font-bold">
              <Headphones className="size-4" /> Recording · Part {section.number}
            </div>
          ) : (
            <TimerControl timer={timer} label={isExam ? "Check" : undefined} />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-6">
        {isExam && phase === "check" && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-sm">
            <p className="font-bold">The recording has finished — you have 2 minutes to check your answers.</p>
            <p className="text-muted-foreground">Review and edit any part. Your answers are submitted automatically when the time is up.</p>
          </div>
        )}

        {/* section header */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary/15 text-[rgb(var(--on-secondary))]">
            <Headphones className="size-4" />
          </span>
          <h2 className="text-base font-bold">Part {section.number}</h2>
          <Badge variant="outline">{section.difficulty}</Badge>
          <Badge variant="muted">{section.group.questions.reduce((k, q) => k + questionSlots(q), 0)} questions</Badge>
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

        {/* audio — remounts per section. Exam: played once, advances when it ends; hidden once heard.
            Practice: replay as often as you like. */}
        <div className="mb-5">
          {isExam ? (
            heard[sIdx] ? (
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                The recording for Part {section.number} has been played.
                {phase === "listening" && sIdx < last && " Moving to the next part…"}
              </div>
            ) : (
              <AudioPlayer
                key={section.id}
                durationSec={section.audioDurationSec}
                src={resolveMedia(section.audioUrl)}
                playOnce
                onEnded={() => onSectionEnded(sIdx)}
              />
            )
          ) : (
            <AudioPlayer key={section.id} durationSec={section.audioDurationSec} src={resolveMedia(section.audioUrl)} />
          )}
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

        {/* footer nav — locked to the recording during the exam listening phase */}
        <div className="sticky bottom-0 z-10 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-soft-md backdrop-blur">
          <Button variant="outline" disabled={sIdx === 0 || listeningPhase} onClick={() => setSIdx((i) => i - 1)}>
            <ArrowLeft className="size-4" /> Previous
          </Button>
          <div className="hidden gap-1.5 sm:flex">
            {exam.sections.map((_, i) => (
              <button
                key={i}
                onClick={() => setSIdx(i)}
                disabled={listeningPhase}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  i === sIdx ? "bg-primary" : "bg-border hover:bg-muted-foreground/40",
                  listeningPhase && "cursor-default hover:bg-border"
                )}
                aria-label={`Part ${i + 1}`}
              />
            ))}
          </div>
          {listeningPhase ? (
            <Button disabled={!heard[sIdx]} onClick={() => (sIdx < last ? setSIdx(sIdx + 1) : setPhase("check"))}>
              {heard[sIdx] ? "Next part" : "Listen to the recording"} <ArrowRight className="size-4" />
            </Button>
          ) : sIdx < last ? (
            <Button onClick={() => setSIdx((i) => i + 1)}>
              {isExam ? "Next part" : <>Complete part &amp; continue</>} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button variant="success" onClick={submit} disabled={submitting}>
              <Flag className="size-4" /> {submitting ? "Submitting…" : "Submit for grading"}
            </Button>
          )}
        </div>
      </div>

      <GradingModal open={grading} onDone={afterGrading} />
    </div>
  );
}
