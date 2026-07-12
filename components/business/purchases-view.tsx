"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2, Truck } from "lucide-react";

import { DataTable } from "@/components/business/data-table";
import { EditPurchaseSheet } from "@/components/business/edit-purchase-sheet";
import { ExportExcelButton } from "@/components/business/export-excel-button";
import { ListFilterBar, type FilterChip } from "@/components/business/list-filter-bar";
import { PageHeader } from "@/components/business/page-header";
import { ReceivePurchaseSheet } from "@/components/business/receive-purchase-sheet";
import { RecordPurchasePaymentSheet } from "@/components/business/record-purchase-payment-sheet";
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
import { useProducts } from "@/hooks/useProducts";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { usePurchasePayments } from "@/hooks/usePurchasePayments";
import { purchasesKeys, useDeletePurchase, usePurchasesPaginated } from "@/hooks/usePurchases";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import { formatMoneyDisplay } from "@/lib/format-money";
import { buildPurchasesWorkbook, downloadWorkbook, todayFilename } from "@/lib/export/business-exports";
import {
  getPurchasesByOrgId,
  type PurchasePaymentMethod,
  type PurchasePaymentStatus,
  type PurchaseReceiptStatus,
  type PurchaseWithMeta,
} from "@/lib/db/purchases";

function PurchasePaymentBadge({ method }: { method: PurchasePaymentMethod }) {
  const { t } = useT();
  const label =
    method === "cash"
      ? t("business.paymentCash")
      : method === "transfer"
        ? t("business.paymentTransfer")
        : t("business.paymentCredit");
  return (
    <Badge variant="outline" className="whitespace-nowrap text-[0.65rem]">
      {label}
    </Badge>
  );
}

function PurchasePaymentStatusBadge({ status }: { status: PurchasePaymentStatus }) {
  const { t } = useT();
  const label =
    status === "paid"
      ? t("business.paymentStatusPaid")
      : status === "partial"
        ? t("business.paymentStatusPartial")
        : status === "credit"
          ? t("business.paymentStatusCredit")
          : t("business.paymentStatusUnpaid");
  const variant =
    status === "paid" ? "secondary" : status === "partial" ? "outline" : "accent";
  return (
    <Badge variant={variant} className="whitespace-nowrap text-[0.65rem]">
      {label}
    </Badge>
  );
}

function ReceiptStatusBadge({ status }: { status: PurchaseReceiptStatus }) {
  const { t } = useT();
  const label =
    status === "pending"
      ? t("business.receiptStatusPending")
      : status === "received"
        ? t("business.receiptStatusReceived")
        : t("business.receiptStatusCancelled");
  const variant =
    status === "pending" ? "outline" : status === "received" ? "secondary" : "accent";
  return (
    <Badge variant={variant} className="whitespace-nowrap text-[0.65rem]">
      {label}
    </Badge>
  );
}

