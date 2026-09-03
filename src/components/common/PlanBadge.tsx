import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PlanBadge({ label, className }: { label: string; className?: string }) {
  const isPro = /pro/i.test(label);
  return (
    <Badge variant={isPro ? "pro" : "muted"} className={cn("gap-1", className)}>
      {isPro && <Sparkles className="size-3" />}
      {label}
    </Badge>
  );
}
