import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pad2, cn } from "@/lib/utils";

interface Props {
  /** length of the simulated recording in seconds */
  durationSec: number;
  /** enforce the real-test rule: the audio may be played only once */
  playOnce?: boolean;
}

/**
 * Simulated section audio player (frontend-only prototype — no real file).
 * When `playOnce` is set it counts through the recording a single time, then
 * locks, mirroring the IELTS "audio is played once" rule.
 */
export function AudioPlayer({ durationSec, playOnce = false }: Props) {
  const total = Math.max(1, durationSec);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [plays, setPlays] = useState(0);
  const ref = useRef<number | null>(null);

  const finishedOnce = plays >= 1;
  const locked = playOnce && finishedOnce;

  useEffect(() => {
    if (!playing) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = window.setInterval(() => {
      setT((v) => {
        if (v + 1 >= total) {
          if (ref.current) clearInterval(ref.current);
          setPlaying(false);
          setPlays((p) => p + 1);
          return total;
        }
        return v + 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [playing, total]);

  function toggle() {
    if (locked) return;
    // starting a fresh play from a locked-but-not-yet state restarts the clock
    if (!playing && t >= total) setT(0);
    setPlaying((p) => !p);
  }

  const bars = Array.from({ length: 48 });
  const progress = (t / total) * 100;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          className="size-12 shrink-0 rounded-full"
          onClick={toggle}
          disabled={locked}
          aria-label={locked ? "Audio already played" : playing ? "Pause" : "Play"}
        >
          {locked ? <Lock className="size-5" /> : playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex h-10 items-end gap-0.5">
            {bars.map((_, i) => {
              const active = (i / bars.length) * 100 <= progress;
              const h = 20 + Math.abs(Math.sin(i * 1.3)) * 70;
              return (
                <div
                  key={i}
                  className={cn("w-full rounded-sm transition-colors", active ? "bg-primary" : "bg-border")}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-medium tabular-nums text-muted-foreground">
            <span>{pad2(Math.floor(t / 60))}:{pad2(t % 60)}</span>
            <span>{pad2(Math.floor(total / 60))}:{pad2(total % 60)}</span>
          </div>
        </div>
        <Volume2 className="size-5 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {playOnce
          ? `Audio played ${Math.min(plays, 1)} of 1 time${locked ? " — playback is now locked, just like the real test." : ". In the real test it plays once."}`
          : "Preview player — playback is simulated."}
      </p>
    </div>
  );
}
