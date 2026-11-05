import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { profilesQuery, tripsQuery } from "@/lib/data";
import { computeStats, todayISO, type Ranked } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — Crossed Off" },
      { name: "description", content: "Leaderboards for our crew: top countries, cities, most days abroad and more." },
      { property: "og:title", content: "Rankings — Crossed Off" },
      { property: "og:description", content: "Who has seen the most of the world?" },
    ],
  }),
  component: Rankings,
});

function Board({ title, items, unit }: { title: string; items: Ranked[]; unit: string }) {
  const max = items[0]?.value ?? 1;
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No data yet.</p> : (
        <ol className="mt-4 space-y-3">
          {items.slice(0, 8).map((it, i) => (
            <li key={it.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span><span className="eyebrow mr-2">{String(i + 1).padStart(2, "0")}</span>{it.label}</span>
                <span className="font-mono text-sage">{it.value} {unit}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-sage" style={{ width: `${(it.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Rankings() {
  const trips = useQuery(tripsQuery);
  const profiles = useQuery(profilesQuery);
  const names = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p.display_name]));
  const s = computeStats(
    (trips.data ?? []).map((t) => ({
      ...t,
      stops: t.trip_stops,
      members: t.trip_members.map((m) => m.user_id),
      media: t.trip_media,
    })),
    names,
    todayISO(),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <p className="eyebrow">Leaderboards</p>
      <h1 className="mt-2 text-5xl">Rankings & stats</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["Countries", s.totalCountries], ["Trips", s.totalTrips], ["Continents", s.totalContinents]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-6">
            <p className="eyebrow">{l}</p>
            <p className="mt-2 font-display text-5xl text-sage">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Board title="Most visited countries" items={s.topCountries} unit="trips" />
        <Board title="Most visited places" items={s.topCities} unit="visits" />
        <Board title="Most countries per friend" items={s.friendsByCountries} unit="countries" />
        <Board title="Most days abroad" items={s.friendsByDays} unit="days" />
        <Board title="Most continents" items={s.friendsByContinents} unit="continents" />
        <Board title="Most photos & videos" items={s.friendsByMedia} unit="items" />
        <Board title="Trips per year" items={s.tripsPerYear} unit="trips" />
      </div>
    </main>
  );
}
