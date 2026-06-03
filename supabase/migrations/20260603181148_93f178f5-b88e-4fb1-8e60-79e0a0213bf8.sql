-- Restore EXECUTE on has_role for authenticated users.
-- This function is intentionally callable by signed-in users because it is
-- referenced by RLS policies on tccs, storage.objects, and user_roles.
-- Without EXECUTE, those policies evaluate to false and admins/owners cannot
-- see their own data.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;