import { useMemo } from "react";
import type { SeriesPoint, SkillStat } from "@/lib/api";
import { skillMeta } from "@/components/common/SkillIcon";
import { formatBand } from "@/lib/utils";

const BAND_MAX = 9;

/** Lightweight responsive line chart of band-over-time (no chart lib). */
export function ProgressLineChart({ points }: { points: SeriesPoint[] }) {
  const W = 640;
  const H = 220;
  const padL = 28;
  const padB = 22;
  const padT = 10;
  const padR = 10;

  const { path, dots, xLabels } = useMemo(() => {
    const n = points.length;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (band: number) => padT + innerH - (band / BAND_MAX) * innerH;
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.band).toFixed(1)}`).join(" ");
    const dots = points.map((p, i) => ({ cx: x(i), cy: y(p.band), band: p.band }));
    // show ~4 x labels
    const step = Math.max(1, Math.round(n / 4));
    const xLabels = points
      .map((p, i) => ({ i, label: shortDate(p.date), x: x(i) }))
      .filter((_, i) => i % step === 0 || i === n - 1);
    return { path, dots, xLabels };
  }, [points]);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full min-w-[420px]" role="img" aria-label="Band score over time">
        {/* gridlines + y labels at 0,3,6,9 */}
        {[0, 3, 6, 9].map((b) => {
          const y = padT + (H - padT - padB) - (b / BAND_MAX) * (H - padT - padB);
          return (
            <g key={b}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} className="stroke-border" strokeWidth={1} />
              <text x={4} y={y + 3} className="fill-muted-foreground text-[10px]">{b}</text>
            </g>
          );
        })}
        {/* area + line */}
        {points.length > 0 && (
          <>
            <path d={`${path} L ${W - padR} ${H - padB} L ${padL} ${H - padB} Z`} className="fill-primary/10" />
            <path d={path} className="fill-none stroke-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {dots.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={3} className="fill-primary" />
            ))}
          </>
        )}
        {/* x labels */}
        {xLabels.map((l) => (
          <text key={l.i} x={l.x} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">{l.label}</text>
        ))}
      </svg>
    </div>
  );
}

/** Vertical bar chart of the current band per skill. */
export function SkillBarChart({ skills }: { skills: SkillStat[] }) {
  const max = BAND_MAX;
  return (
    <div className="flex items-end gap-3 px-1" style={{ height: 180 }}>
      {skills.map((s) => {
        const meta = skillMeta[s.key as keyof typeof skillMeta];
        const band = s.band ?? 0;
        const pct = (band / max) * 100;
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums">{s.band == null ? "–" : formatBand(s.band)}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md ${meta?.tint ?? "bg-muted"}`}
                style={{ height: `${Math.max(4, pct)}%`, minHeight: 4 }}
                title={`${meta?.label ?? s.label}: ${s.band == null ? "no data" : formatBand(s.band)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">{meta?.label ?? s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
