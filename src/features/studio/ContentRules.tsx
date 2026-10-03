import { useId, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { api, type AiStudioQuestion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
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

/** Yalla English Hub vocabulary units ("Tips & Lessons" → Vocabulary) — suggested passage topics. */
export const YALLA_TOPICS = [
  "Character & psychology",
  "Time & change",
  "Individuality & community",
  "Chemistry & medicine",
  "Study & work",
  "Advertising & marketing",
  "Tourism & travel",
  "Government & society",
  "Animals & conservation",
  "Space & physics",
  "Technology & design",
  "Fashion & consumerism",
  "Rural life & city life",
  "Problems & solutions",
  "Natural phenomena & agriculture",
  "Energy & natural resources",
  "Management & personal finance",
  "Crime & punishment",
  "The media",
  "The arts",
];

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

/** A passage photo picked for "Write passage with AI" — kept in the browser, never stored. */
interface PassagePhoto {
  id: string;
  name: string;
  preview: string; // object URL
  base64: string; // downscaled JPEG
}

const PHOTO_MAX_SIDE = 1600; // px — plenty for reading printed text
const PHOTO_BUDGET = 4_800_000; // base64 chars; the AI request allows ~5 MB of images in total

/** Downscale a photo to a JPEG (longest side ≤ 1600 px) so several pages fit in one AI request. */
function photoToJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not an image"));
    };
    img.src = url;
  });
}

/**
 * "Write passage with AI": either transcribe the passage from uploaded photos (pages of a book or
 * worksheet), or write an original passage to the module/section brief on an optional topic. When the
 * photos also show questions, those come back too. Asks before replacing text already in the passage.
 */
export function WritePassageWithAi({ module, section, hasText, onDone }: {
  module: string | undefined;
  section: number;
  /** the passage already has text — confirm before replacing it */
  hasText?: boolean;
  onDone: (r: { title: string; text: string; questions?: AiStudioQuestion[] }) => void;
}) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<PassagePhoto[]>([]);
  const [confirming, setConfirming] = useState(false);
  // Photos are shrunk before they can be sent — the button waits so a quick click can't skip them.
  const [preparing, setPreparing] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files);
    if (inputRef.current) inputRef.current.value = "";
    setPreparing(true);
    try {
      await preparePhotos(picked);
    } finally {
      setPreparing(false);
    }
  }

  async function preparePhotos(picked: File[]) {
    const added: PassagePhoto[] = [];
    for (const file of picked) {
      try {
        const base64 = await photoToJpeg(file);
        added.push({ id: Math.random().toString(36).slice(2, 9), name: file.name, preview: URL.createObjectURL(file), base64 });
      } catch {
        toast.error(`${file.name} isn't an image we can read.`);
      }
    }
    const next = [...photos, ...added];
    if (next.reduce((n, p) => n + p.base64.length, 0) > PHOTO_BUDGET) {
      added.forEach((p) => URL.revokeObjectURL(p.preview));
      toast.error("That's more photos than one AI request can read — remove some pages and try again.");
      return;
    }
    setPhotos(next);
  }

  function removePhoto(id: string) {
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.preview);
    setPhotos(photos.filter((x) => x.id !== id));
  }

  async function run() {
    setBusy(true);
    try {
      if (photos.length) {
        const res = await api.ai.studioExtract({
          images: photos.map((p) => ({ base64: p.base64, mediaType: "image/jpeg" })),
          hint: topic.trim() ? `Topic: ${topic.trim()}` : undefined,
        });
        if (typeof res?.passageText !== "string" || !res.passageText.trim()) throw new Error("empty");
        onDone({ title: "", text: res.passageText, questions: Array.isArray(res.questions) ? res.questions : undefined });
      } else {
        const res = await api.ai.studioPassage({ module: generationModule(module), section, topic: topic.trim() || undefined });
        // Never hand the editor a missing/blank passage — keep the current text and report instead.
        if (typeof res?.text !== "string" || !res.text.trim()) throw new Error("empty");
        onDone({ title: typeof res.title === "string" ? res.title : "", text: res.text });
      }
    } catch {
      toast.error(photos.length ? "Couldn't read the passage from the photos right now." : "Couldn't write the passage right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (optional) — pick a Yalla unit or type your own"
          className="h-8 max-w-xs text-xs"
          aria-label="Passage topic"
          list={listId}
          autoComplete="off"
        />
        {/* suggestions from the Yalla vocabulary units; any other topic can still be typed */}
        <datalist id={listId}>
          {YALLA_TOPICS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => inputRef.current?.click()}>
          <Camera className="size-3.5" /> {photos.length ? "Add more photos" : "Passage photos (optional)"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
        <AiButton
          label={preparing ? "Preparing photos…" : "Write passage with AI"}
          loading={busy || preparing}
          disabled={preparing}
          onClick={() => (hasText ? setConfirming(true) : run())}
        />
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative">
              <img src={p.preview} alt={`Page ${i + 1}: ${p.name}`} className="size-16 rounded-md border border-border object-cover" />
              <button
                onClick={() => removePhoto(p.id)}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
                aria-label={`Remove ${p.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            AI reads the passage from {photos.length === 1 ? "this photo" : `these ${photos.length} pages, in order`} — any questions on them are added too.
          </p>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Replace the passage text?"
        description="The passage already has text. Writing it with AI replaces it."
        confirmLabel="Replace"
        onConfirm={run}
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
