import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, loading };
}

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<"admin" | "user" | null>(null);

  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRole((data?.role as "admin" | "user") ?? "user"));
  }, [user]);

  return { role, isAdmin: role === "admin" };
}
