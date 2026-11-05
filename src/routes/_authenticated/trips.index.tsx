import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, ImageIcon, MapPin } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/States";
import { ME, participants, tripsQuery, useProfilesMap } from "@/lib/data";
import { isUpcoming, todayISO, tripDays } from "@/lib/stats";
import { flagEmoji } from "@/lib/countries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "My trips — Crossed Off" },
      { name: "description", content: "All your trips in one list: countries, dates, places, photos and who came along." },
      { property: "og:title", content: "My trips — Crossed Off" },
      { property: "og:description", content: "Every trip you've been on, in one list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TripsList,
});

const FILTERS = [["all", "All"], ["visited", "Visited"], ["upcoming", "Upcoming"]] as const;

function TripsList() {
  const { data = [], isLoading, error, refetch } = useQuery(tripsQuery(ME));
  const profiles = useProfilesMap(ME);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const today = todayISO();
  const trips = data.filter((t) => filter === "all" || (filter === "upcoming") === isUpcoming(t, today));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-24 sm:px-5 sm:pt-28 md:pb-24">
      <p className="eyebrow">Your logbook</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">My trips</h1>
      <div className="mt-6 flex gap-2" role="group" aria-label="Filter trips">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${filter === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
      {isLoading ? <LoadingState label="Loading your trips…" /> : error ? (
        <ErrorState error={error} label="Couldn't load your trips." onRetry={() => refetch()} />
      ) : trips.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-muted-foreground">{data.length ? "No trips here." : "No trips yet."}</p>
          <Button asChild className="mt-3"><Link to="/trips/new">Add a trip</Link></Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {trips.map((t) => {
            const people = participants(t).map((id) => profiles[id]?.display_name).filter(Boolean);
            return (
              <li key={t.id}>
                <Link to="/trips/$id" params={{ id: t.id }}
                  className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 shadow-sticker transition-transform active:scale-[0.99]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl">{t.title}</h2>
                      {isUpcoming(t, today) && <span className="rounded-full bg-planned px-2 py-0.5 text-xs font-semibold text-planned-foreground">Upcoming</span>}
                    </div>
                    <p className="mt-1 truncate text-sm">{t.countries.map((c) => `${flagEmoji(c.code)} ${c.name}`).join("  ")}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{t.start_date} → {t.end_date} · {tripDays(t.start_date, t.end_date)} days</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.trip_stops.length} places</span>
                      <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{t.trip_media.length}</span>
                    </p>
                    {people.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">With {people.join(", ")}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
