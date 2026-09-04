import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Search, BookOpen, Flag } from "lucide-react";
import { getReadingExam, scoreExam } from "@/lib/mockApi";
import { studioStore } from "@/features/studio/store";
import { studioReadingToExam } from "@/features/studio/convert";
import { setLastAttempt } from "@/store/attempt-store";
import { fullExamStore } from "@/features/simulation/fullexam-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HighlightableText, type Highlight } from "./HighlightableText";
import { HighlightToolbar } from "./HighlightToolbar";
import { QuestionRenderer } from "./questions/QuestionRenderer";
import { GradingModal } from "./GradingModal";
import { pad2, cn } from "@/lib/utils";

export function ReadingRunnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exam = useMemo(() => {
    const authored = id ? studioStore.get().find((e) => e.id === id && e.skill === "reading") : undefined;
    return authored && (authored.passages?.length ?? 0) > 0 ? studioReadingToExam(authored) : getReadingExam();
  }, [id]);

  const [sp] = useSearchParams();
  const full = sp.get("full");
  const [pIdx, setPIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [find, setFind] = useState("");
  const [timeLeft, setTimeLeft] = useState(exam.durationSec);
  const [grading, setGrading] = useState(false);
  const [gradedBand, setGradedBand] = useState(0);

  const passage = exam.passages[pIdx];
  const totalQ = useMemo(
    () => exam.passages.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.questions.length, 0), 0),
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
    const { correct, band } = scoreExam(exam, answers);
    setGradedBand(band);
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

  function afterGrading() {
    if (full) {
      fullExamStore.record("reading", gradedBand);
      navigate("/simulation/full-exam");
    } else {
      navigate(`/results/reading/${exam.id}`);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              Reading · {passage.label} · Passage {passage.passageNumber} of {passage.totalPassages}
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

      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        <div className="mb-4">
          <HighlightToolbar
            activeColor={activeColor}
            setActiveColor={setActiveColor}
            hasHighlights={highlights.length > 0}
            onClear={() => setHighlights([])}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* passage */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:max-h-[calc(100dvh-190px)] lg:overflow-y-auto">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
              <BookOpen className="size-4" /> Fluenta Reading
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find text…"
                className="pl-9"
              />
            </div>
            <h2 className="mb-3 text-xl font-extrabold tracking-tight">{passage.headline}</h2>
            <HighlightableText
              paragraphs={passage.paragraphs}
              highlights={highlights.filter((h) => h.para < passage.paragraphs.length)}
              find={find}
              activeColor={activeColor}
              onHighlight={(h) => setHighlights((prev) => [...prev, h])}
            />
          </section>

          {/* questions */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:max-h-[calc(100dvh-190px)] lg:overflow-y-auto">
            {passage.groups.map((g) => (
              <div key={g.id} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold">{g.rangeLabel}</h3>
                  <Badge variant="outline" className="shrink-0">
                    {g.type.replace(/-/g, " ")}
                  </Badge>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{g.instructions}</p>
                <QuestionRenderer group={g} answers={answers} setAnswer={setAnswer} />
              </div>
            ))}
          </section>
        </div>

        {/* footer nav */}
        <div className="sticky bottom-0 z-10 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-soft-md backdrop-blur">
          <Button variant="outline" disabled={pIdx === 0} onClick={() => setPIdx((i) => i - 1)}>
            <ArrowLeft className="size-4" /> Previous
          </Button>
          <div className="hidden gap-1.5 sm:flex">
            {exam.passages.map((_, i) => (
              <button
                key={i}
                onClick={() => setPIdx(i)}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  i === pIdx ? "bg-primary" : "bg-border hover:bg-muted-foreground/40"
                )}
                aria-label={`Passage ${i + 1}`}
              />
            ))}
          </div>
          {pIdx < exam.passages.length - 1 ? (
            <Button onClick={() => setPIdx((i) => i + 1)}>
              Next passage <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button variant="success" onClick={submit}>
              <Flag className="size-4" /> Submit for grading
            </Button>
          )}
        </div>
      </div>

      <GradingModal open={grading} onDone={afterGrading} />
    </div>
  );
}
