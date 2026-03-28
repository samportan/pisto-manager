import { createClient } from "../client";

export type Profile = {
  id: string;
  first_name: string | null;
  base_currency: string | null;
  theme_preference: string | null;
  created_at: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}
