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
