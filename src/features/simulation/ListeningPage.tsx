import { useNavigate } from "react-router-dom";
import { Headphones, Clock, ListChecks, Play } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/features/exam-runner/AudioPlayer";
import { getListeningExam } from "@/lib/mockApi";
import { useApp } from "@/store/app-context";
import { useStudioExams } from "@/features/studio/store";

export function ListeningPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("listening");
  const exam = getListeningExam();
  const totalQ = exam.sections.reduce((n, s) => n + s.group.questions.length, 0);
  const studioListening = useStudioExams().filter((e) => e.skill === "listening" && e.status === "published");

  return (
    <div>
      <PageHeader title="Listening practice" subtitle="Four sections, played once — just like the real IELTS test." />
      {locked && <UpgradeBanner feature="Listening practice" />}

      {/* featured full mock */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
          <div className="p-6">
            <Badge variant="success" className="mb-2">
              <Headphones className="size-3" /> Featured mock
            </Badge>
            <h2 className="text-xl font-extrabold tracking-tight text-balance">{exam.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {exam.sections.length} sections · {totalQ} questions · each recording plays once.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-4" /> {Math.round(exam.durationSec / 60)} min</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><ListChecks className="size-4" /> {totalQ} questions</span>
            </div>
            <Button className="mt-5" size="lg" onClick={() => navigate(`/exam/listening/${exam.id}`)}>
              <Play className="size-4" /> Start listening test
            </Button>
          </div>
          <div className="hidden flex-col justify-center gap-2 border-l border-border bg-muted/40 p-6 md:flex">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sections</p>
            <ul className="space-y-1.5 text-sm">
              {exam.sections.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-primary">{s.number}</span>
                  <span className="text-muted-foreground">{s.context}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* audio preview */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-semibold">Audio preview</p>
        <AudioPlayer durationSec={exam.sections[0].audioDurationSec} />
      </div>

      {studioListening.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-bold">From your Content Studio</h3>
            <Badge variant="muted">Published</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studioListening.map((e) => (
              <Card key={e.id} className="flex flex-col p-5">
                <div className="mb-3 grid size-11 place-items-center rounded-xl bg-secondary/15 text-[rgb(var(--on-secondary))]">
                  <Headphones className="size-5" />
                </div>
                <h4 className="font-bold leading-snug">{e.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {e.sections?.length ?? 0} section{(e.sections?.length ?? 0) === 1 ? "" : "s"} · {e.module === "general" ? "General" : "Academic"}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(`/exam/listening/${e.id}`)}>
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
