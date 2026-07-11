import { localDayEndUtcIso, localDayStartUtcIso } from "@/lib/timezone";
import { createClient } from "../client";
import type { PaginatedResult } from "./pagination";

export type { PaginatedResult };

export type PurchaseReceiptStatus = "pending" | "received" | "cancelled";
export type PurchasePaymentMethod = "cash" | "transfer" | "credit";
export type PurchasePaymentStatus = "unpaid" | "partial" | "paid" | "credit";
export type PurchaseCreateMode = "pending" | "received";

export type Purchase = {
  id: string;
  user_id: string;
  organization_id: string;
  supplier_id: string | null;
  date: string;
  receipt_status: PurchaseReceiptStatus;
  expected_at: string | null;
  received_at: string | null;
  subtotal: number;
  fees_amount: number;
  fees_notes: string | null;
  total: number;
  payment_method: PurchasePaymentMethod;
  payment_status: PurchasePaymentStatus;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  deleted_at: string | null;
};

export type NewPurchase = Omit<
  Purchase,
  "id" | "total" | "subtotal" | "balance_due" | "deleted_at" | "received_at"
>;

export type ListPurchasesOptions = { includeDeleted?: boolean };

export type PurchaseWithMeta = Purchase & { line_count: number };

export type PurchasesListFilters = {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  receiptStatus?: PurchaseReceiptStatus | "all";
  paymentStatus?: PurchasePaymentStatus | "all";
  paymentMethod?: PurchasePaymentMethod | "all";
};

function normalizePurchase(p: Purchase): Purchase {
  return {
    ...p,
    receipt_status: (p.receipt_status ?? "received") as PurchaseReceiptStatus,
    subtotal: Number(p.subtotal ?? p.total),
    fees_amount: Number(p.fees_amount ?? 0),
    payment_method: (p.payment_method ?? "cash") as PurchasePaymentMethod,
    payment_status: (p.payment_status ?? "paid") as PurchasePaymentStatus,
    amount_paid: Number(p.amount_paid ?? p.total),
    balance_due: Number(p.balance_due ?? 0),
  };
}

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
    ...normalizePurchase(p),
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

export async function getPurchaseById(id: string): Promise<Purchase | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePurchase(data as Purchase) : null;
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
  if (filters?.receiptStatus && filters.receiptStatus !== "all") {
    q = q.eq("receipt_status", filters.receiptStatus);
  }
  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    q = q.eq("payment_status", filters.paymentStatus);
  }
  if (filters?.paymentMethod && filters.paymentMethod !== "all") {
    q = q.eq("payment_method", filters.paymentMethod);
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
    .insert({ ...payload, total: 0, subtotal: 0, deleted_at: null })
    .select("*")
    .single();
  if (error) throw error;
  return normalizePurchase(data as Purchase);
}

export type PurchaseLineInput = {
  product_id: string;
  quantity_ordered: number;
  quantity_received?: number | null;
  unit_cost: number;
  line_total: number;
};

export type CreatePurchaseArgs = {
  organization_id: string;
  supplier_id: string | null;
  date: string;
  notes: string | null;
  receipt_status: PurchaseCreateMode;
  expected_at?: string | null;
  payment_method?: PurchasePaymentMethod;
  amount_paid?: number | null;
  fees_amount?: number;
  fees_notes?: string | null;
  items: PurchaseLineInput[];
};

export async function createPurchaseWithItems(args: CreatePurchaseArgs): Promise<Purchase> {
  if (args.items.length === 0) {
    throw new Error("Add at least one line item.");
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_purchase_with_items", {
    p_organization_id: args.organization_id,
    p_supplier_id: args.supplier_id,
    p_date: args.date,
    p_notes: args.notes,
    p_receipt_status: args.receipt_status,
    p_expected_at: args.expected_at ?? null,
    p_payment_method: args.payment_method ?? "cash",
    p_amount_paid: args.amount_paid ?? null,
    p_fees_amount: args.fees_amount ?? 0,
    p_fees_notes: args.fees_notes ?? null,
    p_items: args.items,
  });
  if (error) throw error;
  return normalizePurchase(data as Purchase);
}

export type UpdatePendingPurchaseArgs = {
  purchase_id: string;
  supplier_id: string | null;
  date: string;
  notes: string | null;
  expected_at?: string | null;
  fees_amount?: number;
  fees_notes?: string | null;
  items: PurchaseLineInput[];
};

export async function updatePendingPurchase(args: UpdatePendingPurchaseArgs): Promise<Purchase> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_pending_purchase", {
    p_purchase_id: args.purchase_id,
    p_supplier_id: args.supplier_id,
    p_date: args.date,
    p_notes: args.notes,
    p_expected_at: args.expected_at ?? null,
    p_fees_amount: args.fees_amount ?? 0,
    p_fees_notes: args.fees_notes ?? null,
    p_items: args.items,
  });
  if (error) throw error;
  return normalizePurchase(data as Purchase);
}

export type ReceivePurchaseArgs = {
  purchase_id: string;
  date?: string | null;
  notes?: string | null;
  payment_method?: PurchasePaymentMethod;
  amount_paid?: number | null;
  fees_amount?: number;
  fees_notes?: string | null;
  items: PurchaseLineInput[];
};

export async function receivePurchase(args: ReceivePurchaseArgs): Promise<Purchase> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("receive_purchase", {
    p_purchase_id: args.purchase_id,
    p_date: args.date ?? null,
    p_notes: args.notes ?? null,
    p_payment_method: args.payment_method ?? "cash",
    p_amount_paid: args.amount_paid ?? null,
    p_fees_amount: args.fees_amount ?? 0,
    p_fees_notes: args.fees_notes ?? null,
    p_items: args.items,
  });
  if (error) throw error;
  return normalizePurchase(data as Purchase);
}

export type UpdateReceivedPurchaseArgs = {
  purchase_id: string;
  supplier_id: string | null;
  date: string;
  notes: string | null;
  fees_amount?: number;
  fees_notes?: string | null;
  items: PurchaseLineInput[];
};

export async function updateReceivedPurchase(
  args: UpdateReceivedPurchaseArgs
): Promise<Purchase> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_received_purchase", {
    p_purchase_id: args.purchase_id,
    p_supplier_id: args.supplier_id,
    p_date: args.date,
    p_notes: args.notes,
    p_fees_amount: args.fees_amount ?? 0,
    p_fees_notes: args.fees_notes ?? null,
    p_items: args.items,
  });
  if (error) throw error;
  return normalizePurchase(data as Purchase);
}

export async function cancelPendingPurchase(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_pending_purchase", {
    p_purchase_id: id,
  });
  if (error) throw error;
}

export async function softDeletePurchase(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("soft_delete_purchase", {
    p_purchase_id: id,
  });
  if (error) throw error;
}
