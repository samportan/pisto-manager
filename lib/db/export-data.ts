import { createClient } from "../client";
import type { StockAdjustmentReason } from "./stock-movements";
import { fetchAllPages } from "./query-chunks";

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

export type ExportStockMovement = {
  id: string;
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  product_barcode: string | null;
  cost_price: number;
  unit_of_measure: string;
  quantity_delta: number;
  reason: StockAdjustmentReason;
  notes: string | null;
  stock_before: number;
  stock_after: number;
  created_at: string;
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

type StockMovementExportRow = {
  id: string;
  product_id: string;
  quantity_delta: number;
  reason: StockAdjustmentReason;
  notes: string | null;
  stock_before: number;
  stock_after: number;
  created_at: string;
  products: {
    name: string;
    sku: string | null;
    barcode: string | null;
    cost_price: number;
    unit_of_measure: string | null;
  } | null;
};

export async function getSaleItemsByOrgId(orgId: string): Promise<ExportSaleLine[]> {
  const supabase = createClient();
  const data = await fetchAllPages(async (from, to) => {
    const { data: page, error } = await supabase
      .from("sale_items")
      .select(
        "id, sale_id, product_id, quantity, unit_price, line_total, sales!inner(date, customer_id, organization_id, deleted_at), products(name, sku)"
      )
      .eq("sales.organization_id", orgId)
      .is("deleted_at", null)
      .is("sales.deleted_at", null)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (page ?? []) as unknown as SaleItemExportRow[];
  });

  return data.map((row) => ({
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
  const data = await fetchAllPages(async (from, to) => {
    const { data: page, error } = await supabase
      .from("purchase_items")
      .select(
        "id, purchase_id, product_id, quantity, quantity_ordered, quantity_received, unit_cost, line_total, purchases!inner(date, supplier_id, organization_id, deleted_at), products(name, sku)"
      )
      .eq("purchases.organization_id", orgId)
      .is("deleted_at", null)
      .is("purchases.deleted_at", null)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (page ?? []) as unknown as PurchaseItemExportRow[];
  });

  return data.map((row) => ({
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

export async function getStockMovementsByOrgId(
  orgId: string
): Promise<ExportStockMovement[]> {
  const supabase = createClient();
  const data = await fetchAllPages(async (from, to) => {
    const { data: page, error } = await supabase
      .from("stock_movements")
      .select(
        "id, product_id, quantity_delta, reason, notes, stock_before, stock_after, created_at, products(name, sku, barcode, cost_price, unit_of_measure)"
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (page ?? []) as unknown as StockMovementExportRow[];
  });

  return data.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.products?.name ?? null,
    product_sku: row.products?.sku ?? null,
    product_barcode: row.products?.barcode ?? null,
    cost_price: Number(row.products?.cost_price ?? 0),
    unit_of_measure: row.products?.unit_of_measure ?? "unit",
    quantity_delta: Number(row.quantity_delta),
    reason: row.reason,
    notes: row.notes,
    stock_before: Number(row.stock_before),
    stock_after: Number(row.stock_after),
    created_at: row.created_at,
  }));
}
