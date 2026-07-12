"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { toDatetimeLocalValue } from "@/components/business/add-sale-form";
import { ContactPicker } from "@/components/business/contact-picker";
import { ProductPicker } from "@/components/business/product-picker";
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
import { useContacts } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useProducts";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import {
  useReceivePurchase,
  useUpdatePendingPurchase,
  useUpdateReceivedPurchase,
} from "@/hooks/usePurchases";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { Contact } from "@/lib/db/contacts";
import type { PurchaseItemRow } from "@/lib/db/purchase-items";
import type {
  PurchaseLineInput,
  PurchasePaymentMethod,
  PurchaseWithMeta,
} from "@/lib/db/purchases";
import type { Product } from "@/lib/db/products";
import { formatMoneyDisplay } from "@/lib/format-money";
import { formatMoneyInputValue, multiplyMoney, sumMoney } from "@/lib/money";
import { isDecimalUom, validateQuantity } from "@/lib/uom";

type EditLine = {
  key: string;
  product_id: string;
  quantity_ordered: string;
  quantity_received: string;
  unit_cost: string;
};

type Props = {
  purchase: PurchaseWithMeta | null;
  products: Product[];
  suppliers: Contact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

function linesFromItems(items: PurchaseItemRow[]): EditLine[] {
  return items.map((row) => ({
    key: row.id,
    product_id: row.product_id,
    quantity_ordered: String(row.quantity_ordered ?? row.quantity),
    quantity_received: String(row.quantity_received ?? row.quantity_ordered ?? row.quantity),
    unit_cost: formatMoneyInputValue(Number(row.unit_cost)),
  }));
}

export function EditPurchaseSheet({
  purchase,
  products,
  suppliers,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { data: existingLines, isLoading } = usePurchaseItems(purchase?.id ?? null);
  const { updatePendingPurchase, isUpdating: isUpdatingPending } = useUpdatePendingPurchase();
  const { updateReceivedPurchase, isUpdating: isUpdatingReceived } = useUpdateReceivedPurchase();

  const isPending = purchase?.receipt_status === "pending";
  const isSubmitting = isUpdatingPending || isUpdatingReceived;

  const [supplierId, setSupplierId] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState("");
  const [expectedAtLocal, setExpectedAtLocal] = React.useState("");
  const [feesAmount, setFeesAmount] = React.useState("");
  const [feesNotes, setFeesNotes] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<EditLine[]>([]);

  const productById = React.useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  React.useEffect(() => {
    if (!open || !purchase) return;
    setSupplierId(purchase.supplier_id ?? "");
    setDateLocal(toDatetimeLocalValue(new Date(purchase.date)));
    setExpectedAtLocal(
      purchase.expected_at ? toDatetimeLocalValue(new Date(purchase.expected_at)) : ""
    );
    setFeesAmount(
      Number(purchase.fees_amount) !== 0 ? formatMoneyInputValue(Number(purchase.fees_amount)) : ""
    );
    setFeesNotes(purchase.fees_notes ?? "");
    setNotes(purchase.notes ?? "");
  }, [open, purchase]);

  React.useEffect(() => {
    if (existingLines?.length) {
      setLines(linesFromItems(existingLines));
    }
  }, [existingLines]);

  function setLine(key: string, patch: Partial<EditLine>) {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        product_id: "",
        quantity_ordered: "1",
        quantity_received: "1",
        unit_cost: "",
      },
    ]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const subtotalPreview = React.useMemo(() => {
    const values: number[] = [];
    for (const row of lines) {
      if (!row.product_id) continue;
      const qty = isPending
        ? Number(row.quantity_ordered) || 0
        : Number(row.quantity_received) || 0;
      values.push(multiplyMoney(qty, moneyInputToNumber(row.unit_cost)));
    }
    return sumMoney(...values);
  }, [lines, isPending]);

  const feesPreview = moneyInputToNumber(feesAmount);
  const totalPreview = sumMoney(subtotalPreview, feesPreview);

  function buildItems(): PurchaseLineInput[] {
    const items: PurchaseLineInput[] = [];
    for (const row of lines) {
      if (!row.product_id) continue;
      const ordered = Number(row.quantity_ordered) || 0;
      const received = Number(row.quantity_received) || 0;
      const unit = moneyInputToNumber(row.unit_cost);
      const pr = productById.get(row.product_id);
      if (!pr) throw new Error(t("business.errorPickProduct"));
      const qty = isPending ? ordered : received;
      if (!validateQuantity(qty, pr.unit_of_measure)) {
        throw new Error(t("business.errorQtyInvalid"));
      }
      items.push({
        product_id: row.product_id,
        quantity_ordered: ordered,
        quantity_received: isPending ? null : received,
        unit_cost: unit,
        line_total: multiplyMoney(qty, unit),
      });
    }
    if (items.length === 0) throw new Error(t("business.errorAddLine"));
    return items;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchase) return;
    try {
      const items = buildItems();
      if (isPending) {
        await updatePendingPurchase({
          purchase_id: purchase.id,
          supplier_id: supplierId || null,
          date: new Date(dateLocal).toISOString(),
          notes: notes.trim() || null,
          expected_at: expectedAtLocal ? new Date(expectedAtLocal).toISOString() : null,
          fees_amount: feesPreview,
          fees_notes: feesNotes.trim() || null,
          items,
        });
      } else {
        await updateReceivedPurchase({
          purchase_id: purchase.id,
          supplier_id: supplierId || null,
          date: new Date(dateLocal).toISOString(),
          notes: notes.trim() || null,
          fees_amount: feesPreview,
          fees_notes: feesNotes.trim() || null,
          items,
        });
      }
      toast.success("toast.purchaseUpdated");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.errorFrom(err);
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

  const pickerProducts = products.filter((p) => p.is_active);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.editPurchase")}</SheetTitle>
          <SheetDescription>{t("business.editPurchaseDescription")}</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">{t("business.supplier")}</Label>
              <ContactPicker
                id="edit-supplier"
                contacts={suppliers}
                value={supplierId}
                onValueChange={setSupplierId}
                allowEmpty
                emptyLabel={t("business.noSupplier")}
                searchPlaceholder={t("business.searchSuppliers")}
                noMatchLabel={t("business.noSuppliersMatch")}
                className="h-11 text-base"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-date">{t("business.date")}</Label>
                <Input
                  id="edit-date"
                  type="datetime-local"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>
              {isPending ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-expected">{t("business.expectedDelivery")}</Label>
                  <Input
                    id="edit-expected"
                    type="datetime-local"
                    value={expectedAtLocal}
                    onChange={(e) => setExpectedAtLocal(e.target.value)}
                    className="h-11 text-base"
                  />
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-fees">{t("business.feesAmount")}</Label>
                <MoneyInput
                  id="edit-fees"
                  className="h-11 text-base"
                  value={feesAmount}
                  onChange={setFeesAmount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fees-notes">{t("business.feesNotes")}</Label>
                <Input
                  id="edit-fees-notes"
                  value={feesNotes}
                  onChange={(e) => setFeesNotes(e.target.value)}
                  placeholder={t("business.feesNotesPlaceholder")}
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">{t("business.notes")}</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
                <Plus className="size-4" />
                {t("business.addLine")}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("business.product")}</TableHead>
                    {isPending ? (
                      <TableHead className="text-right">{t("business.qtyOrdered")}</TableHead>
                    ) : (
                      <>
                        <TableHead className="text-right">{t("business.qtyOrdered")}</TableHead>
                        <TableHead className="text-right">{t("business.qtyReceived")}</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">{t("business.unitCost")}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((row) => {
                    const qtyProps = qtyInputProps(row.product_id);
                    return (
                      <TableRow key={row.key}>
                        <TableCell>
                          <ProductPicker
                            products={pickerProducts}
                            value={row.product_id}
                            onValueChange={(id) => setLine(row.key, { product_id: id })}
                            className="h-10 w-full min-w-[10rem]"
                          />
                        </TableCell>
                        {isPending ? (
                          <TableCell className="text-right">
                            <Input
                              {...qtyProps}
                              className="ml-auto h-10 w-20 text-right tabular-nums"
                              value={row.quantity_ordered}
                              onChange={(e) =>
                                setLine(row.key, { quantity_ordered: e.target.value })
                              }
                            />
                          </TableCell>
                        ) : (
                          <>
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
                          </>
                        )}
                        <TableCell className="text-right">
                          <MoneyInput
                            className="ml-auto h-10 w-28 text-right"
                            value={row.unit_cost}
                            onChange={(v) => setLine(row.key, { unit_cost: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={lines.length <= 1}
                            onClick={() => removeLine(row.key)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
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
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
