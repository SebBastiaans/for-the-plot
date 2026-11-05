import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Stop = Tables<"trip_stops">;
export type Media = Tables<"trip_media">;
export type Note = Tables<"trip_notes">;
export type TripCountry = { code: string; name: string };
export type Trip = Tables<"trips"> & {
  countries: TripCountry[];
  trip_stops: Stop[];
  trip_members: { user_id: string; status: string }[];
  trip_media: Media[];
  trip_notes: Note[];
};

export const MEDIA_BUCKET = "trip-media";

export const ME = "me";

/** Trips for a scope: a group id (trips that meet the group's rule) or "me" (my own and accepted trips). */
export const tripsQuery = (groupId: string | null) => queryOptions({
  queryKey: ["trips", groupId],
  enabled: !!groupId,
  queryFn: async (): Promise<Trip[]> => {
    let ids: string[];
    if (groupId === ME) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "";
      const [own, mem] = await Promise.all([
        supabase.from("trips").select("id").eq("created_by", uid),
        supabase.from("trip_members").select("trip_id").eq("user_id", uid).eq("status", "accepted"),
      ]);
      if (own.error) throw own.error;
      if (mem.error) throw mem.error;
      ids = [...new Set([...(own.data ?? []).map((r) => r.id), ...(mem.data ?? []).map((r) => r.trip_id)])];
    } else {
      const { data: rows, error: e } = await supabase.rpc("group_trip_ids", { _group: groupId! });
      if (e) throw e;
      ids = (rows ?? []) as string[];
    }
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("trips")
      .select("*, trip_stops(*), trip_members(user_id, status), trip_media(*), trip_notes(*), trip_countries(*)")
      .in("id", ids)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((t) => ({
      ...t,
      trip_stops: [...(t.trip_stops ?? [])].sort((a, b) => a.position - b.position),
      countries: t.trip_countries?.length
        ? [...t.trip_countries].sort((a, b) => a.position - b.position).map((c) => ({ code: c.country_code, name: c.country_name }))
        : [{ code: t.country_code, name: t.country_name }],
    })) as Trip[];
  },
});

/** Profiles of the members of a group, or for "me": everyone who shares any group with me (and me). */
export const profilesQuery = (groupId: string | null) => queryOptions({
  queryKey: ["profiles", groupId],
  enabled: !!groupId,
  queryFn: async (): Promise<Profile[]> => {
    let q = supabase.from("group_members").select("profiles(*)");
    if (groupId !== ME) q = q.eq("group_id", groupId!);
    const { data, error } = await q;
    if (error) throw error;
    const list = (data ?? []).map((r) => r.profiles as Profile | null).filter((p): p is Profile => !!p);
    if (groupId === ME) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user && !list.some((p) => p.id === u.user!.id)) {
        const { data: me } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
        if (me) list.push(me);
      }
    }
    return [...new Map(list.map((p) => [p.id, p])).values()]
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  },
});

export function useProfilesMap(groupId: string | null) {
  const { data = [] } = useQuery(profilesQuery(groupId));
  return Object.fromEntries(data.map((p) => [p.id, p])) as Record<string, Profile>;
}

/** Signed URLs for private media paths (valid 1 hour). */
export function useSignedUrls(paths: string[]) {
  const key = [...paths].sort();
  return useQuery({
    queryKey: ["signed", key],
    enabled: key.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(key, 3600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl])) as Record<string, string>;
    },
  });
}

export async function uploadMedia(userId: string, tripId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${tripId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return { path, type: file.type.startsWith("video") ? "video" : "photo" };
}

export type GeoResult = { name: string; lat: number; lng: number; kind?: string | undefined; region?: string | undefined };
export async function geocode(q: string, countryCode?: string): Promise<GeoResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  if (countryCode) url.searchParams.set("countrycodes", countryCode.toLowerCase());
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const json = (await res.json()) as { display_name: string; lat: string; lon: string; type?: string; addresstype?: string; address?: Record<string, string> }[];
  return json.map((r) => {
    const name = r.display_name.split(",")[0] ?? r.display_name;
    const a = r.address ?? {};
    const parts = [a["municipality"] ?? a["city"] ?? a["town"], a["county"], a["state_district"], a["province"] ?? a["state"], a["region"]]
      .filter((p): p is string => !!p && p !== name);
    const region = [...new Set(parts)].slice(0, 3).join(", ");
    const raw = (r.addresstype ?? r.type ?? "").replace(/_/g, " ");
    return { name, lat: Number(r.lat), lng: Number(r.lon), kind: raw && raw !== "yes" ? raw : undefined, region: region || undefined };
  });
}

export const AVATAR_BUCKET = "avatars";

/** Resolve stored avatar values (bucket paths or legacy links) to displayable URLs. */
export function useAvatarUrls(values: (string | null | undefined)[]) {
  const paths = [...new Set(values.filter((v): v is string => !!v && !/^https?:/.test(v)))].sort();
  const { data = {} } = useQuery({
    queryKey: ["avatar-signed", paths],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl])) as Record<string, string>;
    },
  });
  return (v: string | null | undefined) => (!v ? undefined : /^https?:/.test(v) ? v : data[v]);
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

/** People who took part: the creator plus everyone who accepted. */
export function participants(t: { created_by: string; trip_members: { user_id: string; status: string }[] }) {
  return [...new Set([t.created_by, ...t.trip_members.filter((m) => m.status === "accepted").map((m) => m.user_id)])];
}

export type Invite = { trip_id: string; invited_at: string; trips: { title: string; start_date: string; end_date: string; created_by: string } | null };
export const invitesQuery = (userId: string | undefined) => queryOptions({
  queryKey: ["invites", userId],
  enabled: !!userId,
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
  queryFn: async (): Promise<Invite[]> => {
    const { data, error } = await supabase.from("trip_members")
      .select("trip_id, invited_at, trips(title, start_date, end_date, created_by)")
      .eq("user_id", userId!).eq("status", "pending").order("invited_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Invite[];
  },
});
