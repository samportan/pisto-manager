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
import { Badge } from "@/components/ui/badge";
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
import { useSaleItems } from "@/hooks/useSaleItems";
import { salesKeys, useDeleteSale, useSalesPaginated } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";
import { buildSalesWorkbook, downloadWorkbook, todayFilename } from "@/lib/export/business-exports";
import { getSalesByOrgId, type PaymentMethod, type SaleWithMeta } from "@/lib/db/sales";

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const { t } = useT();
  const label =
    method === "cash"
      ? t("business.paymentCash")
      : method === "card"
        ? t("business.paymentCard")
        : t("business.paymentTransfer");
  return (
    <Badge variant="outline" className="whitespace-nowrap text-[0.65rem]">
      {label}
    </Badge>
  );
}

function SaleDetailBody({ sale }: { sale: SaleWithMeta }) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const { contacts } = useContacts();
  const { data: lines, isLoading } = useSaleItems(sale.id);

  const customerName = React.useMemo(() => {
    if (!sale.customer_id) return t("business.walkIn");
    return contacts.find((c) => c.id === sale.customer_id)?.name ?? t("common.empty");
  }, [contacts, sale.customer_id, t]);

  return (
    <div className="space-y-4 px-4 pb-6">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.customer")}</dt>
          <dd className="font-medium">{customerName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.date")}</dt>
          <dd className="tabular-nums">
            {new Date(sale.date).toLocaleString(intlLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.paymentMethod")}</dt>
          <dd>
            <PaymentBadge method={sale.payment_method} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.total")}</dt>
          <dd className="text-lg font-bold tabular-nums">{fmt(Number(sale.total))}</dd>
        </div>
        {sale.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("business.notes")}</dt>
            <dd className="text-muted-foreground">{sale.notes}</dd>
          </div>
        ) : null}
      </dl>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : !lines?.length ? (
        <p className="text-sm text-muted-foreground">{t("business.noLines")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
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
      )}
    </div>
  );
}

type Props = { embedded?: boolean };

export function SalesView({ embedded = false }: Props) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });
  const queryClient = useQueryClient();
  const { deleteSale, isDeleting } = useDeleteSale();
  const { contacts } = useContacts();
  const { activeOrgId } = useActiveOrganization();

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentMethod | "all">("all");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailSale, setDetailSale] = React.useState<SaleWithMeta | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const filters = React.useMemo(
    () => ({
      search: search.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      paymentMethod: paymentFilter,
    }),
    [search, dateFrom, dateTo, paymentFilter]
  );

  const { result, isLoading, isPageLoading, isRefreshing } = useSalesPaginated(
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

  const paymentLabel = (method: PaymentMethod | "all") => {
    if (method === "all") return t("business.paymentAll");
    if (method === "cash") return t("business.paymentCash");
    if (method === "card") return t("business.paymentCard");
    return t("business.paymentTransfer");
  };

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
    if (paymentFilter !== "all") {
      chips.push({
        id: "payment",
        label: paymentLabel(paymentFilter),
        onRemove: () => {
          setPaymentFilter("all");
          setPageIndex(0);
        },
      });
    }
    return chips;
  }, [dateFrom, dateTo, paymentFilter, t]);

  const clearFilters = React.useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("all");
    setPageIndex(0);
  }, []);

  const columns = React.useMemo<ColumnDef<SaleWithMeta>[]>(
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
        id: "sale",
        header: t("business.sale"),
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="min-w-[12rem] space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {s.customer_id
                    ? contactName.get(s.customer_id) ?? t("common.empty")
                    : t("business.walkIn")}
                </span>
                <PaymentBadge method={s.payment_method} />
              </div>
              {s.items_preview ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.items_preview}</p>
              ) : null}
            </div>
          );
        },
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
              onClick={() => setDetailSale(row.original)}
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
      <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${embedded ? "pb-8" : "py-8"}`}>
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
                    const sales = await queryClient.fetchQuery({
                      queryKey: salesKeys.all(activeOrgId),
                      queryFn: () => getSalesByOrgId(activeOrgId),
                    });
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
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                render={<Link href="/dashboard/business/sales/new" />}
              >
                <Plus className="size-4" aria-hidden />
                {t("business.newSaleDoc")}
              </Button>
            </div>
          }
        />

        <ListFilterBar
          fields={[
            {
              type: "search",
              value: search,
              placeholder: t("business.searchSales"),
              onChange: (value) => {
                setSearch(value);
                setPageIndex(0);
              },
            },
            {
              type: "date",
              id: "sale-from",
              label: t("business.filterDateFrom"),
              value: dateFrom,
              onChange: (value) => {
                setDateFrom(value);
                setPageIndex(0);
              },
            },
            {
              type: "date",
              id: "sale-to",
              label: t("business.filterDateTo"),
              value: dateTo,
              onChange: (value) => {
                setDateTo(value);
                setPageIndex(0);
              },
            },
            {
              type: "select",
              id: "sale-payment-filter",
              label: t("business.paymentMethod"),
              value: paymentFilter,
              onChange: (value) => {
                setPaymentFilter(value as PaymentMethod | "all");
                setPageIndex(0);
              },
              options: [
                { value: "all", label: t("business.paymentAll") },
                { value: "cash", label: t("business.paymentCash") },
                { value: "card", label: t("business.paymentCard") },
                { value: "transfer", label: t("business.paymentTransfer") },
              ],
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
          emptyLabel={t("business.noSales")}
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

      <Sheet open={!!detailSale} onOpenChange={(o) => !o && setDetailSale(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 md:max-w-lg">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>{t("business.saleDetailTitle")}</SheetTitle>
            <SheetDescription>{t("business.saleLinesDescription")}</SheetDescription>
          </SheetHeader>
          {detailSale ? <SaleDetailBody sale={detailSale} /> : null}
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
