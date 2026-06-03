import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (uid: string | undefined) => {
      if (!uid) { if (mounted) setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (mounted) setIsAdmin(!!data?.some((r) => r.role === "admin"));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setTimeout(() => loadRole(session?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadRole(session?.user?.id).finally(() => mounted && setLoading(false));
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return { user, isAdmin, loading };
}