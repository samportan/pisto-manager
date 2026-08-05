import { localDayEndUtcIso, localDayStartUtcIso } from "@/lib/timezone";
import { createClient } from "../client";
import { escapeIlikePattern, ilikeOrPart, inOrPart } from "./list-search";
import type { PaginatedResult } from "./pagination";
import { fetchAllPages } from "./query-chunks";

export type { PaginatedResult };

export type PaymentMethod = "cash" | "card" | "transfer";
export type PaymentStatus = "paid" | "partial" | "credit";
export type CollectionMode = "full" | "partial" | "credit";

export type Sale = {
  id: string;
  user_id: string;
  organization_id: string;
  customer_id: string | null;
  date: string;
  subtotal: number;
  card_surcharge_rate: number | null;
  card_surcharge_amount: number;
  apply_card_surcharge: boolean;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  deleted_at: string | null;
};

export type NewSale = Omit<Sale, "id" | "total" | "subtotal" | "balance_due" | "deleted_at">;

export type ListSalesOptions = { includeDeleted?: boolean };

export type SaleItemPreview = { name: string; qty: number };

export type SaleWithMeta = Sale & {
  line_count: number;
  items_preview: string;
  top_products: SaleItemPreview[];
};

export type SalesListFilters = {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod | "all";
  paymentStatus?: PaymentStatus | "all";
  customerId?: string;
  search?: string;
};

export type CustomerBalance = {
  customer_id: string;
  balance_due: number;
  open_sale_count: number;
};

type NestedSaleItem = {
  quantity: number;
  deleted_at: string | null;
  products: { name: string } | null;
};

type SaleRowWithItems = Sale & {
  sale_items?: NestedSaleItem[] | null;
};

function normalizeSaleBase(s: Sale): Omit<
  SaleWithMeta,
  "line_count" | "items_preview" | "top_products"
> {
  return {
    ...s,
    subtotal: Number(s.subtotal ?? s.total),
    card_surcharge_amount: Number(s.card_surcharge_amount ?? 0),
    apply_card_surcharge: s.apply_card_surcharge ?? false,
    payment_method: (s.payment_method ?? "cash") as PaymentMethod,
    payment_status: (s.payment_status ?? "paid") as PaymentStatus,
    amount_paid: Number(s.amount_paid ?? s.total),
    balance_due: Number(s.balance_due ?? 0),
  };
}

function saleWithMetaFromNested(row: SaleRowWithItems): SaleWithMeta {
  const items = (row.sale_items ?? []).filter((i) => i.deleted_at == null);
  const products: SaleItemPreview[] = items.map((i) => ({
    name: i.products?.name ?? "?",
    qty: Number(i.quantity),
  }));
  const previewParts = products.slice(0, 3).map((p) => `${p.name} x${p.qty}`);
  const extra = products.length > 3 ? `, +${products.length - 3}` : "";
  const { sale_items: _items, ...sale } = row;
  return {
    ...normalizeSaleBase(sale),
    line_count: products.length,
    top_products: products.slice(0, 3),
    items_preview: previewParts.join(", ") + extra,
  };
}

/** Headers only — for Excel export. line_count filled from sale lines. */
export async function getSalesHeadersByOrgId(
  orgId: string,
  opts?: ListSalesOptions
): Promise<Sale[]> {
  return fetchAllPages(async (from, to) => {
    const supabase = createClient();
    let q = supabase.from("sales").select("*").eq("organization_id", orgId);
    if (!opts?.includeDeleted) {
      q = q.is("deleted_at", null);
    }
    const { data: page, error } = await q
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return ((page ?? []) as Sale[]).map((s) => normalizeSaleBase(s) as Sale);
  });
}

/** @deprecated Prefer listSalesPaginated or analytics RPCs. Kept for export helpers. */
export async function getSalesByOrgId(
  orgId: string,
  opts?: ListSalesOptions
): Promise<SaleWithMeta[]> {
  const headers = await getSalesHeadersByOrgId(orgId, opts);
  return headers.map((s) => ({
    ...normalizeSaleBase(s),
    line_count: 0,
    top_products: [],
    items_preview: "",
  }));
}

function isMissingRpcError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("list_sales_paginated")
  );
}

type ListRpcPayload = {
  data?: unknown;
  total?: number;
  page?: number;
  page_size?: number;
};

