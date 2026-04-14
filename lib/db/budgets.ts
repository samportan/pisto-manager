import { createClient } from "../client";

/** Align these labels with your Postgres `budget_period` enum (or equivalent). */
export const BUDGET_PERIODS = [
  "monthly",
  "weekly",
  "quarterly",
  "yearly",
] as const;

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
};

export type BudgetCategoryEmbed = {
  id: string;
  name: string;
  color: string | null;
  type: string;
};

export type BudgetWithCategory = Budget & {
  categories: BudgetCategoryEmbed | null;
};

export type NewBudget = Omit<Budget, "id">;

export type BudgetFormValues = {
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
};

export async function getBudgetsByUserId(
  userId: string
): Promise<BudgetWithCategory[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      *,
      categories (
        id,
        name,
        color,
        type
      )
    `
    )
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  if (error) {
    throw error;
  }
  return data as BudgetWithCategory[] | null;
}

export async function createBudget(row: NewBudget): Promise<Budget | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .insert(row)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data as Budget | null;
}

export async function updateBudget(
  id: string,
  patch: Partial<Pick<Budget, "amount" | "period" | "start_date" | "end_date" | "category_id">>
): Promise<Budget | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data as Budget | null;
}

export async function deleteBudget(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) {
    throw error;
  }
}
