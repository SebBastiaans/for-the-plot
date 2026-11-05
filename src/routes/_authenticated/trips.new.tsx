import { Link, createFileRoute } from "@tanstack/react-router";
import { ImagePlus } from "lucide-react";
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
      <p className="mt-1 text-muted-foreground">Saved to your account. Friends you tag get an invite to confirm.</p>
      <Link to="/import" className="mb-8 mt-6 flex items-center gap-4 rounded-3xl border-2 border-primary bg-card p-4 transition-colors hover:bg-accent sm:p-5">
        <ImagePlus className="h-8 w-8 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold">Skip the typing: start from your photos</span>
          <span className="block text-sm text-muted-foreground">Pick photos from your camera roll. We read when and where they were taken and build the trips for you.</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline">Import photos</span>
      </Link>
      <p className="eyebrow mb-4">Or fill it in yourself</p>
      {loading ? null : <TripForm userId={userId} />}
    </main>
  );
}
