"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NewProduct, Product } from "@/lib/db/products";

type ProductFormValues = Omit<NewProduct, "user_id" | "organization_id">;

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Partial<ProductFormValues>) => Promise<void>;
  isSubmitting?: boolean;
};

export function EditProductSheet({ product, open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("0");
  const [costPrice, setCostPrice] = React.useState("0");
  const [stock, setStock] = React.useState("0");
  const [minStock, setMinStock] = React.useState("0");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open || !product) return;
    setName(product.name);
    setSku(product.sku ?? "");
    setSalePrice(String(product.sale_price));
    setCostPrice(String(product.cost_price));
    setStock(String(product.stock));
    setMinStock(String(product.min_stock ?? 0));
    setIsActive(product.is_active);
  }, [open, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim() || null,
        sale_price: Number(salePrice) || 0,
        cost_price: Number(costPrice) || 0,
        stock: Number(stock) || 0,
        min_stock: Number(minStock) || 0,
        is_active: isActive,
      });
      onOpenChange(false);
    } catch {
      // parent surfaced error; keep sheet open
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Edit product</SheetTitle>
          <SheetDescription>
            Update catalog details, pricing, or inventory levels.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex max-h-[calc(100dvh-6rem)] flex-col"
        >
          <div className="space-y-4 overflow-y-auto overscroll-contain px-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="ep-name">Name</Label>
              <Input
                id="ep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cold brew 12oz"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-sku">SKU</Label>
              <Input
                id="ep-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Internal code"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ep-sale">Sale price</Label>
                <Input
                  id="ep-sale"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-cost">Cost price</Label>
                <Input
                  id="ep-cost"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ep-stock">Stock on hand</Label>
                <Input
                  id="ep-stock"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-min">Reorder at (min)</Label>
                <Input
                  id="ep-min"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Active (shown in pickers)
            </label>
          </div>
          <SheetFooter className="mt-auto border-t border-border bg-card/50 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !product}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
