"use client";

import * as React from "react";
import { createClient } from "@/lib/client";
import { getProfile, type Profile } from "@/lib/db/profile";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export type UseProfileResult = {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const fetchSeq = React.useRef(0);

  const loadForUser = React.useCallback(async (userId: string | null) => {
    const seq = ++fetchSeq.current;

    if (!userId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getProfile(userId);
      if (seq !== fetchSeq.current) return;
      setProfile(data);
      setError(null);
    } catch (e) {
      if (seq !== fetchSeq.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (seq === fetchSeq.current) {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void loadForUser(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadForUser(session?.user?.id ?? null);
    });

    return () => {
      fetchSeq.current += 1;
      subscription.unsubscribe();
    };
  }, [loadForUser]);

  const refetch = React.useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await loadForUser(session?.user?.id ?? null);
  }, [loadForUser]);

  return { profile, isLoading, error, refetch };
}

export type { Profile };
