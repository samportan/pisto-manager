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
    <div className="relative flex-1">
      <div className="relative z-10 mx-auto max-w-lg px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile and app preferences — data is local until Supabase is wired.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{display}</p>
              {email ? (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              ) : (
                <p className="text-sm text-amber-700 dark:text-amber-300/90">
                  Add Supabase env vars to enable sign-in.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the sun/moon control in the top bar to switch light, dark, or
            system theme.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Region</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Currency and locale will sync with your profile later.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-medium tabular-nums">USD ($)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Locale</dt>
              <dd className="font-medium">en-US</dd>
            </div>
          </dl>
        </section>

        <Separator className="my-8" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Signing out clears your session in the browser.
          </p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
