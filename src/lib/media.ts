export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MIN_BYTES = 300 * 1024;

export function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Whether a file should be re-encoded before upload. */
export function shouldCompress(file: { type: string; size: number }, minBytes = MIN_BYTES) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return false;
  return file.size >= minBytes;
}

/** Target size keeping aspect ratio, never upscaling. */
export function fitWithin(w: number, h: number, maxEdge: number) {
  const s = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/** Resize + re-encode a photo to WebP (JPEG fallback). Returns the original on any failure or if not smaller. */
export async function compressImage(file: File, maxEdge: number, opts: { square?: boolean; minBytes?: number; quality?: number } = {}): Promise<File> {
  if (!shouldCompress(file, opts.minBytes)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    if (opts.square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
    const { w, h } = fitWithin(sw, sh, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    bmp.close();
    const toBlob = (t: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, t, opts.quality ?? 0.82));
    let blob = await toBlob("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file; // e.g. HEIC the browser can't decode
  }
}
