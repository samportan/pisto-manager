import { createClient } from "../client";

/** Reasons a user can pick in "Adjust stock". */
export type StockAdjustmentReason =
  | "count_correction"
  | "personal_use"
  | "waste"
  | "gift"
  | "other";

/** Reasons written automatically by sales, purchases and system fixes. */
export type StockSystemReason =
  | "initial_stock"
  | "sale"
  | "sale_void"
  | "purchase_receive"
  | "purchase_edit"
  | "purchase_void"
  | "system_correction";

export type StockMovementReason = StockAdjustmentReason | StockSystemReason;

export const STOCK_ADJUSTMENT_REASONS: StockAdjustmentReason[] = [
  "count_correction",
  "personal_use",
  "waste",
  "gift",
  "other",
];

/**
 * Movements that are not already covered by the sales / purchases sheets.
 * Used by the Excel "adjustments" sheet.
 */
export const STOCK_NON_DOCUMENT_REASONS: StockMovementReason[] = [
  ...STOCK_ADJUSTMENT_REASONS,
  "initial_stock",
  "system_correction",
];

export type StockMovement = {
  id: string;
  organization_id: string;
  product_id: string;
  user_id: string;
  quantity_delta: number;
  reason: StockMovementReason;
  notes: string | null;
  stock_before: number;
  stock_after: number;
  /** Sale or purchase that caused the movement (null for manual adjustments). */
  reference_id: string | null;
  created_at: string;
};

function normalizeMovement(row: StockMovement): StockMovement {
  return {
    ...row,
    quantity_delta: Number(row.quantity_delta),
    stock_before: Number(row.stock_before),
    stock_after: Number(row.stock_after),
    reference_id: row.reference_id ?? null,
  };
}

export async function createStockAdjustment(args: {
  organization_id: string;
  product_id: string;
  quantity_delta: number;
  reason: StockAdjustmentReason;
  notes?: string | null;
}): Promise<StockMovement> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_stock_adjustment", {
    p_organization_id: args.organization_id,
    p_product_id: args.product_id,
    p_quantity_delta: args.quantity_delta,
    p_reason: args.reason,
    p_notes: args.notes ?? null,
  });
  if (error) throw error;
  return normalizeMovement(data as StockMovement);
}

/** Full ledger for one product: sales, purchases, adjustments, newest first. */
export async function getStockMovementsByProductId(
  productId: string,
  limit = 30
): Promise<StockMovement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as StockMovement[]).map(normalizeMovement);
}
