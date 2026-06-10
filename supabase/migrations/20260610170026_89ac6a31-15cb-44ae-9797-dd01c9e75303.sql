
CREATE OR REPLACE FUNCTION public.prevent_non_admin_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can change TCC status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tccs_prevent_status_change ON public.tccs;
CREATE TRIGGER tccs_prevent_status_change
BEFORE UPDATE ON public.tccs
FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_status_change();
