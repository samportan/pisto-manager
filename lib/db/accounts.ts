import { createClient } from "../client";

export const ACCOUNT_TYPES = ["cash", "bank", "credit", "investment"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string | null;
  is_active: boolean;
  created_at: string;
  credit_limit: number | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  billing_cycle: string | null;
  due_date: string | null;
};

export type NewAccount = Omit<Account, "id" | "created_at">;

export type NewAccountFormValues = {
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  is_active: boolean;
  credit_limit: number | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  billing_cycle: string | null;
  due_date: string | null;
};

export function parseOptionalNumberInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function creditFieldsForAccountType(
  type: AccountType,
  values: Pick<
    NewAccountFormValues,
    | "credit_limit"
    | "interest_rate"
    | "minimum_payment"
    | "billing_cycle"
    | "due_date"
  >
): Pick<
  Account,
  | "credit_limit"
  | "interest_rate"
  | "minimum_payment"
  | "billing_cycle"
  | "due_date"
> {
  if (type !== "credit") {
    return {
      credit_limit: null,
      interest_rate: null,
      minimum_payment: null,
      billing_cycle: null,
      due_date: null,
    };
  }
  return {
    credit_limit: values.credit_limit,
    interest_rate: values.interest_rate,
    minimum_payment: values.minimum_payment,
    billing_cycle: values.billing_cycle?.trim() || null,
    due_date: values.due_date || null,
  };
}

export type AccountNetSummary = {
  cashAndBank: number;
  investments: number;
  liquidAssets: number;
  creditAvailable: number;
  netWorth: number;
};

export function summarizeAccountsNetWorth(
  accounts: Pick<Account, "type" | "balance" | "is_active">[]
): AccountNetSummary {
  const active = accounts.filter((a) => a.is_active);
  const cashAndBank = active
    .filter((a) => a.type === "cash" || a.type === "bank")
    .reduce((sum, a) => sum + a.balance, 0);
  const investments = active
    .filter((a) => a.type === "investment")
    .reduce((sum, a) => sum + a.balance, 0);
  const liquidAssets = cashAndBank + investments;
  const creditAvailable = active
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => sum + a.balance, 0);
  return {
    cashAndBank,
    investments,
    liquidAssets,
    creditAvailable,
    netWorth: liquidAssets,
  };
}

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
  return data as Account[] | null;
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
  return data as Account | null;
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
  return data as Account | null;
}

export async function updateAccount(
  id: string,
  account: Partial<NewAccount>
): Promise<Account | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("accounts")
    .update(account)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as Account | null;
}
