import * as React from "react";
import { UploadCloud, FileAudio, ImageIcon, X, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PubStatus } from "./store";

export function StatusBadge({ status }: { status: PubStatus }) {
  return status === "published" ? (
    <Badge variant="success">
      <Check className="size-3" /> Published
    </Badge>
  ) : (
    <Badge variant="secondary">Draft</Badge>
  );
}

/** Simulated media upload — clicking picks a plausible filename (no real file I/O). */
export function MediaDrop({
  kind,
  value,
  onChange,
  label,
}: {
  kind: "image" | "audio";
  value: string | null;
  onChange: (name: string | null) => void;
  label?: string;
}) {
  const Icon = kind === "audio" ? FileAudio : ImageIcon;
  const sample = kind === "audio" ? "section-audio.mp3" : "diagram.png";
  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-semibold">{label}</p>}
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <span className="flex-1 truncate text-sm font-semibold">{value}</span>
          <button onClick={() => onChange(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onChange(sample)}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:border-primary"
        >
          <UploadCloud className="size-7 text-muted-foreground" />
          <span className="text-sm font-semibold">
            Drop {kind === "audio" ? "an audio file" : "an image"}, or click to browse
          </span>
          <span className="text-xs text-muted-foreground">
            {kind === "audio" ? "MP3, up to 20MB" : "PNG, JPEG or WebP · up to 5MB"} · simulated in this prototype
          </span>
        </button>
      )}
    </div>
  );
}

export function AiButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-info/40 bg-info/[0.06] px-2.5 py-1.5 text-xs font-semibold text-info transition-colors hover:bg-info/10"
    >
      <Sparkles className="size-3.5" /> {label}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StepDots({ step }: { step: 1 | 2 }) {
  const steps = ["Compose", "Review & publish"];
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2;
        return (
          <div key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-bold",
                n <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {n}
            </span>
            <span className={cn("text-sm font-semibold", n === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i === 0 && <span className="mx-1 h-0.5 w-6 rounded bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
