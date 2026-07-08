"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Search, Trash2 } from "lucide-react";

import { DataTable } from "@/components/business/data-table";
import { ExportExcelButton } from "@/components/business/export-excel-button";
import { PageHeader } from "@/components/business/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { usePurchases, usePurchasesPaginated } from "@/hooks/usePurchases";
import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";
import { buildPurchasesWorkbook, downloadWorkbook, todayFilename } from "@/lib/export/business-exports";
import type { PurchaseWithMeta } from "@/lib/db/purchases";

function PurchaseDetailBody({ purchaseId }: { purchaseId: string }) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { data: lines, isLoading } = usePurchaseItems(purchaseId);

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
            <TableHead className="min-w-[7rem] text-right">{t("business.unitCost")}</TableHead>
            <TableHead className="min-w-[7rem] text-right">{t("business.line")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.products?.name ?? row.product_id}</TableCell>
              <TableCell className="text-right text-base tabular-nums">{row.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmt(Number(row.unit_cost))}
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

export function PurchasesView() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { purchases, deletePurchase, isDeleting } = usePurchases();
  const { contacts } = useContacts();
  const { activeOrgId } = useActiveOrganization();

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const filters = React.useMemo(
    () => ({
      search: search.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [search, dateFrom, dateTo]
  );

  const { result, isLoading } = usePurchasesPaginated(pageIndex + 1, pageSize, filters);
  const pageData = result?.data ?? [];
  const totalRows = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const contactName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, c.name);
    return m;
  }, [contacts]);

  const columns = React.useMemo<ColumnDef<PurchaseWithMeta>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("business.date"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {new Date(row.original.date).toLocaleString(intlLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ),
      },
      {
        id: "supplier",
        header: t("business.supplier"),
        accessorFn: (row) =>
          row.supplier_id ? contactName.get(row.supplier_id) ?? "" : "",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.supplier_id
              ? contactName.get(row.original.supplier_id) ?? t("common.empty")
              : t("business.noSupplier")}
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
          <span className="font-semibold tabular-nums">{fmt(Number(row.original.total))}</span>
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
              aria-label={t("business.removePurchaseTitle")}
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
          title={t("business.purchasesTitle")}
          description={t("business.purchasesSubtitleStock")}
          actions={
            <div className="flex flex-wrap gap-2">
              <ExportExcelButton
                label={t("business.downloadExcel")}
                isExporting={exporting}
                onExport={async () => {
                  if (!activeOrgId) return;
                  setExporting(true);
                  try {
                    const sheets = await buildPurchasesWorkbook(activeOrgId, purchases, contacts, {
                      purchases: t("business.sheetPurchases"),
                      purchaseLines: t("business.sheetPurchaseLines"),
                    });
                    downloadWorkbook(sheets, todayFilename("compras"));
                  } finally {
                    setExporting(false);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                render={<Link href="/dashboard/business/purchases/new" />}
              >
                <Plus className="size-4" aria-hidden />
                {t("business.newPurchase")}
              </Button>
            </div>
          }
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder={t("business.searchPurchases")}
              className="h-10 pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchase-from" className="text-xs text-muted-foreground">
              {t("business.filterDateFrom")}
            </Label>
            <Input
              id="purchase-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPageIndex(0);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchase-to" className="text-xs text-muted-foreground">
              {t("business.filterDateTo")}
            </Label>
            <Input
              id="purchase-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPageIndex(0);
              }}
            />
          </div>
        </div>

        <DataTable
          data={pageData}
          columns={columns}
          isLoading={isLoading}
          emptyLabel={t("business.noPurchases")}
          manualPagination
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalRows={totalRows}
          onPaginationChange={(idx, size) => {
            setPageIndex(idx);
            setPageSize(size);
          }}
        />
      </div>

      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 md:max-w-lg">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>{t("business.purchaseLinesTitle")}</SheetTitle>
            <SheetDescription>{t("business.purchaseLinesDescription")}</SheetDescription>
          </SheetHeader>
          {detailId ? <PurchaseDetailBody purchaseId={detailId} /> : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title={t("business.removePurchaseTitle")}
        description={t("business.removePurchaseDescription")}
        confirmLabel={t("business.remove")}
        pendingLabel={t("common.deleting")}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) await deletePurchase(deleteId);
        }}
      />
    </div>
  );
}
