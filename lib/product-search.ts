import { looksLikeProductCode, normalizeProductCode } from "@/lib/barcode/normalize";
import type { Product } from "@/lib/db/products";

function searchTokensFromQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function codesEqual(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  return normalizeProductCode(a).toLowerCase() === normalizeProductCode(b).toLowerCase();
}

/** @deprecated Prefer filterProductsForPicker */
export function filterProductsByName(products: Product[], query: string): Product[] {
  return filterProductsForPicker(products, query);
}

export function findProductByCode(
  products: Product[],
  code: string,
  options?: { activeOnly?: boolean }
): Product | undefined {
  const normalized = normalizeProductCode(code);
  if (!normalized) return undefined;

  const pool = options?.activeOnly ? products.filter((p) => p.is_active) : products;

  const byBarcode = pool.find((p) => codesEqual(p.barcode, normalized));
  if (byBarcode) return byBarcode;

  return pool.find((p) => codesEqual(p.sku, normalized));
}

export function filterProductsForPicker(products: Product[], query: string): Product[] {
  const trimmed = query.trim();
  if (!trimmed) return products;

  if (looksLikeProductCode(trimmed)) {
    const exact = findProductByCode(products, trimmed);
    if (exact) {
      const rest = products.filter((p) => p.id !== exact.id);
      const tokens = searchTokensFromQuery(trimmed);
      const fuzzy = rest.filter((p) => productMatchesTokens(p, tokens));
      return [exact, ...fuzzy];
    }
  }

  const tokens = searchTokensFromQuery(trimmed);
  if (tokens.length === 0) return products;
  return products.filter((p) => productMatchesTokens(p, tokens));
}

function productMatchesTokens(p: Product, tokens: string[]): boolean {
  const hay = [p.name, p.sku ?? "", p.barcode ?? ""].join(" ").toLowerCase();
  return tokens.every((tok) => hay.includes(tok));
}
