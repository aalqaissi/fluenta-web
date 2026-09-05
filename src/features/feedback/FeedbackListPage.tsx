import { useState } from "react";
import { useParams } from "react-router-dom";
import { MessageSquareText, Plus, Loader2, WifiOff, Star } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { StatusBadge } from "./StatusBadge";
import { api, type FeedbackDto } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";

export function FeedbackListPage() {
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.feedback.list(), []);

  return (
    <div>
      <PageHeader
        title="My Feedback"
        subtitle="Track the feedback you’ve shared and our responses."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Give feedback</Button>}
      />

      {error ? (
        <Card className="p-10 text-center"><WifiOff className="mx-auto mb-2 size-6 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></Card>
      ) : loading ? (
        <Card className="p-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No feedback yet"
          description="Share a suggestion, report a bug, or tell us what you love — we read every note."
          action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Give feedback</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((f) => <FeedbackCard key={f.id} f={f} highlight={f.id === id} />)}
        </div>
      )}

      <FeedbackModal open={open} onOpenChange={setOpen} onSubmitted={reload} />
    </div>
  );
}

function FeedbackCard({ f, highlight }: { f: FeedbackDto; highlight?: boolean }) {
  return (
    <Card className={cn("p-5", highlight && "ring-2 ring-primary")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{f.category}</Badge>
        <StatusBadge status={f.status} />
        {f.rating ? (
          <span className="flex items-center gap-0.5 text-xs text-secondary">
            {Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-secondary text-secondary" />)}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(f.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      <h3 className="mt-2 font-bold">{f.subject || "(no subject)"}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{f.message}</p>
      {f.adminReply && (
        <div className="mt-3 rounded-xl border border-info/30 bg-info/[0.05] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-info"><MessageSquareText className="size-3.5" /> Response from the team</div>
          <p className="whitespace-pre-wrap text-sm">{f.adminReply}</p>
        </div>
      )}
    </Card>
  );
}
