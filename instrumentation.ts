export async function register() {
  if (process.env.NODE_ENV !== "development") return;

  const { isSupabaseConfigured } = await import("@/lib/supabase-config");

  if (isSupabaseConfigured()) {
    console.log(
      "[Supabase] Env loaded: URL + anon key found. Auth check runs on first navigation (middleware + browser)."
    );
  } else {
    console.warn(
      "[Supabase] Not configured: add NEXT_PUBLIC_SUPABASE_URL and a public key (NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)."
    );
  }
}
