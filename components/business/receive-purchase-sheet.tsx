"use client";

import * as React from "react";

import { toDatetimeLocalValue } from "@/components/business/add-sale-form";
import type { PurchaseCollectionMode } from "@/components/business/add-purchase-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, moneyInputToNumber } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/select-native";
import { PendingLabel } from "@/components/ui/pending-label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { useReceivePurchase } from "@/hooks/usePurchases";
import { useT } from "@/hooks/useTranslations";
import type { PurchaseItemRow } from "@/lib/db/purchase-items";
import type { PurchaseLineInput, PurchasePaymentMethod, PurchaseWithMeta } from "@/lib/db/purchases";
import { formatMoneyDisplay } from "@/lib/format-money";
import { formatMoneyInputValue, multiplyMoney, sumMoney } from "@/lib/money";
import { isDecimalUom, validateQuantity } from "@/lib/uom";
import type { Product } from "@/lib/db/products";

type ReceiveLine = {
  key: string;
  product_id: string;
  quantity_ordered: string;
  quantity_received: string;
  unit_cost: string;
};

type Props = {
  purchase: PurchaseWithMeta | null;
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

function linesFromItems(items: PurchaseItemRow[]): ReceiveLine[] {
  return items.map((row) => ({
    key: row.id,
    product_id: row.product_id,
    quantity_ordered: String(row.quantity_ordered ?? row.quantity),
    quantity_received: String(row.quantity_ordered ?? row.quantity),
    unit_cost: formatMoneyInputValue(Number(row.unit_cost)),
  }));
}

export function ReceivePurchaseSheet({
  purchase,
  products,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { data: existingLines, isLoading } = usePurchaseItems(purchase?.id ?? null);
  const { receivePurchase, isReceiving } = useReceivePurchase();

  const [paymentMethod, setPaymentMethod] = React.useState<PurchasePaymentMethod>("cash");
  const [collectionMode, setCollectionMode] = React.useState<PurchaseCollectionMode>("full");
  const [partialAmount, setPartialAmount] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [feesAmount, setFeesAmount] = React.useState("");
  const [feesNotes, setFeesNotes] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<ReceiveLine[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const productById = React.useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  React.useEffect(() => {
    if (!open || !purchase) return;
    setPaymentMethod("cash");
    setCollectionMode("full");
    setPartialAmount("");
    setDateLocal(toDatetimeLocalValue(new Date()));
    setFeesAmount(
      Number(purchase.fees_amount) !== 0 ? formatMoneyInputValue(Number(purchase.fees_amount)) : ""
    );
    setFeesNotes(purchase.fees_notes ?? "");
    setNotes(purchase.notes ?? "");
    setError(null);
  }, [open, purchase]);

  React.useEffect(() => {
    if (existingLines?.length) {
      setLines(linesFromItems(existingLines));
    }
  }, [existingLines]);

  function setLine(key: string, patch: Partial<ReceiveLine>) {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const subtotalPreview = React.useMemo(() => {
    const values: number[] = [];
    for (const row of lines) {
      if (!row.product_id) continue;
      const qty = Number(row.quantity_received) || 0;
      values.push(multiplyMoney(qty, moneyInputToNumber(row.unit_cost)));
    }
    return sumMoney(...values);
  }, [lines]);

  const feesPreview = moneyInputToNumber(feesAmount);
  const totalPreview = sumMoney(subtotalPreview, feesPreview);

  function resolveAmountPaid(): number | null {
    if (collectionMode === "full") return totalPreview;
    if (collectionMode === "partial") return moneyInputToNumber(partialAmount);
    return 0;
  }

  function buildItems(): PurchaseLineInput[] {
    const items: PurchaseLineInput[] = [];
    for (const row of lines) {
      if (!row.product_id) continue;
      const ordered = Number(row.quantity_ordered) || 0;
      const received = Number(row.quantity_received) || 0;
      const unit = moneyInputToNumber(row.unit_cost);
      const pr = productById.get(row.product_id);
      if (!pr) throw new Error(t("business.errorPickProduct"));
      if (!validateQuantity(received, pr.unit_of_measure)) {
        throw new Error(t("business.errorQtyInvalid"));
      }
      items.push({
        product_id: row.product_id,
        quantity_ordered: ordered,
        quantity_received: received,
        unit_cost: unit,
        line_total: multiplyMoney(received, unit),
      });
    }
    if (items.length === 0) throw new Error(t("business.errorAddLine"));
    return items;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchase) return;
    setError(null);
    try {
      if (collectionMode === "partial") {
        const paid = moneyInputToNumber(partialAmount);
        if (paid <= 0 || paid > totalPreview) {
          throw new Error(t("business.errorPaymentAmount"));
        }
      }
      if (collectionMode !== "full" && !purchase.supplier_id) {
        throw new Error(t("business.supplierRequiredForCredit"));
      }

      const items = buildItems();
      await receivePurchase({
        purchase_id: purchase.id,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
        payment_method: paymentMethod,
        amount_paid: resolveAmountPaid(),
        fees_amount: feesPreview,
        fees_notes: feesNotes.trim() || null,
        items,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorSave"));
    }
  }

  function qtyInputProps(productId: string) {
    const pr = productId ? productById.get(productId) : undefined;
    const decimal = pr ? isDecimalUom(pr.unit_of_measure) : false;
    return {
      type: "number" as const,
      inputMode: decimal ? ("decimal" as const) : ("numeric" as const),
      step: decimal ? "0.01" : "1",
      min: decimal ? "0.01" : "1",
    };
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.receivePurchase")}</SheetTitle>
          <SheetDescription>{t("business.receivePurchaseDescription")}</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-4 py-4">
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="receive-date">{t("business.receivedDate")}</Label>
              <Input
                id="receive-date"
                type="datetime-local"
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
                required
                className="h-11 text-base"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="receive-fees">{t("business.feesAmount")}</Label>
                <MoneyInput
                  id="receive-fees"
                  className="h-11 text-base"
                  value={feesAmount}
                  onChange={setFeesAmount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receive-fees-notes">{t("business.feesNotes")}</Label>
                <Input
                  id="receive-fees-notes"
                  value={feesNotes}
                  onChange={(e) => setFeesNotes(e.target.value)}
                  placeholder={t("business.feesNotesPlaceholder")}
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receive-payment-method">{t("business.supplierPaymentMethod")}</Label>
              <NativeSelect
                id="receive-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
                className="h-11 text-base"
              >
                <option value="cash">{t("business.paymentCash")}</option>
                <option value="transfer">{t("business.paymentTransfer")}</option>
                <option value="credit">{t("business.paymentCredit")}</option>
              </NativeSelect>
            </div>

            <div className="space-y-3">
              <Label>{t("business.paymentMode")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["full", "partial", "credit"] as PurchaseCollectionMode[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={collectionMode === mode ? "secondary" : "outline"}
                    onClick={() => setCollectionMode(mode)}
                  >
                    {mode === "full"
                      ? t("business.collectionFull")
                      : mode === "partial"
                        ? t("business.collectionPartial")
                        : t("business.collectionCredit")}
                  </Button>
                ))}
              </div>
              {collectionMode === "partial" ? (
                <div className="space-y-2">
                  <Label htmlFor="receive-partial">{t("business.amountPaidToday")}</Label>
                  <MoneyInput
                    id="receive-partial"
                    className="h-11 max-w-xs text-base"
                    value={partialAmount}
                    onChange={setPartialAmount}
                  />
                </div>
              ) : null}
              {collectionMode === "credit" && !purchase?.supplier_id ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t("business.supplierRequiredForCredit")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="receive-notes">{t("business.notes")}</Label>
              <Textarea
                id="receive-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("business.product")}</TableHead>
                    <TableHead className="text-right">{t("business.qtyOrdered")}</TableHead>
                    <TableHead className="text-right">{t("business.qtyReceived")}</TableHead>
                    <TableHead className="text-right">{t("business.unitCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((row) => {
                    const pr = row.product_id ? productById.get(row.product_id) : undefined;
                    const qtyProps = qtyInputProps(row.product_id);
                    return (
                      <TableRow key={row.key}>
                        <TableCell>{pr?.name ?? row.product_id}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.quantity_ordered}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            {...qtyProps}
                            className="ml-auto h-10 w-20 text-right tabular-nums"
                            value={row.quantity_received}
                            onChange={(e) =>
                              setLine(row.key, { quantity_received: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyInput
                            className="ml-auto h-10 w-28 text-right"
                            value={row.unit_cost}
                            onChange={(v) => setLine(row.key, { unit_cost: v })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("business.subtotal")}</span>
                <span className="tabular-nums font-medium">{fmt(subtotalPreview)}</span>
              </div>
              {feesPreview !== 0 ? (
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">{t("business.feesAmount")}</span>
                  <span className="tabular-nums font-medium">{fmt(feesPreview)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between text-base font-bold">
                <span>{t("business.total")}</span>
                <span className="tabular-nums">{fmt(totalPreview)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={isReceiving}>
                {isReceiving ? (
                  <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
                ) : (
                  t("business.confirmReceive")
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
