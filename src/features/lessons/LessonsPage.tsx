import { useState } from "react";
import { toast } from "sonner";
import { PlayCircle, FileText, Dumbbell, Clock, CheckCircle2, Loader2, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { Lesson } from "@/mock/types";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all", label: "All" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "general", label: "General" },
];

const kindIcon = { Video: PlayCircle, Article: FileText, Drill: Dumbbell };

export function LessonsPage() {
  const [filter, setFilter] = useState("all");
  const { data, loading, error } = useAsync(() => api.content.lessons(), []);
  const lessons = data ?? [];
  const list = lessons.filter((l) => filter === "all" || l.skill === filter);

  return (
    <div>
      <PageHeader title="Lessons & library" subtitle="Bite-sized lessons and drills to fix exactly what’s holding your band back." />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <Card className="p-10 text-center">
          <WifiOff className="mx-auto mb-2 size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      ) : loading ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading lessons…</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const Icon = kindIcon[lesson.kind];
  const done = lesson.progress === 100;
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <Badge variant="outline">{lesson.level}</Badge>
      </div>
      <h3 className="font-bold leading-snug">{lesson.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{lesson.summary}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" /> {lesson.minutes} min
        </span>
        <span className="capitalize">{lesson.skill}</span>
        <span>· {lesson.kind}</span>
      </div>
      {lesson.progress > 0 && lesson.progress < 100 && (
        <div className="mt-3">
          <Progress value={lesson.progress} className="h-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">{lesson.progress}% complete</p>
        </div>
      )}
      <Button
        variant={done ? "outline" : "primary"}
        className="mt-4"
        onClick={() => toast(done ? "Lesson completed" : "Opening lesson…", { description: lesson.title })}
      >
        {done ? (
          <>
            <CheckCircle2 className="size-4 text-success" /> Completed
          </>
        ) : lesson.progress > 0 ? (
          "Continue"
        ) : (
          "Start lesson"
        )}
      </Button>
    </Card>
  );
}
