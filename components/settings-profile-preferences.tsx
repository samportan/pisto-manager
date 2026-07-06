"use client";

import * as React from "react";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { useProfile } from "@/hooks/useProfile";
import { useT } from "@/hooks/useTranslations";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type Locale } from "@/lib/i18n/config";
import { updateProfile } from "@/lib/db/profile";

type SettingsProfilePreferencesProps = {
  email: string | null;
  initials: string;
};

const CURRENCIES = ["USD", "MXN", "EUR", "COP", "GTQ"] as const;

export function SettingsProfilePreferences({
  email,
  initials,
}: SettingsProfilePreferencesProps) {
  const { t } = useT();
  const { userId } = useAuthUserId();
  const { profile, isLoading, error, refetch } = useProfile();
  const { locale, setLocale } = useUserPreferences();
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const displayName =
    profile?.first_name?.trim() ||
    (email ? email.split("@")[0] : null) ||
    t("settings.account");

  async function handleCurrencyChange(currency: string) {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(userId, { base_currency: currency });
      await refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleLocaleChange(next: Locale) {
    setSaveError(null);
    try {
      await setLocale(next);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

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
              <p className="text-sm text-warning">{t("settings.supabaseNotConfigured")}</p>
            )}
            {email && (
              <p className="mt-2 text-xs text-muted-foreground">
                {isLoading && t("common.loading")}
                {!isLoading && error && (
                  <span className="text-destructive">
                    {t("settings.profileError", { message: error.message })}
                  </span>
                )}
                {!isLoading && !error && profile && (
                  <span>{t("settings.profileLoaded")}</span>
                )}
                {!isLoading && !error && !profile && email && (
                  <span>
                    {t("settings.noProfile")}{" "}
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                    >
                      {t("common.retry")}
                    </button>
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">{t("settings.language")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.languageHint")}</p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={locale === "es" ? "default" : "outline"}
            onClick={() => void handleLocaleChange("es")}
          >
            Español
          </Button>
          <Button
            type="button"
            size="sm"
            variant={locale === "en" ? "default" : "outline"}
            onClick={() => void handleLocaleChange("en")}
          >
            English
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">{t("settings.appearance")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.appearanceHint")}</p>
        <p className="mt-3 text-sm font-medium text-foreground">
          {isLoading && "…"}
          {!isLoading && (profile?.theme_preference ?? "—")}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">{t("settings.region")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.regionHint")}</p>
        {saveError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">{saveError}</p>
        ) : null}
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-muted-foreground">{t("settings.currency")}</dt>
            <dd>
              <select
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                disabled={isLoading || saving || !userId}
                value={profile?.base_currency ?? "USD"}
                onChange={(e) => void handleCurrencyChange(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{t("settings.locale")}</dt>
            <dd className="font-semibold text-foreground">{locale === "es" ? "es" : "en"}</dd>
          </div>
        </dl>
      </section>

      <Separator className="my-8 bg-border/50" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("settings.signOutHint")}</p>
        <SignOutButton className="bg-muted text-foreground transition-colors hover:bg-muted/80" />
      </div>
    </>
  );
}
