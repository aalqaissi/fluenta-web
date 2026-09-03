import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, ListChecks, Play, Target } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getReadingExam } from "@/lib/mockApi";
import { QUESTION_TYPE_LABEL } from "@/mock/data";

const themedSets = [
  { title: "Science & Environment", passages: 3, questions: 40, minutes: 60, level: "Academic" },
  { title: "Society & Culture", passages: 3, questions: 40, minutes: 60, level: "Academic" },
  { title: "Technology & Innovation", passages: 3, questions: 40, minutes: 60, level: "Academic" },
];

export function ReadingHub() {
  const navigate = useNavigate();
  const exam = getReadingExam();

  return (
    <div>
      <PageHeader
        title="Reading practice"
        subtitle="Academic reading passages with all 11 IELTS question types and instant AI grading."
      />

      {/* featured exam */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
          <div className="p-6">
            <Badge variant="success" className="mb-2">
              <BookOpen className="size-3" /> Featured set
            </Badge>
            <h2 className="text-xl font-extrabold tracking-tight text-balance">{exam.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              3 passages · 40 questions · covers True/False/Not Given, Matching, Completion and more.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-4" /> 60 min
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ListChecks className="size-4" /> 40 questions
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="size-4" /> Academic
              </span>
            </div>
            <Button className="mt-5" size="lg" onClick={() => navigate(`/exam/reading/${exam.id}`)}>
              <Play className="size-4" /> Start reading exam
            </Button>
          </div>
          <div className="hidden flex-col justify-center gap-2 border-l border-border bg-muted/40 p-6 md:flex">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Question types included</p>
            <div className="flex flex-wrap gap-1.5">
              {exam.questionTypes.map((t) => (
                <Badge key={t} variant="muted">
                  {QUESTION_TYPE_LABEL[t]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <h3 className="mb-3 text-lg font-bold">More reading sets</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themedSets.map((s) => (
          <Card key={s.title} className="flex flex-col p-5">
            <div className="mb-3 grid size-11 place-items-center rounded-xl bg-success/12 text-success">
              <BookOpen className="size-5" />
            </div>
            <h4 className="font-bold">{s.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {s.passages} passages · {s.questions} questions
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {s.minutes} min
              </span>
              <Badge variant="outline">{s.level}</Badge>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/exam/reading/${exam.id}`)}>
              <Play className="size-4" /> Start
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
