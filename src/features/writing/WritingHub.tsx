import { useNavigate } from "react-router-dom";
import { PenLine, Clock, FileText, Play } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ModuleToggle } from "@/components/common/ModuleToggle";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app-context";
import { writingTasks } from "@/mock/data";
import { useStudioExams } from "@/features/studio/store";
import { studioWritingToExam } from "@/features/studio/convert";

export function WritingHub() {
  const navigate = useNavigate();
  const { isLocked, module } = useApp();
  const locked = isLocked("writing");
  const tasks = writingTasks.filter((t) => t.module === "both" || t.module === module);
  const authored = useStudioExams()
    .filter((e) => e.skill === "writing" && e.status === "published")
    .flatMap((e) => studioWritingToExam(e).map((t) => ({ t, examTitle: e.title })))
    .filter(({ t }) => t.module === "both" || t.module === module);

  return (
    <div>
      <PageHeader
        title="Writing practice"
        subtitle="Task 1 & Task 2 with AI feedback across all four IELTS writing criteria."
        actions={<ModuleToggle />}
      />
      {locked && <UpgradeBanner feature="Writing practice" />}

      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((t) => (
          <Card key={t.id} className="flex flex-col p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-11 place-items-center rounded-xl bg-info/12 text-info">
                <PenLine className="size-5" />
              </span>
              <div>
                <Badge variant="info">Task {t.taskNumber}</Badge>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.kind}</p>
              </div>
            </div>
            <p className="flex-1 text-sm leading-relaxed">{t.prompt}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(t.durationSec / 60)} min</span>
              <span className="flex items-center gap-1"><FileText className="size-3.5" /> min {t.minWords} words</span>
            </div>
            <Button className="mt-4" onClick={() => navigate(`/exam/writing/${t.id}`)}>
              <Play className="size-4" /> Start writing
            </Button>
          </Card>
        ))}
      </div>

      {authored.length > 0 && (
        <>
          <div className="mb-3 mt-8 flex items-center gap-2">
            <h3 className="text-lg font-bold">From your Content Studio</h3>
            <Badge variant="muted">Published</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {authored.map(({ t, examTitle }) => (
              <Card key={t.id} className="flex flex-col p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-11 place-items-center rounded-xl bg-success/12 text-success">
                    <PenLine className="size-5" />
                  </span>
                  <div>
                    <Badge variant="success">Task {t.taskNumber}</Badge>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.kind} · {examTitle}</p>
                  </div>
                </div>
                <p className="flex-1 text-sm leading-relaxed">{t.prompt}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(t.durationSec / 60)} min</span>
                  <span className="flex items-center gap-1"><FileText className="size-3.5" /> min {t.minWords} words</span>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => navigate(`/exam/writing/${t.id}`)}>
                  <Play className="size-4" /> Take exam
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
