DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Read tcc pdfs: owner, admin, or approved" ON storage.objects;
CREATE POLICY "Read tcc pdfs: owner or staff" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tcc-pdfs' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
));