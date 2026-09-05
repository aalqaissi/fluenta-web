import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Loader2, WifiOff, Star, Send, CheckCircle2, Eye, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "./StatusBadge";
import { api, ApiError, type FeedbackDto, type FeedbackStatus } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";

const FILTERS: { key: "all" | FeedbackStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "under_review", label: "Under review" },
  { key: "completed", label: "Completed" },
];

export function FeedbackReviewPage() {
  const [filter, setFilter] = useState<"all" | FeedbackStatus>("all");
  const { data, loading, error, reload } = useAsync(() => api.adminFeedback.queue(), []);

  const items = (data?.items ?? []).filter((f) => filter === "all" || f.status === filter);

  return (
    <div>
      <PageHeader title="Feedback Review" subtitle="Review student feedback, reply, and update its status." />

      {data && (
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? data.items.length
              : f.key === "new" ? data.newCount : f.key === "under_review" ? data.underReview : data.completed;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label} <span className="ml-1 rounded bg-muted px-1.5 text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <Card className="p-10 text-center"><WifiOff className="mx-auto mb-2 size-6 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></Card>
      ) : loading ? (
        <Card className="p-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center"><MessageSquareText className="mx-auto mb-2 size-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">No feedback in this view.</p></Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => <ReviewCard key={f.id} f={f} onChanged={reload} />)}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ f, onChanged }: { f: FeedbackDto; onChanged: () => void }) {
  const [reply, setReply] = useState(f.adminReply ?? "");
  const [busy, setBusy] = useState(false);

  async function update(patch: { status?: FeedbackStatus; adminReply?: string }) {
    setBusy(true);
    try {
      await api.adminFeedback.update(f.id, patch);
      toast.success("Updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold">
          {(f.userName || "?").slice(0, 2).toUpperCase()}
        </span>
        <span className="text-sm font-bold">{f.userName}</span>
        <Badge variant="outline">{f.category}</Badge>
        <StatusBadge status={f.status} />
        {f.rating ? (
          <span className="flex items-center gap-0.5">
            {Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-secondary text-secondary" />)}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(f.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      <h3 className="mt-2 font-bold">{f.subject || "(no subject)"}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{f.message}</p>

      <div className="mt-4">
        <label className="text-xs font-semibold text-muted-foreground">Reply to the student</label>
        <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a response…" className="mt-1" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy || reply === (f.adminReply ?? "")} onClick={() => update({ adminReply: reply })}>
          <Send className="size-4" /> Save reply
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        {f.status !== "under_review" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => update({ status: "under_review" })}>
            <Eye className="size-4" /> Mark under review
          </Button>
        )}
        {f.status !== "completed" ? (
          <Button size="sm" variant="success" disabled={busy} onClick={() => update({ status: "completed", adminReply: reply || undefined })}>
            <CheckCircle2 className="size-4" /> Complete
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => update({ status: "new" })}>
            <RotateCcw className="size-4" /> Reopen
          </Button>
        )}
      </div>
    </Card>
  );
}
