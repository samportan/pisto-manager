"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/business/data-table";
import { ProductInsightsBarChart } from "@/components/business/product-insights-charts";
import { PageHeader } from "@/components/business/page-header";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSaleInsights } from "@/hooks/useBusinessAnalytics";
import { useT } from "@/hooks/useTranslations";
import type { InsightsPeriod } from "@/lib/analytics/shared";
import { formatMoneyDisplay } from "@/lib/format-money";
import type { PaymentMethod } from "@/lib/db/sales";

type CustomerSalesRank = {
  customerId: string | null;
  customerName: string;
  saleCount: number;
  revenue: number;
};

export function SaleInsightsView() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const [period, setPeriod] = React.useState<InsightsPeriod>("this_month");
  const walkInLabel = t("business.walkIn");
  const { data, isLoading } = useSaleInsights(period, walkInLabel);

  const periodKpis = data?.kpis;
  const paymentBreakdown = data?.paymentMethods ?? [];
  const customerRanking = (data?.customerRanking ?? []) as CustomerSalesRank[];
  const topCustomers = (data?.topCustomers ?? []).map((r) => ({
    name: r.customerName,
    total: r.revenue,
  }));
  const topDays = (data?.topDays ?? []).map((d) => ({
    name: d.date,
    total: d.revenue,
  }));

  const periodOptions: { value: InsightsPeriod; label: string }[] = [
    { value: "today", label: t("business.periodToday") },
    { value: "this_month", label: t("business.periodThisMonth") },
    { value: "last_30_days", label: t("business.period30Days") },
    { value: "all_time", label: t("business.periodAllTime") },
  ];

  function paymentLabel(method: PaymentMethod) {
    if (method === "cash") return t("business.paymentCash");
    if (method === "card") return t("business.paymentCard");
    return t("business.paymentTransfer");
  }

  const columns = React.useMemo<ColumnDef<CustomerSalesRank>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: t("business.customer"),
        cell: ({ row }) => <span className="font-medium">{row.original.customerName}</span>,
      },
      {
        accessorKey: "saleCount",
        header: t("business.saleCount"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.saleCount}</span>,
      },
      {
        accessorKey: "revenue",
        header: t("business.revenue"),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{fmt(row.original.revenue)}</span>
        ),
      },
    ],
    [fmt, t]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <PageHeader
          title={t("business.saleInsightsTitle")}
          description={t("business.saleInsightsSubtitle")}
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {periodOptions.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={period === opt.value ? "secondary" : "outline"}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading || !periodKpis ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard title={t("business.saleCount")} value={String(periodKpis.saleCount)} />
              <StatCard title={t("business.revenue")} value={fmt(periodKpis.revenue)} />
              <StatCard title={t("business.avgTicket")} value={fmt(periodKpis.avgTicket)} />
              <StatCard
                title={t("business.estimatedMargin")}
                value={fmt(periodKpis.estimatedMargin)}
              />
              <StatCard
                title={t("business.accountsReceivable")}
                value={fmt(periodKpis.accountsReceivable)}
              />
              <StatCard
                title={t("business.collectedInPeriod")}
                value={fmt(periodKpis.collectedInPeriod)}
              />
            </>
          )}
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("business.paymentBreakdown")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {paymentBreakdown.map((p) => (
            <div
              key={p.method}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{paymentLabel(p.method)}</Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {p.percentage.toFixed(0)}%
                </span>
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums">{fmt(p.revenue)}</p>
              <p className="text-xs text-muted-foreground">
                {t("business.saleCount")}: {p.count}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">{t("business.topCustomers")}</h3>
            <div className="mt-4">
              {isLoading ? (
                <div className="h-[180px] animate-pulse rounded-lg bg-muted/50" />
              ) : (
                <ProductInsightsBarChart
                  data={topCustomers}
                  emptyLabel={t("business.noSalesInPeriod")}
                />
              )}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">{t("business.revenueByDay")}</h3>
            <div className="mt-4">
              {isLoading ? (
                <div className="h-[180px] animate-pulse rounded-lg bg-muted/50" />
              ) : (
                <ProductInsightsBarChart
                  data={topDays}
                  emptyLabel={t("business.noSalesInPeriod")}
                />
              )}
            </div>
          </section>
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold">{t("business.customerRanking")}</h2>
        <DataTable
          data={customerRanking}
          columns={columns}
          isLoading={isLoading}
          emptyLabel={t("business.noSalesInPeriod")}
        />
      </div>
    </div>
  );
}
