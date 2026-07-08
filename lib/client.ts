import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '@/lib/supabase-config'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).'
    )
  }
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!)
  }
  return browserClient
}
