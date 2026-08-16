export const MONEY_SCALE = 3;
export const MONEY_DISPLAY_SCALE = 2;
export const CARD_SURCHARGE_RATE = 0.05;

const MILLI_FACTOR = 10 ** MONEY_SCALE;

export function toMilli(value: number): number {
  const scaled = value * MILLI_FACTOR;
  return Math.trunc(scaled + (value >= 0 ? 1e-6 : -1e-6));
}

export function truncMoney(value: number, scale = MONEY_SCALE): number {
  if (!Number.isFinite(value)) return value;
  const milli = toMilli(value);
  if (scale >= MONEY_SCALE) return fromMilli(milli);
  const factor = 10 ** (MONEY_SCALE - scale);
  return fromMilli(Math.trunc(milli / factor) * factor);
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

/** Integer milli comparison — avoids IEEE float false exceeds on values like 12.55. */
export function isMoneyGreater(a: number, b: number): boolean {
  return toMilli(a) > toMilli(b);
}

/**
 * Exact decimal string for RPC numeric params.
 * JSON numbers are float64; 12.55 becomes ~12.550000000000001 and can fail
 * Postgres `amount > balance` checks against exact numeric balances.
 */
export function toRpcMoney(value: number): string {
  const milli = toMilli(value);
  const negative = milli < 0;
  const abs = Math.abs(milli);
  const whole = Math.trunc(abs / MILLI_FACTOR);
  const frac = String(abs % MILLI_FACTOR).padStart(MONEY_SCALE, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

export function applyCardSurcharge(subtotal: number): number {
  return truncMoney(subtotal * CARD_SURCHARGE_RATE, MONEY_SCALE);
}

export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) return null;
  const whole = parseInt(match[1], 10);
  const frac = (match[2] ?? "").slice(0, MONEY_SCALE).padEnd(MONEY_SCALE, "0");
  const milli = whole * MILLI_FACTOR + parseInt(frac, 10);
  if (!Number.isFinite(milli) || milli < 0) return null;
  return fromMilli(milli);
}

export function formatMoneyInputValue(value: number): string {
  if (value === 0) return "";
  const milli = toMilli(value);
  const whole = Math.trunc(milli / MILLI_FACTOR);
  const frac = String(Math.abs(milli % MILLI_FACTOR))
    .padStart(MONEY_SCALE, "0")
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
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
