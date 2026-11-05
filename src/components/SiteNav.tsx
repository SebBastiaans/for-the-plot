import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, Globe2, Luggage, Plus, Trophy, UserRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useGroup } from "@/lib/group";
import { invitesQuery } from "@/lib/data";

const links = [
  { to: "/", label: "Globe", icon: Globe2 },
  { to: "/trips", label: "Trips", icon: Luggage },
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/upcoming", label: "Upcoming", icon: CalendarClock },
  { to: "/groups", label: "Groups", icon: Users },
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

  const signedIn = ready && !!session;
  const { data: invites = [] } = useQuery({ ...invitesQuery(session?.user.id), enabled: signedIn });
  const bell = (
    <Button asChild size="icon" variant="ghost" aria-label={`Inbox${invites.length ? `, ${invites.length} new` : ""}`} className="relative">
      <Link to="/inbox">
        <Bell className="h-5 w-5" />
        {invites.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{invites.length}</span>
        )}
      </Link>
    </Button>
  );

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center px-3 sm:top-3">
        <div className="pointer-events-auto flex h-14 w-full max-w-4xl items-center gap-3 rounded-full border border-border/70 bg-background/80 pl-2 pr-2 backdrop-blur-xl sm:gap-5 sm:pr-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sage text-primary-foreground">
              <Globe2 className="h-5 w-5" />
            </span>
            <span className="hidden min-[380px]:inline">For The Plot</span>
          </Link>
          <nav className="hidden gap-1 text-sm font-bold md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
                activeOptions={{ exact: true }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {signedIn ? (
              <>
                {(
                  <select
                    aria-label="Group"
                    value={groupId ?? ""}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="h-9 min-w-0 max-w-36 truncate rounded-full border border-input bg-background px-3 text-sm font-bold"
                  >
                    <option value="me">Just me</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}
                <Button asChild size="sm" className="hidden md:inline-flex">
                  <Link to="/trips/new"><Plus className="h-4 w-4" /> Add trip</Link>
                </Button>
                {bell}
                <Button asChild size="icon" variant="ghost" aria-label="Profile">
                  <Link to="/profile"><UserRound className="h-5 w-5" /></Link>
                </Button>
                <Button size="sm" variant="ghost" className="hidden md:inline-flex" onClick={signOut}>
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
      </header>

      {/* Mobile tab bar — thumbs first */}
      {signedIn && (
        <nav
          aria-label="Main"
          className="pb-safe pointer-events-none fixed inset-x-0 bottom-2 z-40 px-3 md:hidden"
        >
          <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-end rounded-full border border-border/70 bg-background/85 px-2 py-1.5 shadow-sticker backdrop-blur-xl">
            {links.slice(0, 2).map((l) => <TabLink key={l.to} {...l} />)}
            <Link
              to="/trips/new"
              aria-label="Add trip"
              className="mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-sticker transition-transform active:scale-90"
            >
              <Plus className="h-7 w-7" />
            </Link>
            {links.filter((l) => l.to === "/rankings" || l.to === "/groups").map((l) => <TabLink key={l.to} {...l} />)}
          </div>
        </nav>
      )}
    </>
  );
}

function TabLink({ to, label, icon: Icon }: (typeof links)[number]) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-bold text-muted-foreground"
      activeProps={{ className: "text-sage" }}
      activeOptions={{ exact: true }}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
