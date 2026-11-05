ALTER TABLE public.trip_members ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined'));
ALTER TABLE public.trip_members ADD COLUMN invited_at timestamptz NOT NULL DEFAULT now();
UPDATE public.trip_members SET status = 'accepted';
INSERT INTO public.trip_members (trip_id, user_id, status)
  SELECT t.id, t.created_by, 'accepted' FROM public.trips t
  WHERE NOT EXISTS (SELECT 1 FROM public.trip_members m WHERE m.trip_id = t.id AND m.user_id = t.created_by);

ALTER TABLE public.groups ADD COLUMN rule_type text NOT NULL DEFAULT 'all' CHECK (rule_type IN ('all','count','percent'));
ALTER TABLE public.groups ADD COLUMN rule_value integer NOT NULL DEFAULT 100 CHECK (rule_value >= 1);
COMMENT ON COLUMN public.trips.group_id IS 'DEPRECATED: trips belong to users; groups pick trips by rule';

-- Status on insert: creator or self-join is accepted, everyone else invited (pending)
CREATE OR REPLACE FUNCTION public.trip_member_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id = auth.uid() OR NEW.user_id = (SELECT created_by FROM public.trips WHERE id = NEW.trip_id) THEN
    NEW.status := 'accepted';
  ELSE
    NEW.status := 'pending';
  END IF;
  NEW.invited_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trip_member_status BEFORE INSERT ON public.trip_members FOR EACH ROW EXECUTE FUNCTION public.trip_member_status();

CREATE OR REPLACE FUNCTION public.trip_counts_for_group(_trip uuid, _group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH g AS (SELECT rule_type, rule_value FROM public.groups WHERE id = _group),
  size AS (SELECT count(*)::int AS n FROM public.group_members WHERE group_id = _group),
  part AS (
    SELECT count(DISTINCT gm.user_id)::int AS n FROM public.group_members gm
    WHERE gm.group_id = _group AND (
      gm.user_id = (SELECT created_by FROM public.trips WHERE id = _trip)
      OR EXISTS (SELECT 1 FROM public.trip_members m WHERE m.trip_id = _trip AND m.user_id = gm.user_id AND m.status = 'accepted'))
  )
  SELECT COALESCE((SELECT CASE g.rule_type
    WHEN 'all' THEN part.n = size.n
    WHEN 'count' THEN part.n >= LEAST(g.rule_value, size.n)
    ELSE part.n * 100 >= g.rule_value * size.n END
    FROM g, size, part WHERE part.n > 0), false)
$$;

CREATE OR REPLACE FUNCTION public.group_trip_ids(_group uuid) RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id FROM public.trips t
  WHERE public.is_group_member(_group) AND public.trip_counts_for_group(t.id, _group)
$$;

CREATE OR REPLACE FUNCTION public.can_see_trip(_trip uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips WHERE id = _trip AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = _trip AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.user_id = auth.uid() AND public.trip_counts_for_group(_trip, gm.group_id))
$$;

CREATE OR REPLACE FUNCTION public.shares_group_with(_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members a JOIN public.group_members b ON a.group_id = b.group_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.respond_to_trip(_trip uuid, _accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _accept THEN
    UPDATE public.trip_members SET status = 'accepted' WHERE trip_id = _trip AND user_id = auth.uid();
  ELSE
    DELETE FROM public.trip_members WHERE trip_id = _trip AND user_id = auth.uid();
  END IF;
END $$;

DROP POLICY IF EXISTS "trips read" ON public.trips;
DROP POLICY IF EXISTS "trips insert" ON public.trips;
CREATE POLICY "trips read" ON public.trips FOR SELECT TO authenticated USING (public.can_see_trip(id));
CREATE POLICY "trips insert" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "members insert" ON public.trip_members;
CREATE POLICY "members insert" ON public.trip_members FOR INSERT TO authenticated WITH CHECK (
  public.is_trip_owner(trip_id) AND public.shares_group_with(user_id)
  OR (user_id = auth.uid() AND public.can_see_trip(trip_id)));

GRANT EXECUTE ON FUNCTION public.group_trip_ids(uuid), public.respond_to_trip(uuid, boolean), public.trip_counts_for_group(uuid, uuid), public.shares_group_with(uuid) TO authenticated;