/** Pure helpers to sort photos into trips/places by their own time and location. */
export type PhotoMeta = { takenAt: string | null; lat: number | null; lng: number | null };
type StopLike = { id: string; lat: number; lng: number; arrived_on: string | null; left_on: string | null };
type TripLike = { id: string; start_date: string; end_date: string; trip_stops: StopLike[] };

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const { parse } = await import("exifr");
    const m = (await parse(file, { gps: true, pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"] })) as
      | { DateTimeOriginal?: Date; CreateDate?: Date; latitude?: number; longitude?: number } | undefined;
    const d = m?.DateTimeOriginal ?? m?.CreateDate;
    return {
      takenAt: d instanceof Date && !isNaN(+d) ? d.toISOString() : null,
      lat: typeof m?.latitude === "number" ? m.latitude : null,
      lng: typeof m?.longitude === "number" ? m.longitude : null,
    };
  } catch {
    return { takenAt: null, lat: null, lng: null };
  }
}

const day = (iso: string) => iso.slice(0, 10);

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/** Best route place for a photo: the closest place by location, otherwise the place whose days cover the photo's day. */
export function matchStop(stops: StopLike[], meta: PhotoMeta): string | null {
  if (meta.lat != null && meta.lng != null && stops.length) {
    const best = [...stops].sort((a, b) => km(a, meta as never) - km(b, meta as never))[0]!;
    if (km(best, meta as never) < 150) return best.id;
  }
  if (meta.takenAt) {
    const d = day(meta.takenAt);
    const hit = stops.find((s) => s.arrived_on && d >= s.arrived_on && d <= (s.left_on ?? s.arrived_on));
    if (hit) return hit.id;
  }
  return null;
}

/** Trip whose dates contain the photo's day. */
export function matchTrip<T extends TripLike>(trips: T[], meta: PhotoMeta): T | null {
  if (!meta.takenAt) return null;
  const d = day(meta.takenAt);
  return trips.find((t) => d >= t.start_date && d <= t.end_date) ?? null;
}

/** Group dated photos into runs of days with gaps of at most `gapDays`. */
export function clusterByDays<T extends { meta: PhotoMeta }>(items: T[], gapDays = 2): { start: string; end: string; items: T[] }[] {
  const dated = items.filter((i) => i.meta.takenAt).sort((a, b) => a.meta.takenAt!.localeCompare(b.meta.takenAt!));
  const out: { start: string; end: string; items: T[] }[] = [];
  for (const it of dated) {
    const d = day(it.meta.takenAt!);
    const last = out[out.length - 1];
    if (last && (Date.parse(d) - Date.parse(last.end)) / 86400000 <= gapDays) { last.end = d; last.items.push(it); }
    else out.push({ start: d, end: d, items: [it] });
  }
  return out;
}
