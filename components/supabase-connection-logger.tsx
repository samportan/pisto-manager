"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export function SupabaseConnectionLogger() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    if (process.env.NODE_ENV === "development" && !isSupabaseConfigured()) {
      console.warn(
        "[Supabase] Browser: env not visible — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart dev."
      );
      return;
    }

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    void supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error("[Supabase] Browser session check failed:", error.message);
      } else {
        console.log("[Supabase] Connected successfully (browser → Auth API)");
      }
    });
  }, []);

  return null;
}
