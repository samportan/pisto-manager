import { createClient } from "../client";
import { fromMilli, toMilli, toRpcMoney } from "../money";
import type { PaymentMethod } from "./sales";

export type SalePayment = {
  id: string;
  organization_id: string;
  sale_id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  date: string;
  notes: string | null;
  deleted_at: string | null;
};

export async function getSalePaymentsBySaleId(saleId: string): Promise<SalePayment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sale_payments")
    .select("*")
    .eq("sale_id", saleId)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SalePayment[];
}

export async function getSalePaymentsByOrgId(
  orgId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<SalePayment[]> {
  const supabase = createClient();
  let q = supabase
    .from("sale_payments")
    .select("*")
    .eq("organization_id", orgId)
    .is("deleted_at", null);
  if (dateFrom) q = q.gte("date", dateFrom);
  if (dateTo) q = q.lte("date", `${dateTo}T23:59:59.999Z`);
  const { data, error } = await q.order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SalePayment[];
}

export async function recordSalePayment(args: {
  sale_id: string;
  amount: number;
  payment_method: PaymentMethod;
  date?: string;
  notes?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_sale_payment", {
    p_sale_id: args.sale_id,
    p_amount: toRpcMoney(args.amount),
    p_payment_method: args.payment_method,
    p_date: args.date ?? new Date().toISOString(),
    p_notes: args.notes ?? null,
  });
  if (error) throw error;
  return data;
}

export type CustomerPaymentAllocation = {
  sale_id: string;
  amount: number;
};

export type CustomerPaymentResult = {
  customer_id: string;
  amount: number;
  allocations: CustomerPaymentAllocation[];
};

export type FifoAllocationPreview = {
  sale_id: string;
  date: string;
  balance_due: number;
  applied: number;
};

/** Pure FIFO preview matching record_customer_payment (oldest sale first). */
export function previewCustomerPaymentFifo(
  openSales: { id: string; date: string; balance_due: number }[],
  amount: number
): FifoAllocationPreview[] {
  let remainingMilli = toMilli(amount);
  if (remainingMilli <= 0) return [];
  const sorted = [...openSales].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
  const preview: FifoAllocationPreview[] = [];
  for (const sale of sorted) {
    if (remainingMilli <= 0) break;
    const balanceMilli = toMilli(Number(sale.balance_due));
    if (balanceMilli <= 0) continue;
    const appliedMilli = Math.min(remainingMilli, balanceMilli);
    preview.push({
      sale_id: sale.id,
      date: sale.date,
      balance_due: fromMilli(balanceMilli),
      applied: fromMilli(appliedMilli),
    });
    remainingMilli -= appliedMilli;
  }
  return preview;
}

export async function recordCustomerPayment(args: {
  organization_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  date?: string;
  notes?: string | null;
}): Promise<CustomerPaymentResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_customer_payment", {
    p_organization_id: args.organization_id,
    p_customer_id: args.customer_id,
    p_amount: toRpcMoney(args.amount),
    p_payment_method: args.payment_method,
    p_date: args.date ?? new Date().toISOString(),
    p_notes: args.notes ?? null,
  });
  if (error) throw error;
  const result = data as CustomerPaymentResult;
  return {
    customer_id: result.customer_id,
    amount: Number(result.amount),
    allocations: (result.allocations ?? []).map((a) => ({
      sale_id: a.sale_id,
      amount: Number(a.amount),
    })),
  };
}
