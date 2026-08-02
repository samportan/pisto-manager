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
import { RecordPaymentSheet } from "@/components/business/record-payment-sheet";
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
import { useSalePayments } from "@/hooks/useSalePayments";
import { salesKeys, useDeleteSale, useSalesPaginated } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import { formatMoneyDisplay } from "@/lib/format-money";
import {
  buildSalesWorkbookOnDemand,
  downloadWorkbook,
  todayFilename,
} from "@/lib/export/business-exports";
import {
  listSalesPaginated,
  type PaymentMethod,
  type PaymentStatus,
  type SaleWithMeta,
} from "@/lib/db/sales";

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

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useT();
  const label =
    status === "paid"
      ? t("business.paymentStatusPaid")
      : status === "partial"
        ? t("business.paymentStatusPartial")
        : t("business.paymentStatusCredit");
  const variant = status === "paid" ? "secondary" : status === "partial" ? "outline" : "accent";
  return (
    <Badge variant={variant} className="whitespace-nowrap text-[0.65rem]">
      {label}
    </Badge>
  );
}

function SaleDetailBody({
  sale,
  onRecordPayment,
}: {
  sale: SaleWithMeta;
  onRecordPayment: () => void;
}) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { contacts } = useContacts();
  const { data: lines, isLoading } = useSaleItems(sale.id);
  const { payments, isLoading: paymentsLoading } = useSalePayments(sale.id);

  const customerName = React.useMemo(() => {
    if (!sale.customer_id) return t("business.walkIn");
    return contacts.find((c) => c.id === sale.customer_id)?.name ?? t("common.empty");
  }, [contacts, sale.customer_id, t]);

  const showSurcharge =
    sale.payment_method === "card" && Number(sale.card_surcharge_amount) > 0;

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
          <dt className="text-xs text-muted-foreground">{t("business.paymentStatus")}</dt>
          <dd>
            <PaymentStatusBadge status={sale.payment_status} />
          </dd>
        </div>
        {showSurcharge ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">{t("business.subtotal")}</dt>
              <dd className="tabular-nums">{fmt(Number(sale.subtotal))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("business.cardSurcharge")}</dt>
              <dd className="flex flex-wrap items-center gap-2 tabular-nums">
                {fmt(Number(sale.card_surcharge_amount))}
                {!sale.apply_card_surcharge ? (
                  <Badge variant="outline" className="text-[0.6rem]">
                    {t("business.surchargeNotCharged")}
                  </Badge>
                ) : null}
              </dd>
            </div>
          </>
        ) : null}
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.total")}</dt>
          <dd className="text-lg font-bold tabular-nums">{fmt(Number(sale.total))}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.amountPaid")}</dt>
          <dd className="tabular-nums font-medium">{fmt(Number(sale.amount_paid))}</dd>
        </div>
        {Number(sale.balance_due) > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("business.balanceDue")}</dt>
            <dd className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {fmt(Number(sale.balance_due))}
            </dd>
          </div>
        ) : null}
        {sale.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("business.notes")}</dt>
            <dd className="text-muted-foreground">{sale.notes}</dd>
          </div>
        ) : null}
      </dl>

      {sale.payment_status !== "paid" ? (
        <Button type="button" size="sm" className="w-full sm:w-auto" onClick={onRecordPayment}>
          {t("business.recordPayment")}
        </Button>
      ) : null}

      {paymentsLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : payments.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("business.paymentHistory")}</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("business.date")}</TableHead>
                  <TableHead>{t("business.paymentMethod")}</TableHead>
                  <TableHead className="text-right">{t("business.paymentAmount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular-nums text-sm">
                      {new Date(p.date).toLocaleString(intlLocale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <PaymentBadge method={p.payment_method} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmt(Number(p.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

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

type Props = { embedded?: boolean; customerFilter?: string };

export function SalesView({ embedded = false, customerFilter }: Props) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
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
  const [statusFilter, setStatusFilter] = React.useState<PaymentStatus | "all">("all");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailSale, setDetailSale] = React.useState<SaleWithMeta | null>(null);
  const [paymentSale, setPaymentSale] = React.useState<SaleWithMeta | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const filters = React.useMemo(
    () => ({
      search: search.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      paymentMethod: paymentFilter,
      paymentStatus: statusFilter,
      customerId: customerFilter,
    }),
    [search, dateFrom, dateTo, paymentFilter, statusFilter, customerFilter]
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

  const statusLabel = (status: PaymentStatus | "all") => {
    if (status === "all") return t("business.paymentStatusAll");
    if (status === "paid") return t("business.paymentStatusPaid");
    if (status === "partial") return t("business.paymentStatusPartial");
    return t("business.paymentStatusCredit");
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
    if (statusFilter !== "all") {
      chips.push({
        id: "status",
        label: statusLabel(statusFilter),
        onRemove: () => {
          setStatusFilter("all");
          setPageIndex(0);
        },
      });
    }
    return chips;
  }, [dateFrom, dateTo, paymentFilter, statusFilter, t]);

  const clearFilters = React.useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("all");
    setStatusFilter("all");
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
                {s.payment_status !== "paid" ? (
                  <PaymentStatusBadge status={s.payment_status} />
                ) : null}
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
          <div className="space-y-0.5">
            <span className="font-semibold tabular-nums">{fmt(Number(row.original.total))}</span>
            {Number(row.original.balance_due) > 0 ? (
              <p className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
                {t("business.balanceDueShort")}: {fmt(Number(row.original.balance_due))}
              </p>
            ) : null}
          </div>
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
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <ExportExcelButton
                label={t("business.downloadExcel")}
                isExporting={exporting}
                onExport={async () => {
                  if (!activeOrgId) return;
                  setExporting(true);
                  try {
                    const sheets = await buildSalesWorkbookOnDemand(activeOrgId, contacts, {
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
            {
              type: "select",
              id: "sale-status-filter",
              label: t("business.paymentStatus"),
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value as PaymentStatus | "all");
                setPageIndex(0);
              },
              options: [
                { value: "all", label: t("business.paymentStatusAll") },
                { value: "paid", label: t("business.paymentStatusPaid") },
                { value: "partial", label: t("business.paymentStatusPartial") },
                { value: "credit", label: t("business.paymentStatusCredit") },
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
          {detailSale ? (
            <div className="overflow-y-auto">
              <SaleDetailBody
                sale={detailSale}
                onRecordPayment={() => {
                  setPaymentSale(detailSale);
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <RecordPaymentSheet
        sale={paymentSale}
        open={!!paymentSale}
        onOpenChange={(o) => {
          if (!o) setPaymentSale(null);
        }}
        onSuccess={async () => {
          if (activeOrgId) {
            const refreshed = await queryClient.fetchQuery({
              queryKey: salesKeys.paginated(activeOrgId, pageIndex + 1, pageSize, filters),
              queryFn: () =>
                listSalesPaginated(activeOrgId, pageIndex + 1, pageSize, filters),
            });
            if (paymentSale) {
              const updated = refreshed.data.find((s) => s.id === paymentSale.id);
              if (updated) setDetailSale(updated);
            }
          }
          setPaymentSale(null);
        }}
      />

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
          if (deleteId) {
            await deleteSale(deleteId);
            toast.success("toast.saleDeleted");
          }
        }}
        onError={(err) => toast.errorFrom(err, "delete")}
      />
    </div>
  );
}