function PurchaseDetailBody({
  purchase,
  onEdit,
  onReceive,
  onRecordPayment,
}: {
  purchase: PurchaseWithMeta;
  onEdit: () => void;
  onReceive: () => void;
  onRecordPayment: () => void;
}) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { contacts } = useContacts();
  const { data: lines, isLoading } = usePurchaseItems(purchase.id);
  const { payments, isLoading: paymentsLoading } = usePurchasePayments(purchase.id);

  const supplierName = React.useMemo(() => {
    if (!purchase.supplier_id) return t("business.noSupplier");
    return contacts.find((c) => c.id === purchase.supplier_id)?.name ?? t("common.empty");
  }, [contacts, purchase.supplier_id, t]);

  const showQtyMismatch = lines?.some(
    (row) =>
      row.quantity_received != null &&
      Number(row.quantity_ordered) !== Number(row.quantity_received)
  );

  return (
    <div className="space-y-4 px-4 pb-6">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.supplier")}</dt>
          <dd className="font-medium">{supplierName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.date")}</dt>
          <dd className="tabular-nums">
            {new Date(purchase.date).toLocaleString(intlLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.receiptStatus")}</dt>
          <dd>
            <ReceiptStatusBadge status={purchase.receipt_status} />
          </dd>
        </div>
        {purchase.expected_at ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t("business.expectedDelivery")}</dt>
            <dd className="tabular-nums">
              {new Date(purchase.expected_at).toLocaleString(intlLocale, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        ) : null}
        {purchase.received_at ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t("business.receivedDate")}</dt>
            <dd className="tabular-nums">
              {new Date(purchase.received_at).toLocaleString(intlLocale, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        ) : null}
        {purchase.receipt_status === "received" ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">{t("business.supplierPaymentMethod")}</dt>
              <dd>
                <PurchasePaymentBadge method={purchase.payment_method} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("business.paymentStatus")}</dt>
              <dd>
                <PurchasePaymentStatusBadge status={purchase.payment_status} />
              </dd>
            </div>
          </>
        ) : null}
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.subtotal")}</dt>
          <dd className="tabular-nums">{fmt(Number(purchase.subtotal))}</dd>
        </div>
        {Number(purchase.fees_amount) !== 0 ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t("business.feesAmount")}</dt>
            <dd className="tabular-nums">
              {fmt(Number(purchase.fees_amount))}
              {purchase.fees_notes ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {purchase.fees_notes}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-muted-foreground">{t("business.total")}</dt>
          <dd className="text-lg font-bold tabular-nums">{fmt(Number(purchase.total))}</dd>
        </div>
        {purchase.receipt_status === "received" ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">{t("business.amountPaid")}</dt>
              <dd className="tabular-nums font-medium">{fmt(Number(purchase.amount_paid))}</dd>
            </div>
            {Number(purchase.balance_due) > 0 ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">{t("business.balanceDue")}</dt>
                <dd className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {fmt(Number(purchase.balance_due))}
                </dd>
              </div>
            ) : null}
          </>
        ) : null}
        {purchase.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("business.notes")}</dt>
            <dd className="text-muted-foreground">{purchase.notes}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        {purchase.receipt_status === "pending" ? (
          <Button type="button" size="sm" onClick={onReceive}>
            {t("business.receivePurchase")}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          {t("business.editPurchase")}
        </Button>
        {purchase.receipt_status === "received" && purchase.payment_status !== "paid" ? (
          <Button type="button" size="sm" onClick={onRecordPayment}>
            {t("business.recordSupplierPayment")}
          </Button>
        ) : null}
      </div>

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
                  <TableHead>{t("business.supplierPaymentMethod")}</TableHead>
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
                      <PurchasePaymentBadge method={p.payment_method} />
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
                {showQtyMismatch ? (
                  <>
                    <TableHead className="min-w-[4rem] text-right">{t("business.qtyOrdered")}</TableHead>
                    <TableHead className="min-w-[4rem] text-right">{t("business.qtyReceived")}</TableHead>
                  </>
                ) : (
                  <TableHead className="min-w-[5rem] text-right">{t("business.qty")}</TableHead>
                )}
                <TableHead className="min-w-[7rem] text-right">{t("business.unitCost")}</TableHead>
                <TableHead className="min-w-[7rem] text-right">{t("business.line")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.products?.name ?? row.product_id}</TableCell>
                  {showQtyMismatch ? (
                    <>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.quantity_ordered}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quantity_received ?? "—"}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-right text-base tabular-nums">
                      {purchase.receipt_status === "pending"
                        ? row.quantity_ordered
                        : (row.quantity_received ?? row.quantity_ordered)}
                    </TableCell>
                  )}
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
      )}
    </div>
  );
}

