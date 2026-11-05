DROP POLICY IF EXISTS "trips read" ON public.trips;
CREATE POLICY "trips read" ON public.trips FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.can_see_trip(id));