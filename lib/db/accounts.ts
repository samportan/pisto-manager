import { createClient } from "../client";

export const ACCOUNT_TYPES = ["cash", "bank", "credit", "investment"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  is_active: boolean;
  created_at: string;
};

export type NewAccount = Omit<Account, "id" | "created_at">;

export type NewAccountFormValues = {
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  is_active: boolean;
};

export async function getAccountsByUserId(
  userId: string
): Promise<Account[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data;
}

export async function getAccountById(id: string): Promise<Account | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function createAccount(
  account: NewAccount
): Promise<Account | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert(account)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data ?? null;
}