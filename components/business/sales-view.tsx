"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Search, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/business/page-header";
import { ExportExcelButton } from "@/components/business/export-excel-button";
import { ResponsiveList } from "@/components/business/responsive-list";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts } from "@/hooks/useContacts";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useSaleItems } from "@/hooks/useSaleItems";
import { useSales } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";
import { buildSalesWorkbook, downloadWorkbook, todayFilename } from "@/lib/export/business-exports";
import type { SaleWithMeta } from "@/lib/db/sales";

function SaleDetailBody({ saleId }: { saleId: string }) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { data: lines, isLoading } = useSaleItems(saleId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }
  if (!lines?.length) {
    return <p className="p-4 text-sm text-muted-foreground">{t("business.noLines")}</p>;
  }
  return (
    <div className="overflow-x-auto px-4 pb-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("business.product")}</TableHead>
            <TableHead className="min-w-[5rem] text-right">{t("business.qty")}</TableHead>
            <TableHead className="min-w-[7rem] text-right">{t("business.unit")}</TableHead>
            <TableHead className="min-w-[7rem] text-right">{t("business.line")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.products?.name ?? row.product_id}</TableCell>
              <TableCell className="text-right text-base tabular-nums">{row.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmt(Number(row.unit_price))}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {fmt(Number(row.line_total))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SalesView() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { sales, deleteSale, isLoading, isDeleting } = useSales();
  const { contacts } = useContacts();
  const { activeOrgId } = useActiveOrganization();
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const contactName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, c.name);
    return m;
  }, [contacts]);

  const columns = React.useMemo<ColumnDef<SaleWithMeta>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("business.date"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {new Date(row.original.date).toLocaleString(intlLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ),
      },
      {
        id: "customer",
        header: t("business.customer"),
        accessorFn: (row) =>
          row.customer_id ? contactName.get(row.customer_id) ?? "" : t("business.walkIn"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.customer_id
              ? contactName.get(row.original.customer_id) ?? t("common.empty")
              : t("business.walkIn")}
          </span>
        ),
      },
      {
        accessorKey: "line_count",
        header: t("business.lines"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.line_count}</span>
        ),
      },
      {
        accessorKey: "total",
        header: t("business.total"),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {fmt(Number(row.original.total))}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("business.viewLines")}
              onClick={() => setDetailId(row.original.id)}
            >
              <Eye className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label={t("business.removeSaleTitle")}
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [contactName, fmt, intlLocale, t]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title={t("business.salesTitle")}
          description={t("business.salesSubtitleStock")}
          actions={
            <div className="flex flex-wrap gap-2">
              <ExportExcelButton
                label={t("business.downloadExcel")}
                isExporting={exporting}
                onExport={async () => {
                  if (!activeOrgId) return;
                  setExporting(true);
                  try {
                    const sheets = await buildSalesWorkbook(activeOrgId, sales, contacts, {
                      sales: t("business.sheetSales"),
                      saleLines: t("business.sheetSaleLines"),
                    });
                    downloadWorkbook(sheets, todayFilename("ventas"));
                  } finally {
                    setExporting(false);
                  }
                }}
              />
              <Button type="button" size="sm" className="gap-1.5" render={<Link href="/dashboard/business/sales/new" />}>
                <Plus className="size-4" aria-hidden />
                {t("business.newSaleDoc")}
              </Button>
            </div>
          }
        />

        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder={t("business.searchSales")}
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ResponsiveList
          data={sales}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel={t("business.noSales")}
          getRowKey={(s) => s.id}
          renderCard={(s) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.date).toLocaleString(intlLocale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 font-semibold">
                    {s.customer_id ? contactName.get(s.customer_id) ?? t("common.empty") : t("business.walkIn")}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt(Number(s.total))}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("business.lineCount", { count: String(s.line_count) })}
              </p>
              <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailId(s.id)}>
                  {t("business.lines")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteId(s.id)}
                >
                  {t("business.remove")}
                </Button>
              </div>
            </div>
          )}
        />
      </div>

      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 md:max-w-lg">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>{t("business.saleLinesTitle")}</SheetTitle>
            <SheetDescription>{t("business.saleLinesDescription")}</SheetDescription>
          </SheetHeader>
          {detailId ? <SaleDetailBody saleId={detailId} /> : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title={t("business.removeSaleTitle")}
        description={t("business.removeSaleDescription")}
        confirmLabel={t("business.remove")}
        pendingLabel={t("common.deleting")}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) await deleteSale(deleteId);
        }}
      />
    </div>
  );
}
