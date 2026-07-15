"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  BusinessRevenuePurchasesChart,
  HorizontalBarChart,
} from "@/components/business/business-overview-charts";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { Badge } from "@/components/ui/badge";
import { useProductInsights } from "@/hooks/useProductInsights";
import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";
import { useSales } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { getLastNMonthsBusinessTotals, getMonthBusinessTotals } from "@/lib/analytics/business";
import {
  getProductSalesRanking,
  getTopProductsByRevenue,
} from "@/lib/analytics/business-products";
import { formatMoneyDisplay } from "@/lib/format-money";
import { getLowStockProducts, isOutOfStock } from "@/lib/stock";
import { getZonedParts } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const LOW_STOCK_PREVIEW = 8;

export function BusinessOverview() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { products, isLoading: productsLoading } = useProducts();
  const { sales, isLoading: salesLoading } = useSales();
  const { purchases, isLoading: purchasesLoading } = usePurchases();
  const { saleItems, isLoading: insightsLoading } = useProductInsights();
  const isLoading = productsLoading || salesLoading || purchasesLoading || insightsLoading;

  const stats = useMemo(() => {
    const { year, month } = getZonedParts(new Date());
    const totals = getMonthBusinessTotals(sales, purchases, year, month);
    const lowStockProducts = getLowStockProducts(products);
    return {
      revenue: totals.revenue,
      expense: totals.purchases,
      lowStock: lowStockProducts.length,
      lowStockProducts,
      margin: totals.margin,
    };
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

  const lowStockPreview = stats.lowStockProducts.slice(0, LOW_STOCK_PREVIEW);
  const lowStockHref = "/dashboard/business/products?stock=low";

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
            <Link href={lowStockHref} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <article
                className={cn(
                  "h-full rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30",
                  stats.lowStock > 0 ? "border-destructive/40" : "border-border"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    stats.lowStock > 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {t("business.lowStockItems")}
                </p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-bold tabular-nums",
                    stats.lowStock > 0 && "text-destructive"
                  )}
                >
                  {String(stats.lowStock)}
                </p>
              </article>
            </Link>
          </>
        )}
      </div>

      {!isLoading && stats.lowStock > 0 ? (
        <section className="mt-6 rounded-xl border border-destructive/30 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-destructive">
                {t("business.lowStockAlertTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("business.lowStockAlertSubtitle")}
              </p>
            </div>
            <Link
              href={lowStockHref}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("business.lowStockViewAll")}
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {lowStockPreview.map((product) => {
              const out = isOutOfStock(product);
              return (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t("business.stockVsMin", {
                        stock: product.stock,
                        min: product.min_stock ?? 0,
                      })}{" "}
                      {t(`business.uom.${product.unit_of_measure ?? "unit"}`)}
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0 text-[0.65rem]">
                    {out ? t("business.outOfStock") : t("business.low")}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
