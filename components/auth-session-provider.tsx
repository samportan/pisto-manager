"use client";

import * as React from "react";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

type AuthSessionContextValue = {
  userId: string | null;
  sessionReady: boolean;
};

const AuthSessionContext = React.createContext<AuthSessionContextValue>({
  userId: null,
  sessionReady: false,
});

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
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

    void supabase.auth.getUser().then(({ data }) => {
      if (seq !== fetchSeq.current) return;
      setUserId(data.user?.id ?? null);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      fetchSeq.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const value = React.useMemo(
    () => ({ userId, sessionReady }),
    [userId, sessionReady]
  );

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  return React.useContext(AuthSessionContext);
}
