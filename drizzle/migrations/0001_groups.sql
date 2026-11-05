CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
GRANT SELECT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_group_owner(_group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = _group AND created_by = auth.uid())
$$;

CREATE POLICY "groups read" ON public.groups FOR SELECT TO authenticated USING (public.is_group_member(id));
CREATE POLICY "groups update" ON public.groups FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "groups delete" ON public.groups FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "gm read" ON public.group_members FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "gm delete" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_owner(group_id));

CREATE OR REPLACE FUNCTION public.create_group(_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  INSERT INTO public.groups (name, created_by) VALUES (_name, auth.uid()) RETURNING id INTO gid;
  INSERT INTO public.group_members (group_id, user_id) VALUES (gid, auth.uid());
  RETURN gid;
END; $$;
CREATE OR REPLACE FUNCTION public.join_group(_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT id INTO gid FROM public.groups WHERE invite_code = _code;
  IF gid IS NULL THEN RAISE EXCEPTION 'invalid invite'; END IF;
  INSERT INTO public.group_members (group_id, user_id) VALUES (gid, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN gid;
END; $$;
CREATE OR REPLACE FUNCTION public.group_name_for_invite(_code text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name FROM public.groups WHERE invite_code = _code
$$;
REVOKE EXECUTE ON FUNCTION public.create_group(text), public.join_group(text), public.group_name_for_invite(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_group(text), public.join_group(text), public.group_name_for_invite(text) TO authenticated;

ALTER TABLE public.trips ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

-- backfill: one starter group per existing trip creator
INSERT INTO public.groups (name, created_by) SELECT DISTINCT 'My crew', created_by FROM public.trips;
INSERT INTO public.group_members (group_id, user_id) SELECT id, created_by FROM public.groups ON CONFLICT DO NOTHING;
UPDATE public.trips t SET group_id = g.id FROM public.groups g WHERE g.created_by = t.created_by AND t.group_id IS NULL;

CREATE OR REPLACE FUNCTION public.can_see_trip(_trip uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips t JOIN public.group_members gm ON gm.group_id = t.group_id
                 WHERE t.id = _trip AND gm.user_id = auth.uid())
$$;

DROP POLICY "trips read" ON public.trips;
DROP POLICY "trips insert" ON public.trips;
CREATE POLICY "trips read" ON public.trips FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "trips insert" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND public.is_group_member(group_id));
DROP POLICY "stops read" ON public.trip_stops;
CREATE POLICY "stops read" ON public.trip_stops FOR SELECT TO authenticated USING (public.can_see_trip(trip_id));
DROP POLICY "members read" ON public.trip_members;
DROP POLICY "members insert" ON public.trip_members;
CREATE POLICY "members read" ON public.trip_members FOR SELECT TO authenticated USING (public.can_see_trip(trip_id));
CREATE POLICY "members insert" ON public.trip_members FOR INSERT TO authenticated WITH CHECK (public.can_see_trip(trip_id) AND (public.is_trip_owner(trip_id) OR user_id = auth.uid()));
DROP POLICY "media read" ON public.trip_media;
DROP POLICY "media insert" ON public.trip_media;
CREATE POLICY "media read" ON public.trip_media FOR SELECT TO authenticated USING (public.can_see_trip(trip_id));
CREATE POLICY "media insert" ON public.trip_media FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.can_see_trip(trip_id));
DROP POLICY "notes read" ON public.trip_notes;
DROP POLICY "notes insert" ON public.trip_notes;
CREATE POLICY "notes read" ON public.trip_notes FOR SELECT TO authenticated USING (public.can_see_trip(trip_id));
CREATE POLICY "notes insert" ON public.trip_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.can_see_trip(trip_id));

DROP POLICY "media objects read" ON storage.objects;
CREATE POLICY "media objects read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'trip-media' AND EXISTS (SELECT 1 FROM public.trip_media m WHERE m.storage_path = name AND public.can_see_trip(m.trip_id))
);