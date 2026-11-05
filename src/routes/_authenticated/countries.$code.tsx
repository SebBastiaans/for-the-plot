import { useGroup } from "@/lib/group";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState } from "@/components/States";
import { TripSection } from "@/components/TripDetails";
import { flagEmoji, getCountry } from "@/lib/countries";
import { tripsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/countries/$code")({
  head: ({ params }) => {
    const name = getCountry(params.code)?.name ?? "Country";
    return {
      meta: [
        { title: `${name} — For The Plot` },
        { name: "description", content: `Our trips to ${name}: dates, route, who went, photos, videos and stories.` },
        { property: "og:title", content: `${name} — For The Plot` },
        { property: "og:description", content: `Our trips to ${name}.` },
      ],
    };
  },
  component: CountryPage,
});

function CountryPage() {
  const { code } = Route.useParams();
  const country = getCountry(code);
  const { groupId } = useGroup();
  const { data, isLoading, error, refetch } = useQuery(tripsQuery(groupId));
  const trips = (data ?? []).filter((t) => t.countries.some((c) => c.code === code.toUpperCase()));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-20 sm:px-5 sm:pt-28 md:pb-24">
      <Link to="/" className="eyebrow hover:text-foreground">← Back to globe</Link>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-6xl">{flagEmoji(code)}</span>
        <div>
          <p className="eyebrow">{country?.continent}</p>
          <h1 className="text-4xl sm:text-5xl">{country?.name ?? code}</h1>
        </div>
      </div>
      {isLoading ? (
        <LoadingState label="Loading trips…" />
      ) : error ? (
        <ErrorState error={error} label="Couldn't load the trips." onRetry={() => refetch()} />
      ) : trips.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Nobody has logged a trip here yet. <Link to="/trips/new" className="text-sage underline">Add one</Link>.
        </p>
      ) : (
        <div className="mt-12 space-y-20">
          {trips.map((t) => <TripSection key={t.id} trip={t} code={code.toUpperCase()} link />)}
        </div>
      )}
    </main>
  );
}

