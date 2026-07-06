"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";

import { AddProductSheet } from "@/components/business/add-product-sheet";
import { EditProductSheet } from "@/components/business/edit-product-sheet";
import { PageHeader } from "@/components/business/page-header";
import { ResponsiveList } from "@/components/business/responsive-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { formatMoney } from "@/lib/format-money";
import type { Product } from "@/lib/db/products";

export function ProductsView() {
  const { products, createProduct, updateProduct, deleteProduct, isCreating, isUpdating, isLoading } =
    useProducts();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState<Product | null>(null);
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.sku ? (
              <p className="text-xs text-muted-foreground tabular-nums">SKU {row.original.sku}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "sale_price",
        header: "Sale",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(Number(row.original.sale_price))}</span>
        ),
      },
      {
        accessorKey: "cost_price",
        header: "Cost",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatMoney(Number(row.original.cost_price))}
          </span>
        ),
      },
      {
        accessorKey: "stock",
        header: "Stock",
        cell: ({ row }) => {
          const low =
            (row.original.min_stock ?? 0) > 0 &&
            Number(row.original.stock) <= Number(row.original.min_stock ?? 0);
          return (
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-medium">{row.original.stock}</span>
              {low ? (
                <Badge variant="destructive" className="text-[0.65rem]">
                  Low
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
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
              size="sm"
              onClick={() => setEditProduct(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Products"
          description="Catalog, pricing, and inventory. Low stock surfaces automatically."
          actions={
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New product
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
            placeholder="Search products…"
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ResponsiveList
          data={products}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel="No products yet. Create one to start selling."
          getRowKey={(p) => p.id}
          renderCard={(p) => {
            const low = (p.min_stock ?? 0) > 0 && Number(p.stock) <= Number(p.min_stock ?? 0);
            return (
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.sku ? (
                      <p className="text-xs text-muted-foreground">SKU {p.sku}</p>
                    ) : null}
                  </div>
                  <Badge variant={p.is_active ? "secondary" : "outline"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Sale</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(Number(p.sale_price))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Cost</dt>
                    <dd className="tabular-nums text-muted-foreground">
                      {formatMoney(Number(p.cost_price))}
                    </dd>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">Stock</span>
                    <span className="flex items-center gap-2 font-semibold tabular-nums">
                      {p.stock}
                      {low ? (
                        <Badge variant="destructive" className="text-[0.65rem]">
                          Low
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditProduct(p)}
                  >
                    Edit
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
            );
          }}
        />
      </div>

      <EditProductSheet
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(o) => !o && setEditProduct(null)}
        isSubmitting={isUpdating}
        onSubmit={async (values) => {
          if (!editProduct) return;
          setFormError(null);
          try {
            await updateProduct({ id: editProduct.id, patch: values });
          } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not save");
            throw e;
          }
        }}
      />

      <AddProductSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          setFormError(null);
          try {
            await createProduct(values);
          } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not save");
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove product?"
        description="Soft-deleted from lists. Historical sales lines stay unchanged."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await deleteProduct(deleteId);
        }}
      />
    </div>
  );
}
