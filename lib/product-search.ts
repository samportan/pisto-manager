import type { Product } from "@/lib/db/products";

function searchTokensFromQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function filterProductsByName(products: Product[], query: string): Product[] {
  const tokens = searchTokensFromQuery(query);
  if (tokens.length === 0) return products;
  return products.filter((p) => {
    const hay = p.name.toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });
}
