"use client";

import { useI18n } from "@/components/i18n-provider";

export function useT() {
  const { t, locale, setLocale, intlLocale, currency } = useI18n();
  return { t, locale, setLocale, intlLocale, currency };
}
