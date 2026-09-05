import { Loader2, WifiOff, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RunnerLoading({ label = "Loading exam…" }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function RunnerError({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="size-5" />
        </div>
        <h1 className="text-lg font-bold">Couldn’t load this exam</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex justify-center gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          )}
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
