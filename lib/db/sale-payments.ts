import { createClient } from "../client";
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
    p_amount: args.amount,
    p_payment_method: args.payment_method,
    p_date: args.date ?? new Date().toISOString(),
    p_notes: args.notes ?? null,
  });
  if (error) throw error;
  return data;
}
