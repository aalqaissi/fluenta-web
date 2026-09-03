import { useEffect, useState } from "react";
import { CalendarClock, Pencil, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app-context";
import { pad2 } from "@/lib/utils";

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target + "T09:00:00").getTime() - now;
  const clamped = Math.max(0, diff);
  return {
    days: Math.floor(clamped / 86400000),
    hours: Math.floor((clamped / 3600000) % 24),
    minutes: Math.floor((clamped / 60000) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
  };
}

export function ExamCountdown({ onEdit }: { onEdit: () => void }) {
  const { user } = useApp();
  const c = useCountdown(user.examDate);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <CalendarClock className="size-4 text-primary" /> Exam countdown
        </h3>
        {user.examDate && (
          <button aria-label="Edit exam date" onClick={onEdit} className="text-muted-foreground hover:text-foreground">
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      {!user.examDate || !c ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CalendarClock className="size-7" />
          </div>
          <p className="text-sm font-semibold">Ready to set your exam date?</p>
          <p className="mt-1 text-xs text-muted-foreground">Track your prep and stay motivated with a countdown.</p>
          <Button size="sm" className="mt-3" onClick={onEdit}>
            Set exam date
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {new Date(user.examDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            <Badge variant="info" className="ml-2 align-middle">Scheduled</Badge>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: c.days, l: "Days" },
              { v: c.hours, l: "Hours" },
              { v: c.minutes, l: "Minutes" },
              { v: c.seconds, l: "Seconds" },
            ].map((b) => (
              <div key={b.l} className="rounded-xl bg-muted/60 py-3 text-center">
                <div className="text-2xl font-extrabold tabular-nums">{pad2(b.v)}</div>
                <div className="text-[11px] font-medium text-muted-foreground">{b.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border p-3">
            <div className="grid size-9 place-items-center rounded-lg bg-info/12 text-info">
              <Target className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Target band score</div>
              <div className="text-lg font-extrabold leading-none">{user.targetBand}</div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
