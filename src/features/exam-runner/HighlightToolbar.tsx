import { useState } from "react";
import { Highlighter, Info, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const swatches = [
  { key: "yellow", cls: "bg-yellow-300", label: "Key idea" },
  { key: "green", cls: "bg-green-400", label: "Answer clue" },
  { key: "blue", cls: "bg-sky-400", label: "Definition" },
  { key: "rose", cls: "bg-rose-400", label: "Contrast" },
  { key: "purple", cls: "bg-purple-400", label: "Example" },
];

export function HighlightToolbar({
  activeColor,
  setActiveColor,
  onClear,
  hasHighlights,
}: {
  activeColor: string | null;
  setActiveColor: (c: string | null) => void;
  onClear: () => void;
  hasHighlights: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Highlighter className="size-4" /> Highlight
        </span>
        <div className="flex items-center gap-1.5">
          {swatches.map((s) => (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveColor(activeColor === s.key ? null : s.key)}
                  aria-label={s.label}
                  className={cn(
                    "size-6 rounded-md ring-offset-2 ring-offset-surface transition-all",
                    s.cls,
                    activeColor === s.key ? "ring-2 ring-foreground scale-110" : "hover:scale-110"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>{s.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Info className="size-4" /> Legend
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px]">
            <div className="space-y-1">
              {swatches.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded", s.cls)} /> {s.label}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>

        <button
          onClick={() => setConfirm(true)}
          disabled={!hasHighlights}
          className="ml-auto flex items-center gap-1 text-sm text-destructive/80 transition-colors hover:text-destructive disabled:opacity-40"
        >
          <Eraser className="size-4" /> Clear all
        </button>

        {activeColor && (
          <span className="w-full text-xs text-muted-foreground">
            Select text in the passage to highlight it. Click the swatch again to stop.
          </span>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Clear all annotations?"
        description="This will remove every highlight you've added to this passage. This can't be undone."
        confirmLabel="Clear all"
        onConfirm={onClear}
      />
    </TooltipProvider>
  );
}
