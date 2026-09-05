import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Trash2, ChevronRight, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { SkillIcon, skillMeta } from "@/components/common/SkillIcon";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { RecentExam } from "@/mock/types";
import { bandTone, cn, formatBand } from "@/lib/utils";

export function ProgressPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => api.content.progress(), []);
  const sectionSummaries = data?.sectionSummaries ?? [];
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<RecentExam | null>(null);

  const exams = (data?.recentExams ?? []).filter((e) => !deleted.has(e.id));
  const scored = sectionSummaries.filter((s) => s.band !== null);
  const strongest = scored.length ? scored.reduce((a, b) => (a.band! >= b.band! ? a : b)) : null;
  const weakest = scored.length ? scored.reduce((a, b) => (a.band! <= b.band! ? a : b)) : null;

  if (error) {
    return (
      <div>
        <PageHeader title="Progress" subtitle="Your performance across every skill, with a full history of attempts." />
        <Card className="p-10 text-center">
          <WifiOff className="mx-auto mb-2 size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Progress" subtitle="Your performance across every skill, with a full history of attempts." />
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading your progress…</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Progress" subtitle="Your performance across every skill, with a full history of attempts." />

      {/* strongest / weakest */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="bg-success/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <TrendingUp className="size-4" /> Strongest section
          </div>
          <div className="mt-1 text-2xl font-extrabold capitalize">{strongest ? skillMeta[strongest.skill].label : "—"}</div>
          <div className="text-sm text-muted-foreground">Average: {strongest ? formatBand(strongest.band) : "—"}</div>
        </Card>
        <Card className="bg-destructive/[0.05] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <TrendingDown className="size-4" /> Needs improvement
          </div>
          <div className="mt-1 text-2xl font-extrabold capitalize">{weakest ? skillMeta[weakest.skill].label : "—"}</div>
          <div className="text-sm text-muted-foreground">Average: {weakest ? formatBand(weakest.band) : "—"}</div>
        </Card>
      </div>

      {/* section tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {sectionSummaries.map((s) => (
          <Card key={s.skill} className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold capitalize text-muted-foreground">{skillMeta[s.skill].label}</span>
              <SkillIcon skill={s.skill} size="sm" />
            </div>
            <div className={cn("text-3xl font-extrabold", bandTone(s.band))}>{formatBand(s.band)}</div>
            <div className="text-xs text-muted-foreground">{s.tests} tests</div>
          </Card>
        ))}
      </div>

      {/* recent exams */}
      <h2 className="mb-3 text-lg font-bold">Recent exams</h2>
      <div className="space-y-3">
        {exams.map((e) => (
          <Card key={e.id} className="flex items-center gap-4 p-4">
            <SkillIcon skill={e.skill} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">{e.title}</h3>
                <Badge variant={e.status === "completed" ? "success" : e.status === "in-progress" ? "secondary" : "muted"}>
                  {e.status === "completed" ? "Completed" : e.status === "in-progress" ? "In progress" : "Not started"}
                </Badge>
                {e.isMock && <Badge variant="outline">Mock exam</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {e.sectionsDone}/{e.sectionsTotal} sections
                {e.band ? ` · band ${formatBand(e.band)}` : ""}
              </p>
            </div>
            {e.status === "completed" ? (
              <Button variant="outline" size="sm" onClick={() => navigate(`/results/${e.skill}/${e.id}`)}>
                View <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate(`/exam/${e.skill}/${e.id}`)}>
                Continue
              </Button>
            )}
            <button
              onClick={() => setToDelete(e)}
              aria-label="Delete exam"
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete exam?"
        description="This will permanently remove this attempt and its data. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) {
            setDeleted((prev) => new Set(prev).add(toDelete.id));
            toast.success("Exam deleted");
          }
        }}
      />
    </div>
  );
}
