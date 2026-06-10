
ALTER TABLE public.tccs ADD COLUMN IF NOT EXISTS recommended boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_non_staff_recommend_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.recommended IS DISTINCT FROM OLD.recommended
     AND NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.has_role(auth.uid(), 'teacher'::public.app_role)) THEN
    RAISE EXCEPTION 'Only teachers or admins can change recommendation' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tccs_prevent_recommend_change ON public.tccs;
CREATE TRIGGER tccs_prevent_recommend_change
BEFORE UPDATE ON public.tccs
FOR EACH ROW EXECUTE FUNCTION public.prevent_non_staff_recommend_change();

DROP POLICY IF EXISTS "Owner or admin update" ON public.tccs;
CREATE POLICY "Owner admin or teacher update"
ON public.tccs FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'teacher'::public.app_role)
);

CREATE TABLE IF NOT EXISTS public.tcc_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tcc_id uuid NOT NULL REFERENCES public.tccs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tcc_id, user_id)
);

GRANT SELECT ON public.tcc_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tcc_ratings TO authenticated;
GRANT ALL ON public.tcc_ratings TO service_role;

ALTER TABLE public.tcc_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are public"
ON public.tcc_ratings FOR SELECT
USING (true);

CREATE POLICY "Users insert own rating"
ON public.tcc_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rating"
ON public.tcc_ratings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own rating"
ON public.tcc_ratings FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER tcc_ratings_updated_at
BEFORE UPDATE ON public.tcc_ratings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
