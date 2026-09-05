import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { sampleWritingResult } from "@/mock/data";
import { resolveWritingTask } from "@/features/studio/convert";
import { getLastWriting } from "@/store/attempt-store";
import type { WritingCriterionKey } from "@/mock/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/common/ProgressRing";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bandTone, cn, formatBand } from "@/lib/utils";

const critColor: Record<WritingCriterionKey, string> = {
  task: "bg-primary/25 outline-primary",
  coherence: "bg-info/25 outline-info",
  lexical: "bg-secondary/30 outline-secondary",
  grammar: "bg-destructive/20 outline-destructive",
};
const critBar: Record<WritingCriterionKey, string> = {
  task: "bg-primary",
  coherence: "bg-info",
  lexical: "bg-secondary",
  grammar: "bg-destructive",
};

export function WritingResultsPage() {
  const navigate = useNavigate();
  const result = sampleWritingResult;
  const written = getLastWriting();
  const answer = written?.answer?.trim() ? written.answer : result.answer;
  const wordCount = written?.wordCount ?? result.wordCount;
  const task = resolveWritingTask(written?.taskId);

  const [mode, setMode] = useState<"original" | "feedback">("feedback");
  const [crit, setCrit] = useState<WritingCriterionKey>("task");

  const activeAnnotations = result.annotations.filter((a) => a.criterion === crit);
  const critMeta = result.criteria.find((c) => c.key === crit)!;

  const rendered = useMemo(() => renderAnnotated(answer, result.annotations, mode === "feedback"), [answer, mode]);

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/progress")}>
        <ArrowLeft className="size-4" /> Back to progress
      </Button>

      {/* hero */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <ProgressRing value={(result.overall / 9) * 100} size={104} stroke={10} label={formatBand(result.overall)} sublabel="overall" />
            <div>
              <Badge variant="info" className="mb-1">
                <Sparkles className="size-3" /> AI feedback · Task {task.taskNumber}
              </Badge>
              <h1 className="text-2xl font-extrabold">Your writing, reviewed</h1>
              <p className="text-sm text-muted-foreground">{wordCount} words · scored across all four criteria.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {result.criteria.map((c) => (
              <button
                key={c.key}
                onClick={() => setCrit(c.key)}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-colors",
                  crit === c.key ? "border-primary bg-primary/[0.05]" : "border-border hover:bg-muted"
                )}
              >
                <div className="text-[11px] font-semibold text-muted-foreground">{c.label}</div>
                <div className={cn("text-lg font-extrabold leading-none", bandTone(c.band))}>{formatBand(c.band)}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", critBar[c.key])} style={{ width: `${(c.band / 9) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* your answer */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Your answer</h2>
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList>
                <TabsTrigger value="original">Original</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-[1.9]">{rendered}</div>
          {mode === "feedback" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Highlighted spans mark AI-detected issues. Select a criterion on the right to focus.
            </p>
          )}
        </Card>

        {/* criterion errors */}
        <div>
          <Card className="p-5">
            <h3 className={cn("text-base font-extrabold", bandTone(critMeta.band))}>
              {critMeta.label} · {formatBand(critMeta.band)}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{critMeta.summary}</p>

            <div className="mt-4 space-y-3">
              {activeAnnotations.length === 0 && (
                <p className="text-sm text-muted-foreground">No specific issues flagged for this criterion.</p>
              )}
              {activeAnnotations.map((a, i) => (
                <div key={a.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm italic text-foreground/80">“{a.quote}”</p>
                      <p className="mt-1.5 text-sm">{a.note}</p>
                      <Badge variant="muted" className="mt-2">{crit}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-4 overflow-hidden border-0 bg-warm-gradient p-5 text-white">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Bot className="size-5" /> Get personalized guidance
            </h3>
            <p className="mt-1 text-sm text-white/85">
              Chat with Fluenta Coach to understand your mistakes and practice targeted exercises.
            </p>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate("/coach")}>
              Start conversation with Fluenta Coach
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function renderAnnotated(text: string, annotations: { quote: string; criterion: WritingCriterionKey }[], on: boolean) {
  if (!on) return text;
  let segs: { t: string; crit?: WritingCriterionKey }[] = [{ t: text }];
  for (const a of annotations) {
    const next: typeof segs = [];
    for (const seg of segs) {
      if (seg.crit) {
        next.push(seg);
        continue;
      }
      const idx = seg.t.indexOf(a.quote);
      if (idx === -1) {
        next.push(seg);
        continue;
      }
      if (idx > 0) next.push({ t: seg.t.slice(0, idx) });
      next.push({ t: a.quote, crit: a.criterion });
      next.push({ t: seg.t.slice(idx + a.quote.length) });
    }
    segs = next;
  }
  return segs.map((s, i) =>
    s.crit ? (
      <mark key={i} className={cn("rounded-[3px] px-0.5 text-inherit outline outline-1 outline-offset-1", critColor[s.crit])}>
        {s.t}
      </mark>
    ) : (
      <span key={i}>{s.t}</span>
    )
  );
}
