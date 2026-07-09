export const MONEY_SCALE = 3;
export const MONEY_DISPLAY_SCALE = 2;
export const CARD_SURCHARGE_RATE = 0.05;

const MILLI_FACTOR = 10 ** MONEY_SCALE;

export function truncMoney(value: number, scale = MONEY_SCALE): number {
  const factor = 10 ** scale;
  return Math.trunc(value * factor) / factor;
}

export function toMilli(value: number): number {
  return Math.trunc(value * MILLI_FACTOR);
}

export function fromMilli(milli: number): number {
  return milli / MILLI_FACTOR;
}

/** @deprecated Use toMilli – kept for compatibility */
export function toCents(value: number): number {
  return toMilli(value);
}

/** @deprecated Use fromMilli – kept for compatibility */
export function fromCents(cents: number): number {
  return fromMilli(cents);
}

export function multiplyMoney(qty: number, unitPrice: number): number {
  return truncMoney(qty * unitPrice, MONEY_SCALE);
}

export function sumMoney(...values: number[]): number {
  const totalMilli = values.reduce((sum, value) => sum + toMilli(value), 0);
  return fromMilli(totalMilli);
}

export function applyCardSurcharge(subtotal: number): number {
  return truncMoney(subtotal * CARD_SURCHARGE_RATE, MONEY_SCALE);
}

export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function formatMoneyInputValue(value: number): string {
  if (value === 0) return "";
  return String(value);
}

export function sanitizeMoneyInputOnChange(
  prev: string,
  next: string
): string {
  if (prev === "0" && next.length > 1 && next.startsWith("0") && next[1] !== ".") {
    return next.slice(1);
  }
  if (prev === "0" && /^\d$/.test(next)) {
    return next;
  }
  return next;
}
