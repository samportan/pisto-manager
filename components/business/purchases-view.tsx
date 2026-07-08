"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/business/data-table";
import { ExportExcelButton } from "@/components/business/export-excel-button";
import { ListFilterBar, type FilterChip } from "@/components/business/list-filter-bar";
import { PageHeader } from "@/components/business/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { purchasesKeys, useDeletePurchase, usePurchasesPaginated } from "@/hooks/usePurchases";
import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";
import { buildPurchasesWorkbook, downloadWorkbook, todayFilename } from "@/lib/export/business-exports";
import { getPurchasesByOrgId, type PurchaseWithMeta } from "@/lib/db/purchases";

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
  const queryClient = useQueryClient();
  const { deletePurchase, isDeleting } = useDeletePurchase();
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

  const { result, isLoading, isPageLoading, isRefreshing } = usePurchasesPaginated(
    pageIndex + 1,
    pageSize,
    filters
  );
  const pageData = isPageLoading ? [] : (result?.data ?? []);
  const totalRows = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const contactName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, c.name);
    return m;
  }, [contacts]);

  const filterChips = React.useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];
    if (dateFrom) {
      chips.push({
        id: "dateFrom",
        label: `${t("business.filterDateFrom")}: ${dateFrom}`,
        onRemove: () => {
          setDateFrom("");
          setPageIndex(0);
        },
      });
    }
    if (dateTo) {
      chips.push({
        id: "dateTo",
        label: `${t("business.filterDateTo")}: ${dateTo}`,
        onRemove: () => {
          setDateTo("");
          setPageIndex(0);
        },
      });
    }
    return chips;
  }, [dateFrom, dateTo, t]);

  const clearFilters = React.useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setPageIndex(0);
  }, []);

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
                    const purchases = await queryClient.fetchQuery({
                      queryKey: purchasesKeys.all(activeOrgId),
                      queryFn: () => getPurchasesByOrgId(activeOrgId),
                    });
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

        <ListFilterBar
          fields={[
            {
              type: "search",
              value: search,
              placeholder: t("business.searchPurchases"),
              onChange: (value) => {
                setSearch(value);
                setPageIndex(0);
              },
            },
            {
              type: "date",
              id: "purchase-from",
              label: t("business.filterDateFrom"),
              value: dateFrom,
              onChange: (value) => {
                setDateFrom(value);
                setPageIndex(0);
              },
            },
            {
              type: "date",
              id: "purchase-to",
              label: t("business.filterDateTo"),
              value: dateTo,
              onChange: (value) => {
                setDateTo(value);
                setPageIndex(0);
              },
            },
          ]}
          chips={filterChips}
          activeFilterCount={filterChips.length}
          onClear={filterChips.length > 0 ? clearFilters : undefined}
        />

        <DataTable
          data={pageData}
          columns={columns}
          isLoading={isLoading}
          isPageLoading={isPageLoading}
          isRefreshing={isRefreshing}
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
