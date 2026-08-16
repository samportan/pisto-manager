"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { PeriodFilter } from "@/components/analytics/period-filter";
import {
  BusinessRevenuePurchasesChart,
  HorizontalBarChart,
} from "@/components/business/business-overview-charts";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { Badge } from "@/components/ui/badge";
import { useBusinessOverview } from "@/hooks/useBusinessAnalytics";
import { useT } from "@/hooks/useTranslations";
import { percentChange } from "@/lib/analytics/personal";
import {
  insightsPeriodToMonth,
  monthToInsightsPeriod,
  type InsightsPeriod,
} from "@/lib/analytics/shared";
import { formatMoneyDisplay } from "@/lib/format-money";
import { isOutOfStock } from "@/lib/stock";
import {
  BUSINESS_TIMEZONE,
  calendarMonthKey,
  formatZonedMonthYear,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

function PnlRow({
  label,
  value,
  fmt,
  tone = "default",
  hint,
  emphasis = false,
  shareOf,
}: {
  label: string;
  value: number;
  fmt: (v: number) => string;
  tone?: "default" | "minus" | "result";
  hint?: string;
  emphasis?: boolean;
  shareOf?: number;
}) {
  const width =
    shareOf && shareOf > 0 ? Math.min(100, (Math.abs(value) / shareOf) * 100) : 0;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 py-2.5",
        emphasis && "border-t border-border pt-3"
      )}
    >
      <div className="min-w-0 flex-1">
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
        {shareOf != null && !emphasis ? (
          <div className="mt-1.5 h-1.5 max-w-[12rem] overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                tone === "minus" ? "bg-amber-500/80" : "bg-emerald-500/80"
              )}
              style={{ width: `${width}%` }}
            />
          </div>
        ) : null}
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
  const [period, setPeriod] = useState<InsightsPeriod>("this_month");
  const { data, isLoading } = useBusinessOverview(period);

  const chartMonths = useMemo(() => {
    if (!data) return [];
    return data.series.map((m) => {
      const [y, mo] = m.key.split("-").map(Number);
      const labelDate = new Date(Date.UTC(y, mo - 1, 15, 12, 0, 0));
      return {
        key: m.key,
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

  const viewingMonth = insightsPeriodToMonth(period);
  const activeMonthKey = viewingMonth
    ? calendarMonthKey(viewingMonth.year, viewingMonth.month)
    : undefined;

  const lowStockCount = data?.lowStockCount ?? 0;
  const lowStockPreview = data?.lowStockPreview ?? [];
  const lowStockHref = "/dashboard/business/products?stock=low";
  const month = data?.monthTotals;
  const prev = data?.prevTotals;
  const pnl = data?.pnl;
  const cash = data?.cashPosition;
  const cashIn = cash ? cash.cashIncome + cash.bankIncome : 0;
  const cashOut = cash ? cash.inventoryPurchases + cash.totalExpenses : 0;

  const revenueDelta = prev ? percentChange(month?.revenue ?? 0, prev.revenue) : null;
  const operatingDelta = prev
    ? percentChange(pnl?.operatingProfit ?? 0, prev.operatingProfit)
    : null;
  const netDelta = prev ? percentChange(pnl?.netProfit ?? 0, prev.netProfit) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("business.overviewTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("business.overviewSubtitle")}</p>
        </div>
      </div>

      <PeriodFilter
        value={period}
        onChange={setPeriod}
        presets={["this_month", "last_month", "last_30_days", "all_time"]}
        className="mt-6"
      />

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("business.pnlNetProfit")}
        </p>
        {isLoading || !pnl ? (
          <div className="mt-2 h-12 w-48 animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <p
              className={cn(
                "text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
                pnl.netProfit < 0 ? "text-destructive" : "text-primary"
              )}
            >
              {fmt(pnl.netProfit)}
            </p>
            {netDelta != null ? (
              <span className="text-sm text-muted-foreground">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    netDelta > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : netDelta < 0
                        ? "text-destructive"
                        : ""
                  )}
                >
                  {netDelta > 0 ? "↑" : netDelta < 0 ? "↓" : "—"} {Math.abs(netDelta).toFixed(0)}%
                </span>{" "}
                {t("business.vsPreviousPeriod")}
              </span>
            ) : null}
          </div>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{t("business.overviewHeroHint")}</p>
        <div className="mt-4 h-1 w-16 rounded-full bg-accent" />
      </section>

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
            <StatCard
              title={t("business.revenue")}
              value={fmt(month.revenue)}
              icon={TrendingUp}
              tone="positive"
              delta={revenueDelta}
              deltaLabel={t("business.vsPreviousPeriod")}
              href="/dashboard/business/sales"
            />
            <StatCard
              title={t("business.pnlOperatingProfit")}
              value={fmt(pnl.operatingProfit)}
              icon={Wallet}
              hint={t("business.pnlOperatingProfitHint")}
              delta={operatingDelta}
              deltaLabel={t("business.vsPreviousPeriod")}
            />
            <StatCard
              title={t("business.cashAvailableBalance")}
              value={fmt(cash.availableBalance)}
              icon={Wallet}
              tone={cash.availableBalance < 0 ? "danger" : "default"}
              hint={t("business.cashPositionSubtitle")}
              href="/dashboard/business/expenses"
            />
            <StatCard
              title={t("business.lowStockItems")}
              value={String(lowStockCount)}
              icon={AlertTriangle}
              tone={lowStockCount > 0 ? "danger" : "default"}
              href={lowStockHref}
            />
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
              <PnlRow
                label={t("business.pnlRevenue")}
                value={pnl.revenue}
                fmt={fmt}
                shareOf={pnl.revenue}
              />
              <PnlRow
                label={t("business.pnlCogs")}
                value={pnl.cogs}
                fmt={fmt}
                tone="minus"
                shareOf={pnl.revenue}
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
                shareOf={pnl.revenue}
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
                shareOf={pnl.revenue}
              />
              <PnlRow
                label={t("business.pnlPersonalExpenses")}
                value={pnl.personalExpenses}
                fmt={fmt}
                tone="minus"
                shareOf={pnl.revenue}
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
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">{t("business.cashInTotal")}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt(cashIn)}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">{t("business.cashOutTotal")}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-amber-600">
                    {fmt(cashOut)}
                  </p>
                </div>
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
          <p className="mt-0.5 text-xs text-muted-foreground">{t("business.chartClickMonth")}</p>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" />
            ) : (
              <BusinessRevenuePurchasesChart
                data={chartMonths}
                activeKey={activeMonthKey}
                onSelectMonth={(key) => {
                  const [y, mo] = key.split("-").map(Number);
                  setPeriod(monthToInsightsPeriod(y, mo));
                }}
              />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("business.topProductsPeriod")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">
            {period === "all_time"
              ? t("business.periodAllTime")
              : period === "last_30_days"
                ? t("business.period30Days")
                : period === "today"
                  ? t("business.periodToday")
                  : viewingMonth
                    ? formatZonedMonthYear(viewingMonth.year, viewingMonth.month, intlLocale)
                    : t("business.thisMonth")}
          </p>
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

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("business.quickActions")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Quick
            href="/dashboard/business/sales/new"
            label={t("business.newSale")}
            icon={ShoppingCart}
          />
          <Quick
            href="/dashboard/business/purchases/new"
            label={t("business.newPurchase")}
            icon={Boxes}
          />
          <Quick
            href="/dashboard/business/expenses"
            label={t("business.newExpense")}
            icon={Receipt}
          />
          <Quick
            href="/dashboard/business/products"
            label={t("business.manageProducts")}
            icon={Package}
          />
        </div>
      </div>
    </div>
  );
}

function Quick({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Package;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="size-5" aria-hidden />
      </span>
      {label}
    </Link>
  );
}
