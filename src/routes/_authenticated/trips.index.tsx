import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TripRow } from "@/components/TripRow";
import { ErrorState, LoadingState } from "@/components/States";
import { ME, tripsQuery, useProfilesMap } from "@/lib/data";
import { isUpcoming, todayISO } from "@/lib/stats";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "My trips — For The Plot" },
      { name: "description", content: "All your trips in one list: countries, dates, places, photos and who came along." },
      { property: "og:title", content: "My trips — For The Plot" },
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
          {trips.map((t) => <TripRow key={t.id} trip={t} profiles={profiles} />)}
        </ul>
      )}
    </main>
  );
}
