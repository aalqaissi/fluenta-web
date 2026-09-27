import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AiButton } from "./components";

/**
 * Content-generation rules from the owner's IELTS spec (mirrors backend `ContentRules`): Academic and
 * General Training reading are written separately, listening parts have fixed contexts, and full
 * mocks use 13 + 13 + 14 (reading) / 4 × 10 (listening) = 40.
 */
export const READING_FULL = [13, 13, 14];
export const LISTENING_FULL = [10, 10, 10, 10];

const GT_BRIEF: Record<number, string> = {
  1: "General Training Section 1 — everyday texts: notices, adverts, schedules, instructions, practical information.",
  2: "General Training Section 2 — workplace texts: job descriptions, policies, contracts, training material, staff procedures.",
  3: "General Training Section 3 — one longer, more complex text on a topic of general interest.",
};

export const LISTENING_PART_CONTEXT: Record<number, string> = {
  1: "Part 1 — a conversation in an everyday social context (e.g. a booking or enquiry).",
  2: "Part 2 — a monologue in an everyday social context (e.g. a talk about local facilities).",
  3: "Part 3 — a conversation in an educational or training context (up to four speakers).",
  4: "Part 4 — an academic monologue, such as a lecture or presentation.",
};

/** "both" isn't a valid generation target: Academic and GT reading are never interchangeable. */
export const generationModule = (module: string | undefined) => (module === "general" ? "general" : "academic");

export function passageBrief(module: string | undefined, section: number): string {
  if (generationModule(module) === "general") return `${GT_BRIEF[Math.min(3, Math.max(1, section))]} Not a simplified Academic passage.`;
  return `Academic passage ${section} — academic-style source: descriptive, factual, discursive, argumentative or analytical; may include a visual.`;
}

export function WritePassageWithAi({ module, section, onDone }: {
  module: string | undefined;
  section: number;
  onDone: (r: { title: string; text: string }) => void;
}) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic (optional), e.g. urban beekeeping"
        className="h-8 max-w-xs text-xs"
        aria-label="Passage topic"
      />
      <AiButton
        label="Write passage with AI"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            onDone(await api.ai.studioPassage({ module: generationModule(module), section, topic: topic.trim() || undefined }));
          } catch {
            toast.error("Couldn't write the passage right now.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Advisory check against the full-mock distribution — practice sets needn't match. */
export function FullMockCheck({ counts, target, unit }: { counts: number[]; target: number[]; unit: "Passage" | "Part" }) {
  const total = counts.reduce((a, b) => a + b, 0);
  const goal = target.reduce((a, b) => a + b, 0);
  const ok = counts.length === target.length && counts.every((c, i) => c === target[i]);
  return (
    <div className={cn("rounded-xl border p-3 text-xs", ok ? "border-success/40 bg-success/[0.06]" : "border-border bg-muted/40")}>
      <p className={cn("flex items-center gap-1.5 font-bold", ok ? "text-success" : "text-foreground")}>
        {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5 text-muted-foreground" />}
        Full-mock check: {target.length} {unit.toLowerCase()}s · {target.join(" + ")} = {goal} questions
      </p>
      <p className="mt-1 text-muted-foreground">
        Now: {counts.length} {unit.toLowerCase()}{counts.length === 1 ? "" : "s"} ·{" "}
        {counts.map((c, i) => `${unit} ${i + 1}: ${c}${target[i] !== undefined && c !== target[i] ? ` (needs ${target[i]})` : ""}`).join(" · ")} · total {total}.
        {!ok && " Only full mocks must match — practice sets can use any number."}
      </p>
    </div>
  );
}
