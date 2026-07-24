import { formatMoneyInputValue } from "@/lib/money";
import type { Product } from "@/lib/db/products";
import { isDecimalUom } from "@/lib/uom";

export type ScanLine = {
  key: string;
  product_id: string;
  quantity: string;
};

export type ApplyScanSuccess<T extends ScanLine> = {
  ok: true;
  lines: T[];
  product: Product;
  action: "added" | "incremented";
};

export type ApplyScanFailure<T extends ScanLine> = {
  ok: false;
  reason: "not_found" | "inactive";
  lines: T[];
};

type PriceField = "sale_price" | "cost_price";

function nextQuantity(current: string, product: Product): string {
  const qty = Number(current) || 0;
  if (isDecimalUom(product.unit_of_measure)) {
    return String(Number((qty + 1).toFixed(2)));
  }
  return String(Math.max(0, Math.floor(qty)) + 1);
}

export function applyScanToDocumentLines<T extends ScanLine>(
  lines: T[],
  product: Product | undefined,
  options?: {
    priceField?: PriceField;
  }
): ApplyScanSuccess<T> | ApplyScanFailure<T> {
  if (!product) {
    return { ok: false, reason: "not_found", lines };
  }
  if (!product.is_active) {
    return { ok: false, reason: "inactive", lines };
  }

  const existing = lines.find((row) => row.product_id === product.id);
  if (existing) {
    return {
      ok: true,
      action: "incremented",
      product,
      lines: lines.map((row) =>
        row.key === existing.key
          ? { ...row, quantity: nextQuantity(row.quantity, product) }
          : row
      ),
    };
  }

  const empty = lines.find((row) => !row.product_id);
  const priceField = options?.priceField ?? "sale_price";
  const price = Number(product[priceField]) || 0;
  const priceStr = price > 0 ? formatMoneyInputValue(price) : "";
  const pricePatch = (
    priceField === "sale_price" ? { unit_price: priceStr } : { unit_cost: priceStr }
  ) as unknown as Partial<T>;

  if (empty) {
    return {
      ok: true,
      action: "added",
      product,
      lines: lines.map((row) =>
        row.key === empty.key
          ? {
              ...row,
              ...pricePatch,
              product_id: product.id,
              quantity: row.quantity && Number(row.quantity) > 0 ? row.quantity : "1",
            }
          : row
      ),
    };
  }

  const newRow = {
    key: crypto.randomUUID(),
    product_id: product.id,
    quantity: "1",
    ...pricePatch,
  } as unknown as T;

  return {
    ok: true,
    action: "added",
    product,
    lines: [...lines, newRow],
  };
}
