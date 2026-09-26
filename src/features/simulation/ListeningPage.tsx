import { useNavigate } from "react-router-dom";
import { Headphones, Clock, ListChecks, Play, Shuffle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/features/exam-runner/AudioPlayer";
import { useApp } from "@/store/app-context";
import type { ExamDto } from "@/lib/api";
import type { ListeningExam } from "@/mock/types";
import { useExamPool } from "@/features/exam-runner/publishedExams";
import { listeningFromDto } from "@/features/exam-runner/loadExam";
import { PoolState } from "@/features/exam-runner/PoolState";

interface ListeningItem {
  id: string;
  module: ExamDto["module"];
  exam: ListeningExam;
}
const toItem = (dto: ExamDto): ListeningItem => ({ id: dto.id, module: dto.module, exam: listeningFromDto(dto) });

const questionCount = (e: ListeningExam) => e.sections.reduce((n, s) => n + s.group.questions.length, 0);
const moduleLabel = (m: ExamDto["module"]) => (m === "general" ? "General" : m === "both" ? "Academic & General" : "Academic");

export function ListeningPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("listening");
  const pool = useExamPool("listening", toItem);
  const featured = pool.featured;

  return (
    <div>
      <PageHeader title="Listening practice" subtitle="Four sections, played once — just like the real IELTS test." />
      {locked && <UpgradeBanner feature="Listening practice" />}

      {PoolState({ loading: pool.loading, error: pool.error, count: pool.all.length, reload: pool.reload, icon: Headphones, skillLabel: "listening" }) ?? (
        featured && (
          <>
            <Card className="mb-6 overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
                <div className="p-6">
                  <Badge variant="success" className="mb-2">
                    <Headphones className="size-3" /> Picked for you
                  </Badge>
                  <h2 className="text-xl font-extrabold tracking-tight text-balance">{featured.exam.title}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {featured.exam.sections.length} section{featured.exam.sections.length === 1 ? "" : "s"} · {questionCount(featured.exam)} questions · each recording plays once.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-4" /> {Math.round(featured.exam.durationSec / 60)} min</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><ListChecks className="size-4" /> {questionCount(featured.exam)} questions</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="lg" onClick={() => navigate(`/exam/listening/${featured.id}`)}>
                      <Play className="size-4" /> Start listening test
                    </Button>
                    {pool.all.length > 1 && (
                      <Button size="lg" variant="outline" onClick={pool.shuffle}>
                        <Shuffle className="size-4" /> Pick another
                      </Button>
                    )}
                  </div>
                </div>
                <div className="hidden flex-col justify-center gap-2 border-l border-border bg-muted/40 p-6 md:flex">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sections</p>
                  <ul className="space-y-1.5 text-sm">
                    {featured.exam.sections.map((s) => (
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
            {featured.exam.sections[0] && (
              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold">Audio preview</p>
                <AudioPlayer durationSec={featured.exam.sections[0].audioDurationSec} />
              </div>
            )}

            {pool.others.length > 0 && (
              <>
                <h3 className="mb-3 text-lg font-bold">More listening tests</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pool.others.map((e) => (
                    <Card key={e.id} className="flex flex-col p-5">
                      <div className="mb-3 grid size-11 place-items-center rounded-xl bg-secondary/15 text-[rgb(var(--on-secondary))]">
                        <Headphones className="size-5" />
                      </div>
                      <h4 className="font-bold leading-snug">{e.exam.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {e.exam.sections.length} section{e.exam.sections.length === 1 ? "" : "s"} · {moduleLabel(e.module)}
                      </p>
                      <Button variant="outline" className="mt-4" onClick={() => navigate(`/exam/listening/${e.id}`)}>
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
    </div>
  );
}
