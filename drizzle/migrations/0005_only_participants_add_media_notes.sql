CREATE OR REPLACE FUNCTION public.is_trip_participant(_trip uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips WHERE id = _trip AND created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = _trip AND user_id = auth.uid() AND status = 'accepted')
$$;
GRANT EXECUTE ON FUNCTION public.is_trip_participant(uuid) TO authenticated;
DROP POLICY IF EXISTS "media insert" ON public.trip_media;
CREATE POLICY "media insert" ON public.trip_media FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.is_trip_participant(trip_id));
DROP POLICY IF EXISTS "notes insert" ON public.trip_notes;
CREATE POLICY "notes insert" ON public.trip_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.is_trip_participant(trip_id));