import type { Metadata } from "next";
import { createClient } from "@/lib/server";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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

  const display = email ?? "Not signed in (configure Supabase)";
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

        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 bg-primary/20 text-primary">
              <AvatarFallback className="text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{display}</p>
              {email ? (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              ) : (
                <p className="text-sm text-warning">
                  Configure Supabase to sign in.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Appearance</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the sun/moon icon in the header to switch themes.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Region</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Currency and locale settings for your account.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-semibold text-foreground tabular-nums">USD ($)</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Locale</dt>
              <dd className="font-semibold text-foreground">en-US</dd>
            </div>
          </dl>
        </section>

        <Separator className="my-8 bg-border/50" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Sign out of your account from this device.
          </p>
          <SignOutButton className="bg-muted text-foreground hover:bg-muted/80 transition-colors" />
        </div>
      </div>
    </div>
  );
}
