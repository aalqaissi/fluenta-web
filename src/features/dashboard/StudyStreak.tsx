import { Flame, Trophy, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const intensity = ["bg-muted", "bg-primary/25", "bg-primary/55", "bg-primary"];

export function StudyStreak() {
  const { user } = useApp();
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Flame className="size-4 text-primary" /> Study streak
          </h3>
          <p className="text-sm text-muted-foreground">Your consistency builds excellence.</p>
        </div>
        <button aria-label="Refresh" className="text-muted-foreground transition-colors hover:text-foreground">
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-primary/8 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Flame className="size-3.5 text-primary" /> Current streak
          </div>
          <div className="mt-1 text-2xl font-extrabold text-primary">{user.streak.current}</div>
          <div className="text-xs text-muted-foreground">days in a row</div>
        </div>
        <div className="rounded-xl bg-success/8 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Trophy className="size-3.5 text-success" /> Best streak
          </div>
          <div className="mt-1 text-2xl font-extrabold text-success">{user.streak.best}</div>
          <div className="text-xs text-muted-foreground">personal record</div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Last 30 days</p>
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
          {user.streak.last30.map((v, i) => (
            <div
              key={i}
              className={cn("aspect-square rounded-[5px]", intensity[v])}
              title={`Day ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
