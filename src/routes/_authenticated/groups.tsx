import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profilesQuery } from "@/lib/data";
import { useGroup, type Group } from "@/lib/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Groups — Crossed Off" },
      { name: "description", content: "Create a travel group and invite friends with a link." },
      { property: "og:title", content: "Groups — Crossed Off" },
      { property: "og:description", content: "Create a travel group and invite friends with a link." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { groups, groupId, setGroupId } = useGroup();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("create_group", { _name: name });
    if (error) { toast.error(error.message); return; }
    setName("");
    await qc.invalidateQueries({ queryKey: ["groups"] });
    setGroupId(data);
    toast.success("Group created — share the invite link");
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <p className="eyebrow">Your crews</p>
      <h1 className="mt-2 text-5xl">Groups</h1>
      <p className="mt-2 text-muted-foreground">Each group has its own globe, trips and rankings.</p>

      <form onSubmit={create} className="mt-8 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name, e.g. Uni friends" required />
        <Button type="submit">Create group</Button>
      </form>

      <div className="mt-10 space-y-4">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} active={g.id === groupId} onSelect={() => setGroupId(g.id)} />
        ))}
        {groups.length === 0 && <p className="text-muted-foreground">You're not in any group yet.</p>}
      </div>
    </main>
  );
}

function GroupCard({ group, active, onSelect }: { group: Group; active: boolean; onSelect: () => void }) {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(profilesQuery(group.id));
  const owner = group.created_by === userId;
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/join/${group.invite_code}`;

  async function removeMember(id: string) {
    const self = id === userId;
    if (!confirm(self ? "Leave this group?" : "Remove this member?")) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: self ? ["groups"] : ["profiles", group.id] });
  }

  async function del() {
    if (!confirm(`Delete "${group.name}" and all its trips?`)) return;
    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["groups"] });
  }

  async function rename() {
    const n = prompt("New name", group.name);
    if (!n) return;
    const { error } = await supabase.from("groups").update({ name: n }).eq("id", group.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["groups"] });
  }

  return (
    <section className={`rounded-2xl border bg-card p-6 ${active ? "border-sage" : "border-border"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">{group.name}</h2>
        {active ? <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Viewing</span> : (
          <Button size="sm" variant="outline" onClick={onSelect}>Switch to this group</Button>
        )}
        {owner && (
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" onClick={rename}>Rename</Button>
            <Button size="sm" variant="ghost" onClick={del} aria-label="Delete group"><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="eyebrow mb-2">Invite link</p>
        <div className="flex gap-2">
          <Input readOnly value={link} className="font-mono text-xs" />
          <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(link); toast.success("Invite link copied"); }}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      <p className="eyebrow mb-2 mt-5">Members · {members.length}</p>
      <ul className="flex flex-wrap gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-full border border-border py-1 pl-3 pr-1 text-sm">
            {m.display_name}{m.id === group.created_by && <span className="text-xs text-sage">owner</span>}
            {(owner && m.id !== userId) || (!owner && m.id === userId) ? (
              <button onClick={() => removeMember(m.id)} className="rounded-full p-1 text-muted-foreground hover:text-destructive" aria-label={m.id === userId ? "Leave" : "Remove"}>
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            ) : <span className="w-1" />}
          </li>
        ))}
      </ul>
    </section>
  );
}
