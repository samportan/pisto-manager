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
