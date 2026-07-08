import { createClient } from "../client";

export type StockAdjustmentReason =
  | "count_correction"
  | "personal_use"
  | "waste"
  | "gift"
  | "other";

export type StockMovement = {
  id: string;
  organization_id: string;
  product_id: string;
  user_id: string;
  quantity_delta: number;
  reason: StockAdjustmentReason;
  notes: string | null;
  stock_before: number;
  stock_after: number;
  created_at: string;
};

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
  return data as StockMovement;
}

export async function getStockMovementsByProductId(
  productId: string,
  limit = 20
): Promise<StockMovement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as StockMovement[];
}
