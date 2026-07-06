"use client";

import type { ReactNode } from "react";

import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/config";

type I18nRootProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function I18nRoot({ children, initialLocale }: I18nRootProps) {
  return <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>;
}
