"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { ExportExcelButton } from "@/components/business/export-excel-button";
import { PageHeader } from "@/components/business/page-header";
import { ProductInsightsBarChart } from "@/components/business/product-insights-charts";
import { DataTable } from "@/components/business/data-table";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useProductInsightsAgg } from "@/hooks/useBusinessAnalytics";
import { useT } from "@/hooks/useTranslations";
import type { InsightsPeriod } from "@/lib/analytics/shared";
import type { ProductSalesRank } from "@/lib/analytics/business-products";
import {
  buildFullBusinessWorkbookOnDemand,
  downloadWorkbook,
  todayFilename,
} from "@/lib/export/business-exports";
import { formatMoneyDisplay } from "@/lib/format-money";

export function ProductInsightsView() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const [period, setPeriod] = React.useState<InsightsPeriod>("this_month");
  const [exporting, setExporting] = React.useState(false);
  const { activeOrgId } = useActiveOrganization();
  const { data, isLoading } = useProductInsightsAgg(period);

  const inventory = data?.inventory;
  const periodKpis = data?.periodSales;
  const ranking: ProductSalesRank[] = (data?.ranking ?? []).map((r) => ({
    productId: r.productId,
    productName: r.productName,
    unitsSold: r.unitsSold,
    revenue: r.revenue,
    estimatedMargin: r.estimatedMargin,
    stock: r.stock,
    lowStock: r.lowStock,
    outOfStock: r.outOfStock,
  }));
  const topRevenue = ranking.slice(0, 5);
  const topUnits = [...ranking].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
  const deadStockCount = data?.deadStockCount ?? 0;

  const periodOptions: { value: InsightsPeriod; label: string }[] = [
    { value: "today", label: t("business.periodToday") },
    { value: "this_month", label: t("business.periodThisMonth") },
    { value: "last_30_days", label: t("business.period30Days") },
    { value: "all_time", label: t("business.periodAllTime") },
  ];

  const columns = React.useMemo<ColumnDef<ProductSalesRank>[]>(
    () => [
      {
        accessorKey: "productName",
        header: t("business.product"),
        cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
      },
      {
        accessorKey: "unitsSold",
        header: t("business.unitsSold"),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.unitsSold}</span>
        ),
      },
      {
        accessorKey: "revenue",
        header: t("business.revenue"),
        cell: ({ row }) => (
          <span className="tabular-nums">{fmt(row.original.revenue)}</span>
        ),
      },
      {
        accessorKey: "estimatedMargin",
        header: t("business.estimatedMargin"),
        cell: ({ row }) => (
          <span className="tabular-nums">{fmt(row.original.estimatedMargin)}</span>
        ),
      },
      {
        accessorKey: "stock",
        header: t("business.stock"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{row.original.stock}</span>
            {row.original.outOfStock ? (
              <Badge variant="destructive" className="text-[0.65rem]">
                {t("business.outOfStock")}
              </Badge>
            ) : row.original.lowStock ? (
              <Badge variant="destructive" className="text-[0.65rem]">
                {t("business.low")}
              </Badge>
            ) : null}
          </div>
        ),
      },
    ],
    [fmt, t]
  );

  const handleExportAll = async () => {
    if (!activeOrgId) return;
    setExporting(true);
    try {
      const sheets = await buildFullBusinessWorkbookOnDemand({
        orgId: activeOrgId,
        ranking,
        labels: {
          products: t("business.sheetProducts"),
          sales: t("business.sheetSales"),
          saleLines: t("business.sheetSaleLines"),
          purchases: t("business.sheetPurchases"),
          purchaseLines: t("business.sheetPurchaseLines"),
          performance: t("business.sheetPerformance"),
        },
      });
      downloadWorkbook(sheets, todayFilename("negocio-completo"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title={t("business.insightsTitle")}
          description={`${t("business.insightsSubtitle")} ${t("business.marginDisclaimer")}`}
          actions={
            <ExportExcelButton
              label={t("business.exportAll")}
              isExporting={exporting}
              onExport={handleExportAll}
              icon={Download}
            />
          }
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

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("business.inventorySection")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading || !inventory ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title={t("business.inventoryValueCost")}
                value={fmt(inventory.inventoryValueCost)}
              />
              <StatCard
                title={t("business.inventoryValueRetail")}
                value={fmt(inventory.inventoryValueRetail)}
              />
              <StatCard
                title={t("business.potentialMargin")}
                value={fmt(inventory.potentialMargin)}
              />
            </>
          )}
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("business.salesSection")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading || !periodKpis ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard title={t("business.revenue")} value={fmt(periodKpis.revenue)} />
              <StatCard title={t("business.unitsSold")} value={String(periodKpis.unitsSold)} />
              <StatCard
                title={t("business.estimatedMargin")}
                value={fmt(periodKpis.estimatedMargin)}
              />
              <StatCard title={t("business.deadStock")} value={String(deadStockCount)} />
            </>
          )}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">{t("business.topByRevenue")}</h3>
            <div className="mt-4">
              {isLoading ? (
                <div className="h-[180px] animate-pulse rounded-lg bg-muted/50" />
              ) : (
                <ProductInsightsBarChart
                  data={topRevenue.map((p) => ({ name: p.productName, total: p.revenue }))}
                  emptyLabel={t("business.noSalesInPeriod")}
                />
              )}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">{t("business.topByUnits")}</h3>
            <div className="mt-4">
              {isLoading ? (
                <div className="h-[180px] animate-pulse rounded-lg bg-muted/50" />
              ) : (
                <ProductInsightsBarChart
                  data={topUnits.map((p) => ({ name: p.productName, total: p.unitsSold }))}
                  emptyLabel={t("business.noSalesInPeriod")}
                />
              )}
            </div>
          </section>
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold">{t("business.performanceTable")}</h2>
        <DataTable
          data={ranking}
          columns={columns}
          isLoading={isLoading}
          emptyLabel={t("business.noSalesInPeriod")}
        />
      </div>
    </div>
  );
}
