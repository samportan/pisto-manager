"use client";

import * as React from "react";

import { BarcodeField } from "@/components/business/barcode-field";
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
import { normalizeProductCode } from "@/lib/barcode/normalize";
import type { NewProduct, Product } from "@/lib/db/products";
import { formatMoneyDisplay } from "@/lib/format-money";
import { formatMoneyInputValue } from "@/lib/money";
import { suggestedSalePrice, TARGET_CONTRIBUTION_MARGIN } from "@/lib/pricing";
import type { UnitOfMeasure } from "@/lib/uom";

type ProductFormValues = Omit<NewProduct, "user_id" | "organization_id">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isSubmitting?: boolean;
  products?: Product[];
};

export function AddProductSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  products = [],
}: Props) {
  const { t, intlLocale, currency } = useT();
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("");
  const [salePriceTouched, setSalePriceTouched] = React.useState(false);
  const [costPrice, setCostPrice] = React.useState("");
  const [stock, setStock] = React.useState("");
  const [minStock, setMinStock] = React.useState("");
  const [unitOfMeasure, setUnitOfMeasure] = React.useState<UnitOfMeasure>("unit");
  const [isActive, setIsActive] = React.useState(true);

  const costNumber = moneyInputToNumber(costPrice);
  const suggested = suggestedSalePrice(costNumber);
  const suggestedLabel =
    suggested > 0
      ? formatMoneyDisplay(suggested, { currency, locale: intlLocale })
      : null;

  const normalizedBarcode = normalizeProductCode(barcode);
  const barcodeDuplicate =
    normalizedBarcode.length > 0 &&
    products.some(
      (p) =>
        p.barcode &&
        normalizeProductCode(p.barcode).toLowerCase() === normalizedBarcode.toLowerCase()
    );

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setSku("");
    setBarcode("");
    setSalePrice("");
    setSalePriceTouched(false);
    setCostPrice("");
    setStock("");
    setMinStock("");
    setUnitOfMeasure("unit");
    setIsActive(true);
  }, [open]);

  function handleCostChange(value: string) {
    setCostPrice(value);
    if (salePriceTouched) return;
    const cost = moneyInputToNumber(value);
    const next = suggestedSalePrice(cost);
    setSalePrice(next > 0 ? formatMoneyInputValue(next) : "");
  }

  function handleSaleChange(value: string) {
    setSalePriceTouched(true);
    setSalePrice(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (barcodeDuplicate) return;
    try {
      const cost = moneyInputToNumber(costPrice);
      let sale = moneyInputToNumber(salePrice);
      if (sale === 0 && cost > 0) {
        sale = suggestedSalePrice(cost);
      }
      await onSubmit({
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: normalizedBarcode || null,
        sale_price: sale,
        cost_price: cost,
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
              <BarcodeField
                id="p-barcode"
                value={barcode}
                onChange={setBarcode}
                duplicate={barcodeDuplicate}
              />
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
                  <Label htmlFor="p-cost">{t("business.costPrice")}</Label>
                  <MoneyInput
                    id="p-cost"
                    value={costPrice}
                    onChange={handleCostChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-sale">{t("business.salePrice")}</Label>
                  <MoneyInput
                    id="p-sale"
                    value={salePrice}
                    onChange={handleSaleChange}
                  />
                </div>
              </div>
              {suggestedLabel ? (
                <p className="text-xs text-muted-foreground">
                  {t("business.suggestedSalePriceHint", {
                    percent: Math.round(TARGET_CONTRIBUTION_MARGIN * 100),
                    amount: suggestedLabel,
                  })}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="p-stock">{t("business.stockOnHand")}</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0"
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
              <p className="text-xs text-muted-foreground">{t("business.stockOnHandHint")}</p>
              <p className="text-xs text-muted-foreground">{t("business.minStockAlertHint")}</p>
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
            <Button type="submit" disabled={isSubmitting || barcodeDuplicate}>
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
