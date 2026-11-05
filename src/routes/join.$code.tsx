import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useGroup } from "@/lib/group";
import { Button } from "@/components/ui/button";

export const PENDING_INVITE_KEY = "crossed-off:invite";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "You're invited — For The Plot" },
      { name: "description", content: "Join your friends' travel group and see every country you've crossed off together." },
      { property: "og:title", content: "You're invited to a travel crew" },
      { property: "og:description", content: "Join your friends' travel group on For The Plot." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const { session, ready } = useAuth();
  const { setGroupId } = useGroup();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data: name, isLoading } = useQuery({
    queryKey: ["invite", code],
    enabled: !!session,
    queryFn: async () => (await supabase.rpc("group_name_for_invite", { _code: code })).data,
  });

  async function join() {
    setBusy(true);
    const { data, error } = await supabase.rpc("join_group", { _code: code });
    setBusy(false);
    if (error) { toast.error("This invite link doesn't work anymore."); return; }
    await qc.invalidateQueries({ queryKey: ["groups"] });
    setGroupId(data);
    toast.success("You're in!");
    navigate({ to: "/" });
  }

  return (
    <main className="bg-hero flex min-h-screen items-center justify-center px-5 pt-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <p className="eyebrow">Invitation</p>
        {!ready ? null : !session ? (
          <>
            <h1 className="mt-2 text-3xl">Join a travel crew</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in or create an account first, then you'll come back here.</p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth" onClick={() => sessionStorage.setItem(PENDING_INVITE_KEY, code)}>Sign in to join</Link>
            </Button>
          </>
        ) : isLoading ? <p className="mt-4 text-muted-foreground">Checking invite…</p> : !name ? (
          <h1 className="mt-2 text-2xl">This invite link doesn't work</h1>
        ) : (
          <>
            <h1 className="mt-2 text-3xl">Join <span className="text-sage">{name}</span>?</h1>
            <Button className="mt-6 w-full" onClick={join} disabled={busy}>Join group</Button>
          </>
        )}
      </div>
    </main>
  );
}
