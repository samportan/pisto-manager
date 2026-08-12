"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  BusinessRevenuePurchasesChart,
  HorizontalBarChart,
} from "@/components/business/business-overview-charts";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { Badge } from "@/components/ui/badge";
import { useBusinessOverview } from "@/hooks/useBusinessAnalytics";
import { useT } from "@/hooks/useTranslations";
import { formatMoneyDisplay } from "@/lib/format-money";
import { isOutOfStock } from "@/lib/stock";
import { BUSINESS_TIMEZONE } from "@/lib/timezone";
import { cn } from "@/lib/utils";

function PnlRow({
  label,
  value,
  fmt,
  tone = "default",
  hint,
  emphasis = false,
}: {
  label: string;
  value: number;
  fmt: (v: number) => string;
  tone?: "default" | "minus" | "result";
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 py-2.5",
        emphasis && "border-t border-border pt-3"
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm",
            emphasis ? "font-semibold" : "text-muted-foreground",
            tone === "minus" && !emphasis && "text-muted-foreground"
          )}
        >
          {tone === "minus" ? `− ${label}` : tone === "result" ? `= ${label}` : `+ ${label}`}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <p
        className={cn(
          "shrink-0 tabular-nums text-sm",
          emphasis ? "text-base font-bold" : "font-medium",
          value < 0 && "text-destructive"
        )}
      >
        {fmt(value)}
      </p>
    </div>
  );
}

export function BusinessOverview() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { data, isLoading } = useBusinessOverview();

  const chartMonths = useMemo(() => {
    if (!data) return [];
    return data.series.map((m) => {
      const [y, mo] = m.key.split("-").map(Number);
      const labelDate = new Date(Date.UTC(y, mo - 1, 15, 12, 0, 0));
      return {
        label: labelDate.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
          timeZone: BUSINESS_TIMEZONE,
        }),
        revenue: m.revenue,
        purchases: m.purchases,
      };
    });
  }, [data]);

  const topProducts = useMemo(
    () =>
      (data?.topProducts ?? []).map((item) => ({
        name: item.productName,
        total: item.revenue,
      })),
    [data]
  );

  const lowStockCount = data?.lowStockCount ?? 0;
  const lowStockPreview = data?.lowStockPreview ?? [];
  const lowStockHref = "/dashboard/business/products?stock=low";
  const month = data?.monthTotals;
  const pnl = data?.pnl;
  const cash = data?.cashPosition;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("business.overviewTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("business.overviewSubtitle")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !month || !pnl || !cash ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title={t("business.revenue")} value={fmt(month.revenue)} />
            <StatCard
              title={t("business.pnlOperatingProfit")}
              value={fmt(pnl.operatingProfit)}
            />
            <StatCard title={t("business.pnlNetProfit")} value={fmt(pnl.netProfit)} />
            <Link
              href={lowStockHref}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <article
                className={cn(
                  "h-full rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30",
                  lowStockCount > 0 ? "border-destructive/40" : "border-border"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    lowStockCount > 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {t("business.lowStockItems")}
                </p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-bold tabular-nums",
                    lowStockCount > 0 && "text-destructive"
                  )}
                >
                  {String(lowStockCount)}
                </p>
              </article>
            </Link>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("business.pnlTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("business.pnlSubtitle")}</p>
          {isLoading || !pnl ? (
            <div className="mt-4 h-56 animate-pulse rounded-lg bg-muted/50" />
          ) : (
            <div className="mt-2 divide-y divide-border/70">
              <PnlRow label={t("business.pnlRevenue")} value={pnl.revenue} fmt={fmt} />
              <PnlRow
                label={t("business.pnlCogs")}
                value={pnl.cogs}
                fmt={fmt}
                tone="minus"
              />
              <PnlRow
                label={t("business.pnlGrossProfit")}
                value={pnl.grossProfit}
                fmt={fmt}
                tone="result"
                emphasis
              />
              <PnlRow
                label={t("business.pnlOperatingExpenses")}
                value={pnl.operatingExpenses}
                fmt={fmt}
                tone="minus"
              />
              <PnlRow
                label={t("business.pnlOperatingProfit")}
                value={pnl.operatingProfit}
                fmt={fmt}
                tone="result"
                hint={t("business.pnlOperatingProfitHint")}
                emphasis
              />
              <PnlRow
                label={t("business.pnlFinancialExpenses")}
                value={pnl.financialExpenses}
                fmt={fmt}
                tone="minus"
              />
              <PnlRow
                label={t("business.pnlPersonalExpenses")}
                value={pnl.personalExpenses}
                fmt={fmt}
                tone="minus"
              />
              <PnlRow
                label={t("business.pnlNetProfit")}
                value={pnl.netProfit}
                fmt={fmt}
                tone="result"
                hint={t("business.pnlNetProfitHint")}
                emphasis
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("business.cashPositionTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("business.cashPositionSubtitle")}
          </p>
          {isLoading || !cash ? (
            <div className="mt-4 h-56 animate-pulse rounded-lg bg-muted/50" />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-muted/40 px-3 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("business.cashAvailableBalance")}
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-bold tabular-nums",
                    cash.availableBalance < 0 && "text-destructive"
                  )}
                >
                  {fmt(cash.availableBalance)}
                </p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("business.cashIncome")}</dt>
                  <dd className="tabular-nums font-medium">{fmt(cash.cashIncome)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("business.bankIncome")}</dt>
                  <dd className="tabular-nums font-medium">{fmt(cash.bankIncome)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("business.cashInventoryOut")}</dt>
                  <dd className="tabular-nums font-medium">
                    {fmt(cash.inventoryPurchases)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("business.cashExpensesOut")}</dt>
                  <dd className="tabular-nums font-medium">{fmt(cash.totalExpenses)}</dd>
                </div>
              </dl>
              {cash.recurringExpenseCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("business.recurringExpensesAlert", {
                    count: cash.recurringExpenseCount,
                  })}
                </p>
              ) : null}
              <Link
                href="/dashboard/business/expenses"
                className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("business.newExpense")}
              </Link>
            </div>
          )}
        </section>
      </div>

      {!isLoading && lowStockCount > 0 ? (
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
              <BusinessRevenuePurchasesChart data={chartMonths} />
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

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Quick href="/dashboard/business/products" label={t("business.manageProducts")} />
        <Quick href="/dashboard/business/sales" label={t("business.newSale")} />
        <Quick href="/dashboard/business/expenses" label={t("business.newExpense")} />
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
