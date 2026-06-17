
-- 1) Ratings privacy: drop public SELECT, allow only own rows; expose aggregate via a view
DROP POLICY IF EXISTS "Ratings are public" ON public.tcc_ratings;
CREATE POLICY "Users view own ratings" ON public.tcc_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.tcc_rating_stats
WITH (security_invoker = true) AS
SELECT tcc_id,
       AVG(rating)::numeric(10,2) AS avg_rating,
       COUNT(*)::int AS rating_count
FROM public.tcc_ratings
GROUP BY tcc_id;

GRANT SELECT ON public.tcc_rating_stats TO anon, authenticated;

-- The view aggregates without exposing user_id. Underlying RLS on tcc_ratings
-- with security_invoker would normally filter to own rows, so for public aggregates
-- we wrap with a SECURITY DEFINER function exposing only aggregate data.
DROP VIEW public.tcc_rating_stats;

CREATE OR REPLACE FUNCTION public.get_tcc_rating_stats()
RETURNS TABLE(tcc_id uuid, avg_rating numeric, rating_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tcc_id, AVG(rating)::numeric(10,2), COUNT(*)::int
  FROM public.tcc_ratings
  GROUP BY tcc_id;
$$;

REVOKE ALL ON FUNCTION public.get_tcc_rating_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tcc_rating_stats() TO anon, authenticated;

-- 2) TCC update policy: prevent status self-approval and edits to approved TCCs by owner
DROP POLICY IF EXISTS "Owner admin or teacher update" ON public.tccs;
CREATE POLICY "Owner admin or teacher update" ON public.tccs
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
  WITH CHECK (
    (auth.uid() = user_id AND status IN ('pending'::public.tcc_status, 'rejected'::public.tcc_status))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- Existing prevent_non_admin_status_change trigger still blocks status changes from non-admins.
-- Ensure trigger is attached:
DROP TRIGGER IF EXISTS prevent_non_admin_status_change_trg ON public.tccs;
CREATE TRIGGER prevent_non_admin_status_change_trg
BEFORE UPDATE ON public.tccs
FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_status_change();

DROP TRIGGER IF EXISTS prevent_non_staff_recommend_change_trg ON public.tccs;
CREATE TRIGGER prevent_non_staff_recommend_change_trg
BEFORE UPDATE ON public.tccs
FOR EACH ROW EXECUTE FUNCTION public.prevent_non_staff_recommend_change();

-- 3) Revoke EXECUTE on internal SECURITY DEFINER trigger functions from regular users
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_non_admin_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_non_staff_recommend_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
