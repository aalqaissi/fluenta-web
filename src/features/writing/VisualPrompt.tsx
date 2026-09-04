import type { WritingVisual } from "@/mock/types";

const SERIES = [
  { name: "Country A", color: "#EF6C57", points: [30, 45, 62, 78, 88] },
  { name: "Country B", color: "#0EA5A4", points: [12, 28, 40, 66, 82] },
  { name: "Country C", color: "#F5A524", points: [8, 15, 24, 38, 55] },
];
const YEARS = ["2000", "2005", "2010", "2015", "2020"];

/** A stand-in "uploaded" Academic Task 1 visual prompt (rendered as an SVG chart). */
export function VisualPrompt({ visual }: { visual: WritingVisual }) {
  if (!visual) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Households with internet access (%)
      </p>
      {visual === "line" ? <LineChart /> : <LineChart />}
      <div className="mt-3 flex flex-wrap gap-3">
        {SERIES.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function LineChart() {
  const w = 520;
  const h = 240;
  const pad = { l: 34, r: 12, t: 12, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const x = (i: number) => pad.l + (i / (YEARS.length - 1)) * iw;
  const y = (v: number) => pad.t + ih - (v / 100) * ih;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full min-w-[420px]" role="img" aria-label="Line chart of internet access">
        {/* gridlines + y labels */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} y1={y(v)} x2={w - pad.r} y2={y(v)} stroke="#EBE1D6" strokeWidth={1} />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#78716C">{v}</text>
          </g>
        ))}
        {/* x labels */}
        {YEARS.map((yr, i) => (
          <text key={yr} x={x(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="#78716C">{yr}</text>
        ))}
        {/* series */}
        {SERIES.map((s) => (
          <g key={s.name}>
            <polyline
              points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.points.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
