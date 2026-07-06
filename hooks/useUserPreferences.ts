"use client";

import * as React from "react";

import { useAuthUserId } from "@/hooks/useAuthUserId";
import { useProfile } from "@/hooks/useProfile";
import {
  defaultLocale,
  isValidLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { updateProfile } from "@/lib/db/profile";

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`)
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return value && isValidLocale(value) ? value : null;
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}

export type UserPreferences = {
  locale: Locale;
  currency: string;
  isLoading: boolean;
  setLocale: (locale: Locale) => Promise<void>;
};

export function useUserPreferences(initialLocale?: Locale): UserPreferences {
  const { userId } = useAuthUserId();
  const { profile, isLoading, refetch } = useProfile();
  const [cookieLocale, setCookieLocale] = React.useState<Locale | null>(
    initialLocale ?? null
  );
  const [optimisticLocale, setOptimisticLocale] = React.useState<Locale | null>(
    null
  );

  React.useEffect(() => {
    setCookieLocale(readLocaleCookie());
  }, []);

  const profileLocale =
    profile?.locale && isValidLocale(profile.locale) ? profile.locale : null;

  const locale =
    optimisticLocale ?? profileLocale ?? cookieLocale ?? defaultLocale;

  const currency = profile?.base_currency?.trim() || "USD";

  const setLocale = React.useCallback(
    async (next: Locale) => {
      setOptimisticLocale(next);
      writeLocaleCookie(next);

      if (userId) {
        try {
          await updateProfile(userId, { locale: next });
          await refetch();
        } catch {
          // cookie still applies for this session
        }
      }
    },
    [userId, refetch]
  );

  return {
    locale,
    currency,
    isLoading,
    setLocale,
  };
}
