import { createClient } from "../client";

export type Profile = {
  id: string;
  first_name: string | null;
  base_currency: string | null;
  theme_preference: string | null;
  locale: string | null;
  created_at: string;
};

export type ProfileUpdate = Partial<
  Pick<Profile, "first_name" | "base_currency" | "theme_preference" | "locale">
>;

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

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}
