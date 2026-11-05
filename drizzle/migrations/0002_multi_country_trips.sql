CREATE TABLE public.trip_countries (
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  country_name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (trip_id, country_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_countries TO authenticated;
GRANT ALL ON public.trip_countries TO service_role;
ALTER TABLE public.trip_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries read" ON public.trip_countries FOR SELECT TO authenticated USING (public.can_see_trip(trip_id));
CREATE POLICY "countries write" ON public.trip_countries FOR ALL TO authenticated USING (public.is_trip_owner(trip_id)) WITH CHECK (public.is_trip_owner(trip_id));
INSERT INTO public.trip_countries (trip_id, country_code, country_name, position) SELECT id, country_code, country_name, 0 FROM public.trips;
ALTER TABLE public.trip_stops ADD COLUMN country_code text, ADD COLUMN arrived_on date, ADD COLUMN left_on date;
UPDATE public.trip_stops s SET country_code = t.country_code FROM public.trips t WHERE t.id = s.trip_id;
COMMENT ON COLUMN public.trips.country_code IS 'DEPRECATED: first country only; see trip_countries';
COMMENT ON COLUMN public.trips.country_name IS 'DEPRECATED: first country only; see trip_countries';
CREATE POLICY "avatars read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);