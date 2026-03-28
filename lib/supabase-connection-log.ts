let logged = false;

export function logSupabaseConnectionOnce(ok: boolean, detail?: string) {
  if (logged) return;
  logged = true;
  if (ok) {
    console.log("[Supabase] Connected successfully");
  } else {
    console.error("[Supabase] Connection failed", detail ?? "");
  }
}
