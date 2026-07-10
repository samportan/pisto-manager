import { createClient } from "../client";

export type ExportSaleLine = {
  id: string;
  sale_id: string;
  sale_date: string;
  customer_id: string | null;
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type ExportPurchaseLine = {
  id: string;
  purchase_id: string;
  purchase_date: string;
  supplier_id: string | null;
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  quantity: number;
  quantity_ordered: number;
  quantity_received: number | null;
  unit_cost: number;
  line_total: number;
};

type SaleItemExportRow = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sales: {
    date: string;
    customer_id: string | null;
    organization_id: string;
    deleted_at: string | null;
  };
  products: { name: string; sku: string | null } | null;
};

type PurchaseItemExportRow = {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  quantity_ordered: number;
  quantity_received: number | null;
  unit_cost: number;
  line_total: number;
  purchases: {
    date: string;
    supplier_id: string | null;
    organization_id: string;
    deleted_at: string | null;
  };
  products: { name: string; sku: string | null } | null;
};

export async function getSaleItemsByOrgId(orgId: string): Promise<ExportSaleLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sale_items")
    .select(
      "id, sale_id, product_id, quantity, unit_price, line_total, sales!inner(date, customer_id, organization_id, deleted_at), products(name, sku)"
    )
    .eq("sales.organization_id", orgId)
    .is("deleted_at", null)
    .is("sales.deleted_at", null)
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as SaleItemExportRow[]).map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    sale_date: row.sales.date,
    customer_id: row.sales.customer_id,
    product_id: row.product_id,
    product_name: row.products?.name ?? null,
    product_sku: row.products?.sku ?? null,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    line_total: Number(row.line_total),
  }));
}

export async function getPurchaseItemsByOrgId(
  orgId: string
): Promise<ExportPurchaseLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_items")
    .select(
      "id, purchase_id, product_id, quantity, quantity_ordered, quantity_received, unit_cost, line_total, purchases!inner(date, supplier_id, organization_id, deleted_at), products(name, sku)"
    )
    .eq("purchases.organization_id", orgId)
    .is("deleted_at", null)
    .is("purchases.deleted_at", null)
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as PurchaseItemExportRow[]).map((row) => ({
    id: row.id,
    purchase_id: row.purchase_id,
    purchase_date: row.purchases.date,
    supplier_id: row.purchases.supplier_id,
    product_id: row.product_id,
    product_name: row.products?.name ?? null,
    product_sku: row.products?.sku ?? null,
    quantity: Number(row.quantity),
    quantity_ordered: Number(row.quantity_ordered ?? row.quantity),
    quantity_received: row.quantity_received != null ? Number(row.quantity_received) : null,
    unit_cost: Number(row.unit_cost),
    line_total: Number(row.line_total),
  }));
}
