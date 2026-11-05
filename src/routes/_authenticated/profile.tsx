import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profilesQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Crossed Off" },
      { name: "description", content: "Set your name and avatar for the crew." },
      { property: "og:title", content: "Your profile — Crossed Off" },
      { property: "og:description", content: "Set your name and avatar for the crew." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useQuery(profilesQuery);
  const me = data?.find((p) => p.id === userId);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (me) { setName(me.display_name); setAvatar(me.avatar_url ?? ""); }
  }, [me]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name, avatar_url: avatar || null }).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profiles"] });
    toast.success("Profile saved");
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-28">
      <p className="eyebrow">You</p>
      <h1 className="mt-2 text-4xl">Profile</h1>
      <form onSubmit={save} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="n">Display name</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a">Avatar image link</Label>
          <Input id="a" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" />
        </div>
        <Button type="submit">Save</Button>
      </form>
    </main>
  );
}
