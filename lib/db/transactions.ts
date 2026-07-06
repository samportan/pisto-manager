import { createClient } from "../client";

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  destination_account_id: string | null;
  description: string | null;
  created_at: string;
};

export type NewTransaction = Omit<Transaction, "id" | "created_at">;

export type NewTransactionFormValues = {
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  destination_account_id: string | null;
  description: string | null;
};

export function transactionToFormValues(tx: Transaction): NewTransactionFormValues {
  return {
    account_id: tx.account_id,
    category_id: tx.category_id,
    type: tx.type,
    amount: Number(tx.amount),
    date: tx.date,
    destination_account_id: tx.destination_account_id,
    description: tx.description,
  };
}

export async function getTransactionsByUserId(
  userId: string
): Promise<Transaction[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) {
    throw error;
  }
  return data as Transaction[] | null;
}

export async function createTransaction(
  row: NewTransaction
): Promise<Transaction | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data as Transaction | null;
}

export type TransactionUpdate = Partial<
  Omit<Transaction, "id" | "user_id" | "created_at">
>;

export async function updateTransaction(
  id: string,
  userId: string,
  patch: TransactionUpdate
): Promise<Transaction | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction | null;
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
