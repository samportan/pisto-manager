import { createClient } from "../client";

export type ProductInsightSaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  line_total: number;
  sale_id: string;
  sale_date: string;
  payment_status: "paid" | "partial" | "credit";
  product_name: string | null;
  cost_price: number | null;
  stock: number | null;
  min_stock: number | null;
  is_active: boolean | null;
  product_deleted_at: string | null;
};

type SaleItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  line_total: number;
  sale_id: string;
  sales: {
    date: string;
    organization_id: string;
    deleted_at: string | null;
    payment_status: "paid" | "partial" | "credit" | null;
  };
  products: {
    name: string;
    cost_price: number;
    stock: number;
    min_stock: number | null;
    is_active: boolean;
    deleted_at: string | null;
  } | null;
};

export async function getSaleItemsForInsightsByOrgId(
  orgId: string
): Promise<ProductInsightSaleItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sale_items")
    .select(
      "id, product_id, quantity, line_total, sale_id, sales!inner(date, organization_id, deleted_at, payment_status), products(name, cost_price, stock, min_stock, is_active, deleted_at)"
    )
    .eq("sales.organization_id", orgId)
    .is("deleted_at", null)
    .is("sales.deleted_at", null)
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as SaleItemRow[]).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    quantity: Number(row.quantity),
    line_total: Number(row.line_total),
    sale_id: row.sale_id,
    sale_date: row.sales.date,
    payment_status: row.sales.payment_status ?? "paid",
    product_name: row.products?.name ?? null,
    cost_price: row.products ? Number(row.products.cost_price) : null,
    stock: row.products ? Number(row.products.stock) : null,
    min_stock: row.products?.min_stock != null ? Number(row.products.min_stock) : null,
    is_active: row.products?.is_active ?? null,
    product_deleted_at: row.products?.deleted_at ?? null,
  }));
}
