import { localDayEndUtcIso, localDayStartUtcIso } from "@/lib/timezone";
import { createClient } from "../client";
import type { PaginatedResult } from "./pagination";

export type { PaginatedResult };

export type Purchase = {
  id: string;
  user_id: string;
  organization_id: string;
  supplier_id: string | null;
  date: string;
  total: number;
  notes: string | null;
  deleted_at: string | null;
};

export type NewPurchase = Omit<Purchase, "id" | "total" | "deleted_at">;

export type ListPurchasesOptions = { includeDeleted?: boolean };

export type PurchaseWithMeta = Purchase & { line_count: number };

export type PurchasesListFilters = {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

async function attachPurchaseMeta(
  purchases: Purchase[],
  supabase: ReturnType<typeof createClient>
): Promise<PurchaseWithMeta[]> {
  if (purchases.length === 0) return [];
  const ids = purchases.map((p) => p.id);
  const { data: rows, error: cErr } = await supabase
    .from("purchase_items")
    .select("purchase_id")
    .in("purchase_id", ids)
    .is("deleted_at", null);
  if (cErr) throw cErr;
  const countBy = new Map<string, number>();
  for (const r of rows ?? []) {
    const pid = (r as { purchase_id: string }).purchase_id;
    countBy.set(pid, (countBy.get(pid) ?? 0) + 1);
  }
  return purchases.map((p) => ({
    ...p,
    line_count: countBy.get(p.id) ?? 0,
  }));
}

export async function getPurchasesByOrgId(
  orgId: string,
  opts?: ListPurchasesOptions
): Promise<PurchaseWithMeta[]> {
  const supabase = createClient();
  let q = supabase.from("purchases").select("*").eq("organization_id", orgId);
  if (!opts?.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  const { data, error } = await q.order("date", { ascending: false });
  if (error) throw error;
  return attachPurchaseMeta((data ?? []) as Purchase[], supabase);
}

export async function listPurchasesPaginated(
  orgId: string,
  page: number,
  pageSize: number,
  filters?: PurchasesListFilters
): Promise<PaginatedResult<PurchaseWithMeta>> {
  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("purchases")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .is("deleted_at", null);

  if (filters?.dateFrom) {
    q = q.gte("date", localDayStartUtcIso(filters.dateFrom));
  }
  if (filters?.dateTo) {
    q = q.lte("date", localDayEndUtcIso(filters.dateTo));
  }

  const { data, error, count } = await q
    .order("date", { ascending: false })
    .range(from, to);
  if (error) throw error;

  let purchases = (data ?? []) as Purchase[];
  if (filters?.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    purchases = purchases.filter(
      (p) =>
        p.notes?.toLowerCase().includes(term) ||
        String(p.total).includes(term)
    );
  }

  const withMeta = await attachPurchaseMeta(purchases, supabase);
  return {
    data: withMeta,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function createPurchase(payload: NewPurchase): Promise<Purchase> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchases")
    .insert({ ...payload, total: 0, deleted_at: null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Purchase;
}

export type PurchaseLineInput = {
  product_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
};

export async function createPurchaseWithItems(args: {
  organization_id: string;
  supplier_id: string | null;
  date: string;
  notes: string | null;
  items: PurchaseLineInput[];
}): Promise<Purchase> {
  if (args.items.length === 0) {
    throw new Error("Add at least one line item.");
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_purchase_with_items", {
    p_organization_id: args.organization_id,
    p_supplier_id: args.supplier_id,
    p_date: args.date,
    p_notes: args.notes,
    p_items: args.items,
  });
  if (error) throw error;
  return data as Purchase;
}

export async function softDeletePurchase(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("soft_delete_purchase", {
    p_purchase_id: id,
  });
  if (error) throw error;
}
