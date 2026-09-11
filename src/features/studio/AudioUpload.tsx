import { useRef, useState } from "react";
import { UploadCloud, FileAudio, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, resolveMedia } from "@/lib/api";

const ACCEPT = ".mp3,.m4a,.aac,audio/mpeg,audio/mp4,audio/aac,audio/x-m4a";
const MAX_BYTES = 20 * 1024 * 1024;

/** Read a media file's duration (seconds, rounded) in the browser. Resolves 0 on failure. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    let settled = false;
    // Idempotent: guards against double-revoke/double-resolve if multiple events fire,
    // and doubles as the leak safety net for the object URL.
    const finish = (durationSec: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(durationSec);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = el.duration;
      finish(Number.isFinite(d) ? Math.round(d) : 0);
    };
    el.onerror = () => finish(0);
    el.onabort = () => finish(0);
    el.src = url;
  });
}

export function AudioUpload({
  value,
  onUploaded,
  onRemove,
}: {
  value: { url: string; name: string } | null;
  onUploaded: (r: { url: string; name: string; durationSec: number }) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Audio exceeds the 20 MB limit");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const durationSec = await readDuration(file);
      const { url } = await api.media.upload(file);
      onUploaded({ url, name: file.name, durationSec });
      toast.success("Audio uploaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileAudio className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.name}</p>
            <audio controls preload="none" src={resolveMedia(value.url)} className="mt-1 h-8 w-full" />
          </div>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove audio">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:border-primary disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-7 animate-spin text-primary" /> : <UploadCloud className="size-7 text-muted-foreground" />}
          <span className="text-sm font-semibold">{busy ? "Uploading…" : "Drop an audio file, or click to browse"}</span>
          <span className="text-xs text-muted-foreground">MP3 or M4A/AAC · up to 20MB</span>
        </button>
      )}
    </div>
  );
}
