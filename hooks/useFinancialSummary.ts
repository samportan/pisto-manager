"use client";

import * as React from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/client";
import {
  fetchUserFinancialSummary,
  financialSummaryKeys,
} from "@/lib/financial-summary";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export function useFinancialSummary() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [sessionReady, setSessionReady] = React.useState(false);
  const fetchSeq = React.useRef(0);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSessionReady(true);
      return;
    }

    const supabase = createClient();
    const seq = ++fetchSeq.current;

    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (seq !== fetchSeq.current) return;
      setUserId(data.session?.user?.id ?? null);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      fetchSeq.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const enabled =
    isSupabaseConfigured() && sessionReady && userId !== null;

  const query = useQuery({
    queryKey: userId ? financialSummaryKeys.all(userId) : ["financial-summary", "idle"],
    queryFn: fetchUserFinancialSummary,
    enabled,
    staleTime: 30_000,
  });

  const isLoading =
    !sessionReady || (enabled && query.isLoading);

  return {
    summary: query.data ?? null,
    isLoading,
    isSessionReady: sessionReady,
    userId,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
