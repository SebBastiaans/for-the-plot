import { createFileRoute } from "@tanstack/react-router";
import { TripForm } from "@/components/TripForm";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({
    meta: [
      { title: "Add a trip — Crossed Off" },
      { name: "description", content: "Log a new trip: country, dates, route and who came along." },
      { property: "og:title", content: "Add a trip — Crossed Off" },
      { property: "og:description", content: "Log a new trip on our shared travel globe." },
    ],
  }),
  component: NewTrip,
});

function NewTrip() {
  const { userId } = Route.useRouteContext();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-28">
      <p className="eyebrow">New entry</p>
      <h1 className="mb-8 mt-2 text-4xl">Add a trip</h1>
      <TripForm userId={userId} />
    </main>
  );
}
