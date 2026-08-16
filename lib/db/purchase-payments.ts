import { createClient } from "../client";
import { toRpcMoney } from "../money";
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
