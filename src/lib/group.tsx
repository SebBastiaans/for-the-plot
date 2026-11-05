import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export type Group = Tables<"groups">;
const KEY = "crossed-off:group";

export const myGroupsQuery = queryOptions({
  queryKey: ["groups"],
  queryFn: async (): Promise<Group[]> => {
    const { data, error } = await supabase.from("groups").select("*").order("created_at");
    if (error) throw error;
    return data ?? [];
  },
});

type GroupState = { groups: Group[]; group: Group | null; groupId: string | null; loading: boolean; setGroupId: (id: string) => void };
const Ctx = createContext<GroupState>({ groups: [], group: null, groupId: null, loading: true, setGroupId: () => {} });

export function GroupProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const { data: groups = [], isLoading } = useQuery({ ...myGroupsQuery, enabled: !!session });
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    setStored(localStorage.getItem(KEY));
  }, []);

  const group = groups.find((g) => g.id === stored) ?? groups[0] ?? null;
  const setGroupId = (id: string) => {
    localStorage.setItem(KEY, id);
    setStored(id);
  };

  return (
    <Ctx.Provider value={{ groups, group, groupId: group?.id ?? null, loading: !ready || (!!session && isLoading), setGroupId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGroup() {
  return useContext(Ctx);
}

export function NeedGroup() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      <p className="eyebrow">No group yet</p>
      <h2 className="mt-2 text-2xl">Start or join a crew</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create a group and share the invite link, or open an invite link a friend sent you.</p>
      <Button asChild className="mt-5"><Link to="/groups">Create a group</Link></Button>
    </div>
  );
}
