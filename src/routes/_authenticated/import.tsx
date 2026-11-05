import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ME, addMediaToTrip, participants, tripsQuery, type Trip } from "@/lib/data";
import { clusterByDays, matchTrip, readPhotoMeta, type PhotoMeta } from "@/lib/photos";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { MediaPicker } from "@/components/MediaPicker";
import { ErrorState, LoadingState, errText } from "@/components/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import photos — For The Plot" },
      { name: "description", content: "Pick photos from your camera roll and sort them into trips automatically." },
      { property: "og:title", content: "Import photos — For The Plot" },
      { property: "og:description", content: "Sort your camera roll into trips by time and place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportPage,
});

type Item = { file: File; meta: PhotoMeta };

async function countryAt(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=3&lat=${lat}&lon=${lng}`);
    const j = (await r.json()) as { address?: { country_code?: string } };
    return j.address?.country_code?.toUpperCase() ?? null;
  } catch { return null; }
}

const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function ImportPage() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: allTrips = [], isLoading, error, refetch } = useQuery(tripsQuery(ME));
  const trips = allTrips.filter((t) => participants(t).includes(userId));
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [countries, setCountries] = useState<Record<string, string | null>>({});
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [withUndated, setWithUndated] = useState<Record<string, boolean>>({});
  const [undatedTrip, setUndatedTrip] = useState("");
  const [undatedDate, setUndatedDate] = useState("");

  async function sort() {
    setReading(true);
    try {
      const out: Item[] = [];
      for (const f of files) out.push({ file: f, meta: await readPhotoMeta(f) });
      setItems(out);
    } finally { setReading(false); }
  }

  const { matched, suggestions, undated } = useMemo(() => {
    const matched = new Map<string, { trip: Trip; items: Item[] }>();
    const rest: Item[] = [];
    for (const it of items ?? []) {
      const t = matchTrip(trips, it.meta);
      if (t) { const m = matched.get(t.id) ?? { trip: t, items: [] }; m.items.push(it); matched.set(t.id, m); }
      else rest.push(it);
    }
    return { matched: [...matched.values()], suggestions: clusterByDays(rest), undated: rest.filter((i) => !i.meta.takenAt) };
  }, [items, trips]);

  // look up the country of each suggestion from its first photo with a location
  useEffect(() => {
    for (const s of suggestions) {
      const key = s.start;
      if (key in countries) continue;
      const g = s.items.find((i) => i.meta.lat != null);
      setCountries((c) => ({ ...c, [key]: null }));
      if (g) countryAt(g.meta.lat!, g.meta.lng!).then((code) => setCountries((c) => ({ ...c, [key]: code })));
    }
  }, [suggestions]); // eslint-disable-line react-hooks/exhaustive-deps

  function done(used: Item[]) {
    setItems((cur) => (cur ?? []).filter((i) => !used.includes(i)));
    setFiles((cur) => cur.filter((f) => !used.some((u) => u.file === f)));
  }

  async function addTo(trip: Trip, its: Item[]) {
    setBusy(trip.id);
    const t = toast.loading(`Uploading ${its.length} to ${trip.title}…`);
    try {
      await addMediaToTrip(userId, trip, its.map((i) => i.file));
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Added ${its.length} to ${trip.title}`, { id: t });
      done(its);
    } catch (e) { toast.error(`Upload failed: ${errText(e)}`, { id: t }); }
    finally { setBusy(null); }
  }

  async function addUndated(tripId: string) {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;
    setBusy("undated");
    const t = toast.loading(`Uploading ${undated.length} to ${trip.title}…`);
    try {
      await addMediaToTrip(userId, trip, undated.map((i) => i.file), { takenAt: undatedDate ? `${undatedDate}T12:00:00Z` : null });
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Added ${undated.length} to ${trip.title}`, { id: t });
      done(undated);
    } catch (e) { toast.error(`Upload failed: ${errText(e)}`, { id: t }); }
    finally { setBusy(null); }
  }

  async function createTrip(s: { start: string; end: string; items: Item[] }) {
    const code = picked[s.start] || countries[s.start];
    const c = code ? getCountry(code) : undefined;
    if (!c) { toast.error("Pick a country first."); return; }
    if (withUndated[s.start]) s = { ...s, items: [...s.items, ...undated] };
    setBusy(s.start);
    const t = toast.loading("Creating trip…");
    try {
      const { data, error } = await supabase.from("trips").insert({
        country_code: c.code, country_name: c.name, title: `Trip to ${c.name}`, start_date: s.start, end_date: s.end, created_by: userId,
      }).select("id").single();
      if (error) throw error;
      const r1 = await supabase.from("trip_countries").insert({ trip_id: data.id, country_code: c.code, country_name: c.name, position: 0 });
      if (r1.error) throw r1.error;
      await supabase.from("trip_members").insert({ trip_id: data.id, user_id: userId });
      await addMediaToTrip(userId, { id: data.id, trip_stops: [] }, s.items.map((i) => i.file));
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Created "Trip to ${c.name}" with ${s.items.length} items`, { id: t,
        action: { label: "Edit", onClick: () => { window.location.href = `/trips/${data.id}/edit`; } } });
      done(s.items);
    } catch (e) { toast.error(`Couldn't create the trip: ${errText(e)}`, { id: t }); }
    finally { setBusy(null); }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-20 sm:px-5 sm:pt-28 md:pb-24">
      <p className="eyebrow">Camera roll</p>
      <h1 className="mt-2 text-4xl">Import photos</h1>
      <p className="mb-6 mt-1 text-muted-foreground">
        Pick photos and videos. We use the time and place stored in each one to put it on the right trip, or suggest a new trip.
        Instagram and Snapchat can save your stories to your camera roll in their settings, so those work too.
      </p>
      {isLoading ? <LoadingState label="Loading your trips…" /> : error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <>
          <MediaPicker files={files} onChange={(f) => { setFiles(f); setItems(null); }} />
          {files.length > 0 && !items && (
            <Button className="mt-4" onClick={sort} disabled={reading}>{reading ? "Reading photos…" : `Sort ${files.length} items`}</Button>
          )}
          {items && items.length === 0 && <p className="mt-6 font-semibold text-primary">All sorted.</p>}
          {items && items.length > 0 && (
            <div className="mt-8 space-y-6">
              {matched.map(({ trip, items: its }) => (
                <div key={trip.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="eyebrow">Fits an existing trip</p>
                  <p className="mt-1 font-semibold">{trip.title}</p>
                  <p className="text-sm text-muted-foreground">{fmt(trip.start_date)} – {fmt(trip.end_date)} · {its.length} items</p>
                  <Button size="sm" className="mt-3" disabled={!!busy} onClick={() => addTo(trip, its)}>
                    {busy === trip.id ? "Uploading…" : `Add ${its.length} to this trip`}
                  </Button>
                </div>
              ))}
              {suggestions.map((s) => {
                const found = countries[s.start];
                const code = picked[s.start] || found;
                const name = code ? getCountry(code)?.name : undefined;
                return (
                  <div key={s.start} className="rounded-2xl border border-dashed border-border p-4">
                    <p className="eyebrow">Suggested new trip</p>
                    <p className="mt-1 font-semibold">{name ? `Trip to ${name}` : found === undefined ? "Finding the place…" : "Where was this?"}</p>
                    <p className="text-sm text-muted-foreground">{fmt(s.start)} – {fmt(s.end)} · {s.items.length} items</p>
                    <label className="mt-3 block text-sm font-semibold">
                      Country
                      <select
                        className="mt-1 block w-full rounded-full border border-border bg-background px-4 py-2 text-base"
                        value={code ?? ""}
                        onChange={(e) => setPicked((p) => ({ ...p, [s.start]: e.target.value }))}
                      >
                        <option value="">Pick a country…</option>
                        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </label>
                    {undated.length > 0 && (
                      <label className="mt-3 flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-5" checked={!!withUndated[s.start]}
                          onChange={(e) => setWithUndated((w) => ({ ...w, [s.start]: e.target.checked }))} />
                        Also add the {undated.length} {undated.length === 1 ? "item" : "items"} without a date
                      </label>
                    )}
                    <Button size="sm" className="mt-3" disabled={!!busy || !name} onClick={() => createTrip(s)}>
                      {busy === s.start ? "Creating…" : "Create this trip"}
                    </Button>
                  </div>
                );
              })}
              {undated.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="eyebrow">No date found</p>
                  <p className="mt-1 font-semibold">{undated.length} {undated.length === 1 ? "item" : "items"} without a date</p>
                  <label className="mt-3 block text-sm font-semibold">
                    Add to trip
                    <select className="mt-1 block w-full rounded-full border border-border bg-background px-4 py-2 text-base"
                      value={undatedTrip} onChange={(e) => setUndatedTrip(e.target.value)}>
                      <option value="">Pick a trip…</option>
                      {trips.map((t) => <option key={t.id} value={t.id}>{t.title} ({fmt(t.start_date)})</option>)}
                    </select>
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Date (optional)
                    <input type="date" className="mt-1 block w-full rounded-full border border-border bg-background px-4 py-2 text-base"
                      value={undatedDate} onChange={(e) => setUndatedDate(e.target.value)} />
                  </label>
                  <Button size="sm" className="mt-3" disabled={!!busy || !undatedTrip} onClick={() => addUndated(undatedTrip)}>
                    {busy === "undated" ? "Uploading…" : `Add ${undated.length} to this trip`}
                  </Button>
                  {suggestions.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Or tick the box on a suggested trip above.</p>}
                </div>
              )}
            </div>
          )}
          <p className="mt-10 text-sm"><Link to="/trips/new" className="underline">Or add a trip by hand</Link></p>
        </>
      )}
    </main>
  );
}
