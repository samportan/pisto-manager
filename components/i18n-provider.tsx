"use client";

import * as React from "react";

import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  defaultLocale,
  localeToIntl,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/get-messages";

type TranslateValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, values?: TranslateValues) => string;
  intlLocale: string;
  currency: string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function resolveMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, values?: TranslateValues): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    values[name] !== undefined ? String(values[name]) : `{${name}}`
  );
}

type I18nProviderProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
};

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const { locale, currency, setLocale } = useUserPreferences(initialLocale);
  const activeLocale = locale || initialLocale || defaultLocale;
  const messages = React.useMemo(
    () => getMessages(activeLocale),
    [activeLocale]
  );
  const intlLocale = localeToIntl(activeLocale);

  React.useEffect(() => {
    document.documentElement.lang = activeLocale;
  }, [activeLocale]);

  const t = React.useCallback(
    (key: string, values?: TranslateValues) => {
      const message = resolveMessage(messages, key);
      if (!message) return key;
      return interpolate(message, values);
    },
    [messages]
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale: activeLocale,
      messages,
      setLocale,
      t,
      intlLocale,
      currency,
    }),
    [activeLocale, messages, setLocale, t, intlLocale, currency]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
