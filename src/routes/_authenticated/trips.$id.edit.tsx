import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TripForm } from "@/components/TripForm";
import { ME, tripsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/trips/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit trip — Crossed Off" },
      { name: "description", content: "Update the dates, route and crew of a trip." },
      { property: "og:title", content: "Edit trip — Crossed Off" },
      { property: "og:description", content: "Update a trip on our shared travel globe." },
    ],
  }),
  component: EditTrip,
});

function EditTrip() {
  const { userId } = Route.useRouteContext();
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(tripsQuery(ME));
  const trip = data?.find((t) => t.id === id);
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-20 sm:px-5 sm:pt-28 md:pb-24">
      <p className="eyebrow">Edit entry</p>
      <h1 className="mb-8 mt-2 text-4xl">{trip?.title ?? "Trip"}</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : !trip ? (
        <p className="text-muted-foreground">Trip not found.</p>
      ) : trip.created_by !== userId ? (
        <p className="text-muted-foreground">Only the person who added this trip can edit it.</p>
      ) : (
        <TripForm userId={userId} trip={trip} />
      )}
    </main>
  );
}
