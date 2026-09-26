import { Loader2, WifiOff } from "lucide-react";
import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Loading / error / nothing-published states for a student exam pool. Returns null once there
 * is at least one exam to show, so hubs can render `<PoolState …/> ?? content`.
 */
export function PoolState({
  loading,
  error,
  count,
  reload,
  icon,
  skillLabel,
}: {
  loading: boolean;
  error: string | null;
  count: number;
  reload: () => void;
  icon: ComponentType<{ className?: string }>;
  skillLabel: string;
}) {
  if (error)
    return (
      <Card className="p-10 text-center">
        <WifiOff className="mx-auto mb-2 size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={reload}>Retry</Button>
      </Card>
    );
  if (loading && count === 0)
    return (
      <Card className="p-10 text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading {skillLabel} tests…</p>
      </Card>
    );
  if (count === 0)
    return (
      <EmptyState
        icon={icon}
        title={`No ${skillLabel} tests yet`}
        description={`New ${skillLabel} tests appear here as soon as they're published.`}
        action={<Button variant="outline" size="sm" onClick={reload}>Refresh</Button>}
      />
    );
  return null;
}
