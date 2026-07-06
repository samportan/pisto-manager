import { createClient } from "../client";

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  deleted_at: string | null;
};

export type SaleItemRow = SaleItem & {
  products: { name: string } | null;
};

export async function getSaleItems(saleId: string): Promise<SaleItemRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sale_items")
    .select("*, products(name)")
    .eq("sale_id", saleId)
    .is("deleted_at", null)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SaleItemRow[];
}

export type NewSaleItemRow = {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export async function insertSaleItems(rows: NewSaleItemRow[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from("sale_items").insert(rows);
  if (error) throw error;
}

export async function softDeleteSaleItemsBySaleId(saleId: string): Promise<void> {
  const supabase = createClient();
  const ts = new Date().toISOString();
  const { error } = await supabase
    .from("sale_items")
    .update({ deleted_at: ts })
    .eq("sale_id", saleId)
    .is("deleted_at", null);
  if (error) throw error;
}
