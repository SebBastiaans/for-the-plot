import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, ImageIcon, MapPin } from "lucide-react";
import { participants, type Trip } from "@/lib/data";
import { isUpcoming, todayISO, tripDays } from "@/lib/stats";
import { flagEmoji } from "@/lib/countries";

/** One tappable trip card, shared by My trips and group pages. */
export function TripRow({ trip: t, profiles }: { trip: Trip; profiles: Record<string, { display_name: string } | undefined> }) {
  const people = participants(t).map((id) => profiles[id]?.display_name).filter(Boolean);
  return (
    <li>
      <Link to="/trips/$id" params={{ id: t.id }}
        className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 shadow-sticker transition-transform active:scale-[0.99]">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl">{t.title}</h2>
            {isUpcoming(t, todayISO()) && <span className="rounded-full bg-planned px-2 py-0.5 text-xs font-semibold text-planned-foreground">Upcoming</span>}
          </div>
          <p className="mt-1 truncate text-sm">{t.countries.map((c) => `${flagEmoji(c.code)} ${c.name}`).join("  ")}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{t.start_date} → {t.end_date} · {tripDays(t.start_date, t.end_date)} days</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.trip_stops.length} places</span>
            <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{t.trip_media.length}</span>
          </p>
          {people.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">With {people.join(", ")}</p>}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
