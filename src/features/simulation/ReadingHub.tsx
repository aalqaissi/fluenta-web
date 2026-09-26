import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, ListChecks, Play, Target, GraduationCap, Shuffle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ModuleToggle } from "@/components/common/ModuleToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getReadingExam } from "@/lib/mockApi";
import type { ExamDto } from "@/lib/api";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { ReadingExam } from "@/mock/types";
import { useApp } from "@/store/app-context";
import { PracticeByTypeGrid } from "@/features/practice/PracticeByTypeGrid";
import { useExamPool } from "@/features/exam-runner/publishedExams";
import { readingFromDto } from "@/features/exam-runner/loadExam";
import { PoolState } from "@/features/exam-runner/PoolState";

interface ReadingItem {
  id: string;
  module: ExamDto["module"];
  exam: ReadingExam;
}
const toItem = (dto: ExamDto): ReadingItem => ({ id: dto.id, module: dto.module, exam: readingFromDto(dto) });

const moduleLabel = (m: ExamDto["module"]) => (m === "general" ? "General Training" : m === "both" ? "Academic & General" : "Academic");
const questionCount = (e: ReadingExam) => e.passages.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.questions.length, 0), 0);

export function ReadingHub() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("full");
  const { module } = useApp();
  // Only tests for the chosen module (Academic / General Training) — "both" suits either.
  const pool = useExamPool("reading", toItem, { key: module, keep: (d) => d.module === "both" || d.module === module });
  const featured = pool.featured;

  return (
    <div>
      <PageHeader
        title="Reading practice"
        subtitle="Sit a full test, or target a single question type with a guided lesson."
        actions={<ModuleToggle />}
      />

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="mb-5">
          <TabsTrigger value="full">
            <BookOpen className="size-4" /> Full Test
          </TabsTrigger>
          <TabsTrigger value="type">
            <GraduationCap className="size-4" /> By Question Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="full">
          {PoolState({ loading: pool.loading, error: pool.error, count: pool.all.length, reload: pool.reload, icon: BookOpen, skillLabel: module === "general" ? "General Training reading" : "Academic reading" }) ?? (
            featured && (
              <>
                <Card className="mb-6 overflow-hidden">
                  <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
                    <div className="p-6">
                      <Badge variant="success" className="mb-2">
                        <BookOpen className="size-3" /> {moduleLabel(featured.module)} · Picked for you
                      </Badge>
                      <h2 className="text-xl font-extrabold tracking-tight text-balance">{featured.exam.title}</h2>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {featured.exam.passages.length} passage{featured.exam.passages.length === 1 ? "" : "s"} · {questionCount(featured.exam)} questions
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-4" /> {Math.round(featured.exam.durationSec / 60)} min</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground"><ListChecks className="size-4" /> {questionCount(featured.exam)} questions</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Target className="size-4" /> {moduleLabel(featured.module)}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="lg" onClick={() => navigate(`/exam/reading/${featured.id}`)}>
                          <Play className="size-4" /> Start reading test
                        </Button>
                        {pool.all.length > 1 && (
                          <Button size="lg" variant="outline" onClick={pool.shuffle}>
                            <Shuffle className="size-4" /> Pick another
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="hidden flex-col justify-center gap-2 border-l border-border bg-muted/40 p-6 md:flex">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Question types included</p>
                      <div className="flex flex-wrap gap-1.5">
                        {featured.exam.questionTypes.map((t) => (
                          <Badge key={t} variant="muted">{QUESTION_TYPE_LABEL[t]}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {pool.others.length > 0 && (
                  <>
                    <h3 className="mb-3 text-lg font-bold">More reading tests</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pool.others.map((e) => (
                        <Card key={e.id} className="flex flex-col p-5">
                          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-success/12 text-success">
                            <BookOpen className="size-5" />
                          </div>
                          <h4 className="font-bold leading-snug">{e.exam.title}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {e.exam.passages.length} passage{e.exam.passages.length === 1 ? "" : "s"} · {questionCount(e.exam)} questions · {moduleLabel(e.module)}
                          </p>
                          <Button variant="outline" className="mt-4" onClick={() => navigate(`/exam/reading/${e.id}`)}>
                            <Play className="size-4" /> Take exam
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </>
            )
          )}
        </TabsContent>

        <TabsContent value="type">
          <div className="mb-4 rounded-2xl bg-warm-soft p-4">
            <p className="text-sm font-semibold">Weak on a specific question type? Start there.</p>
            <p className="text-sm text-muted-foreground">
              Each type gives you a strategy lesson, quick tips, then a graded practice set — the fastest way to lift a weak area.
            </p>
          </div>
          {/* Guided question-type lessons are curated practice, independent of the published test pool. */}
          <PracticeByTypeGrid skill="reading" types={getReadingExam().questionTypes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
