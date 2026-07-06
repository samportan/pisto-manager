"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";
import { useSales } from "@/hooks/useSales";
import { formatMoney } from "@/lib/format-money";

export function BusinessOverview() {
  const { products } = useProducts();
  const { sales } = useSales({ includeDeleted: true });
  const { purchases } = usePurchases({ includeDeleted: true });

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
      <h1 className="text-3xl font-bold tracking-tight">Business overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Monthly KPIs (includes soft-deleted docs so numbers stay stable).
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Revenue" value={formatMoney(stats.revenue)} />
        <Stat title="Purchases" value={formatMoney(stats.expense)} />
        <Stat title="Gross margin" value={formatMoney(stats.margin)} />
        <Stat title="Low stock items" value={String(stats.lowStock)} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Quick href="/dashboard/business/products" label="Manage products" />
        <Quick href="/dashboard/business/sales" label="New sale" />
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
