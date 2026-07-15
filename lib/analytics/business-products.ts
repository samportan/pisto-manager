import type { ProductInsightSaleItem } from "@/lib/db/product-insights";
import type { Product } from "@/lib/db/products";
import {
  filterByPeriod,
  filterFullyPaidSales,
  type InsightsPeriod,
} from "@/lib/analytics/shared";
import { isLowStock, isOutOfStock } from "@/lib/stock";

export type { InsightsPeriod } from "@/lib/analytics/shared";

export type InventoryKpis = {
  inventoryValueCost: number;
  inventoryValueRetail: number;
  potentialMargin: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type ProductSalesRank = {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  estimatedMargin: number;
  stock: number;
  lowStock: boolean;
  outOfStock: boolean;
};

export function filterSaleItemsByPeriod(
  items: ProductInsightSaleItem[],
  period: InsightsPeriod,
  now = new Date()
): ProductInsightSaleItem[] {
  return filterFullyPaidSales(filterByPeriod(items, period, (item) => item.sale_date, now));
}

export function getInventoryKpis(products: Product[]): InventoryKpis {
  let inventoryValueCost = 0;
  let inventoryValueRetail = 0;
  let activeProducts = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const stock = Number(p.stock);
    const cost = Number(p.cost_price);
    const retail = Number(p.sale_price);
    inventoryValueCost += stock * cost;
    inventoryValueRetail += stock * retail;
    if (p.is_active) activeProducts += 1;
    if (isOutOfStock(p)) outOfStockCount += 1;
    if (isLowStock(p)) lowStockCount += 1;
  }

  return {
    inventoryValueCost,
    inventoryValueRetail,
    potentialMargin: inventoryValueRetail - inventoryValueCost,
    activeProducts,
    lowStockCount,
    outOfStockCount,
  };
}

export function getProductSalesRanking(
  saleItems: ProductInsightSaleItem[],
  products: Product[],
  period: InsightsPeriod
): ProductSalesRank[] {
  const filtered = filterSaleItemsByPeriod(saleItems, period);
  const byProduct = new Map<
    string,
    { unitsSold: number; revenue: number; estimatedMargin: number; name: string }
  >();

  for (const item of filtered) {
    const cost = item.cost_price ?? 0;
    const margin = item.line_total - item.quantity * cost;
    const existing = byProduct.get(item.product_id);
    if (existing) {
      existing.unitsSold += item.quantity;
      existing.revenue += item.line_total;
      existing.estimatedMargin += margin;
    } else {
      byProduct.set(item.product_id, {
        unitsSold: item.quantity,
        revenue: item.line_total,
        estimatedMargin: margin,
        name: item.product_name ?? item.product_id,
      });
    }
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  return Array.from(byProduct.entries())
    .map(([productId, stats]) => {
      const product = productMap.get(productId);
      const stock = product ? Number(product.stock) : 0;
      return {
        productId,
        productName: stats.name,
        unitsSold: stats.unitsSold,
        revenue: stats.revenue,
        estimatedMargin: stats.estimatedMargin,
        stock,
        lowStock: product ? isLowStock(product) : false,
        outOfStock: product ? isOutOfStock(product) : stock <= 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getTopProductsByRevenue(ranking: ProductSalesRank[], n: number) {
  return ranking.slice(0, n);
}

export function getTopProductsByUnits(ranking: ProductSalesRank[], n: number) {
  return [...ranking].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, n);
}

export function getDeadStockProducts(
  products: Product[],
  saleItems: ProductInsightSaleItem[],
  period: InsightsPeriod
): Product[] {
  const filtered = filterSaleItemsByPeriod(saleItems, period);
  const soldIds = new Set(filtered.map((item) => item.product_id));
  return products.filter((p) => Number(p.stock) > 0 && !soldIds.has(p.id));
}

export function getPeriodSalesKpis(
  saleItems: ProductInsightSaleItem[],
  period: InsightsPeriod
) {
  const filtered = filterSaleItemsByPeriod(saleItems, period);
  let revenue = 0;
  let unitsSold = 0;
  let estimatedMargin = 0;

  for (const item of filtered) {
    revenue += item.line_total;
    unitsSold += item.quantity;
    estimatedMargin += item.line_total - item.quantity * (item.cost_price ?? 0);
  }

  return { revenue, unitsSold, estimatedMargin };
}
