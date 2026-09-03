import { useState } from "react";
import { CalendarDays, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-context";

const presets = [
  { label: "1 Month", months: 1 },
  { label: "2 Months", months: 2 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
];

function addMonths(months: number) {
  const d = new Date("2026-09-02T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function daysBetween(target: Date) {
  const now = new Date("2026-09-02T00:00:00");
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 86400000));
}

export function SetExamDateModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, updateUser } = useApp();
  const [preset, setPreset] = useState(3);
  const [band, setBand] = useState(String(user.targetBand));
  const date = addMonths(preset);
  const days = daysBetween(date);

  function save() {
    updateUser({ examDate: date.toISOString().slice(0, 10), targetBand: Number(band) });
    toast.success("Exam date set!", { description: `${days} days to prepare. Countdown started.` });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
          <DialogTitle>Set your exam date</DialogTitle>
          <DialogDescription>Track your preparation time and stay motivated.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {presets.map((p) => (
              <button
                key={p.months}
                onClick={() => setPreset(p.months)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                  preset === p.months
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" /> Exam date
            </p>
            <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm font-semibold">
              {fmt(date)}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Target className="size-4 text-muted-foreground" /> Target band score
            </p>
            <Select value={band} onValueChange={setBand}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9"].map((b) => (
                  <SelectItem key={b} value={b}>
                    {b} {b === "7" ? "· Recommended" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-info/10 p-3.5 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-info" />
            <p>
              <span className="font-bold">You have {days} days to prepare.</span>{" "}
              <span className="text-muted-foreground">Stay consistent with daily practice to reach your target of {band}.</span>
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              updateUser({ examDate: null });
              toast("Exam date cleared");
              onOpenChange(false);
            }}
          >
            Clear date
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save &amp; start countdown</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
