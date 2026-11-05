import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_VIDEO_BYTES, formatBytes } from "@/lib/media";

/** Opens the phone's photo library (camera roll) for photos and videos, with small previews. */
export function MediaPicker({ files, onChange, progress }: { files: File[]; onChange: (f: File[]) => void; progress?: number | null }) {
  const input = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden
        onChange={(e) => { onChange([...files, ...(e.target.files ?? [])]); e.target.value = ""; }} />
      <Button type="button" variant="secondary" onClick={() => input.current?.click()}>
        <ImagePlus className="h-4 w-4" /> Add from camera roll
      </Button>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={urls[i]} className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted">
              {f.type.startsWith("video") ? <><video src={urls[i]} muted preload="metadata" className="h-full w-full object-cover" />
                <span className={`absolute inset-x-0 bottom-0 bg-background/85 text-center text-[10px] font-bold ${f.size > MAX_VIDEO_BYTES ? "text-destructive" : ""}`}>{formatBytes(f.size)}</span></> : <img src={urls[i]} alt={f.name} className="h-full w-full object-cover" />}
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90">
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {progress != null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}
