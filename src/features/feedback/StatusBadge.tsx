import { Badge } from "@/components/ui/badge";
import type { FeedbackStatus } from "@/lib/api";

const MAP: Record<FeedbackStatus, { label: string; variant: "info" | "secondary" | "success" }> = {
  new: { label: "New", variant: "info" },
  under_review: { label: "Under review", variant: "secondary" },
  completed: { label: "Completed", variant: "success" },
};

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  const m = MAP[status] ?? MAP.new;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
