"use client";

import * as React from "react";

import { UomSelect } from "@/components/business/uom-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, moneyInputToNumber } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/select-native";
import { PendingLabel } from "@/components/ui/pending-label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStockAdjustment, useStockMovements } from "@/hooks/useStockMovements";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { NewProduct, Product } from "@/lib/db/products";
import type { StockAdjustmentReason } from "@/lib/db/stock-movements";
import type { UnitOfMeasure } from "@/lib/uom";

type ProductFormValues = Omit<NewProduct, "user_id" | "organization_id">;

const REASONS: StockAdjustmentReason[] = [
  "count_correction",
  "personal_use",
  "waste",
  "gift",
  "other",
];

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Partial<ProductFormValues>) => Promise<void>;
  isSubmitting?: boolean;
};

export function EditProductSheet({ product, open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const { t, intlLocale } = useT();
  const toast = useAppToast();
  const { movements, isLoading: movementsLoading } = useStockMovements(product?.id ?? null);
  const { adjustStock, isAdjusting } = useStockAdjustment();

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [minStock, setMinStock] = React.useState("");
  const [unitOfMeasure, setUnitOfMeasure] = React.useState<UnitOfMeasure>("unit");
  const [isActive, setIsActive] = React.useState(true);
  const [adjustQty, setAdjustQty] = React.useState("");
  const [adjustReason, setAdjustReason] =
    React.useState<StockAdjustmentReason>("count_correction");
  const [adjustNotes, setAdjustNotes] = React.useState("");

  React.useEffect(() => {
    if (!open || !product) return;
    setName(product.name);
    setSku(product.sku ?? "");
    setSalePrice(String(product.sale_price));
    setCostPrice(String(product.cost_price));
    setMinStock(String(product.min_stock ?? 0));
    setUnitOfMeasure(product.unit_of_measure ?? "unit");
    setIsActive(product.is_active);
    setAdjustQty("");
    setAdjustReason("count_correction");
    setAdjustNotes("");
  }, [open, product]);

  const currentStock = product ? Number(product.stock) : 0;
  const adjustDelta = Number(adjustQty) || 0;
  const stockAfter = currentStock + adjustDelta;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const patch: Partial<ProductFormValues> = {
        name: name.trim(),
        sku: sku.trim() || null,
        sale_price: moneyInputToNumber(salePrice),
        cost_price: moneyInputToNumber(costPrice),
        min_stock: Number(minStock) || 0,
        unit_of_measure: unitOfMeasure,
        is_active: isActive,
      };
      await onSubmit(patch);
      onOpenChange(false);
    } catch {
      // parent surfaced error; keep sheet open
    }
  }

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    try {
      const delta = Number(adjustQty);
      if (!delta || delta === 0) {
        toast.error("business.errorQtyPositive");
        return;
      }
      await adjustStock({
        product_id: product.id,
        quantity_delta: delta,
        reason: adjustReason,
        notes: adjustNotes.trim() || null,
      });
      setAdjustQty("");
      setAdjustNotes("");
    } catch (err) {
      toast.errorFrom(err);
    }
  }

  function reasonLabel(reason: StockAdjustmentReason) {
    const map: Record<StockAdjustmentReason, string> = {
      count_correction: t("business.reasonCountCorrection"),
      personal_use: t("business.reasonPersonalUse"),
      waste: t("business.reasonWaste"),
      gift: t("business.reasonGift"),
      other: t("business.reasonOther"),
    };
    return map[reason];
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!isSubmitting && !isAdjusting) onOpenChange(o);
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
              <div className="space-y-2">
                <Label htmlFor="ep-uom">{t("business.unitOfMeasure")}</Label>
                <UomSelect
                  id="ep-uom"
                  value={unitOfMeasure}
                  onChange={setUnitOfMeasure}
                  className="h-10 w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ep-sale">{t("business.salePrice")}</Label>
                  <MoneyInput
                    id="ep-sale"
                    value={salePrice}
                    onChange={setSalePrice}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ep-cost">{t("business.costPrice")}</Label>
                  <MoneyInput
                    id="ep-cost"
                    value={costPrice}
                    onChange={setCostPrice}
                  />
                </div>
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

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{t("business.adjustStock")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("business.adjustStockDescription")}
                </p>
                <p className="mt-2 text-sm">
                  {t("business.stock")}:{" "}
                  <span className="font-semibold tabular-nums">
                    {currentStock} {t(`business.uom.${unitOfMeasure}`)}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-adjust-qty">{t("business.adjustmentQty")}</Label>
                <Input
                  id="ep-adjust-qty"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="+10 / -2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-adjust-reason">{t("business.adjustmentReason")}</Label>
                <NativeSelect
                  id="ep-adjust-reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as StockAdjustmentReason)}
                  className="h-10 w-full"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {reasonLabel(r)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-adjust-notes">{t("business.adjustmentNotes")}</Label>
                <Textarea
                  id="ep-adjust-notes"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={2}
                />
              </div>
              {adjustQty ? (
                <p className="text-sm text-muted-foreground">
                  {t("business.stockAfter")}:{" "}
                  <span className="font-medium tabular-nums text-foreground">{stockAfter}</span>
                </p>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isAdjusting || !product}
                onClick={(e) => void handleAdjustment(e)}
              >
                {isAdjusting ? (
                  <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
                ) : (
                  t("business.saveAdjustment")
                )}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("business.stockHistory")}</h3>
              {movementsLoading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("business.noStockMovements")}</p>
              ) : (
                <ul className="space-y-2">
                  {movements.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[0.65rem]">
                          {reasonLabel(m.reason)}
                        </Badge>
                        <span
                          className={`font-semibold tabular-nums ${
                            m.quantity_delta > 0 ? "text-green-600" : "text-destructive"
                          }`}
                        >
                          {m.quantity_delta > 0 ? "+" : ""}
                          {m.quantity_delta}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString(intlLocale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        · {m.stock_before} → {m.stock_after}
                      </p>
                      {m.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
