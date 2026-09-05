import { useMemo, useState } from "react";
import {
  Trophy, ChevronDown, Lock, Loader2, WifiOff,
  Footprints, Flame, BookOpen, GraduationCap, Medal, Crown, TrendingUp, Sparkles, Target,
  MessageSquareHeart, BadgeCheck, Bot, Sunrise, Moon, RotateCcw, Star, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { Achievement, AchievementCategory, AchievementStatus, AchievementTier } from "@/mock/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Footprints, Flame, BookOpen, GraduationCap, Medal, Crown, TrendingUp, Sparkles, Target,
  MessageSquareHeart, BadgeCheck, Bot, Sunrise, Moon, RotateCcw, Star,
};

const CATEGORIES: { key: AchievementCategory; label: string; icon: LucideIcon }[] = [
  { key: "exams", label: "Exams", icon: BookOpen },
  { key: "streaks", label: "Streaks", icon: Flame },
  { key: "scores", label: "Scores", icon: TrendingUp },
  { key: "milestones", label: "Milestones", icon: Target },
  { key: "special", label: "Special", icon: Star },
];

const TIER_STYLE: Record<AchievementTier, string> = {
  bronze: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-600 border-slate-200",
  gold: "bg-yellow-100 text-yellow-700 border-yellow-200",
  platinum: "bg-violet-100 text-violet-700 border-violet-200",
};

const STATUS_FILTERS: { key: "all" | AchievementStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unlocked", label: "Unlocked" },
  { key: "in_progress", label: "In Progress" },
  { key: "locked", label: "Locked" },
];

export function AchievementsPage() {
  const { data, loading, error } = useAsync(() => api.content.achievements(), []);
  const [statusFilter, setStatusFilter] = useState<"all" | AchievementStatus>("all");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({ exams: true, streaks: true, scores: true, milestones: true, special: true });

  const items = data ?? [];
  const stats = useMemo(() => {
    const unlocked = items.filter((a) => a.status === "unlocked");
    return {
      total: items.length,
      unlocked: unlocked.length,
      inProgress: items.filter((a) => a.status === "in_progress").length,
      locked: items.filter((a) => a.status === "locked").length,
      points: unlocked.reduce((n, a) => n + (a.points ?? 0), 0),
    };
  }, [items]);

  const shown = items.filter((a) => statusFilter === "all" || a.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Achievements"
        subtitle={`${stats.unlocked} of ${stats.total} achievements unlocked`}
        actions={
          <div className="text-right">
            <div className="text-2xl font-extrabold text-primary">{stats.points}</div>
            <div className="text-xs text-muted-foreground">Total Points</div>
          </div>
        }
      />

      {error ? (
        <Card className="p-10 text-center"><WifiOff className="mx-auto mb-2 size-6 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></Card>
      ) : loading ? (
        <Card className="p-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => {
              const n = f.key === "all" ? stats.total : f.key === "unlocked" ? stats.unlocked : f.key === "in_progress" ? stats.inProgress : stats.locked;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    statusFilter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label} {f.key !== "all" && <span className="ml-1 rounded bg-muted px-1.5 text-xs">{n}</span>}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const catItems = shown.filter((a) => a.category === cat.key);
              if (catItems.length === 0) return null;
              const open = openCats[cat.key];
              return (
                <Card key={cat.key} className="overflow-hidden p-0">
                  <button
                    onClick={() => setOpenCats((o) => ({ ...o, [cat.key]: !o[cat.key] }))}
                    className="flex w-full items-center gap-2 px-5 py-4 text-left"
                  >
                    <cat.icon className="size-4 text-primary" />
                    <span className="font-bold">{cat.label}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{catItems.length}</span>
                    <ChevronDown className={cn("ml-auto size-4 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {catItems.map((a) => <AchievementCard key={a.id} a={a} />)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AchievementCard({ a }: { a: Achievement }) {
  const Icon = ICONS[a.icon] ?? Trophy;
  const unlocked = a.status === "unlocked";
  const locked = a.status === "locked";
  return (
    <div className={cn("rounded-2xl border border-border p-4", unlocked ? "" : "opacity-95")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", unlocked ? "bg-warm-gradient text-white shadow-glow" : "bg-muted text-muted-foreground")}>
          {locked ? <Lock className="size-5" /> : <Icon className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold">{a.title}</h3>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold capitalize", TIER_STYLE[a.tier])}>{a.tier}</span>
            <span className="text-xs font-semibold text-muted-foreground">{a.points} pts</span>
          </div>
          {unlocked ? (
            <Badge variant="success" className="mt-2">
              Unlocked {a.unlockedOn && new Date(a.unlockedOn + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
            </Badge>
          ) : a.status === "in_progress" ? (
            <div className="mt-2.5">
              <Progress value={a.progress} className="h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{a.progress}% there</p>
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">Locked</p>
          )}
        </div>
      </div>
    </div>
  );
}
