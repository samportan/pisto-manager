import type { Product } from "@/lib/db/products";
import { isDecimalUom } from "@/lib/uom";

export type ReceiveScanLine = {
  key: string;
  product_id: string;
  quantity_ordered: string;
  quantity_received: string;
};

export type ApplyReceiveScanResult =
  | {
      ok: true;
      lines: ReceiveScanLine[];
      product: Product;
      overReceived: boolean;
    }
  | { ok: false; reason: "not_found" | "not_on_order" };

function nextQuantity(current: string, product: Product): string {
  const qty = Number(current) || 0;
  if (isDecimalUom(product.unit_of_measure)) {
    return String(Number((qty + 1).toFixed(2)));
  }
  return String(Math.max(0, Math.floor(qty)) + 1);
}

export function applyScanToReceiveLines(
  lines: ReceiveScanLine[],
  product: Product | undefined
): ApplyReceiveScanResult {
  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  const existing = lines.find((row) => row.product_id === product.id);
  if (!existing) {
    return { ok: false, reason: "not_on_order" };
  }

  const nextQty = nextQuantity(existing.quantity_received, product);
  const ordered = Number(existing.quantity_ordered) || 0;
  const overReceived = Number(nextQty) > ordered;

  return {
    ok: true,
    product,
    overReceived,
    lines: lines.map((row) =>
      row.key === existing.key ? { ...row, quantity_received: nextQty } : row
    ),
  };
}

export function resetReceiveQuantitiesToZero(lines: ReceiveScanLine[]): ReceiveScanLine[] {
  return lines.map((row) => ({ ...row, quantity_received: "0" }));
}
