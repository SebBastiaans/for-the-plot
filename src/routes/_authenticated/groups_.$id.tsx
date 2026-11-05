import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/States";
import { TripRow } from "@/components/TripRow";
import { profilesQuery, tripsQuery } from "@/lib/data";
import { useGroup } from "@/lib/group";
import { isUpcoming, todayISO } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/groups_/$id")({
  head: () => ({
    meta: [
      { title: "Group trips — For The Plot" },
      { name: "description", content: "Every trip that counts for this travel group." },
      { property: "og:title", content: "Group trips — For The Plot" },
      { property: "og:description", content: "Every trip that counts for this travel group." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupTrips,
});

const FILTERS = [["all", "All"], ["visited", "Visited"], ["upcoming", "Upcoming"]] as const;

function GroupTrips() {
  const { id } = Route.useParams();
  const { groups } = useGroup();
  const group = groups.find((g) => g.id === id);
  const { data = [], isLoading, error, refetch } = useQuery(tripsQuery(id));
  const { data: members = [] } = useQuery(profilesQuery(id));
  const profiles = Object.fromEntries(members.map((p) => [p.id, p]));
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const today = todayISO();
  const trips = data.filter((t) => filter === "all" || (filter === "upcoming") === isUpcoming(t, today));

  const rule = !group ? "" : group.rule_type === "all" ? "Everyone was on the trip"
    : group.rule_type === "count" ? `At least ${group.rule_value} of ${members.length} members were on the trip`
    : `At least ${group.rule_value}% of the group was on the trip`;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-24 sm:px-5 sm:pt-28 md:pb-24">
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to groups
      </Link>
      {!group ? (
        <p className="mt-8 text-muted-foreground">This group doesn't exist or you're not a member.</p>
      ) : (
        <>
          <p className="eyebrow mt-4">{members.length} members · {rule}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{group.name}</h1>
          <div className="mt-6 flex gap-2" role="group" aria-label="Filter trips">
            {FILTERS.map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold ${filter === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
          {isLoading ? <LoadingState label="Loading the group's trips…" /> : error ? (
            <ErrorState error={error} label="Couldn't load this group's trips." onRetry={() => refetch()} />
          ) : trips.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
              {data.length ? "No trips here." : "No trips count for this group yet. A trip shows up once enough members were tagged on it to meet the group's rule."}
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {trips.map((t) => <TripRow key={t.id} trip={t} profiles={profiles} />)}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