async function listSalesPaginatedViaRpc(
  orgId: string,
  page: number,
  pageSize: number,
  filters?: SalesListFilters
): Promise<PaginatedResult<SaleWithMeta> | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_sales_paginated", {
    p_organization_id: orgId,
    p_page: page,
    p_page_size: pageSize,
    p_search: filters?.search?.trim() || null,
    p_date_from: filters?.dateFrom ? localDayStartUtcIso(filters.dateFrom) : null,
    p_date_to: filters?.dateTo ? localDayEndUtcIso(filters.dateTo) : null,
    p_payment_method:
      filters?.paymentMethod && filters.paymentMethod !== "all"
        ? filters.paymentMethod
        : null,
    p_payment_status:
      filters?.paymentStatus && filters.paymentStatus !== "all"
        ? filters.paymentStatus
        : null,
    p_customer_id: filters?.customerId ?? null,
  });

  if (error) {
    if (isMissingRpcError(error)) return null;
    throw error;
  }

  const payload = (data ?? {}) as ListRpcPayload;
  const rows = (Array.isArray(payload.data) ? payload.data : []) as SaleRowWithItems[];
  return {
    data: rows.map(saleWithMetaFromNested),
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? page),
    pageSize: Number(payload.page_size ?? pageSize),
  };
}

async function resolveSaleSearchOrFilter(
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

  const contactIds = (contactsRes.data ?? []).map((r) => String(r.id));
  const productIds = (productsRes.data ?? []).map((r) => String(r.id));

  let saleIds: string[] = [];
  if (productIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("sale_items")
      .select("sale_id")
      .in("product_id", productIds)
      .is("deleted_at", null)
      .limit(500);
    if (itemsError) throw itemsError;
    saleIds = Array.from(new Set((itemRows ?? []).map((r) => String(r.sale_id))));
  }

  const parts = [
    ilikeOrPart("notes", pattern),
    inOrPart("customer_id", contactIds),
    inOrPart("id", saleIds),
  ].filter((p): p is string => !!p);

  const asNumber = Number(term);
  if (Number.isFinite(asNumber) && /^\d+(\.\d+)?$/.test(term)) {
    parts.push(`total.eq.${asNumber}`);
  }

  return parts.join(",");
}

async function listSalesPaginatedViaQuery(
  orgId: string,
  page: number,
  pageSize: number,
  filters?: SalesListFilters
): Promise<PaginatedResult<SaleWithMeta>> {
  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("sales")
    .select("*, sale_items(quantity, deleted_at, products(name))", { count: "exact" })
    .eq("organization_id", orgId)
    .is("deleted_at", null);

  if (filters?.dateFrom) {
    q = q.gte("date", localDayStartUtcIso(filters.dateFrom));
  }
  if (filters?.dateTo) {
    q = q.lte("date", localDayEndUtcIso(filters.dateTo));
  }
  if (filters?.paymentMethod && filters.paymentMethod !== "all") {
    q = q.eq("payment_method", filters.paymentMethod);
  }
  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    q = q.eq("payment_status", filters.paymentStatus);
  }
  if (filters?.customerId) {
    q = q.eq("customer_id", filters.customerId);
  }

  const search = filters?.search?.trim();
  if (search) {
    const orFilter = await resolveSaleSearchOrFilter(orgId, search);
    if (orFilter) q = q.or(orFilter);
  }

  const { data, error, count } = await q
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw error;

  return {
    data: ((data ?? []) as unknown as SaleRowWithItems[]).map(saleWithMetaFromNested),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listSalesPaginated(
  orgId: string,
  page: number,
  pageSize: number,
  filters?: SalesListFilters
): Promise<PaginatedResult<SaleWithMeta>> {
  if (filters?.search?.trim()) {
    const viaRpc = await listSalesPaginatedViaRpc(orgId, page, pageSize, filters);
    if (viaRpc) return viaRpc;
  }
  return listSalesPaginatedViaQuery(orgId, page, pageSize, filters);
}

export async function getCustomerBalances(orgId: string): Promise<CustomerBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_customer_balances_agg", {
    p_organization_id: orgId,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      customer_id: String(r.customer_id ?? ""),
      balance_due: Number(r.balance_due ?? 0),
      open_sale_count: Number(r.open_sale_count ?? 0),
    };
  });
}

export type OpenCustomerSale = Pick<
  Sale,
  "id" | "date" | "total" | "amount_paid" | "balance_due" | "payment_status" | "notes"
>;

export async function getOpenSalesByCustomer(
  orgId: string,
  customerId: string
): Promise<OpenCustomerSale[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id, date, total, amount_paid, balance_due, payment_status, notes")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .neq("payment_status", "paid")
    .order("date", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as OpenCustomerSale;
    return {
      ...r,
      total: Number(r.total),
      amount_paid: Number(r.amount_paid),
      balance_due: Number(r.balance_due),
    };
  });
}

export async function createSale(payload: NewSale): Promise<Sale> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .insert({ ...payload, total: 0, subtotal: 0, deleted_at: null })
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
  payment_method: PaymentMethod;
  apply_card_surcharge: boolean;
  amount_paid: number | null;
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
    p_payment_method: args.payment_method,
    p_apply_card_surcharge: args.apply_card_surcharge,
    p_amount_paid: args.amount_paid,
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
