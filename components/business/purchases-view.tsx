"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Search, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/business/page-header";
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
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { usePurchases } from "@/hooks/usePurchases";
import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";
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
  const { purchases, deletePurchase, isLoading } = usePurchases();
  const { contacts } = useContacts();
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);

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
          <span className="tabular-nums text-muted-foreground">
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
            <Button type="button" size="sm" className="gap-1.5" render={<Link href="/dashboard/business/purchases/new" />}>
                <Plus className="size-4" aria-hidden />
                {t("business.newPurchase")}
            </Button>
          }
        />

        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder={t("business.searchPurchases")}
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ResponsiveList
          data={purchases}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel={t("business.noPurchases")}
          getRowKey={(p) => p.id}
          renderCard={(p) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.date).toLocaleString(intlLocale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 font-semibold">
                    {p.supplier_id
                      ? contactName.get(p.supplier_id) ?? t("common.empty")
                      : t("business.noSupplier")}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt(Number(p.total))}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("business.lineCount", { count: String(p.line_count) })}
              </p>
              <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailId(p.id)}>
                  {t("business.lines")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteId(p.id)}
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
            <SheetTitle>{t("business.purchaseLinesTitle")}</SheetTitle>
            <SheetDescription>{t("business.purchaseLinesDescription")}</SheetDescription>
          </SheetHeader>
          {detailId ? <PurchaseDetailBody purchaseId={detailId} /> : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t("business.removePurchaseTitle")}
        description={t("business.removePurchaseDescription")}
        confirmLabel={t("business.remove")}
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await deletePurchase(deleteId);
        }}
      />
    </div>
  );
}
