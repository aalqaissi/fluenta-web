import { useEffect, useState } from "react";
import { ListChecks, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Honest, deterministic scoring feedback (reading/listening are scored on the server against the
// answer key — no AI at this stage).
const scoringSteps = [
  { label: "Checking your answers…", atProgress: 20 },
  { label: "Comparing with the answer key…", atProgress: 50 },
  { label: "Calculating your band score…", atProgress: 80 },
  { label: "Done!", atProgress: 100 },
];

export function GradingModal({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPct(0);
    let value = 0;
    let cancelled = false;
    const totalMs = 1800;
    const ticks = 36;
    const timer = setInterval(() => {
      if (cancelled) return;
      value = Math.min(100, value + Math.ceil(100 / ticks));
      setPct(value);
      if (value >= 100) {
        clearInterval(timer);
        setTimeout(() => !cancelled && onDone(), 400);
      }
    }, totalMs / ticks);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = [...scoringSteps].reverse().find((s) => pct >= s.atProgress)?.label ?? scoringSteps[0].label;

  return (
    <Dialog open={open}>
      <DialogContent hideClose className="max-w-md text-center" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Scoring your answers</DialogTitle>
        <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-2xl bg-warm-soft">
          <ListChecks className="size-8 text-primary" />
        </div>
        <h3 className="text-xl font-extrabold">Scoring your answers</h3>
        <p className="text-sm text-muted-foreground">{label}</p>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Progress</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <ul className="mt-4 space-y-2 text-left">
          {scoringSteps.map((s) => {
            const active = pct >= s.atProgress;
            const current = label === s.label && pct < 100;
            return (
              <li key={s.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full",
                    active ? "bg-success text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {active ? <Check className="size-3" /> : current ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <span className={cn(active ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Your answers are scored on the server. This only takes a moment.</p>
      </DialogContent>
    </Dialog>
  );
}
