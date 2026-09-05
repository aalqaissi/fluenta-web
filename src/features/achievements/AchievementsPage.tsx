import {
  Footprints,
  Flame,
  BookOpen,
  MessageSquareHeart,
  TrendingUp,
  Sparkles,
  Medal,
  Bot,
  Lock,
  Loader2,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  Footprints,
  Flame,
  BookOpen,
  MessageSquareHeart,
  TrendingUp,
  Sparkles,
  Medal,
  Bot,
};

export function AchievementsPage() {
  const { data, loading, error } = useAsync(() => api.content.achievements(), []);
  const achievements = data ?? [];
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div>
      <PageHeader
        title="Achievements"
        subtitle="Little wins that keep you moving toward your target band."
        actions={
          achievements.length > 0 ? (
            <Badge variant="success" className="text-sm">
              {earned}/{achievements.length} unlocked
            </Badge>
          ) : undefined
        }
      />

      {error ? (
        <Card className="p-10 text-center">
          <WifiOff className="mx-auto mb-2 size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      ) : loading ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading achievements…</p>
        </Card>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => {
          const Icon = icons[a.icon] ?? Sparkles;
          return (
            <Card
              key={a.id}
              className={cn("p-5 transition-all", a.earned ? "" : "opacity-90")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl",
                    a.earned ? "bg-warm-gradient text-white shadow-glow" : "bg-muted text-muted-foreground"
                  )}
                >
                  {a.earned ? <Icon className="size-6" /> : <Lock className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{a.title}</h3>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
                  {a.earned ? (
                    <Badge variant="success" className="mt-2">
                      Earned {a.earnedOn && new Date(a.earnedOn + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                    </Badge>
                  ) : (
                    <div className="mt-2.5">
                      <Progress value={a.progress ?? 0} className="h-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">{a.progress ?? 0}% there</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
