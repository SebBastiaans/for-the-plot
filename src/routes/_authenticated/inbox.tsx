import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invitesQuery, profilesQuery, ME } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Crossed Off" },
      { name: "description", content: "Accept or decline trips your friends tagged you on." },
      { property: "og:title", content: "Inbox — Crossed Off" },
      { property: "og:description", content: "Confirm the trips you went on with friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(invitesQuery(userId));
  const { data: people = [] } = useQuery(profilesQuery(ME));
  const name = (id?: string) => people.find((p) => p.id === id)?.display_name ?? "A friend";

  async function respond(tripId: string, accept: boolean) {
    const { error } = await supabase.rpc("respond_to_trip", { _trip: tripId, _accept: accept });
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? "Added to your trips" : "Invite declined");
    qc.invalidateQueries({ queryKey: ["invites"] });
    qc.invalidateQueries({ queryKey: ["trips"] });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-20 sm:px-5 sm:pt-28 md:pb-24">
      <p className="eyebrow">Inbox</p>
      <h1 className="mt-2 text-4xl">Trip invites</h1>
      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : data.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No invites right now.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {data.map((i) => (
            <li key={i.trip_id} className="rounded-3xl border-2 border-border bg-card p-4 shadow-sticker">
              <p className="text-sm text-muted-foreground">{name(i.trips?.created_by)} says you were there</p>
              <p className="mt-1 text-xl font-semibold">{i.trips?.title ?? "Trip"}</p>
              <p className="text-sm text-muted-foreground">{i.trips?.start_date} → {i.trips?.end_date}</p>
              <div className="mt-3 flex gap-2">
                <Button className="h-11 flex-1" onClick={() => respond(i.trip_id, true)}>Accept</Button>
                <Button className="h-11 flex-1" variant="outline" onClick={() => respond(i.trip_id, false)}>Decline</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
