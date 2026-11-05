import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState } from "@/components/States";
import { TripSection } from "@/components/TripDetails";
import { ME, tripsQuery } from "@/lib/data";
import { useGroup } from "@/lib/group";

export const Route = createFileRoute("/_authenticated/trips/$id")({
  head: () => ({
    meta: [
      { title: "Trip — For The Plot" },
      { name: "description", content: "A trip in full: route, dates, who went, photos, videos and stories." },
      { property: "og:title", content: "Trip — For The Plot" },
      { property: "og:description", content: "Route, people, photos and stories of one trip." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TripPage,
});

function TripPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { groupId } = useGroup();
  const mine = useQuery(tripsQuery(ME));
  const group = useQuery(tripsQuery(groupId && groupId !== ME ? groupId : null));
  const trip = mine.data?.find((t) => t.id === id) ?? group.data?.find((t) => t.id === id);
  const loading = mine.isLoading || (group.isLoading && group.fetchStatus !== "idle");

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-24 sm:px-5 sm:pt-28 md:pb-24">
      <button onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/trips" }))}
        className="eyebrow hover:text-foreground">← Back</button>
      {trip ? (
        <div className="mt-6"><TripSection trip={trip} /></div>
      ) : loading ? <LoadingState label="Loading trip…" /> : mine.error ? (
        <ErrorState error={mine.error} label="Couldn't load this trip." onRetry={() => mine.refetch()} />
      ) : (
        <p className="mt-8 text-muted-foreground">This trip doesn't exist or you can't see it. <Link to="/trips" className="underline">See your trips</Link>.</p>
      )}
    </main>
  );
}
