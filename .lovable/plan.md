# Smaller files: fonts, images and user uploads

## 1. The app's own files
- **Fonts:** load the three fonts (Bricolage Grotesque, Nunito, Space Mono) from the app itself as WOFF2 files, and only the weights the app uses. The app stops asking Google for them, so text shows sooner.
- **Images:** the leftover image `s.png` (350 KB) gets deleted if nothing uses it, or turned into WebP if something does. The globe maps are already WebP.
- **Country shapes:** they're already compressed when sent, so they stay as they are.

## 2. Photos friends upload
- **Before upload:** each photo is resized on the phone to at most 2560 px on its longest side and saved as WebP. That usually makes it 5 to 10 times smaller, so uploads are faster and use less storage.
- **Auto-sorting still works:** the time and place inside each photo are read first, before it's converted.
- **Avatars:** cut to a 512 px WebP square.
- **Unsupported phones:** if a phone can't make WebP, the photo is saved as JPEG. Small photos that are already efficient stay as they are.

## 3. Videos friends upload
Shrinking a video on a phone in the browser is slow and drains the battery. It would also mean downloading a roughly 30 MB converter. So:
- Videos upload as they are. The app shows how big each one is before upload.
- The size limit stays at 200 MB, with a clear message if a video is too large.
- Video thumbnails load only when you open a video.
- Later, if needed, videos can be shrunk in the background after they're uploaded.

## Technical details
- Use `@fontsource/*` WOFF2 packages (latin subset, used weights) imported in `src/styles.css`, and remove the Google Fonts `<link>` tags from `__root.tsx`.
- `rg` for `s.png`, then delete it or convert it with sharp/cwebp to WebP.
- New helper `compressImage(file, maxEdge, quality)` in `src/lib/media.ts`: `createImageBitmap` → `OffscreenCanvas`/canvas → `toBlob('image/webp', 0.82)`, with a JPEG fallback when the result isn't `image/webp`. Skip GIFs and HEIC that can't be decoded (keep the original), and skip files under 300 KB.
- `addMediaToTrip`: `readPhotoMeta` runs on the original file, then the photo is compressed. The storage path extension becomes `.webp`. The avatar upload uses `maxEdge` 512.
- Videos: `preload="metadata"`, a size check before upload, and file sizes shown in `MediaPicker`.
- Add a unit test for the compress size/skip rules.
