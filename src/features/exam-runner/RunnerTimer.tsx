import { useEffect, useRef, useState } from "react";
import { Clock, TimerOff } from "lucide-react";
import { cn, pad2 } from "@/lib/utils";
import type { ExamMode } from "./examMode";

/**
 * Component timer with the two mode rules:
 * - exam: a mandatory countdown that starts immediately and calls `onExpire` (auto-submit) at 0;
 * - practice: off by default; the student may switch on an informational countdown that never submits.
 */
export function useRunnerTimer({ mode, durationSec, onExpire, running = true }: {
  mode: ExamMode;
  durationSec: number;
  onExpire?: () => void;
  /** pause the countdown (e.g. before a phase starts) */
  running?: boolean;
}) {
  const [enabled, setEnabled] = useState(mode === "exam");
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [elapsed, setElapsed] = useState(0);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      if (enabled) setTimeLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [enabled, running]);

  useEffect(() => {
    if (mode === "exam" && enabled && timeLeft === 0) expireRef.current?.();
  }, [mode, enabled, timeLeft]);

  return {
    mode,
    enabled,
    timeLeft,
    /** seconds actually spent (counts even when the practice timer is off) */
    elapsed,
    toggle: () => {
      if (mode === "exam") return; // exam timing can't be switched off
      setEnabled((v) => !v);
    },
    reset: (sec: number) => setTimeLeft(sec),
  };
}

export function TimerControl({ timer, label }: { timer: ReturnType<typeof useRunnerTimer>; label?: string }) {
  const { mode, enabled, timeLeft } = timer;
  const low = enabled && timeLeft < 120;
  const clock = `${pad2(Math.floor(timeLeft / 60))}:${pad2(timeLeft % 60)}`;
  if (mode === "exam") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums",
          low ? "bg-destructive/10 text-destructive" : "bg-muted"
        )}
        aria-label={`${label ?? "Time left"} ${clock}`}
      >
        <Clock className="size-4" /> {label && <span className="hidden text-xs font-semibold sm:inline">{label}</span>} {clock}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={timer.toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums transition-colors",
        enabled ? (low ? "bg-destructive/10 text-destructive" : "bg-muted") : "border border-dashed border-border text-muted-foreground hover:bg-muted"
      )}
      aria-pressed={enabled}
      title={enabled ? "Practice timer — click to turn off" : "Practice mode: timer is optional — click to turn it on"}
    >
      {enabled ? <Clock className="size-4" /> : <TimerOff className="size-4" />}
      {enabled ? (timeLeft === 0 ? "Time's up — keep going" : clock) : "Timer off"}
    </button>
  );
}
