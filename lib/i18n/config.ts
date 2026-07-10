export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const LOCALE_COOKIE = "pisto_locale";

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeToIntl(locale: Locale): string {
  return locale === "es" ? "es-SV" : "en-US";
}
