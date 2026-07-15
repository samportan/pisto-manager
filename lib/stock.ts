import type { Product } from "@/lib/db/products";

type StockLike = {
  stock: number;
  min_stock?: number | null;
};

export function isOutOfStock(product: StockLike): boolean {
  return Number(product.stock) <= 0;
}

export function isLowStock(product: StockLike): boolean {
  const minStock = product.min_stock ?? 0;
  return minStock > 0 && Number(product.stock) <= minStock;
}

export function stockUrgency(product: StockLike): number {
  const stock = Number(product.stock);
  const minStock = product.min_stock ?? 0;
  if (stock <= 0) return Number.NEGATIVE_INFINITY;
  return stock - minStock;
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products
    .filter(isLowStock)
    .slice()
    .sort((a, b) => {
      const urgencyDiff = stockUrgency(a) - stockUrgency(b);
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.name.localeCompare(b.name);
    });
}
