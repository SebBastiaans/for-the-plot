import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { tripsQuery, useProfilesMap } from "@/lib/data";
import { flagEmoji } from "@/lib/countries";
import { isUpcoming, todayISO, tripDays } from "@/lib/stats";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming trips — Crossed Off" },
      { name: "description", content: "Our planned trips with countdowns and who's coming along." },
      { property: "og:title", content: "Upcoming trips — Crossed Off" },
      { property: "og:description", content: "Where we're going next." },
    ],
  }),
  component: Upcoming,
});

function Upcoming() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const profiles = useProfilesMap();
  const today = todayISO();
  const { data, isLoading } = useQuery(tripsQuery);
  const trips = (data ?? []).filter((t) => isUpcoming(t, today)).sort((a, b) => a.start_date.localeCompare(b.start_date));

  async function toggle(tripId: string, joined: boolean) {
    const { error } = joined
      ? await supabase.from("trip_members").delete().eq("trip_id", tripId).eq("user_id", userId)
      : await supabase.from("trip_members").insert({ trip_id: tripId, user_id: userId });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["trips"] });
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-28">
      <p className="eyebrow">Next up</p>
      <h1 className="mt-2 text-5xl">Upcoming trips</h1>
      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : trips.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Nothing planned yet. <Link to="/trips/new" className="text-planned underline">Plan a trip</Link> with a future start date.
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {trips.map((t) => {
            const days = tripDays(today, t.start_date) - 1;
            const joined = t.trip_members.some((m) => m.user_id === userId);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-5">
                <div className="w-24 text-center">
                  <p className="font-display text-5xl text-planned">{days}</p>
                  <p className="eyebrow">days to go</p>
                </div>
                <div className="min-w-0 flex-1">
                  <Link to="/countries/$code" params={{ code: t.country_code }} className="text-xl font-semibold hover:text-sage">
                    {flagEmoji(t.country_code)} {t.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {t.country_name} · {t.start_date} → {t.end_date}
                    {t.trip_stops.length > 0 && ` · ${t.trip_stops.map((s) => s.name).join(" → ")}`}
                  </p>
                  <p className="mt-1 text-sm">
                    Coming: {t.trip_members.map((m) => profiles[m.user_id]?.display_name).filter(Boolean).join(", ") || "nobody yet"}
                  </p>
                </div>
                <Button variant={joined ? "outline" : "default"} size="sm" onClick={() => toggle(t.id, joined)}>
                  {joined ? "Leave" : "I'm in"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
