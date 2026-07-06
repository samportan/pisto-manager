"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingLabel } from "@/components/ui/pending-label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/hooks/useTranslations";
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
  const { t } = useT();
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("0");
  const [costPrice, setCostPrice] = React.useState("0");
  const [stock, setStock] = React.useState("0");
  const [minStock, setMinStock] = React.useState("0");
  const [isActive, setIsActive] = React.useState(true);
  const [stockTouched, setStockTouched] = React.useState(false);

  React.useEffect(() => {
    if (!open || !product) return;
    setName(product.name);
    setSku(product.sku ?? "");
    setSalePrice(String(product.sale_price));
    setCostPrice(String(product.cost_price));
    setStock(String(product.stock));
    setMinStock(String(product.min_stock ?? 0));
    setIsActive(product.is_active);
    setStockTouched(false);
  }, [open, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const patch: Partial<ProductFormValues> = {
        name: name.trim(),
        sku: sku.trim() || null,
        sale_price: Number(salePrice) || 0,
        cost_price: Number(costPrice) || 0,
        min_stock: Number(minStock) || 0,
        is_active: isActive,
      };
      if (stockTouched) {
        patch.stock = Number(stock) || 0;
      }
      await onSubmit(patch);
      onOpenChange(false);
    } catch {
      // parent surfaced error; keep sheet open
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!isSubmitting) onOpenChange(o);
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.editProductTitle")}</SheetTitle>
          <SheetDescription>{t("business.editProductDescription")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex max-h-[calc(100dvh-6rem)] flex-col"
        >
          <div className="space-y-4 overflow-y-auto overscroll-contain px-4 py-6">
            <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ep-name">{t("business.name")}</Label>
              <Input
                id="ep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("business.namePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-sku">{t("business.sku")}</Label>
              <Input
                id="ep-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t("business.skuPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ep-sale">{t("business.salePrice")}</Label>
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
                <Label htmlFor="ep-cost">{t("business.costPrice")}</Label>
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
                <Label htmlFor="ep-stock">{t("business.stockOnHand")}</Label>
                <Input
                  id="ep-stock"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={stock}
                  onChange={(e) => {
                    setStockTouched(true);
                    setStock(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-min">{t("business.reorderAt")}</Label>
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
              {t("business.activeInPickers")}
            </label>
            </fieldset>
          </div>
          <SheetFooter className="mt-auto border-t border-border bg-card/50 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !product}>
              {isSubmitting ? (
                <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
              ) : (
                t("business.saveChanges")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
