"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";
import { useSales } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";

export function BusinessOverview() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { products, isLoading: productsLoading } = useProducts();
  const { sales, isLoading: salesLoading } = useSales({ includeDeleted: true });
  const { purchases, isLoading: purchasesLoading } = usePurchases({ includeDeleted: true });
  const isLoading = productsLoading || salesLoading || purchasesLoading;

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("business.overviewTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("business.overviewSubtitle")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat title={t("business.revenue")} value={fmt(stats.revenue)} />
            <Stat title={t("business.purchases")} value={fmt(stats.expense)} />
            <Stat title={t("business.grossMargin")} value={fmt(stats.margin)} />
            <Stat title={t("business.lowStockItems")} value={String(stats.lowStock)} />
          </>
        )}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Quick href="/dashboard/business/products" label={t("business.manageProducts")} />
        <Quick href="/dashboard/business/sales" label={t("business.newSale")} />
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}

function StatSkeleton() {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
    </article>
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
