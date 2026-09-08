import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

/** Client-side session state. Use only inside client-rendered trees. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, loading };
}

export const meQueryKey = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.rpc("ensure_profile");
      if (error) throw error;
      return data as Profile;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: meQueryKey });
}
