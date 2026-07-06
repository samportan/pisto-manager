"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Plus, Search, Trash2 } from "lucide-react";

import { AddPurchaseSheet } from "@/components/business/add-purchase-sheet";
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
import { useProducts } from "@/hooks/useProducts";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { usePurchases } from "@/hooks/usePurchases";
import { formatMoney } from "@/lib/format-money";
import type { PurchaseWithMeta } from "@/lib/db/purchases";

function PurchaseDetailBody({ purchaseId }: { purchaseId: string }) {
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
    return <p className="p-4 text-sm text-muted-foreground">No lines.</p>;
  }
  return (
    <div className="px-4 pb-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Line</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.products?.name ?? row.product_id}</TableCell>
              <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(Number(row.unit_cost))}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatMoney(Number(row.line_total))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PurchasesView() {
  const { purchases, createPurchaseWithItems, deletePurchase, isCreating, isLoading } =
    usePurchases();
  const { contacts } = useContacts();
  const { products } = useProducts();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const suppliers = React.useMemo(
    () => contacts.filter((c) => c.type === "supplier" || c.type === "both"),
    [contacts]
  );

  const contactName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, c.name);
    return m;
  }, [contacts]);

  const columns = React.useMemo<ColumnDef<PurchaseWithMeta>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {new Date(row.original.date).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ),
      },
      {
        id: "supplier",
        header: "Supplier",
        accessorFn: (row) =>
          row.supplier_id ? contactName.get(row.supplier_id) ?? "" : "—",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.supplier_id
              ? contactName.get(row.original.supplier_id) ?? "—"
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "line_count",
        header: "Lines",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.line_count}</span>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatMoney(Number(row.original.total))}
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
              aria-label="View lines"
              onClick={() => setDetailId(row.original.id)}
            >
              <Eye className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label="Remove purchase"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [contactName]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Purchases"
          description="Receiving stock with optional supplier and landed unit cost."
          actions={
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New purchase
            </Button>
          }
        />

        {formError ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search purchases…"
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
          emptyLabel="No purchases yet."
          getRowKey={(p) => p.id}
          renderCard={(p) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.date).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 font-semibold">
                    {p.supplier_id ? contactName.get(p.supplier_id) ?? "—" : "No supplier"}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums">{formatMoney(Number(p.total))}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.line_count} line(s)</p>
              <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailId(p.id)}>
                  Lines
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteId(p.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        />
      </div>

      <AddPurchaseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        products={products}
        suppliers={suppliers}
        isSubmitting={isCreating}
        onSubmit={async (payload) => {
          setFormError(null);
          try {
            await createPurchaseWithItems(payload);
          } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not save");
            throw e;
          }
        }}
      />

      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>Purchase lines</SheetTitle>
            <SheetDescription>Products and costs for this document.</SheetDescription>
          </SheetHeader>
          {detailId ? <PurchaseDetailBody purchaseId={detailId} /> : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove purchase?"
        description="Soft-deleted from lists. Totals in overview still include history."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await deletePurchase(deleteId);
        }}
      />
    </div>
  );
}
