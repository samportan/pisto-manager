import { localDayEndUtcIso, localDayStartUtcIso } from "@/lib/timezone";
import { createClient } from "../client";
import { escapeIlikePattern, ilikeOrPart, inOrPart } from "./list-search";
import type { PaginatedResult } from "./pagination";
import { fetchAllPages } from "./query-chunks";

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

export type PurchaseItemPreview = { name: string; qty: number };

export type PurchaseWithMeta = Purchase & {
  line_count: number;
  items_preview: string;
  top_products: PurchaseItemPreview[];
};

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

type NestedPurchaseItem = {
  id: string;
  quantity?: number | null;
  quantity_ordered?: number | null;
  deleted_at: string | null;
  products?: { name: string } | null;
};
type PurchaseRowWithItems = Purchase & {
  purchase_items?: NestedPurchaseItem[] | null;
};

function purchaseWithMetaFromNested(row: PurchaseRowWithItems): PurchaseWithMeta {
  const items = (row.purchase_items ?? []).filter((i) => i.deleted_at == null);
  const products: PurchaseItemPreview[] = items.map((i) => ({
    name: i.products?.name ?? "?",
    qty: Number(i.quantity ?? i.quantity_ordered ?? 0),
  }));
  const previewParts = products.slice(0, 3).map((p) => `${p.name} x${p.qty}`);
  const extra = products.length > 3 ? `, +${products.length - 3}` : "";
  const { purchase_items: _items, ...purchase } = row;
  return {
    ...normalizePurchase(purchase),
    line_count: products.length,
    top_products: products.slice(0, 3),
    items_preview: previewParts.join(", ") + extra,
  };
}

/** Headers only — for Excel export. */
export async function getPurchasesHeadersByOrgId(
  orgId: string,
  opts?: ListPurchasesOptions
): Promise<Purchase[]> {
  return fetchAllPages(async (from, to) => {
    const supabase = createClient();
    let q = supabase.from("purchases").select("*").eq("organization_id", orgId);
    if (!opts?.includeDeleted) {
      q = q.is("deleted_at", null);
    }
    const { data: page, error } = await q
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return ((page ?? []) as Purchase[]).map(normalizePurchase);
  });
}

/** @deprecated Prefer listPurchasesPaginated. Kept for export helpers. */
export async function getPurchasesByOrgId(
  orgId: string,
  opts?: ListPurchasesOptions
): Promise<PurchaseWithMeta[]> {
  const headers = await getPurchasesHeadersByOrgId(orgId, opts);
  return headers.map((p) => ({
    ...normalizePurchase(p),
    line_count: 0,
    top_products: [],
    items_preview: "",
  }));
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

function isMissingRpcError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("list_purchases_paginated")
  );
}

type ListRpcPayload = {
  data?: unknown;
  total?: number;
  page?: number;
  page_size?: number;
};

async function listPurchasesPaginatedViaRpc(
  orgId: string,
  page: number,
  pageSize: number,
  filters?: PurchasesListFilters
): Promise<PaginatedResult<PurchaseWithMeta> | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_purchases_paginated", {
    p_organization_id: orgId,
    p_page: page,
    p_page_size: pageSize,
    p_search: filters?.search?.trim() || null,
    p_date_from: filters?.dateFrom ? localDayStartUtcIso(filters.dateFrom) : null,
    p_date_to: filters?.dateTo ? localDayEndUtcIso(filters.dateTo) : null,
    p_receipt_status:
      filters?.receiptStatus && filters.receiptStatus !== "all"
        ? filters.receiptStatus
        : null,
    p_payment_status:
      filters?.paymentStatus && filters.paymentStatus !== "all"
        ? filters.paymentStatus
        : null,
    p_payment_method:
      filters?.paymentMethod && filters.paymentMethod !== "all"
        ? filters.paymentMethod
        : null,
  });

  if (error) {
    if (isMissingRpcError(error)) return null;
    throw error;
  }

  const payload = (data ?? {}) as ListRpcPayload;
  const rows = (Array.isArray(payload.data) ? payload.data : []) as PurchaseRowWithItems[];
  return {
    data: rows.map(purchaseWithMetaFromNested),
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? page),
    pageSize: Number(payload.page_size ?? pageSize),
  };
}

async function resolvePurchaseSearchOrFilter(
  orgId: string,
  search: string
): Promise<string | null> {
  const supabase = createClient();
  const term = search.trim();
  if (!term) return null;

  const pattern = `%${escapeIlikePattern(term)}%`;
  const [contactsRes, productsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(100),
    supabase
      .from("products")
      .select("id")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .or(
        [
          ilikeOrPart("name", pattern),
          ilikeOrPart("sku", pattern),
          ilikeOrPart("barcode", pattern),
        ].join(",")
      )
      .limit(100),
  ]);
  if (contactsRes.error) throw contactsRes.error;
  if (productsRes.error) throw productsRes.error;

  const supplierIds = (contactsRes.data ?? []).map((r) => String(r.id));
  const productIds = (productsRes.data ?? []).map((r) => String(r.id));

  let purchaseIds: string[] = [];
  if (productIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("purchase_items")
      .select("purchase_id")
      .in("product_id", productIds)
      .is("deleted_at", null)
      .limit(500);
    if (itemsError) throw itemsError;
    purchaseIds = Array.from(
      new Set((itemRows ?? []).map((r) => String(r.purchase_id)))
    );
  }

  const parts = [
    ilikeOrPart("notes", pattern),
    ilikeOrPart("fees_notes", pattern),
    inOrPart("supplier_id", supplierIds),
    inOrPart("id", purchaseIds),
  ].filter((p): p is string => !!p);

  const asNumber = Number(term);
  if (Number.isFinite(asNumber) && /^\d+(\.\d+)?$/.test(term)) {
    parts.push(`total.eq.${asNumber}`);
  }

  return parts.join(",");
}

async function listPurchasesPaginatedViaQuery(
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
    .select("*, purchase_items(id, quantity_ordered, deleted_at, products(name))", {
      count: "exact",
    })
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

  const search = filters?.search?.trim();
  if (search) {
    const orFilter = await resolvePurchaseSearchOrFilter(orgId, search);
    if (orFilter) q = q.or(orFilter);
  }

  const { data, error, count } = await q
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw error;

  return {
    data: ((data ?? []) as unknown as PurchaseRowWithItems[]).map(purchaseWithMetaFromNested),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listPurchasesPaginated(
  orgId: string,
  page: number,
  pageSize: number,
  filters?: PurchasesListFilters
): Promise<PaginatedResult<PurchaseWithMeta>> {
  if (filters?.search?.trim()) {
    const viaRpc = await listPurchasesPaginatedViaRpc(orgId, page, pageSize, filters);
    if (viaRpc) return viaRpc;
  }
  return listPurchasesPaginatedViaQuery(orgId, page, pageSize, filters);
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
