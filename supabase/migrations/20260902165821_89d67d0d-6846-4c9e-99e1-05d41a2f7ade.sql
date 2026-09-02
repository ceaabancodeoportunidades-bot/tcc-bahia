-- 1) keywords + rejection reason
ALTER TABLE public.tccs
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS tccs_keywords_idx ON public.tccs USING GIN (keywords);

-- 2) only staff can set/alter rejection_reason
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

  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason AND NOT (is_admin OR is_teacher) THEN
    RAISE EXCEPTION 'Only staff can change the rejection reason' USING ERRCODE = '42501';
  END IF;

  IF OLD.status = 'approved'::tcc_status AND NOT (is_admin OR is_teacher) THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.abstract IS DISTINCT FROM OLD.abstract
       OR NEW.year IS DISTINCT FROM OLD.year
       OR NEW.area IS DISTINCT FROM OLD.area
       OR NEW.authors IS DISTINCT FROM OLD.authors
       OR NEW.advisor IS DISTINCT FROM OLD.advisor
       OR NEW.keywords IS DISTINCT FROM OLD.keywords
       OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path THEN
      RAISE EXCEPTION 'Approved TCCs can only be edited by staff' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) authors cannot rate their own TCC
CREATE OR REPLACE FUNCTION public.prevent_self_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tccs WHERE id = NEW.tcc_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Authors cannot rate their own TCC' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_self_rating() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tcc_ratings_prevent_self_rating ON public.tcc_ratings;
CREATE TRIGGER tcc_ratings_prevent_self_rating
BEFORE INSERT OR UPDATE ON public.tcc_ratings
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_rating();