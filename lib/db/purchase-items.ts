import { createClient } from "../client";

export type PurchaseItem = {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  quantity_ordered: number;
  quantity_received: number | null;
  unit_cost: number;
  line_total: number;
  unit_of_measure: string | null;
  deleted_at: string | null;
};

export type PurchaseItemRow = PurchaseItem & {
  products: { name: string } | null;
};

export async function getPurchaseItems(purchaseId: string): Promise<PurchaseItemRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_items")
    .select("*, products(name)")
    .eq("purchase_id", purchaseId)
    .is("deleted_at", null)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PurchaseItemRow[];
}

export type NewPurchaseItemRow = {
  purchase_id: string;
  product_id: string;
  quantity: number;
  quantity_ordered: number;
  quantity_received: number | null;
  unit_cost: number;
  line_total: number;
};

export async function insertPurchaseItems(rows: NewPurchaseItemRow[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from("purchase_items").insert(rows);
  if (error) throw error;
}

export async function softDeletePurchaseItemsByPurchaseId(
  purchaseId: string
): Promise<void> {
  const supabase = createClient();
  const ts = new Date().toISOString();
  const { error } = await supabase
    .from("purchase_items")
    .update({ deleted_at: ts })
    .eq("purchase_id", purchaseId)
    .is("deleted_at", null);
  if (error) throw error;
}
