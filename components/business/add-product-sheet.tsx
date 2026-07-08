"use client";

import * as React from "react";

import { UomSelect } from "@/components/business/uom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, moneyInputToNumber } from "@/components/ui/money-input";
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
import type { NewProduct } from "@/lib/db/products";
import type { UnitOfMeasure } from "@/lib/uom";

type ProductFormValues = Omit<NewProduct, "user_id" | "organization_id">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isSubmitting?: boolean;
};

export function AddProductSheet({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const { t } = useT();
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [stock, setStock] = React.useState("");
  const [minStock, setMinStock] = React.useState("");
  const [unitOfMeasure, setUnitOfMeasure] = React.useState<UnitOfMeasure>("unit");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setSku("");
    setSalePrice("");
    setCostPrice("");
    setStock("");
    setMinStock("");
    setUnitOfMeasure("unit");
    setIsActive(true);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim() || null,
        sale_price: moneyInputToNumber(salePrice),
        cost_price: moneyInputToNumber(costPrice),
        stock: Number(stock) || 0,
        min_stock: Number(minStock) || 0,
        unit_of_measure: unitOfMeasure,
        is_active: isActive,
      });
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
          <SheetTitle>{t("business.newProductTitle")}</SheetTitle>
          <SheetDescription>{t("business.newProductDescription")}</SheetDescription>
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
                <Label htmlFor="p-name">{t("business.name")}</Label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("business.namePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sku">{t("business.sku")}</Label>
                <Input
                  id="p-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder={t("business.skuPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-uom">{t("business.unitOfMeasure")}</Label>
                <UomSelect
                  id="p-uom"
                  value={unitOfMeasure}
                  onChange={setUnitOfMeasure}
                  className="h-10 w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="p-sale">{t("business.salePrice")}</Label>
                  <MoneyInput
                    id="p-sale"
                    value={salePrice}
                    onChange={setSalePrice}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-cost">{t("business.costPrice")}</Label>
                  <MoneyInput
                    id="p-cost"
                    value={costPrice}
                    onChange={setCostPrice}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="p-stock">{t("business.stockOnHand")}</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-min">{t("business.reorderAt")}</Label>
                  <Input
                    id="p-min"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
              ) : (
                t("business.saveProduct")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
