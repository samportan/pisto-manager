import { createClient } from "../client";

export type Sale = {
  id: string;
  user_id: string;
  organization_id: string;
  customer_id: string | null;
  date: string;
  total: number;
  notes: string | null;
  deleted_at: string | null;
};

export type NewSale = Omit<Sale, "id" | "total" | "deleted_at">;

export type ListSalesOptions = { includeDeleted?: boolean };

export type SaleWithMeta = Sale & { line_count: number };

export async function getSalesByOrgId(
  orgId: string,
  opts?: ListSalesOptions
): Promise<SaleWithMeta[]> {
  const supabase = createClient();
  let q = supabase.from("sales").select("*").eq("organization_id", orgId);
  if (!opts?.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  const { data, error } = await q.order("date", { ascending: false });
  if (error) throw error;
  const sales = (data ?? []) as Sale[];
  if (sales.length === 0) return [];
  const ids = sales.map((s) => s.id);
  const { data: rows, error: cErr } = await supabase
    .from("sale_items")
    .select("sale_id")
    .in("sale_id", ids)
    .is("deleted_at", null);
  if (cErr) throw cErr;
  const countBy = new Map<string, number>();
  for (const r of rows ?? []) {
    const sid = (r as { sale_id: string }).sale_id;
    countBy.set(sid, (countBy.get(sid) ?? 0) + 1);
  }
  return sales.map((s) => ({
    ...s,
    line_count: countBy.get(s.id) ?? 0,
  }));
}

export async function createSale(payload: NewSale): Promise<Sale> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .insert({ ...payload, total: 0, deleted_at: null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Sale;
}

export type SaleLineInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export async function createSaleWithItems(args: {
  organization_id: string;
  customer_id: string | null;
  date: string;
  notes: string | null;
  items: SaleLineInput[];
}): Promise<Sale> {
  if (args.items.length === 0) {
    throw new Error("Add at least one line item.");
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_sale_with_items", {
    p_organization_id: args.organization_id,
    p_customer_id: args.customer_id,
    p_date: args.date,
    p_notes: args.notes,
    p_items: args.items,
  });
  if (error) throw error;
  return data as Sale;
}

export async function softDeleteSale(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("soft_delete_sale", { p_sale_id: id });
  if (error) throw error;
}
