import { Link, createFileRoute } from "@tanstack/react-router";
import { TripForm } from "@/components/TripForm";
import { useGroup } from "@/lib/group";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({
    meta: [
      { title: "Add a trip — For The Plot" },
      { name: "description", content: "Log a new trip: country, dates, route and who came along." },
      { property: "og:title", content: "Add a trip — For The Plot" },
      { property: "og:description", content: "Log a new trip on our shared travel globe." },
    ],
  }),
  component: NewTrip,
});

function NewTrip() {
  const { userId } = Route.useRouteContext();
  const { loading } = useGroup();
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-20 sm:px-5 sm:pt-28 md:pb-24">
      <p className="eyebrow">New entry</p>
      <h1 className="mt-2 text-4xl">Add a trip</h1>
      <p className="mb-8 mt-1 text-muted-foreground">Saved to your account. Friends you tag get an invite to confirm. Got lots of photos? <Link to="/import" className="underline">Import them from your camera roll</Link> and we suggest trips for you.</p>
      {loading ? null : <TripForm userId={userId} />}
    </main>
  );
}
