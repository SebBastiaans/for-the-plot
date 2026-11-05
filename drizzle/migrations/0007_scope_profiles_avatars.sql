CREATE OR REPLACE FUNCTION public.can_see_profile(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.shares_group_with(_user)
    OR EXISTS (SELECT 1 FROM public.trips t WHERE t.created_by = _user AND public.can_see_trip(t.id))
    OR EXISTS (SELECT 1 FROM public.trip_members m WHERE m.user_id = _user AND public.can_see_trip(m.trip_id)))
$$;
DROP POLICY "profiles read" ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (public.can_see_profile(id));
DROP POLICY "avatars read" ON storage.objects;
CREATE POLICY "avatars read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND public.can_see_profile(((storage.foldername(name))[1])::uuid));