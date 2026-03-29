import { createClient } from "../client";

export type Loan = {
  id: string;
  user_id: string;
  account_id: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  end_date: string;
  monthly_payment: number;
  status: string;
};

export async function getLoansByAccountId(
  accountId: string
): Promise<Loan[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("account_id", accountId)
    .order("start_date", { ascending: false });
  if (error) {
    throw error;
  }
  return data as Loan[] | null;
}

export async function getLoansByUserId(
  userId: string
): Promise<Loan[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  if (error) {
    throw error;
  }
  return data as Loan[] | null;
}
