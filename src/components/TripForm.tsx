import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { geocode, profilesQuery, type GeoResult, type Trip } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useGroup } from "@/lib/group";

type DraftStop = { id?: string; name: string; lat: number; lng: number };

export function TripForm({ userId, trip }: { userId: string; trip?: Trip }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { groupId } = useGroup();
  const { data: profiles = [] } = useQuery(profilesQuery(groupId));
  const [country, setCountry] = useState(trip?.country_code ?? "");
  const [title, setTitle] = useState(trip?.title ?? "");
  const [start, setStart] = useState(trip?.start_date ?? "");
  const [end, setEnd] = useState(trip?.end_date ?? "");
  const [story, setStory] = useState(trip?.story ?? "");
  const [stops, setStops] = useState<DraftStop[]>(trip?.trip_stops ?? []);
  const [members, setMembers] = useState<string[]>(trip ? trip.trip_members.map((m) => m.user_id) : [userId]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);

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
    const c = getCountry(country);
    if (!c) { toast.error("Pick a country"); return; }
    if (end < start) { toast.error("End date must be after start date"); return; }
    setBusy(true);
    try {
      const row = { country_code: c.code, country_name: c.name, title, start_date: start, end_date: end, story: story || null };
      let tripId = trip?.id;
      if (tripId) {
        const { error } = await supabase.from("trips").update(row).eq("id", tripId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("trips").insert({ ...row, created_by: userId, group_id: groupId! }).select("id").single();
        if (error) throw error;
        tripId = data.id;
      }
      // stops: keep existing ids so tagged media stays linked
      const keep = stops.filter((s) => s.id).map((s) => s.id!);
      const removed = (trip?.trip_stops ?? []).filter((s) => !keep.includes(s.id)).map((s) => s.id);
      if (removed.length) await supabase.from("trip_stops").delete().in("id", removed);
      for (const [i, s] of stops.entries()) {
        if (s.id) await supabase.from("trip_stops").update({ position: i }).eq("id", s.id);
        else await supabase.from("trip_stops").insert({ trip_id: tripId, name: s.name, lat: s.lat, lng: s.lng, position: i });
      }
      await supabase.from("trip_members").delete().eq("trip_id", tripId);
      if (members.length) {
        const { error } = await supabase.from("trip_members").insert(members.map((m) => ({ trip_id: tripId!, user_id: m })));
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip saved");
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
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Choose…</option>
            {COUNTRIES.map((c) => (
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
      <p className="text-xs text-muted-foreground">Trips with a start date in the future show up under Upcoming.</p>

      <div className="space-y-2">
        <Label>Route — places in order</Label>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city or place"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
          <Button type="button" variant="secondary" onClick={search}><Search className="h-4 w-4" /></Button>
        </div>
        {results.length > 0 && (
          <ul className="rounded-md border border-border bg-popover text-sm">
            {results.map((r, i) => (
              <li key={i}>
                <button type="button" className="w-full px-3 py-2 text-left hover:bg-accent"
                  onClick={() => { setStops([...stops, r]); setResults([]); setQ(""); }}>
                  {r.name} <span className="text-muted-foreground">({r.lat.toFixed(2)}, {r.lng.toFixed(2)})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <ol className="space-y-1.5">
          {stops.map((s, i) => (
            <li key={s.id ?? `${s.name}-${i}`} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-xs font-bold text-primary-foreground">{i + 1}</span>
              <span className="flex-1">{s.name}</span>
              <Button type="button" size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setStops(stops.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2">
        <Label>Who went</Label>
        <div className="flex flex-wrap gap-3">
          {profiles.map((p) => (
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
