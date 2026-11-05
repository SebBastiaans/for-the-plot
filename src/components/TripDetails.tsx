import { ClientOnly, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { ArrowRight, CalendarDays, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MediaPicker } from "@/components/MediaPicker";
import { errText } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { flagEmoji } from "@/lib/countries";
import { useAuth } from "@/lib/auth";
import { useGroup } from "@/lib/group";
import { participants, addMediaToTrip, useProfilesMap, useAvatarUrls, useSignedUrls, type Trip } from "@/lib/data";
import { isUpcoming, todayISO, tripDays } from "@/lib/stats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const RouteMap = lazy(() => import("@/components/RouteMap"));

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function TripSection({ trip: full, code, link = false }: { trip: Trip; code?: string; link?: boolean }) {
  // with a country: only that country's places (stops without a country belong to every country of the trip)
  const trip = code ? { ...full, trip_stops: full.trip_stops.filter((s) => !s.country_code || s.country_code === code) } : full;
  const others = full.countries.filter((c) => c.code !== code);
  const userId = useAuth().session?.user.id ?? "";
  const { groupId } = useGroup();
  const profiles = useProfilesMap(groupId);
  const avatarUrl = useAvatarUrls(Object.values(profiles).map((p) => p.avatar_url));
  const upcoming = isUpcoming(trip, todayISO());
  const stopName = (id: string | null) => trip.trip_stops.find((s) => s.id === id)?.name;
  const [filter, setFilter] = useState<string>("all");
  const media = [...trip.trip_media]
    .filter((m) => filter === "all" || m.stop_id === filter)
    .sort((a, b) => (a.taken_at ?? a.created_at).localeCompare(b.taken_at ?? b.created_at));
  const urls = useSignedUrls(trip.trip_media.map((m) => m.storage_path));
  const notes = [...trip.trip_notes].sort((a, b) => (a.happened_at ?? a.created_at).localeCompare(b.happened_at ?? b.created_at));
  const pins = [
    ...trip.trip_media.filter((m) => m.stop_id).map((m) => ({ id: m.id, stopId: m.stop_id!, label: m.caption ?? "" })),
    ...trip.trip_notes.filter((n) => n.stop_id).map((n) => ({ id: n.id, stopId: n.stop_id!, label: n.body })),
  ];

  return (
    <article className="rounded-3xl border-2 border-border bg-card p-5 shadow-sticker sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {upcoming && <span className="rounded-full bg-planned px-2.5 py-0.5 text-xs font-semibold text-planned-foreground">Upcoming</span>}
          <h2 className="mt-2 text-3xl">{link ? <Link to="/trips/$id" params={{ id: trip.id }} className="hover:underline">{trip.title}</Link> : trip.title}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" /> {trip.start_date} → {trip.end_date} · {tripDays(trip.start_date, trip.end_date)} days
          </p>
          {trip.trip_stops.length > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {trip.trip_stops.map((s) => s.name + (s.arrived_on ? ` (${s.arrived_on}${s.left_on ? ` → ${s.left_on}` : ""})` : "")).join(" → ")}
            </p>
          )}
          {others.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {code ? "Also on this trip:" : "Countries:"}{" "}
              {others.map((c, i) => (
                <span key={c.code}>
                  {i > 0 && ", "}
                  <Link to="/countries/$code" params={{ code: c.code }} className="text-sage underline-offset-4 hover:underline">
                    {flagEmoji(c.code)} {c.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex gap-2">
        {link && (
          <Button asChild variant="secondary" size="sm">
            <Link to="/trips/$id" params={{ id: trip.id }}>Open trip <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        )}
        {trip.created_by === userId && (
          <Button asChild variant="outline" size="sm">
            <Link to="/trips/$id/edit" params={{ id: trip.id }}><Pencil className="h-4 w-4" /> Edit</Link>
          </Button>
        )}
        </div>
      </header>

      <div className="mt-6">
        <p className="eyebrow mb-3">Who went</p>
        <div className="flex flex-wrap gap-3">
          {trip.trip_members.map((m) => {
            const p = profiles[m.user_id];
            return (
              <div key={m.user_id} className={`flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm ${m.status === "pending" ? "opacity-60" : ""}`}>
                <Avatar className="h-7 w-7">
                  {avatarUrl(p?.avatar_url) && <AvatarImage src={avatarUrl(p?.avatar_url)} />}
                  <AvatarFallback className="bg-accent text-xs">{p?.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                {p?.display_name ?? "Friend"}
                {m.status === "pending" && <span className="text-xs text-muted-foreground">pending</span>}
              </div>
            );
          })}
        </div>
      </div>

      {trip.story && <p className="mt-6 max-w-3xl whitespace-pre-line leading-relaxed">{trip.story}</p>}

      {trip.trip_stops.length > 0 && (
        <div className="mt-8 h-80 overflow-hidden rounded-2xl border border-border">
          <ClientOnly fallback={<div className="h-full bg-muted" />}>
            <Suspense fallback={<div className="h-full bg-muted" />}>
              <RouteMap stops={trip.trip_stops} pins={pins} />
            </Suspense>
          </ClientOnly>
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-3 text-2xl">Gallery</h3>
          {[{ id: "all", name: "All" }, ...trip.trip_stops].map((s) => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              className={`rounded-full border px-3 py-1 text-xs ${filter === s.id ? "border-sage bg-sage text-primary-foreground" : "border-border text-muted-foreground"}`}>
              {s.name}
            </button>
          ))}
        </div>
        {media.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No photos or videos yet.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            {media.map((m) => {
              const url = urls.data?.[m.storage_path];
              return (
                <figure key={m.id} className="group overflow-hidden rounded-xl border border-border bg-muted">
                  <div className="aspect-[4/3]">
                    {url ? (
                      m.media_type === "video" ? (
                        <video src={url} controls preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={m.caption ?? ""} loading="lazy" className="h-full w-full object-cover" /></a>
                      )
                    ) : <div className="h-full animate-pulse" />}
                  </div>
                  <figcaption className="flex items-start justify-between gap-2 p-3 text-xs">
                    <div>
                      {m.caption && <p className="text-sm text-foreground">{m.caption}</p>}
                      <p className="text-muted-foreground">
                        {[stopName(m.stop_id), fmt(m.taken_at)].filter(Boolean).join(" · ") || "No place or time"}
                      </p>
                    </div>
                    {(m.uploaded_by === userId || trip.created_by === userId) && <DeleteMedia id={m.id} path={m.storage_path} />}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
        {participants(trip).includes(userId) && <AddMedia trip={trip} />}
      </section>

      <section className="mt-10">
        <h3 className="text-2xl">Stories & notes</h3>
        <ol className="mt-4 space-y-3 border-l border-border pl-5">
          {notes.map((n) => (
            <li key={n.id} className="relative">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-sage" />
              <p className="eyebrow">
                {[stopName(n.stop_id), fmt(n.happened_at), profiles[n.author_id]?.display_name].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 whitespace-pre-line">{n.body}</p>
            </li>
          ))}
          {notes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
        </ol>
        {participants(trip).includes(userId) && <AddNote trip={trip} />}
      </section>
    </article>
  );
}

function PlaceTimeFields({ trip, stop, setStop, when, setWhen }: {
  trip: Trip; stop: string; setStop: (v: string) => void; when: string; setWhen: (v: string) => void;
}) {
  return (
    <>
      <select value={stop} onChange={(e) => setStop(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">Place (optional)</option>
        {trip.trip_stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-auto" aria-label="When" />
    </>
  );
}

function AddMedia({ trip }: { trip: Trip }) {
  const userId = useAuth().session?.user.id ?? "";
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [stop, setStop] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true); setProgress(0);
    try {
      await addMediaToTrip(userId, trip, files, {
        caption, stopId: stop || null, takenAt: when ? new Date(when).toISOString() : null, onProgress: setProgress,
      });
      const n = files.length;
      setFiles([]); setCaption("");
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`${n} ${n === 1 ? "item" : "items"} added to the gallery`);
    } catch (err) {
      toast.error(`Upload failed: ${errText(err)}`);
    } finally {
      setBusy(false); setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl border border-dashed border-border p-4">
      <MediaPicker files={files} onChange={setFiles} progress={progress} />
      {files.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Place and time are filled in from each photo. Pick them below only to override.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="w-40" />
            <PlaceTimeFields trip={trip} stop={stop} setStop={setStop} when={when} setWhen={setWhen} />
            <Button type="submit" size="sm" disabled={busy}>{busy ? `Uploading… ${Math.round((progress ?? 0) * 100)}%` : `Upload ${files.length}`}</Button>
          </div>
        </>
      )}
    </form>
  );
}

function AddNote({ trip }: { trip: Trip }) {
  const userId = useAuth().session?.user.id ?? "";
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [stop, setStop] = useState("");
  const [when, setWhen] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("trip_notes").insert({
      trip_id: trip.id, body, author_id: userId, stop_id: stop || null,
      happened_at: when ? new Date(when).toISOString() : null,
    });
    if (error) { toast.error(`Couldn't save note: ${errText(error)}`); return; }
    setBody("");
    toast.success("Note added");
    await qc.invalidateQueries({ queryKey: ["trips"] });
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-2 rounded-xl border border-dashed border-border p-4">
      <Textarea placeholder="Write a story or note…" value={body} onChange={(e) => setBody(e.target.value)} required rows={3} />
      <div className="flex flex-wrap gap-2">
        <PlaceTimeFields trip={trip} stop={stop} setStop={setStop} when={when} setWhen={setWhen} />
        <Button type="submit" size="sm">Add note</Button>
      </div>
    </form>
  );
}

function DeleteMedia({ id, path }: { id: string; path: string }) {
  const qc = useQueryClient();
  return (
    <button aria-label="Delete" className="text-muted-foreground hover:text-destructive"
      onClick={async () => {
        if (!confirm("Remove this item?")) return;
        const { error } = await supabase.from("trip_media").delete().eq("id", id);
        if (error) { toast.error(`Couldn't remove: ${errText(error)}`); return; }
        await supabase.storage.from("trip-media").remove([path]);
        toast.success("Removed");
        qc.invalidateQueries({ queryKey: ["trips"] });
      }}>
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
