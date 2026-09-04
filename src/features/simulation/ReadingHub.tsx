import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, ListChecks, Play, Target, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ModuleToggle } from "@/components/common/ModuleToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getReadingExam } from "@/lib/mockApi";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import { useApp } from "@/store/app-context";
import { PracticeByTypeGrid } from "@/features/practice/PracticeByTypeGrid";
import { useStudioExams } from "@/features/studio/store";

export function ReadingHub() {
  const navigate = useNavigate();
  const exam = getReadingExam();
  const { module } = useApp();
  const [mode, setMode] = useState("full");
  const studioReading = useStudioExams().filter((e) => e.skill === "reading" && e.status === "published");

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
          <Card className="mb-6 overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
              <div className="p-6">
                <Badge variant="success" className="mb-2">
                  <BookOpen className="size-3" /> {module === "academic" ? "Academic" : "General Training"} · Featured
                </Badge>
                <h2 className="text-xl font-extrabold tracking-tight text-balance">{exam.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  3 passages · 40 questions · covers True/False/Not Given, Matching, Completion and more.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-4" /> 60 min</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><ListChecks className="size-4" /> 40 questions</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Target className="size-4" /> {module === "academic" ? "Academic" : "General"}</span>
                </div>
                <Button className="mt-5" size="lg" onClick={() => navigate(`/exam/reading/${exam.id}`)}>
                  <Play className="size-4" /> Start reading test
                </Button>
              </div>
              <div className="hidden flex-col justify-center gap-2 border-l border-border bg-muted/40 p-6 md:flex">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Question types included</p>
                <div className="flex flex-wrap gap-1.5">
                  {exam.questionTypes.map((t) => (
                    <Badge key={t} variant="muted">{QUESTION_TYPE_LABEL[t]}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {studioReading.length > 0 && (
            <>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-lg font-bold">From your Content Studio</h3>
                <Badge variant="muted">Published</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {studioReading.map((e) => (
                  <Card key={e.id} className="flex flex-col p-5">
                    <div className="mb-3 grid size-11 place-items-center rounded-xl bg-success/12 text-success">
                      <BookOpen className="size-5" />
                    </div>
                    <h4 className="font-bold leading-snug">{e.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {e.passages?.length ?? 0} passage{(e.passages?.length ?? 0) === 1 ? "" : "s"} · {e.module === "general" ? "General" : "Academic"}
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(`/exam/reading/${e.id}`)}>
                      <Play className="size-4" /> Take exam
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="type">
          <div className="mb-4 rounded-2xl bg-warm-soft p-4">
            <p className="text-sm font-semibold">Weak on a specific question type? Start there.</p>
            <p className="text-sm text-muted-foreground">
              Each type gives you a strategy lesson, quick tips, then a graded practice set — the fastest way to lift a weak area.
            </p>
          </div>
          <PracticeByTypeGrid skill="reading" types={exam.questionTypes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
