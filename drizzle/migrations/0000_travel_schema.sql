CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Traveler',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1), 'Traveler'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  story text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips read" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "trips insert" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "trips update" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "trips delete" ON public.trips FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.is_trip_owner(_trip uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips WHERE id = _trip AND created_by = auth.uid())
$$;

CREATE TABLE public.trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  position int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_stops TO authenticated;
GRANT ALL ON public.trip_stops TO service_role;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops read" ON public.trip_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "stops write" ON public.trip_stops FOR ALL TO authenticated USING (public.is_trip_owner(trip_id)) WITH CHECK (public.is_trip_owner(trip_id));

CREATE TABLE public.trip_members (
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.trip_members TO authenticated;
GRANT ALL ON public.trip_members TO service_role;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read" ON public.trip_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members insert" ON public.trip_members FOR INSERT TO authenticated WITH CHECK (public.is_trip_owner(trip_id) OR user_id = auth.uid());
CREATE POLICY "members delete" ON public.trip_members FOR DELETE TO authenticated USING (public.is_trip_owner(trip_id) OR user_id = auth.uid());

CREATE TABLE public.trip_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.trip_stops(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo',
  caption text,
  taken_at timestamptz,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_media TO authenticated;
GRANT ALL ON public.trip_media TO service_role;
ALTER TABLE public.trip_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media read" ON public.trip_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "media insert" ON public.trip_media FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "media update" ON public.trip_media FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR public.is_trip_owner(trip_id));
CREATE POLICY "media delete" ON public.trip_media FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.is_trip_owner(trip_id));

CREATE TABLE public.trip_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.trip_stops(id) ON DELETE SET NULL,
  body text NOT NULL,
  happened_at timestamptz,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_notes TO authenticated;
GRANT ALL ON public.trip_notes TO service_role;
ALTER TABLE public.trip_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes read" ON public.trip_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes insert" ON public.trip_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes delete" ON public.trip_notes FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_trip_owner(trip_id));

CREATE POLICY "media objects read" ON storage.objects FOR SELECT USING (bucket_id = 'trip-media');
CREATE POLICY "media objects upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trip-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media objects delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trip-media' AND (storage.foldername(name))[1] = auth.uid()::text);