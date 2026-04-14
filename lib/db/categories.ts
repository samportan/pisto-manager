import { createClient } from "../client";

export const CATEGORY_TYPES = ["income", "expense"] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  parent_category_id: string | null;
  icon: string | null;
  color: string | null;
};

export type NewCategory = Omit<Category, "id">;

export type NewCategoryFormValues = {
  name: string;
  type: CategoryType;
  color: string;
};

export async function getCategoriesByUserId(
  userId: string
): Promise<Category[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data as Category[] | null;
}

export async function createCategory(
  row: NewCategory
): Promise<Category | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(row)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data as Category | null;
}
