import { createFileRoute } from "@tanstack/react-router";
import { TripForm } from "@/components/TripForm";
import { NeedGroup, useGroup } from "@/lib/group";

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
  const { groupId, group, loading } = useGroup();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-28">
      <p className="eyebrow">New entry</p>
      <h1 className="mt-2 text-4xl">Add a trip</h1>
      {group && <p className="mb-8 mt-1 text-muted-foreground">to {group.name}</p>}
      {loading ? null : groupId ? <TripForm userId={userId} /> : <NeedGroup />}
    </main>
  );
}
