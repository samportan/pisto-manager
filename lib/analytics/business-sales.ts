import type { PaymentMethod, SaleWithMeta } from "@/lib/db/sales";
import type { SalePayment } from "@/lib/db/sale-payments";
import type { ProductInsightSaleItem } from "@/lib/db/product-insights";
import { filterByPeriod, type InsightsPeriod } from "@/lib/analytics/shared";
import { sumMoney } from "@/lib/money";

export type { InsightsPeriod };

export type PeriodSaleKpis = {
  saleCount: number;
  revenue: number;
  avgTicket: number;
  estimatedMargin: number;
  accountsReceivable: number;
  openCreditCount: number;
  collectedInPeriod: number;
};

export type PaymentMethodBreakdown = {
  method: PaymentMethod;
  revenue: number;
  count: number;
  percentage: number;
};

export type CustomerSalesRank = {
  customerId: string | null;
  customerName: string;
  saleCount: number;
  revenue: number;
};

export type DailyRevenue = {
  date: string;
  revenue: number;
  count: number;
};

export function filterSalesByPeriod(
  sales: SaleWithMeta[],
  period: InsightsPeriod,
  now = new Date()
): SaleWithMeta[] {
  return filterByPeriod(sales, period, (s) => s.date, now);
}

export function filterPaymentsByPeriod(
  payments: SalePayment[],
  period: InsightsPeriod,
  now = new Date()
): SalePayment[] {
  return filterByPeriod(payments, period, (p) => p.date, now);
}

export function getPeriodSaleKpis(
  sales: SaleWithMeta[],
  saleItems: ProductInsightSaleItem[],
  period: InsightsPeriod,
  payments: SalePayment[] = [],
  now = new Date()
): PeriodSaleKpis {
  const filtered = filterSalesByPeriod(sales, period, now);
  const saleIds = new Set(filtered.map((s) => s.id));
  const items = saleItems.filter((i) => saleIds.has(i.sale_id));
  const revenue = sumMoney(...filtered.map((s) => Number(s.total)));
  const estimatedMargin = items.reduce((sum, i) => {
    const cost = Number(i.cost_price ?? 0) * Number(i.quantity);
    return sum + Number(i.line_total) - cost;
  }, 0);
  const saleCount = filtered.length;

  const openSales = sales.filter((s) => s.payment_status !== "paid");
  const accountsReceivable = sumMoney(...openSales.map((s) => Number(s.balance_due)));
  const openCreditCount = openSales.length;

  const periodPayments = filterPaymentsByPeriod(payments, period, now);
  const collectedInPeriod = sumMoney(...periodPayments.map((p) => Number(p.amount)));

  return {
    saleCount,
    revenue,
    avgTicket: saleCount > 0 ? revenue / saleCount : 0,
    estimatedMargin,
    accountsReceivable,
    openCreditCount,
    collectedInPeriod,
  };
}

export function getPaymentMethodBreakdown(
  sales: SaleWithMeta[],
  period: InsightsPeriod,
  now = new Date()
): PaymentMethodBreakdown[] {
  const filtered = filterSalesByPeriod(sales, period, now);
  const total = sumMoney(...filtered.map((s) => Number(s.total)));
  const methods: PaymentMethod[] = ["cash", "card", "transfer"];
  return methods.map((method) => {
    const matching = filtered.filter((s) => s.payment_method === method);
    const revenue = sumMoney(...matching.map((s) => Number(s.total)));
    return {
      method,
      revenue,
      count: matching.length,
      percentage: total > 0 ? (revenue / total) * 100 : 0,
    };
  });
}

export function getCustomerSalesRanking(
  sales: SaleWithMeta[],
  contactNames: Map<string, string>,
  walkInLabel: string,
  period: InsightsPeriod,
  now = new Date()
): CustomerSalesRank[] {
  const filtered = filterSalesByPeriod(sales, period, now);
  const byCustomer = new Map<string | null, CustomerSalesRank>();

  for (const s of filtered) {
    const key = s.customer_id;
    const existing = byCustomer.get(key) ?? {
      customerId: key,
      customerName: key ? contactNames.get(key) ?? "?" : walkInLabel,
      saleCount: 0,
      revenue: 0,
    };
    existing.saleCount += 1;
    existing.revenue = sumMoney(existing.revenue, Number(s.total));
    byCustomer.set(key, existing);
  }

  return [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);
}

export function getTopCustomersByRevenue(ranking: CustomerSalesRank[], n: number) {
  return ranking.slice(0, n).map((r) => ({
    name: r.customerName,
    total: r.revenue,
  }));
}

export function getSalesByDay(
  sales: SaleWithMeta[],
  period: InsightsPeriod,
  now = new Date()
): DailyRevenue[] {
  const filtered = filterSalesByPeriod(sales, period, now);
  const byDay = new Map<string, DailyRevenue>();

  for (const s of filtered) {
    const day = s.date.slice(0, 10);
    const existing = byDay.get(day) ?? { date: day, revenue: 0, count: 0 };
    existing.revenue = sumMoney(existing.revenue, Number(s.total));
    existing.count += 1;
    byDay.set(day, existing);
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getTopDaysByRevenue(daily: DailyRevenue[], n: number) {
  return [...daily]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n)
    .map((d) => ({
      name: d.date,
      total: d.revenue,
    }));
}
