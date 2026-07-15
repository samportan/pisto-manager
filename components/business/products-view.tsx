"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { AddProductSheet } from "@/components/business/add-product-sheet";
import { EditProductSheet } from "@/components/business/edit-product-sheet";
import { ExportExcelButton } from "@/components/business/export-excel-button";
import { PageHeader } from "@/components/business/page-header";
import { DataTable } from "@/components/business/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import { formatMoneyDisplay } from "@/lib/format-money";
import { buildProductsWorkbook, downloadWorkbook, todayFilename } from "@/lib/export/business-exports";
import type { Product } from "@/lib/db/products";
import { isLowStock, isOutOfStock, stockUrgency } from "@/lib/stock";
import { cn } from "@/lib/utils";

export function ProductsView({ embedded = false }: { embedded?: boolean }) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const searchParams = useSearchParams();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { products, createProduct, updateProduct, deleteProduct, isCreating, isUpdating, isDeleting, isLoading } =
    useProducts();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState<Product | null>(null);
  const [search, setSearch] = React.useState("");
  const [lowStockOnly, setLowStockOnly] = React.useState(
    () => searchParams.get("stock") === "low"
  );
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("stock") === "low") {
      setLowStockOnly(true);
    }
  }, [searchParams]);

  const tableData = React.useMemo(() => {
    const filtered = lowStockOnly ? products.filter(isLowStock) : products;
    if (!lowStockOnly) return filtered;
    return filtered.slice().sort((a, b) => {
      const urgencyDiff = stockUrgency(a) - stockUrgency(b);
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.name.localeCompare(b.name);
    });
  }, [products, lowStockOnly]);

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("business.product"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.sku ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("business.sku")} {row.original.sku}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "sale_price",
        header: t("business.sale"),
        cell: ({ row }) => (
          <span className="tabular-nums">{fmt(Number(row.original.sale_price))}</span>
        ),
      },
      {
        accessorKey: "cost_price",
        header: t("business.cost"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {fmt(Number(row.original.cost_price))}
          </span>
        ),
      },
      {
        accessorKey: "stock",
        header: t("business.stock"),
        cell: ({ row }) => {
          const out = isOutOfStock(row.original);
          const low = isLowStock(row.original);
          return (
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-medium">
                {row.original.stock}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {t(`business.uom.${row.original.unit_of_measure ?? "unit"}`)}
                </span>
              </span>
              {out ? (
                <Badge variant="destructive" className="text-[0.65rem]">
                  {t("business.outOfStock")}
                </Badge>
              ) : low ? (
                <Badge variant="destructive" className="text-[0.65rem]">
                  {t("business.low")}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: t("business.status"),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? t("business.active") : t("business.inactive")}
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
    [fmt, t]
  );

  return (
    <div className="flex-1">
      <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${embedded ? "pb-8" : "py-8"}`}>
        <PageHeader
          title={t("business.productsTitle")}
          description={t("business.productsSubtitle")}
          actions={
            <div className="flex flex-wrap gap-2">
              <ExportExcelButton
                label={t("business.downloadExcel")}
                isExporting={exporting}
                onExport={async () => {
                  setExporting(true);
                  try {
                    const sheets = await buildProductsWorkbook(
                      products,
                      t("business.sheetProducts")
                    );
                    downloadWorkbook(sheets, todayFilename("productos"));
                  } finally {
                    setExporting(false);
                  }
                }}
              />
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
                <Plus className="size-4" aria-hidden />
                {t("business.newProduct")}
              </Button>
            </div>
          }
        />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder={t("business.searchProducts")}
              className="h-10 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant={lowStockOnly ? "secondary" : "outline"}
            className={cn(lowStockOnly && "border-destructive/40 text-destructive")}
            onClick={() => setLowStockOnly((v) => !v)}
            aria-pressed={lowStockOnly}
          >
            {t("business.filterLowStock")}
          </Button>
        </div>

        <DataTable
          data={tableData}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel={
            lowStockOnly && !search
              ? t("business.lowStockEmpty")
              : t("business.noProducts")
          }
        />
      </div>

      <EditProductSheet
        product={editProduct ? products.find((p) => p.id === editProduct.id) ?? editProduct : null}
        open={!!editProduct}
        onOpenChange={(o) => !o && setEditProduct(null)}
        isSubmitting={isUpdating}
        onSubmit={async (values) => {
          if (!editProduct) return;
          try {
            await updateProduct({ id: editProduct.id, patch: values });
            toast.success("toast.productUpdated");
            setEditProduct(null);
          } catch (e) {
            toast.errorFrom(e);
            throw e;
          }
        }}
      />

      <AddProductSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          try {
            await createProduct(values);
            toast.success("toast.productSaved");
            setSheetOpen(false);
          } catch (e) {
            toast.errorFrom(e);
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title={t("business.removeProductTitle")}
        description={t("business.removeProductDescription")}
        confirmLabel={t("business.remove")}
        pendingLabel={t("common.deleting")}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) {
            await deleteProduct(deleteId);
            toast.success("toast.productDeleted");
          }
        }}
        onError={(err) => toast.errorFrom(err, "delete")}
      />
    </div>
  );
}
