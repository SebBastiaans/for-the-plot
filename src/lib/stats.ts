import { getCountry } from "./countries";

export type StatTrip = {
  id: string;
  countries: { code: string; name: string }[];
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
    const tripContinents = new Set<string>();
    for (const tc of t.countries) {
      const c = countries.get(tc.code) ?? { label: tc.name, value: 0 };
      c.value++;
      countries.set(tc.code, c);
      const continent = getCountry(tc.code)?.continent;
      if (continent) { continents.add(continent); tripContinents.add(continent); }
    }
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
      for (const tc of t.countries) friendCountries.get(m)!.add(tc.code);
      if (!friendContinents.has(m)) friendContinents.set(m, new Set());
      for (const ct of tripContinents) friendContinents.get(m)!.add(ct);
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

/** A stop's own dates are optional, but when set they must fall inside the trip and arrive before leaving. */
export function stopDatesError(
  trip: { start_date: string; end_date: string },
  stop: { arrived_on?: string | null; left_on?: string | null },
): string | null {
  const { arrived_on: a, left_on: l } = stop;
  if (a && (a < trip.start_date || a > trip.end_date)) return "Arrival must be within the trip dates";
  if (l && (l < trip.start_date || l > trip.end_date)) return "Departure must be within the trip dates";
  if (a && l && l < a) return "Departure must be after arrival";
  return null;
}

export type GroupRule = { rule_type: string; rule_value: number };
/** Does a trip count for a group? `present` = group members who took part, `size` = group size. Mirrors SQL trip_counts_for_group. */
export function qualifiesForGroup(rule: GroupRule, present: number, size: number): boolean {
  if (present <= 0 || size <= 0) return false;
  if (rule.rule_type === "all") return present >= size;
  if (rule.rule_type === "count") return present >= Math.min(rule.rule_value, size);
  return present * 100 >= rule.rule_value * size;
}
