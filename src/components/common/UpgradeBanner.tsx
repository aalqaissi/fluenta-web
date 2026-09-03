import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Non-blocking upsell shown on locked (free-tier preview) sections.
 *  The feature underneath stays fully usable — this only demonstrates the gate. */
export function UpgradeBanner({ feature }: { feature: string }) {
  const navigate = useNavigate();
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-secondary/40 bg-secondary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/20 text-[rgb(var(--on-secondary))]">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">{feature} is a Pro feature</p>
          <p className="text-sm text-muted-foreground">
            You’re previewing it on a free account. Upgrade to unlock unlimited access and AI feedback.
          </p>
        </div>
      </div>
      <Button className="shrink-0" onClick={() => navigate("/checkout")}>
        Upgrade to Pro <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