export function PurchasesView() {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const queryClient = useQueryClient();
  const { deletePurchase, isDeleting } = useDeletePurchase();
  const { contacts } = useContacts();
  const { products } = useProducts();
  const { activeOrgId } = useActiveOrganization();

  const suppliers = contacts.filter((c) => c.type === "supplier" || c.type === "both");

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [receiptFilter, setReceiptFilter] = React.useState<PurchaseReceiptStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = React.useState<PurchasePaymentMethod | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<PurchasePaymentStatus | "all">("all");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailPurchase, setDetailPurchase] = React.useState<PurchaseWithMeta | null>(null);
  const [editPurchase, setEditPurchase] = React.useState<PurchaseWithMeta | null>(null);
  const [receivePurchase, setReceivePurchase] = React.useState<PurchaseWithMeta | null>(null);
  const [paymentPurchase, setPaymentPurchase] = React.useState<PurchaseWithMeta | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const filters = React.useMemo(
    () => ({
      search: search.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      receiptStatus: receiptFilter,
      paymentMethod: paymentFilter,
      paymentStatus: statusFilter,
    }),
    [search, dateFrom, dateTo, receiptFilter, paymentFilter, statusFilter]
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

  const receiptLabel = (status: PurchaseReceiptStatus | "all") => {
    if (status === "all") return t("business.receiptStatusAll");
    if (status === "pending") return t("business.receiptStatusPending");
    if (status === "received") return t("business.receiptStatusReceived");
    return t("business.receiptStatusCancelled");
  };

  const paymentLabel = (method: PurchasePaymentMethod | "all") => {
    if (method === "all") return t("business.paymentAll");
    if (method === "cash") return t("business.paymentCash");
    if (method === "transfer") return t("business.paymentTransfer");
    return t("business.paymentCredit");
  };

  const statusLabel = (status: PurchasePaymentStatus | "all") => {
    if (status === "all") return t("business.paymentStatusAll");
    if (status === "paid") return t("business.paymentStatusPaid");
    if (status === "partial") return t("business.paymentStatusPartial");
    if (status === "credit") return t("business.paymentStatusCredit");
    return t("business.paymentStatusUnpaid");
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
    if (receiptFilter !== "all") {
      chips.push({
        id: "receipt",
        label: receiptLabel(receiptFilter),
        onRemove: () => {
          setReceiptFilter("all");
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
  }, [dateFrom, dateTo, receiptFilter, paymentFilter, statusFilter, t]);

  const clearFilters = React.useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setReceiptFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
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
        id: "purchase",
        header: t("business.purchase"),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="min-w-[12rem] space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {p.supplier_id
                    ? contactName.get(p.supplier_id) ?? t("common.empty")
                    : t("business.noSupplier")}
                </span>
                <ReceiptStatusBadge status={p.receipt_status} />
                {p.receipt_status === "received" && p.payment_status !== "paid" ? (
                  <PurchasePaymentStatusBadge status={p.payment_status} />
                ) : null}
              </div>
              {p.receipt_status === "received" && Number(p.balance_due) > 0 ? (
                <p className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
                  {t("business.balanceDueShort")}: {fmt(Number(p.balance_due))}
                </p>
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
            {row.original.receipt_status === "pending" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("business.receivePurchase")}
                onClick={() => setReceivePurchase(row.original)}
              >
                <Truck className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("business.editPurchase")}
              onClick={() => setEditPurchase(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("business.viewLines")}
              onClick={() => setDetailPurchase(row.original)}
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

  function refreshDetail() {
    if (activeOrgId) {
      void queryClient.invalidateQueries({ queryKey: ["purchases", activeOrgId] });
    }
  }

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
            {
              type: "select",
              id: "purchase-receipt-filter",
              label: t("business.receiptStatus"),
              value: receiptFilter,
              onChange: (value) => {
                setReceiptFilter(value as PurchaseReceiptStatus | "all");
                setPageIndex(0);
              },
              options: [
                { value: "all", label: t("business.receiptStatusAll") },
                { value: "pending", label: t("business.receiptStatusPending") },
                { value: "received", label: t("business.receiptStatusReceived") },
              ],
            },
            {
              type: "select",
              id: "purchase-payment-filter",
              label: t("business.supplierPaymentMethod"),
              value: paymentFilter,
              onChange: (value) => {
                setPaymentFilter(value as PurchasePaymentMethod | "all");
                setPageIndex(0);
              },
              options: [
                { value: "all", label: t("business.paymentAll") },
                { value: "cash", label: t("business.paymentCash") },
                { value: "transfer", label: t("business.paymentTransfer") },
                { value: "credit", label: t("business.paymentCredit") },
              ],
            },
            {
              type: "select",
              id: "purchase-status-filter",
              label: t("business.paymentStatus"),
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value as PurchasePaymentStatus | "all");
                setPageIndex(0);
              },
              options: [
                { value: "all", label: t("business.paymentStatusAll") },
                { value: "unpaid", label: t("business.paymentStatusUnpaid") },
                { value: "partial", label: t("business.paymentStatusPartial") },
                { value: "paid", label: t("business.paymentStatusPaid") },
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

      <Sheet
        open={!!detailPurchase}
        onOpenChange={(o) => !o && setDetailPurchase(null)}
      >
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 md:max-w-lg">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>{t("business.purchaseLinesTitle")}</SheetTitle>
            <SheetDescription>{t("business.purchaseLinesDescription")}</SheetDescription>
          </SheetHeader>
          {detailPurchase ? (
            <PurchaseDetailBody
              purchase={detailPurchase}
              onEdit={() => {
                setEditPurchase(detailPurchase);
                setDetailPurchase(null);
              }}
              onReceive={() => {
                setReceivePurchase(detailPurchase);
                setDetailPurchase(null);
              }}
              onRecordPayment={() => {
                setPaymentPurchase(detailPurchase);
                setDetailPurchase(null);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <EditPurchaseSheet
        purchase={editPurchase}
        products={products}
        suppliers={suppliers}
        open={!!editPurchase}
        onOpenChange={(o) => !o && setEditPurchase(null)}
        onSuccess={refreshDetail}
      />

      <ReceivePurchaseSheet
        purchase={receivePurchase}
        products={products}
        open={!!receivePurchase}
        onOpenChange={(o) => !o && setReceivePurchase(null)}
        onSuccess={refreshDetail}
      />

      <RecordPurchasePaymentSheet
        purchase={paymentPurchase}
        open={!!paymentPurchase}
        onOpenChange={(o) => !o && setPaymentPurchase(null)}
        onSuccess={refreshDetail}
      />

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
          if (deleteId) {
            await deletePurchase(deleteId);
            toast.success("toast.purchaseDeleted");
          }
        }}
        onError={(err) => toast.errorFrom(err, "delete")}
      />
    </div>
  );
}
