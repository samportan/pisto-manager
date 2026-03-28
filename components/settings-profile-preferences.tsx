"use client";

import { useProfile } from "@/hooks/useProfile";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type SettingsProfilePreferencesProps = {
  email: string | null;
  initials: string;
};

export function SettingsProfilePreferences({
  email,
  initials,
}: SettingsProfilePreferencesProps) {
  const { profile, isLoading, error, refetch } = useProfile();

  const displayName =
    profile?.first_name?.trim() ||
    (email ? email.split("@")[0] : null) ||
    "Account";

  return (
    <>
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 bg-primary/20 text-primary">
            <AvatarFallback className="text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{displayName}</p>
            {email ? (
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            ) : (
              <p className="text-sm text-warning">
                Configure Supabase to sign in.
              </p>
            )}
            {email && (
              <p className="mt-2 text-xs text-muted-foreground">
                {isLoading && "Loading profile…"}
                {!isLoading && error && (
                  <span className="text-destructive">
                    Profile could not be loaded: {error.message}
                  </span>
                )}
                {!isLoading && !error && profile && (
                  <span className="text-muted-foreground">
                    Profile loaded from your account.
                  </span>
                )}
                {!isLoading && !error && !profile && email && (
                  <span>
                    No profile row yet.{" "}
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                    >
                      Retry
                    </button>
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the sun/moon icon in the header to switch themes. Stored preference:
        </p>
        <p className="mt-3 text-sm font-medium text-foreground">
          {isLoading && "…"}
          {!isLoading &&
            (profile?.theme_preference ?? "— (not loaded)")}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Region</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Currency and locale settings for your account.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-semibold text-foreground tabular-nums">
              {isLoading && "…"}
              {!isLoading &&
                (profile?.base_currency
                  ? `${profile.base_currency}`
                  : "—")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
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
        <SignOutButton className="bg-muted text-foreground transition-colors hover:bg-muted/80" />
      </div>
    </>
  );
}
