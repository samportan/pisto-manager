import type { Product } from "@/lib/db/products";
import type { StockMovementReason } from "@/lib/db/stock-movements";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

const STOCK_REASON_KEYS: Record<StockMovementReason, string> = {
  count_correction: "business.reasonCountCorrection",
  personal_use: "business.reasonPersonalUse",
  waste: "business.reasonWaste",
  gift: "business.reasonGift",
  other: "business.reasonOther",
  initial_stock: "business.reasonInitialStock",
  sale: "business.reasonSale",
  sale_void: "business.reasonSaleVoid",
  purchase_receive: "business.reasonPurchaseReceive",
  purchase_edit: "business.reasonPurchaseEdit",
  purchase_void: "business.reasonPurchaseVoid",
  system_correction: "business.reasonSystemCorrection",
};

/** Labels for every stock movement reason (manual and automatic). */
export function stockReasonLabels(t: TranslateFn): Record<StockMovementReason, string> {
  const out = {} as Record<StockMovementReason, string>;
  for (const [reason, key] of Object.entries(STOCK_REASON_KEYS)) {
    out[reason as StockMovementReason] = t(key);
  }
  return out;
}

/**
 * Units of each product requested across all lines of a document.
 * The same product can appear on several lines; stock must cover the sum.
 */
export function sumQuantitiesByProduct(
  lines: { product_id: string; quantity: number }[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!line.product_id) continue;
    const next = (totals.get(line.product_id) ?? 0) + line.quantity;
    totals.set(line.product_id, Math.round(next * 1000) / 1000);
  }
  return totals;
}

type StockLike = {
  stock: number;
  min_stock?: number | null;
};

export function isOutOfStock(product: StockLike): boolean {
  return Number(product.stock) <= 0;
}

export function isLowStock(product: StockLike): boolean {
  const minStock = product.min_stock ?? 0;
  return minStock > 0 && Number(product.stock) <= minStock;
}

export function stockUrgency(product: StockLike): number {
  const stock = Number(product.stock);
  const minStock = product.min_stock ?? 0;
  if (stock <= 0) return Number.NEGATIVE_INFINITY;
  return stock - minStock;
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products
    .filter(isLowStock)
    .slice()
    .sort((a, b) => {
      const urgencyDiff = stockUrgency(a) - stockUrgency(b);
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.name.localeCompare(b.name);
    });
}
