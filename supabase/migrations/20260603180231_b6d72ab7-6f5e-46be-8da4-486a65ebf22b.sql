
-- Tighten tcc-pdfs read policy: only owner, admin, or files of approved TCCs
DROP POLICY IF EXISTS "Anyone can read tcc pdfs" ON storage.objects;

CREATE POLICY "Read tcc pdfs: owner, admin, or approved"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tcc-pdfs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tccs t
      WHERE t.pdf_path = storage.objects.name
        AND t.status = 'approved'
    )
  )
);

-- Lock down user_roles writes: only admins (or service_role bypassing RLS)
CREATE POLICY "Admins insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict has_role EXECUTE to backend/system roles (still callable from RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
