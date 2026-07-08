export const UNIT_OF_MEASURE_VALUES = [
  "unit",
  "lb",
  "kg",
  "package",
  "box",
  "liter",
] as const;

export type UnitOfMeasure = (typeof UNIT_OF_MEASURE_VALUES)[number];

export function isDecimalUom(uom: UnitOfMeasure): boolean {
  return uom === "lb" || uom === "kg" || uom === "liter";
}

export function validateQuantity(qty: number, uom: UnitOfMeasure): boolean {
  if (!Number.isFinite(qty) || qty <= 0) return false;
  if (isDecimalUom(uom)) return true;
  return Number.isInteger(qty);
}

export function formatQuantityWithUom(
  qty: number,
  uom: UnitOfMeasure,
  label: (key: string) => string
): string {
  const uomLabel = label(`business.uom.${uom}`);
  return `${qty} ${uomLabel}`;
}
