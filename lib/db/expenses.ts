import { createClient } from "../client";

export const EXPENSE_CATEGORIES = ["operating", "financial", "personal"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_PAYMENT_METHODS = ["petty_cash", "bank", "sales_cash"] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const OPERATING_SUBCATEGORIES = [
  "electricity",
  "water",
  "rent",
  "transport",
  "maintenance",
  "office_supplies",
  "salaries",
  "internet_phone",
  "other_operating",
] as const;

export const FINANCIAL_SUBCATEGORIES = [
  "bank_loan",
  "informal_loan",
  "interest",
  "bank_fees",
  "other_financial",
] as const;

export const PERSONAL_SUBCATEGORIES = [
  "owner_salary",
  "owner_withdrawal",
  "other_personal",
] as const;

export const EXPENSE_SUBCATEGORIES_BY_CATEGORY: Record<
  ExpenseCategory,
  readonly string[]
> = {
  operating: OPERATING_SUBCATEGORIES,
  financial: FINANCIAL_SUBCATEGORIES,
  personal: PERSONAL_SUBCATEGORIES,
};

export type Expense = {
  id: string;
  user_id: string;
  organization_id: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  subcategory: string;
  payment_method: ExpensePaymentMethod;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type NewExpense = Omit<Expense, "id" | "created_at" | "deleted_at">;

export type ListExpensesOptions = { includeDeleted?: boolean };

function normalizeExpense(row: Expense): Expense {
  return {
    ...row,
    amount: Number(row.amount ?? 0),
    is_recurring: Boolean(row.is_recurring),
    category: row.category as ExpenseCategory,
    payment_method: row.payment_method as ExpensePaymentMethod,
  };
}

export function isValidSubcategory(
  category: ExpenseCategory,
  subcategory: string
): boolean {
  return (EXPENSE_SUBCATEGORIES_BY_CATEGORY[category] as readonly string[]).includes(
    subcategory
  );
}

export async function getExpensesByOrgId(
  orgId: string,
  opts?: ListExpensesOptions
): Promise<Expense[]> {
  const supabase = createClient();
  let q = supabase.from("expenses").select("*").eq("organization_id", orgId);
  if (!opts?.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Expense[]).map(normalizeExpense);
}

export async function createExpense(payload: NewExpense): Promise<Expense> {
  if (!isValidSubcategory(payload.category, payload.subcategory)) {
    throw new Error("Invalid expense subcategory for category.");
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...payload, deleted_at: null })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeExpense(data as Expense);
}

export async function updateExpense(
  id: string,
  patch: Partial<
    Pick<
      NewExpense,
      | "amount"
      | "date"
      | "category"
      | "subcategory"
      | "payment_method"
      | "is_recurring"
      | "notes"
    >
  >
): Promise<Expense> {
  if (
    patch.category != null &&
    patch.subcategory != null &&
    !isValidSubcategory(patch.category, patch.subcategory)
  ) {
    throw new Error("Invalid expense subcategory for category.");
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeExpense(data as Expense);
}

export async function softDeleteExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const deleteExpense = softDeleteExpense;
