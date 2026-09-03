import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LockChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-[rgb(var(--on-secondary))]",
        className
      )}
    >
      <Lock className="size-3" />
      Pro
    </span>
  );
}
