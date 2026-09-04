import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

/** Mock examiner-audio button: plays a simulated clip for a few seconds. */
export function ExaminerAudio({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(false), 2600);
    return () => clearTimeout(t);
  }, [playing]);
  return (
    <button
      onClick={() => setPlaying(true)}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
    >
      {playing ? (
        <span className="flex items-end gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-0.5 animate-pulse rounded-full bg-primary"
              style={{ height: 6 + ((i * 5) % 12), animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
      ) : (
        <Volume2 className="size-3.5 text-primary" />
      )}
      {playing ? "Playing…" : label}
    </button>
  );
}
