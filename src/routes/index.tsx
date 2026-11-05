import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ErrorState, LoadingState } from "@/components/States";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { Camera, Globe2, Route as RouteIcon, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NeedGroup, useGroup } from "@/lib/group";
import { participants, profilesQuery, tripsQuery } from "@/lib/data";
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

const steps = [
  { icon: Globe2, title: "Spin the globe", body: "Grab it and turn. Every country that lights up green is one your crew has crossed off." },
  { icon: RouteIcon, title: "Log a trip", body: "Add the dates, the route of cities in order and tag who came along." },
  { icon: Camera, title: "Fill the gallery", body: "Upload photos and videos and write notes — each tied to a place and a moment." },
  { icon: Trophy, title: "Compare & plan", body: "See who's been where in the rankings and count down to the next trip." },
];

function GlobeFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-[85%] aspect-square rounded-full border border-border animate-pulse" />
    </div>
  );
}

function Index() {
  const { session, ready } = useAuth();
  const { groupId, group, loading } = useGroup();
  const navigate = useNavigate();
  const trips = useQuery(tripsQuery(groupId));
  const profiles = useQuery(profilesQuery(groupId));
  const today = todayISO();

  // resume an invite after Google sign-in returned to the home page
  useEffect(() => {
    if (!session) return;
    const invite = sessionStorage.getItem("crossed-off:invite");
    if (invite) {
      sessionStorage.removeItem("crossed-off:invite");
      navigate({ to: "/join/$code", params: { code: invite } });
    }
  }, [session, navigate]);

  const statuses = useMemo(() => {
    const s: Record<string, CountryStatus> = {};
    for (const t of trips.data ?? []) {
      const up = isUpcoming(t, today);
      for (const { code } of t.countries) {
        const cur = s[code];
        if (up) {
          if (!cur) s[code] = { status: "planned", trips: 0 };
        } else {
          s[code] = { status: "visited", trips: (cur?.status === "visited" ? cur.trips : 0) + 1 };
        }
      }
    }
    return s;
  }, [trips.data, today]);

  const past = (trips.data ?? []).filter((t) => !isUpcoming(t, today));
  const visitedCount = Object.values(statuses).filter((s) => s.status === "visited").length;
  const names = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p.display_name]));

  return (
    <main className="overflow-x-clip pb-20 md:pb-0">
      <div className="relative overflow-clip">
      <section className="bg-hero relative h-[100svh] min-h-[680px] pt-14 sm:pt-16">
        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-10 sm:px-5 sm:pt-14 text-center">
          <p className="eyebrow">{group ? group.name : "My trips"} · {visitedCount} countries crossed off</p>
          <h1 className="mt-4 text-[2.6rem] leading-[1] sm:text-7xl">
            Where in the world <span className="text-sage">have we been?</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-muted-foreground">Grab the globe, give it a spin, and tap a green country to relive the trip.</p>
          <div className="mt-5 flex justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sage" /> Visited</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-planned" /> Planned</span>
          </div>
          {ready && !session && (
            <Button asChild className="mt-6"><Link to="/auth">Sign in to see our map</Link></Button>
          )}
        </div>
        {/* Big globe: its center sits near the bottom of the first screen, so only the top half shows */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[135svh] overflow-hidden">
        <div className="pointer-events-auto absolute left-1/2 top-[52svh] h-[min(150vw,1500px)] w-[min(150vw,1500px)] -translate-x-1/2 sm:top-[46svh] sm:h-[min(110vw,1300px)] sm:w-[min(110vw,1300px)]">
          <ClientOnly fallback={<GlobeFallback />}>
            <Suspense fallback={<GlobeFallback />}>
              <Globe statuses={statuses} onCountryClick={(code) => navigate({ to: "/countries/$code", params: { code } })} />
            </Suspense>
          </ClientOnly>
        </div>
        </div>
      </section>

      <section className="bg-fade pointer-events-none relative z-10 -mt-[22svh] pb-24 pt-[34svh]">
        <div className="pointer-events-auto mx-auto max-w-6xl px-5">
          <p className="eyebrow text-center">How it works</p>
          <h2 className="mt-3 text-center text-4xl sm:text-5xl">One globe for the whole crew</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="rounded-3xl border-2 border-border bg-card/90 p-6 shadow-sticker backdrop-blur transition-transform hover:-rotate-1 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-sage" />
                  <span className="eyebrow">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              {session ? <Link to="/trips/new">Add a trip</Link> : <Link to="/auth">Join the crew</Link>}
            </Button>
          </div>
        </div>
      </section>
      </div>

      {session && (
        <section className="relative z-10 mx-auto max-w-6xl bg-background px-5 pb-24">
          {!loading && !groupId ? <NeedGroup /> : trips.isLoading ? <LoadingState label="Loading your trips…" /> : trips.error ? (
            <ErrorState error={trips.error} label="Couldn't load your trips." onRetry={() => trips.refetch()} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[["Countries", visitedCount], ["Trips", past.length], ["Friends", profiles.data?.length ?? 0]].map(([l, v]) => (
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
                      <Link to="/countries/$code" params={{ code: t.countries[0]!.code }}
                        className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 shadow-sticker transition-transform hover:-translate-y-0.5 hover:border-sage">
                        <span className="text-3xl">{t.countries.map((c) => flagEmoji(c.code)).join("")}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{t.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {t.countries.map((c) => c.name).join(", ")} · {t.start_date} · {participants(t).map((id) => names[id]).filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
