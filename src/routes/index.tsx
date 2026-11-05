import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { profilesQuery, tripsQuery } from "@/lib/data";
import { flagEmoji } from "@/lib/countries";
import { isUpcoming, todayISO } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import type { CountryStatus } from "@/components/Globe";

const Globe = lazy(() => import("@/components/Globe"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crossed Off — the countries our crew has visited" },
      { name: "description", content: "Spin the globe and see every country we've crossed off together, with trips, routes, photos and stories." },
      { property: "og:title", content: "Crossed Off — our travel globe" },
      { property: "og:description", content: "Spin the globe and see every country we've crossed off together." },
    ],
  }),
  component: Index,
});

function GlobeFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-[60%] aspect-square rounded-full border border-sage/20 shadow-glow animate-pulse" />
    </div>
  );
}

function Index() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const trips = useQuery({ ...tripsQuery, enabled: !!session });
  const profiles = useQuery({ ...profilesQuery, enabled: !!session });
  const today = todayISO();

  const statuses = useMemo(() => {
    const s: Record<string, CountryStatus> = {};
    for (const t of trips.data ?? []) {
      const up = isUpcoming(t, today);
      const cur = s[t.country_code];
      if (up) {
        if (!cur) s[t.country_code] = { status: "planned", trips: 0 };
      } else {
        s[t.country_code] = { status: "visited", trips: (cur?.status === "visited" ? cur.trips : 0) + 1 };
      }
    }
    return s;
  }, [trips.data, today]);

  const past = (trips.data ?? []).filter((t) => !isUpcoming(t, today));
  const visitedCount = Object.values(statuses).filter((s) => s.status === "visited").length;
  const names = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p.display_name]));

  return (
    <main>
      <section className="bg-hero grain relative h-[100svh] min-h-[640px] overflow-hidden pt-16">
        <div className="pointer-events-none absolute left-0 right-0 top-24 z-10 mx-auto max-w-6xl px-5">
          <p className="eyebrow">Field log · {visitedCount} countries crossed off</p>
          <h1 className="mt-3 max-w-xl text-5xl leading-[1.05] sm:text-6xl">
            Where in the world <em className="text-sage">have we been?</em>
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">Grab the globe and spin it. Lit-up countries are ours — click one to open the trip log.</p>
          <div className="mt-5 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sage" /> Visited</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-planned" /> Planned</span>
          </div>
          {ready && !session && (
            <Button asChild className="pointer-events-auto mt-6">
              <Link to="/auth">Sign in to see our map</Link>
            </Button>
          )}
        </div>
        <div className="absolute inset-0 top-16">
          <ClientOnly fallback={<GlobeFallback />}>
            <Suspense fallback={<GlobeFallback />}>
              <Globe statuses={statuses} onCountryClick={(code) => navigate({ to: "/countries/$code", params: { code } })} />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      {session && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Countries", visitedCount],
              ["Trips", past.length],
              ["Friends", profiles.data?.length ?? 0],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-border bg-card p-6">
                <p className="eyebrow">{l}</p>
                <p className="mt-2 font-display text-5xl text-sage">{v}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-16 text-3xl">Recent trips</h2>
          {past.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              No trips yet. <Link to="/trips/new" className="text-sage underline">Add the first one</Link>.
            </p>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {past.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <Link
                    to="/countries/$code"
                    params={{ code: t.country_code }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-sage/60"
                  >
                    <span className="text-3xl">{flagEmoji(t.country_code)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.country_name} · {t.start_date} · {t.trip_members.map((m) => names[m.user_id]).filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
