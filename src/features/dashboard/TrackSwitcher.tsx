import { toast } from "sonner";
import { GraduationCap, MessageCircle, Briefcase, BookOpen, MonitorSmartphone, Baby, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  GraduationCap, MessageCircle, Briefcase, BookOpen, MonitorSmartphone, Baby,
};

/** Program/track switcher — IELTS is active; other programs are visible but "coming soon". */
export function TrackSwitcher() {
  const { user, updateUser } = useApp();
  const { data: tracks } = useAsync(() => api.content.tracks(), []);
  const active = user.track ?? "ielts";

  if (!tracks) return null;

  return (
    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Program</span>
      {tracks.map((t) => {
        const Icon = ICONS[t.icon] ?? GraduationCap;
        const isActive = t.key === active;
        const comingSoon = t.status !== "active";
        return (
          <button
            key={t.key}
            onClick={() => {
              if (comingSoon) {
                toast(`${t.name} — coming soon`, { description: t.description });
              } else if (!isActive) {
                updateUser({ track: t.key });
              }
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : comingSoon
                ? "border-border text-muted-foreground opacity-70 hover:opacity-100"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
            title={comingSoon ? "Coming soon" : t.name}
          >
            <Icon className="size-4" /> {t.short}
            {comingSoon && <span className="rounded bg-muted px-1 text-[10px] font-bold uppercase">soon</span>}
          </button>
        );
      })}
    </div>
  );
}
