import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search, BookOpen, Check, RefreshCw, GraduationCap } from "lucide-react";
import { getReadingExam } from "@/lib/mockApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { HighlightableText, type Highlight } from "@/features/exam-runner/HighlightableText";
import { HighlightToolbar } from "@/features/exam-runner/HighlightToolbar";
import { QuestionRenderer } from "@/features/exam-runner/questions/QuestionRenderer";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { Passage, QuestionGroup, QuestionType } from "@/mock/types";
import { cn, formatBand } from "@/lib/utils";

interface Section {
  passage: Passage;
  groups: QuestionGroup[];
}

/**
 * Practice by question type — the same passage + questions layout as the Full Test, but showing
 * only the questions of the selected type, across every passage that contains that type. Navigate
 * passages with Previous / Next passage; check answers for an instant review. (No strategy steps.)
 */
export function QuestionTypePracticePage() {
  const { skill, type } = useParams();
  const navigate = useNavigate();
  const qType = type as QuestionType;
  const label = QUESTION_TYPE_LABEL[qType] ?? "Practice";

  // Build, from the built-in reading exam, the passages that contain the selected type — keeping
  // only the matching questions in each. (Vocabulary/Grammar and other skills: coming soon.)
  const sections: Section[] = useMemo(() => {
    if (skill !== "reading") return [];
    const exam = getReadingExam();
    const out: Section[] = [];
    for (const p of exam.passages) {
      const groups: QuestionGroup[] = [];
      for (const g of p.groups) {
        const questions = g.questions.filter((q) => (q.type ?? g.type) === qType);
        if (questions.length) groups.push({ ...g, questions });
      }
      if (groups.length) out.push({ passage: p, groups });
    }
    return out;
  }, [skill, qType]);

  const [pIdx, setPIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [find, setFind] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const allQuestions = sections.flatMap((s) => s.groups.flatMap((g) => g.questions));
  const total = allQuestions.length;
  const answered = allQuestions.filter((q) => (answers[q.id] ?? "").trim()).length;
  const correct = allQuestions.filter(
    (q) => (answers[q.id] ?? "").trim().toLowerCase() === q.correct.trim().toLowerCase()
  ).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const band = pct >= 90 ? 8.5 : pct >= 75 ? 7.5 : pct >= 60 ? 6.5 : pct >= 40 ? 5.5 : 4.5;

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState
          icon={GraduationCap}
          title={skill === "reading" ? "No passages for this type yet" : "Practice by type is coming soon"}
          description={skill === "reading"
            ? "We couldn't find passages with this question type in the current bank."
            : `Targeted ${skill} practice by type is on the way.`}
          action={<Button onClick={() => navigate(`/simulation/${skill ?? "reading"}`)}>Back</Button>}
        />
      </div>
    );
  }

  const section = sections[Math.min(pIdx, sections.length - 1)];

  return (
    <div className="min-h-dvh">
      {/* top bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/simulation/${skill ?? "reading"}`)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{label} · Practice by type</h1>
            <p className="text-xs text-muted-foreground">
              Reading · passage {Math.min(pIdx, sections.length - 1) + 1} of {sections.length}
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">{qType.replace(/-/g, " ")}</Badge>
          <Badge variant="muted">{answered}/{total} answered</Badge>
        </div>
      </div>

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
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <BookOpen className="size-4" /> Yalla Reading
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find text…" className="pl-9" />
          </div>
          <h2 className="mb-3 text-xl font-extrabold tracking-tight">{section.passage.headline}</h2>
          <HighlightableText
            paragraphs={section.passage.paragraphs}
            highlights={highlights.filter((h) => h.para < section.passage.paragraphs.length)}
            find={find}
            activeColor={activeColor}
            onHighlight={(h) => setHighlights((prev) => [...prev, h])}
          />
        </section>

        {/* questions */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto">
          {checked && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-success/[0.06] p-3">
              <span className="grid size-10 place-items-center rounded-xl bg-success/15 text-sm font-extrabold text-success">
                {correct}/{total}
              </span>
              <div>
                <p className="text-sm font-bold">Nice work on {label}!</p>
                <p className="text-xs text-muted-foreground">Estimated band for this type: <span className="font-bold text-foreground">{formatBand(band)}</span></p>
              </div>
            </div>
          )}
          {section.groups.map((g) => (
            <div key={g.id} className="mb-6 last:mb-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold">{g.rangeLabel}</h3>
                <Badge variant="outline" className="shrink-0">{g.type.replace(/-/g, " ")}</Badge>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{g.instructions}</p>
              <QuestionRenderer group={g} answers={answers} setAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} review={checked} />
            </div>
          ))}
        </section>
      </div>

      {/* footer nav */}
      <div className="sticky bottom-0 z-10 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-soft-md backdrop-blur">
        <Button variant="outline" disabled={pIdx === 0} onClick={() => setPIdx((i) => Math.max(0, i - 1))}>
          <ArrowLeft className="size-4" /> Previous
        </Button>
        <div className="hidden gap-1.5 sm:flex">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => setPIdx(i)}
              className={cn("size-2.5 rounded-full transition-colors", i === pIdx ? "bg-primary" : "bg-border hover:bg-muted-foreground/40")}
              aria-label={`Passage ${i + 1}`}
            />
          ))}
        </div>
        {checked ? (
          <Button variant="outline" onClick={() => { setChecked(false); setAnswers({}); setPIdx(0); }}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        ) : pIdx < sections.length - 1 ? (
          <Button onClick={() => setPIdx((i) => i + 1)}>
            Next passage <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button variant="success" onClick={() => { setChecked(true); setPIdx(0); }}>
            <Check className="size-4" /> Check answers
          </Button>
        )}
      </div>
    </div>
  );
}
