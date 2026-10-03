import { useRef, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, resolveMedia } from "@/lib/api";

const ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";
const MAX_BYTES = 5 * 1024 * 1024; // matches the backend's image limit

/**
 * Real image upload (PNG/JPEG/WebP, up to 5 MB) to `/api/media`, with a preview. Used for a passage's
 * diagram / map / process image, which students see with the passage in the simulation.
 */
export function ImageUpload({
  value,
  onUploaded,
  onRemove,
}: {
  value: { url: string; name: string } | null;
  onUploaded: (r: { url: string; name: string }) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Image exceeds the 5 MB limit");
      return;
    }
    setBusy(true);
    try {
      const { url } = await api.media.upload(file);
      onUploaded({ url, name: file.name });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <img src={resolveMedia(value.url)} alt={value.name} className="max-h-40 max-w-[60%] rounded-lg border border-border bg-white object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.name}</p>
            <p className="text-xs text-muted-foreground">Shown with the passage in the exam.</p>
            <button onClick={() => inputRef.current?.click()} className="mt-2 text-xs font-semibold text-primary hover:underline">
              Replace image
            </button>
          </div>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove image">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:border-primary disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-7 animate-spin text-primary" /> : <UploadCloud className="size-7 text-muted-foreground" />}
          <span className="text-sm font-semibold">{busy ? "Uploading…" : "Drop an image, or click to browse"}</span>
          <span className="text-xs text-muted-foreground">PNG, JPEG or WebP · up to 5 MB</span>
        </button>
      )}
    </div>
  );
}
