-- Tighten update policy: owners (students) may only edit their own non-approved TCCs
DROP POLICY IF EXISTS "Owner admin or teacher update" ON public.tccs;

CREATE POLICY "Owner admin or teacher update"
ON public.tccs
FOR UPDATE
USING (
  ((auth.uid() = user_id) AND status = ANY (ARRAY['pending'::tcc_status, 'rejected'::tcc_status]))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
)
WITH CHECK (
  ((auth.uid() = user_id) AND status = ANY (ARRAY['pending'::tcc_status, 'rejected'::tcc_status]))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
);

-- Prevent anyone but admins from changing ownership, and block field edits on approved rows by non-admins
CREATE OR REPLACE FUNCTION public.protect_sensitive_tcc_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
  is_teacher boolean := public.has_role(auth.uid(), 'teacher'::public.app_role);
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can change TCC ownership' USING ERRCODE = '42501';
  END IF;

  IF OLD.status = 'approved'::tcc_status AND NOT (is_admin OR is_teacher) THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.abstract IS DISTINCT FROM OLD.abstract
       OR NEW.year IS DISTINCT FROM OLD.year
       OR NEW.area IS DISTINCT FROM OLD.area
       OR NEW.authors IS DISTINCT FROM OLD.authors
       OR NEW.advisor IS DISTINCT FROM OLD.advisor
       OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path THEN
      RAISE EXCEPTION 'Approved TCCs can only be edited by staff' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_sensitive_tcc_fields() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS tccs_protect_sensitive_fields ON public.tccs;
CREATE TRIGGER tccs_protect_sensitive_fields
BEFORE UPDATE ON public.tccs
FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_tcc_fields();