"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  BusinessRevenuePurchasesChart,
  HorizontalBarChart,
} from "@/components/business/business-overview-charts";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { useProductInsights } from "@/hooks/useProductInsights";
import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";
import { useSales } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { getLastNMonthsBusinessTotals } from "@/lib/analytics/business";
import {
  getProductSalesRanking,
  getTopProductsByRevenue,
} from "@/lib/analytics/business-products";
import { formatMoney } from "@/lib/format-money";

export function BusinessOverview() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { products, isLoading: productsLoading } = useProducts();
  const { sales, isLoading: salesLoading } = useSales();
  const { purchases, isLoading: purchasesLoading } = usePurchases();
  const { saleItems, isLoading: insightsLoading } = useProductInsights();
  const isLoading = productsLoading || salesLoading || purchasesLoading || insightsLoading;

  const stats = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const monthSales = sales.filter((x) => {
      const d = new Date(x.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const monthPurchases = purchases.filter((x) => {
      const d = new Date(x.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const revenue = monthSales.reduce((sum, x) => sum + Number(x.total ?? 0), 0);
    const expense = monthPurchases.reduce((sum, x) => sum + Number(x.total ?? 0), 0);
    const lowStock = products.filter(
      (p) => (p.min_stock ?? 0) > 0 && p.stock <= (p.min_stock ?? 0)
    ).length;
    return { revenue, expense, lowStock, margin: revenue - expense };
  }, [products, purchases, sales]);

  const chartMonths = useMemo(
    () => getLastNMonthsBusinessTotals(sales, purchases, 6),
    [sales, purchases]
  );

  const topProducts = useMemo(() => {
    const ranking = getProductSalesRanking(saleItems, products, "this_month");
    return getTopProductsByRevenue(ranking, 5).map((item) => ({
      name: item.productName,
      total: item.revenue,
    }));
  }, [saleItems, products]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("business.overviewTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("business.overviewSubtitle")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title={t("business.revenue")} value={fmt(stats.revenue)} />
            <StatCard title={t("business.purchases")} value={fmt(stats.expense)} />
            <StatCard title={t("business.grossMargin")} value={fmt(stats.margin)} />
            <StatCard title={t("business.lowStockItems")} value={String(stats.lowStock)} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("business.revenueVsPurchases")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("business.chartLast6Months")}</p>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" />
            ) : (
              <BusinessRevenuePurchasesChart
                data={chartMonths.map((m) => ({
                  label: m.label,
                  revenue: m.revenue,
                  purchases: m.purchases,
                }))}
              />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("business.topProductsThisMonth")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("business.thisMonth")}</p>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" />
            ) : (
              <HorizontalBarChart
                data={topProducts}
                emptyLabel={t("business.noSalesInPeriod")}
              />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Quick href="/dashboard/business/products" label={t("business.manageProducts")} />
        <Quick href="/dashboard/business/sales" label={t("business.newSale")} />
      </div>
    </div>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30"
    >
      {label}
    </Link>
  );
}
