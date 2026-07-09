import {
  defaultLocale,
  isValidLocale,
  localeToIntl,
  type Locale,
} from "@/lib/i18n/config";
import { MONEY_DISPLAY_SCALE, truncMoney } from "@/lib/money";

export type FormatMoneyOptions = {
  currency?: string;
  locale?: Locale | string;
};

function resolveIntlLocale(locale?: Locale | string): string {
  if (!locale) return localeToIntl(defaultLocale);
  if (typeof locale === "string" && locale.length === 2 && isValidLocale(locale)) {
    return localeToIntl(locale);
  }
  return locale;
}

export function formatMoney(
  value: number,
  options?: FormatMoneyOptions | string
) {
  const resolved =
    typeof options === "string" ? { currency: options } : (options ?? {});
  const currency = resolved.currency ?? "USD";
  const intlLocale = resolveIntlLocale(resolved.locale);

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  }).format(value);
}

/** Truncates to 2 decimal places before formatting (business UI display). */
export function formatMoneyDisplay(
  value: number,
  options?: FormatMoneyOptions | string
) {
  const truncated = truncMoney(value, MONEY_DISPLAY_SCALE);
  return formatMoney(truncated, options);
}

export type FormatDateOptions = Intl.DateTimeFormatOptions & {
  locale?: Locale | string;
};

export function formatDate(
  value: Date | string | number,
  options?: FormatDateOptions
) {
  const { locale, ...intlOptions } = options ?? {};
  const date = value instanceof Date ? value : new Date(value);
  const intlLocale = resolveIntlLocale(locale);

  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
    ...intlOptions,
  }).format(date);
}
