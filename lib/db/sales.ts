import { localDayEndUtcIso, localDayStartUtcIso } from "@/lib/timezone";
import { createClient } from "../client";
import type { PaginatedResult } from "./pagination";

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

async function attachSaleMeta(
  sales: Sale[],
  supabase: ReturnType<typeof createClient>
): Promise<SaleWithMeta[]> {
  if (sales.length === 0) return [];
  const ids = sales.map((s) => s.id);

  const { data: countRows, error: cErr } = await supabase
    .from("sale_items")
    .select("sale_id")
    .in("sale_id", ids)
    .is("deleted_at", null);
  if (cErr) throw cErr;

  const countBy = new Map<string, number>();
  for (const r of countRows ?? []) {
    const sid = (r as { sale_id: string }).sale_id;
    countBy.set(sid, (countBy.get(sid) ?? 0) + 1);
  }

  const { data: itemRows, error: iErr } = await supabase
    .from("sale_items")
    .select("sale_id, quantity, products(name)")
    .in("sale_id", ids)
    .is("deleted_at", null);
  if (iErr) throw iErr;

  const itemsBySale = new Map<string, SaleItemPreview[]>();
  for (const row of itemRows ?? []) {
    const r = row as unknown as {
      sale_id: string;
      quantity: number;
      products: { name: string } | null;
    };
    const list = itemsBySale.get(r.sale_id) ?? [];
    list.push({ name: r.products?.name ?? "?", qty: Number(r.quantity) });
    itemsBySale.set(r.sale_id, list);
  }

  return sales.map((s) => {
    const products = itemsBySale.get(s.id) ?? [];
    const previewParts = products.slice(0, 3).map((p) => `${p.name} x${p.qty}`);
    const extra = products.length > 3 ? `, +${products.length - 3}` : "";
    return {
      ...s,
      subtotal: Number(s.subtotal ?? s.total),
      card_surcharge_amount: Number(s.card_surcharge_amount ?? 0),
      apply_card_surcharge: s.apply_card_surcharge ?? false,
      payment_method: (s.payment_method ?? "cash") as PaymentMethod,
      payment_status: (s.payment_status ?? "paid") as PaymentStatus,
      amount_paid: Number(s.amount_paid ?? s.total),
      balance_due: Number(s.balance_due ?? 0),
      line_count: countBy.get(s.id) ?? 0,
      top_products: products.slice(0, 3),
      items_preview: previewParts.join(", ") + extra,
    };
  });
}

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
  return attachSaleMeta((data ?? []) as Sale[], supabase);
}

export async function listSalesPaginated(
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
    .select("*", { count: "exact" })
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

  const { data, error, count } = await q
    .order("date", { ascending: false })
    .range(from, to);
  if (error) throw error;

  let sales = (data ?? []) as Sale[];
  if (filters?.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    sales = sales.filter(
      (s) =>
        s.notes?.toLowerCase().includes(term) ||
        String(s.total).includes(term)
    );
  }

  const withMeta = await attachSaleMeta(sales, supabase);
  return {
    data: withMeta,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCustomerBalances(orgId: string): Promise<CustomerBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("customer_id, balance_due")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .neq("payment_status", "paid")
    .not("customer_id", "is", null);
  if (error) throw error;

  const byCustomer = new Map<string, CustomerBalance>();
  for (const row of data ?? []) {
    const r = row as { customer_id: string; balance_due: number };
    const existing = byCustomer.get(r.customer_id) ?? {
      customer_id: r.customer_id,
      balance_due: 0,
      open_sale_count: 0,
    };
    existing.balance_due += Number(r.balance_due);
    existing.open_sale_count += 1;
    byCustomer.set(r.customer_id, existing);
  }
  return [...byCustomer.values()];
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
