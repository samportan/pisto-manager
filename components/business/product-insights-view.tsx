"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { ExportExcelButton } from "@/components/business/export-excel-button";
import { PageHeader } from "@/components/business/page-header";
import { ProductInsightsBarChart } from "@/components/business/product-insights-charts";
import { ResponsiveList } from "@/components/business/responsive-list";
import { StatCard, StatCardSkeleton } from "@/components/business/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useProductInsights } from "@/hooks/useProductInsights";
import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";
import { useSales } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import {
  getDeadStockProducts,
  getInventoryKpis,
  getPeriodSalesKpis,
  getProductSalesRanking,
  getTopProductsByRevenue,
  getTopProductsByUnits,
  type InsightsPeriod,
  type ProductSalesRank,
} from "@/lib/analytics/business-products";
import {
  buildFullBusinessWorkbook,
  downloadWorkbook,
  todayFilename,
} from "@/lib/export/business-exports";
import { formatMoney } from "@/lib/format-money";

export function ProductInsightsView() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const [period, setPeriod] = React.useState<InsightsPeriod>("this_month");
  const [exporting, setExporting] = React.useState(false);

  const { products, isLoading: productsLoading } = useProducts();
  const { saleItems, isLoading: insightsLoading } = useProductInsights();
  const { sales, isLoading: salesLoading } = useSales();
  const { purchases, isLoading: purchasesLoading } = usePurchases();
  const { contacts } = useContacts();
  const { activeOrgId } = useActiveOrganization();
  const isLoading = productsLoading || insightsLoading;

  const inventory = React.useMemo(() => getInventoryKpis(products), [products]);
  const periodKpis = React.useMemo(
    () => getPeriodSalesKpis(saleItems, period),
    [saleItems, period]
  );
  const ranking = React.useMemo(
    () => getProductSalesRanking(saleItems, products, period),
    [saleItems, products, period]
  );
  const topRevenue = React.useMemo(() => getTopProductsByRevenue(ranking, 5), [ranking]);
  const topUnits = React.useMemo(() => getTopProductsByUnits(ranking, 5), [ranking]);
  const deadStock = React.useMemo(
    () => getDeadStockProducts(products, saleItems, period),
    [products, saleItems, period]
  );

  const periodOptions: { value: InsightsPeriod; label: string }[] = [
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
            {row.original.lowStock ? (
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
    setExporting(true);
    try {
      const sheets = await buildFullBusinessWorkbook({
        orgId: activeOrgId ?? "",
        products,
        sales,
        purchases,
        contacts,
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
              isExporting={exporting || salesLoading || purchasesLoading}
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
          {isLoading ? (
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
          {isLoading ? (
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
              <StatCard title={t("business.deadStock")} value={String(deadStock.length)} />
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
        <ResponsiveList
          data={ranking}
          columns={columns}
          globalFilter=""
          isLoading={isLoading}
          emptyLabel={t("business.noSalesInPeriod")}
          getRowKey={(row) => row.productId}
          renderCard={(row) => (
            <div className="p-4">
              <p className="font-semibold">{row.productName}</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("business.unitsSold")}</dt>
                  <dd className="tabular-nums">{row.unitsSold}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("business.revenue")}</dt>
                  <dd className="tabular-nums">{fmt(row.revenue)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("business.estimatedMargin")}</dt>
                  <dd className="tabular-nums">{fmt(row.estimatedMargin)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("business.stock")}</dt>
                  <dd className="flex items-center gap-2 tabular-nums">
                    {row.stock}
                    {row.lowStock ? (
                      <Badge variant="destructive" className="text-[0.65rem]">
                        {t("business.low")}
                      </Badge>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        />
      </div>
    </div>
  );
}
