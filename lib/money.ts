export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function multiplyMoney(qty: number, unitPrice: number): number {
  return fromCents(Math.round(qty * toCents(unitPrice)));
}

export function sumMoney(...values: number[]): number {
  const totalCents = values.reduce((sum, value) => sum + toCents(value), 0);
  return fromCents(totalCents);
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
