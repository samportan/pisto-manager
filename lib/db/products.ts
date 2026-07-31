import { createClient } from "../client";
import type { UnitOfMeasure } from "@/lib/uom";

export type Product = {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sale_price: number;
  cost_price: number;
  stock: number;
  min_stock: number | null;
  unit_of_measure: UnitOfMeasure;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type NewProduct = Omit<Product, "id" | "created_at" | "deleted_at">;

export type ListProductsOptions = { includeDeleted?: boolean };

export async function getProductsByOrgId(
  orgId: string,
  opts?: ListProductsOptions
): Promise<Product[]> {
  const supabase = createClient();
  let q = supabase.from("products").select("*").eq("organization_id", orgId);
  if (!opts?.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...(p as Product),
    barcode: ((p as Product).barcode ?? null) as string | null,
    unit_of_measure: ((p as Product).unit_of_measure ?? "unit") as UnitOfMeasure,
  }));
}

export async function createProduct(payload: NewProduct): Promise<Product> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...payload, deleted_at: null as string | null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(
  id: string,
  patch: Partial<NewProduct>
): Promise<Product> {
  // Stock must change only via sales, purchases, or create_stock_adjustment.
  const safePatch = { ...patch };
  delete safePatch.stock;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(safePatch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function softDeleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const deleteProduct = softDeleteProduct;

export async function getProductStock(id: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("stock")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Product not found");
  return Number((data as { stock: number }).stock);
}
