import { getCountry } from "./countries";

export type StatTrip = {
  id: string;
  country_code: string;
  country_name: string;
  start_date: string;
  end_date: string;
  stops: { name: string }[];
  members: string[];
  media: { media_type: string; uploaded_by: string }[];
};

export function tripDays(start: string, end: string): number {
  const ms = new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** A trip counts as visited once it has started (start date on or before today). */
export function isUpcoming(trip: { start_date: string }, today: string): boolean {
  return trip.start_date > today;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export type Ranked = { key: string; label: string; value: number };

function rank(map: Map<string, { label: string; value: number }>): Ranked[] {
  return [...map.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function computeStats(trips: StatTrip[], names: Record<string, string>, today: string) {
  const past = trips.filter((t) => !isUpcoming(t, today));
  const countries = new Map<string, { label: string; value: number }>();
  const cities = new Map<string, { label: string; value: number }>();
  const friendCountries = new Map<string, Set<string>>();
  const friendContinents = new Map<string, Set<string>>();
  const friendDays = new Map<string, number>();
  const friendMedia = new Map<string, number>();
  const years = new Map<string, { label: string; value: number }>();
  const continents = new Set<string>();

  for (const t of past) {
    const c = countries.get(t.country_code) ?? { label: t.country_name, value: 0 };
    c.value++;
    countries.set(t.country_code, c);
    const continent = getCountry(t.country_code)?.continent;
    if (continent) continents.add(continent);
    for (const s of t.stops) {
      const k = s.name.toLowerCase();
      const e = cities.get(k) ?? { label: s.name, value: 0 };
      e.value++;
      cities.set(k, e);
    }
    const y = t.start_date.slice(0, 4);
    const ye = years.get(y) ?? { label: y, value: 0 };
    ye.value++;
    years.set(y, ye);
    const days = tripDays(t.start_date, t.end_date);
    for (const m of t.members) {
      if (!friendCountries.has(m)) friendCountries.set(m, new Set());
      friendCountries.get(m)!.add(t.country_code);
      if (continent) {
        if (!friendContinents.has(m)) friendContinents.set(m, new Set());
        friendContinents.get(m)!.add(continent);
      }
      friendDays.set(m, (friendDays.get(m) ?? 0) + days);
    }
    for (const md of t.media) friendMedia.set(md.uploaded_by, (friendMedia.get(md.uploaded_by) ?? 0) + 1);
  }

  const byFriend = (src: Map<string, number>) =>
    rank(new Map([...src].map(([id, v]) => [id, { label: names[id] ?? "Unknown", value: v }])));

  return {
    totalTrips: past.length,
    totalCountries: countries.size,
    totalContinents: continents.size,
    topCountries: rank(countries),
    topCities: rank(cities),
    friendsByCountries: byFriend(new Map([...friendCountries].map(([k, s]) => [k, s.size]))),
    friendsByContinents: byFriend(new Map([...friendContinents].map(([k, s]) => [k, s.size]))),
    friendsByDays: byFriend(friendDays),
    friendsByMedia: byFriend(friendMedia),
    tripsPerYear: rank(years).sort((a, b) => a.key.localeCompare(b.key)),
  };
}
