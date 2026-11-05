import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Stop = Tables<"trip_stops">;
export type Media = Tables<"trip_media">;
export type Note = Tables<"trip_notes">;
export type Trip = Tables<"trips"> & {
  trip_stops: Stop[];
  trip_members: { user_id: string }[];
  trip_media: Media[];
  trip_notes: Note[];
};

export const MEDIA_BUCKET = "trip-media";

export const tripsQuery = (groupId: string | null) => queryOptions({
  queryKey: ["trips", groupId],
  enabled: !!groupId,
  queryFn: async (): Promise<Trip[]> => {
    const { data, error } = await supabase
      .from("trips")
      .select("*, trip_stops(*), trip_members(user_id), trip_media(*), trip_notes(*)")
      .eq("group_id", groupId!)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((t) => ({
      ...t,
      trip_stops: [...(t.trip_stops ?? [])].sort((a, b) => a.position - b.position),
    })) as Trip[];
  },
});

/** Profiles of the members of a group. */
export const profilesQuery = (groupId: string | null) => queryOptions({
  queryKey: ["profiles", groupId],
  enabled: !!groupId,
  queryFn: async (): Promise<Profile[]> => {
    const { data, error } = await supabase.from("group_members").select("profiles(*)").eq("group_id", groupId!);
    if (error) throw error;
    return (data ?? [])
      .map((r) => r.profiles as Profile | null)
      .filter((p): p is Profile => !!p)
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

export type GeoResult = { name: string; lat: number; lng: number };
export async function geocode(q: string, countryCode?: string): Promise<GeoResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "5");
  if (countryCode) url.searchParams.set("countrycodes", countryCode.toLowerCase());
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const json = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return json.map((r) => ({ name: r.display_name.split(",")[0] ?? r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}
