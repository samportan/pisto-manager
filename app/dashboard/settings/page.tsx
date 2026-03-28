import type { Metadata } from "next";
import { createClient } from "@/lib/server";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import { SettingsProfilePreferences } from "@/components/settings-profile-preferences";

export const metadata: Metadata = {
  title: "Settings",
  description: "Profile and preferences",
};

function initialsFromEmail(email: string | null) {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return local.slice(0, 2).toUpperCase() || "?";
}

export default async function SettingsPage() {
  let email: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  const initials = initialsFromEmail(email);

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile and preferences.
        </p>

        <SettingsProfilePreferences email={email} initials={initials} />
      </div>
    </div>
  );
}
