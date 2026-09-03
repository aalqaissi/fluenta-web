import { useEffect, useState } from "react";
import { BrainCircuit, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { gradingSteps, runAiGrading } from "@/lib/mockApi";
import { cn } from "@/lib/utils";

export function GradingModal({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState(gradingSteps[0].label);

  useEffect(() => {
    if (!open) return;
    setPct(0);
    let cancelled = false;
    runAiGrading((p, l) => {
      if (cancelled) return;
      setPct(p);
      setLabel(l);
    }).then(() => {
      if (!cancelled) setTimeout(onDone, 500);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent hideClose className="max-w-md text-center" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">AI is grading your work</DialogTitle>
        <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-2xl bg-warm-soft">
          <BrainCircuit className="size-8 text-primary" />
        </div>
        <h3 className="text-xl font-extrabold">AI is grading your work</h3>
        <p className="text-sm text-muted-foreground">{label}</p>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Progress</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <ul className="mt-4 space-y-2 text-left">
          {gradingSteps.map((s) => {
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
        <p className="mt-4 text-xs text-muted-foreground">This usually takes 15–30 seconds. Please don’t close this window.</p>
      </DialogContent>
    </Dialog>
  );
}
