import { createClient } from "../client";
import { fromMilli, toMilli, toRpcMoney } from "../money";
import type { PurchasePaymentMethod } from "./purchases";

export type PurchasePayment = {
  id: string;
  organization_id: string;
  purchase_id: string;
  user_id: string;
  amount: number;
  payment_method: PurchasePaymentMethod;
  date: string;
  notes: string | null;
  deleted_at: string | null;
};

export async function getPurchasePaymentsByPurchaseId(
  purchaseId: string
): Promise<PurchasePayment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_payments")
    .select("*")
    .eq("purchase_id", purchaseId)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PurchasePayment[];
}

export async function getPurchasePaymentsByOrgId(
  orgId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<PurchasePayment[]> {
  const supabase = createClient();
  let q = supabase
    .from("purchase_payments")
    .select("*")
    .eq("organization_id", orgId)
    .is("deleted_at", null);
  if (dateFrom) q = q.gte("date", dateFrom);
  if (dateTo) q = q.lte("date", `${dateTo}T23:59:59.999Z`);
  const { data, error } = await q.order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PurchasePayment[];
}

export async function recordPurchasePayment(args: {
  purchase_id: string;
  amount: number;
  payment_method: PurchasePaymentMethod;
  date?: string;
  notes?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_purchase_payment", {
    p_purchase_id: args.purchase_id,
    p_amount: toRpcMoney(args.amount),
    p_payment_method: args.payment_method,
    p_date: args.date ?? new Date().toISOString(),
    p_notes: args.notes ?? null,
  });
  if (error) throw error;
  return data;
}

export type SupplierBalance = {
  supplier_id: string;
  balance_due: number;
  open_purchase_count: number;
};

/** What we owe each supplier: received purchases on credit or partially paid. */
export async function getSupplierBalances(orgId: string): Promise<SupplierBalance[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_supplier_balances_agg", {
    p_organization_id: orgId,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      supplier_id: String(r.supplier_id ?? ""),
      balance_due: Number(r.balance_due ?? 0),
      open_purchase_count: Number(r.open_purchase_count ?? 0),
    };
  });
}

export type OpenSupplierPurchase = {
  id: string;
  date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: "partial" | "credit";
  notes: string | null;
};

export async function getOpenPurchasesBySupplier(
  orgId: string,
  supplierId: string
): Promise<OpenSupplierPurchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("id, date, total, amount_paid, balance_due, payment_status, notes")
    .eq("organization_id", orgId)
    .eq("supplier_id", supplierId)
    .eq("receipt_status", "received")
    .is("deleted_at", null)
    .in("payment_status", ["partial", "credit"])
    .order("date", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const r = row as OpenSupplierPurchase;
      return {
        ...r,
        total: Number(r.total),
        amount_paid: Number(r.amount_paid),
        balance_due: Number(r.balance_due),
      };
    })
    .filter((p) => p.balance_due > 0);
}

export type SupplierPaymentAllocation = {
  purchase_id: string;
  amount: number;
};

export type SupplierPaymentResult = {
  supplier_id: string;
  amount: number;
  allocations: SupplierPaymentAllocation[];
};

export type SupplierFifoPreview = {
  purchase_id: string;
  date: string;
  balance_due: number;
  applied: number;
};

/** Pure FIFO preview matching record_supplier_payment (oldest purchase first). */
export function previewSupplierPaymentFifo(
  openPurchases: { id: string; date: string; balance_due: number }[],
  amount: number
): SupplierFifoPreview[] {
  let remainingMilli = toMilli(amount);
  if (remainingMilli <= 0) return [];
  const sorted = [...openPurchases].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
  const preview: SupplierFifoPreview[] = [];
  for (const purchase of sorted) {
    if (remainingMilli <= 0) break;
    const balanceMilli = toMilli(Number(purchase.balance_due));
    if (balanceMilli <= 0) continue;
    const appliedMilli = Math.min(remainingMilli, balanceMilli);
    preview.push({
      purchase_id: purchase.id,
      date: purchase.date,
      balance_due: fromMilli(balanceMilli),
      applied: fromMilli(appliedMilli),
    });
    remainingMilli -= appliedMilli;
  }
  return preview;
}

/**
 * One payment split across several open purchases of a supplier.
 * purchase_ids limits the split to the purchases picked by the user.
 */
export async function recordSupplierPayment(args: {
  organization_id: string;
  supplier_id: string;
  amount: number;
  payment_method: PurchasePaymentMethod;
  purchase_ids?: string[] | null;
  date?: string;
  notes?: string | null;
}): Promise<SupplierPaymentResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_supplier_payment", {
    p_organization_id: args.organization_id,
    p_supplier_id: args.supplier_id,
    p_amount: toRpcMoney(args.amount),
    p_payment_method: args.payment_method,
    p_date: args.date ?? new Date().toISOString(),
    p_notes: args.notes ?? null,
    p_purchase_ids: args.purchase_ids && args.purchase_ids.length > 0 ? args.purchase_ids : null,
  });
  if (error) throw error;
  const result = data as SupplierPaymentResult;
  return {
    supplier_id: result.supplier_id,
    amount: Number(result.amount),
    allocations: (result.allocations ?? []).map((a) => ({
      purchase_id: a.purchase_id,
      amount: Number(a.amount),
    })),
  };
}
