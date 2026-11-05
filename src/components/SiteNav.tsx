import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Globe2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useGroup } from "@/lib/group";

const links = [
  { to: "/", label: "Globe" },
  { to: "/rankings", label: "Rankings" },
  { to: "/upcoming", label: "Upcoming" },
  { to: "/groups", label: "Groups" },
] as const;

export function SiteNav() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { groups, groupId, setGroupId } = useGroup();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg">
          <Globe2 className="h-5 w-5 text-sage" />
          Crossed Off
        </Link>
        <nav className="hidden gap-5 text-sm sm:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {ready && session ? (
            <>
              {groups.length > 0 && (
                <select
                  aria-label="Group"
                  value={groupId ?? ""}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="h-8 max-w-40 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <Button asChild size="sm">
                <Link to="/trips/new">
                  <Plus className="h-4 w-4" /> Add trip
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/profile">Profile</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : ready ? (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <nav className="flex justify-center gap-5 pb-2 text-sm sm:hidden">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="text-muted-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
