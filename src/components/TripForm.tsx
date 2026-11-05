import { Suspense, lazy, useState } from "react";
import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, flagEmoji, getCountry } from "@/lib/countries";
import { stopDatesError } from "@/lib/stats";
import { ME, geocode, profilesQuery, type GeoResult, type Trip } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const PlacePickerMap = lazy(() => import("@/components/PlacePickerMap"));

type DraftStop = { id?: string; name: string; lat: number; lng: number; country_code?: string | null; arrived_on?: string | null; left_on?: string | null };

export function TripForm({ userId, trip }: { userId: string; trip?: Trip }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profiles = [] } = useQuery(profilesQuery(ME));
  const [countries, setCountries] = useState<string[]>(trip ? trip.countries.map((c) => c.code) : []);
  const [country, setCountry] = useState(trip?.countries[0]?.code ?? "");
  const [pick, setPick] = useState("");
  const [title, setTitle] = useState(trip?.title ?? "");
  const [start, setStart] = useState(trip?.start_date ?? "");
  const [end, setEnd] = useState(trip?.end_date ?? "");
  const [story, setStory] = useState(trip?.story ?? "");
  const [stops, setStops] = useState<DraftStop[]>(trip?.trip_stops ?? []);
  const [members, setMembers] = useState<string[]>(trip ? trip.trip_members.map((m) => m.user_id) : [userId]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  function addResult(i: number) {
    const r = results[i];
    if (!r) return;
    setStops([...stops, { name: r.name, lat: r.lat, lng: r.lng, country_code: country || null }]);
    setResults([]); setQ(""); setHover(null);
  }

  async function search() {
    if (!q.trim()) return;
    try {
      setResults(await geocode(q, country || undefined));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function move(i: number, d: number) {
    const next = [...stops];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setStops(next);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const picked = countries.map(getCountry).filter((x): x is NonNullable<typeof x> => !!x);
    const c = picked[0];
    if (!c) { toast.error("Pick at least one country"); return; }
    if (end < start) { toast.error("End date must be after start date"); return; }
    for (const s of stops) {
      const err = stopDatesError({ start_date: start, end_date: end }, s);
      if (err) { toast.error(`${s.name}: ${err}`); return; }
    }
    setBusy(true);
    try {
      const row = { country_code: c.code, country_name: c.name, title, start_date: start, end_date: end, story: story || null };
      let tripId = trip?.id;
      if (tripId) {
        const { error } = await supabase.from("trips").update(row).eq("id", tripId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("trips").insert({ ...row, created_by: userId }).select("id").single();
        if (error) throw error;
        tripId = data.id;
      }
      // stops: keep existing ids so tagged media stays linked
      const keep = stops.filter((s) => s.id).map((s) => s.id!);
      const removed = (trip?.trip_stops ?? []).filter((s) => !keep.includes(s.id)).map((s) => s.id);
      if (removed.length) await supabase.from("trip_stops").delete().in("id", removed);
      for (const [i, s] of stops.entries()) {
        const extra = { position: i, country_code: s.country_code ?? null, arrived_on: s.arrived_on || null, left_on: s.left_on || null };
        if (s.id) await supabase.from("trip_stops").update(extra).eq("id", s.id);
        else await supabase.from("trip_stops").insert({ trip_id: tripId, name: s.name, lat: s.lat, lng: s.lng, ...extra });
      }
      await supabase.from("trip_countries").delete().eq("trip_id", tripId);
      {
        const { error } = await supabase.from("trip_countries").insert(
          picked.map((p, i) => ({ trip_id: tripId!, country_code: p.code, country_name: p.name, position: i })),
        );
        if (error) throw error;
      }
      // keep existing invites/acceptances; only add new people (as invites) and remove unticked ones
      const want = [...new Set([userId, ...members])];
      const had = (trip?.trip_members ?? []).map((m) => m.user_id);
      const gone = had.filter((m) => !want.includes(m));
      if (gone.length) await supabase.from("trip_members").delete().eq("trip_id", tripId).in("user_id", gone);
      const added = want.filter((m) => !had.includes(m));
      if (added.length) {
        const { error } = await supabase.from("trip_members").insert(added.map((m) => ({ trip_id: tripId!, user_id: m })));
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(added.length > (trip ? 0 : 1) ? "Trip saved, invites sent" : "Trip saved");
      navigate({ to: "/countries/$code", params: { code: c.code } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!trip || !confirm("Delete this trip?")) return;
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["trips"] });
    navigate({ to: "/" });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="country">Countries</Label>
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => (
              <span key={code} className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 py-1 pl-3 pr-1 text-sm font-semibold">
                {flagEmoji(code)} {getCountry(code)?.name}
                <button type="button" aria-label={`Remove ${getCountry(code)?.name}`} className="grid h-6 w-6 place-items-center rounded-full hover:bg-sage/30"
                  onClick={() => { setCountries(countries.filter((x) => x !== code)); if (country === code) setCountry(""); }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <select
            id="country"
            value={pick}
            onChange={(e) => {
              const v = e.target.value;
              if (v && !countries.includes(v)) { setCountries([...countries, v]); setCountry(v); }
              setPick("");
            }}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">{countries.length ? "Add another country…" : "Choose a country…"}</option>
            {COUNTRIES.filter((c) => !countries.includes(c.code)).map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Trip name</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Summer road trip" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start">Start date</Label>
          <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">End date</Label>
          <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Dates for the whole trip — you can add dates per place below. Trips with a start date in the future show up under Upcoming.</p>

      <div className="space-y-2">
        <Label>Route — places in order</Label>
        <div className="flex gap-2">
          {countries.length > 1 && (
            <select aria-label="Search in country" value={country} onChange={(e) => setCountry(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-2 text-sm">
              {countries.map((c) => <option key={c} value={c}>{flagEmoji(c)} {getCountry(c)?.name}</option>)}
            </select>
          )}
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city or place"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
          <Button type="button" variant="secondary" onClick={search}><Search className="h-4 w-4" /></Button>
        </div>
        {results.length > 0 && (
          <div className="space-y-2">
            <ClientOnly fallback={<div className="h-48 rounded-xl border border-border sm:h-56" />}>
              <Suspense fallback={<div className="h-48 rounded-xl border border-border sm:h-56" />}>
                <PlacePickerMap places={results} active={hover} onHover={setHover} onPick={addResult} />
              </Suspense>
            </ClientOnly>
            <ul className="rounded-xl border border-border bg-popover text-sm">
              {results.map((r, i) => (
                <li key={i}>
                  <button type="button"
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent ${hover === i ? "bg-accent" : ""}`}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)}
                    onClick={() => addResult(i)}>
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-primary-foreground">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="font-semibold">{r.name}</span>
                      {r.kind && <span className="ml-2 text-xs capitalize text-muted-foreground">{r.kind}</span>}
                      <span className="block truncate text-xs text-muted-foreground">{r.region ?? "No region info"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ol className="space-y-1.5">
          {stops.map((s, i) => (
            <li key={s.id ?? `${s.name}-${i}`} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-xs font-bold text-primary-foreground">{i + 1}</span>
                <span className="flex-1">{s.country_code ? flagEmoji(s.country_code) + " " : ""}{s.name}</span>
                <Button type="button" size="icon" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Remove place" onClick={() => setStops(stops.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-8 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">Arrived
                  <Input type="date" className="h-8 w-auto" min={start || undefined} max={end || undefined} value={s.arrived_on ?? ""}
                    onChange={(e) => setStops(stops.map((x, j) => (j === i ? { ...x, arrived_on: e.target.value || null } : x)))} />
                </label>
                <label className="flex items-center gap-1.5">Left
                  <Input type="date" className="h-8 w-auto" min={s.arrived_on || start || undefined} max={end || undefined} value={s.left_on ?? ""}
                    onChange={(e) => setStops(stops.map((x, j) => (j === i ? { ...x, left_on: e.target.value || null } : x)))} />
                </label>
                <span>optional — fill in later</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2">
        <Label>Who came along</Label>
        <p className="text-xs text-muted-foreground">They get an invite to accept or decline. Groups show the trip once enough members are on it.</p>
        <div className="flex flex-wrap gap-3">
          {profiles.filter((p) => p.id !== userId).map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
              <Checkbox checked={members.includes(p.id)}
                onCheckedChange={(v) => setMembers(v ? [...members, p.id] : members.filter((m) => m !== p.id))} />
              {p.display_name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="story">The story</Label>
        <Textarea id="story" rows={5} value={story} onChange={(e) => setStory(e.target.value)} placeholder="What happened?" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{trip ? "Save changes" : "Add trip"}</Button>
        {trip && <Button type="button" variant="destructive" onClick={remove}>Delete trip</Button>}
      </div>
      <p className="text-xs text-muted-foreground">Add photos, videos and notes on the country page after saving.</p>
    </form>
  );
}
