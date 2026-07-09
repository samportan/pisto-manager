"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { DocumentFormPage } from "@/components/business/document-form-page";
import { ProductPicker } from "@/components/business/product-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, moneyInputToNumber } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/hooks/useTranslations";
import type { CollectionMode } from "@/hooks/useSales";
import type { Product } from "@/lib/db/products";
import type { Contact } from "@/lib/db/contacts";
import type { PaymentMethod, SaleLineInput } from "@/lib/db/sales";
import { formatMoneyDisplay } from "@/lib/format-money";
import {
  applyCardSurcharge as calcCardSurcharge,
  formatMoneyInputValue,
  multiplyMoney,
  sumMoney,
  truncMoney,
} from "@/lib/money";
import { isDecimalUom, validateQuantity } from "@/lib/uom";

export function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Line = { key: string; product_id: string; quantity: string; unit_price: string };

type Props = {
  products: Product[];
  customers: Contact[];
  onSubmit: (payload: {
    customer_id: string | null;
    date: string;
    notes: string | null;
    payment_method: PaymentMethod;
    apply_card_surcharge: boolean;
    amount_paid: number | null;
    items: SaleLineInput[];
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export function AddSaleForm({ products, customers, onSubmit, onCancel, isSubmitting }: Props) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });

  const [customerId, setCustomerId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [applyCardSurcharge, setApplyCardSurcharge] = React.useState(false);
  const [collectionMode, setCollectionMode] = React.useState<CollectionMode>("full");
  const [partialAmount, setPartialAmount] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([
    { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_price: "" },
  ]);
  const [localErr, setLocalErr] = React.useState<string | null>(null);

  const productById = React.useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  React.useEffect(() => {
    if (paymentMethod !== "card") {
      setApplyCardSurcharge(false);
    }
  }, [paymentMethod]);

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.product_id !== undefined && patch.product_id) {
          const pr = productById.get(patch.product_id);
          if (pr) {
            next.unit_price = pr.sale_price > 0 ? formatMoneyInputValue(pr.sale_price) : "";
          }
        }
        return next;
      })
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_price: "" },
    ]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const lineTotals = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of lines) {
      if (!row.product_id) {
        totals.set(row.key, 0);
        continue;
      }
      const q = Number(row.quantity) || 0;
      const u = moneyInputToNumber(row.unit_price);
      totals.set(row.key, multiplyMoney(q, u));
    }
    return totals;
  }, [lines]);

  const subtotalPreview = React.useMemo(() => {
    const values: number[] = [];
    for (const row of lines) {
      if (!row.product_id) continue;
      values.push(lineTotals.get(row.key) ?? 0);
    }
    return sumMoney(...values);
  }, [lines, lineTotals]);

  const cardSurchargePreview = React.useMemo(() => {
    if (paymentMethod !== "card") return 0;
    return calcCardSurcharge(subtotalPreview);
  }, [paymentMethod, subtotalPreview]);

  const totalPreview = React.useMemo(() => {
    if (paymentMethod === "card" && applyCardSurcharge) {
      return sumMoney(subtotalPreview, cardSurchargePreview);
    }
    return subtotalPreview;
  }, [paymentMethod, applyCardSurcharge, subtotalPreview, cardSurchargePreview]);

  const amountPaidPreview = React.useMemo(() => {
    if (collectionMode === "full") return totalPreview;
    if (collectionMode === "credit") return 0;
    return moneyInputToNumber(partialAmount);
  }, [collectionMode, totalPreview, partialAmount]);

  const balanceDuePreview = React.useMemo(
    () => truncMoney(totalPreview - amountPaidPreview),
    [totalPreview, amountPaidPreview]
  );

  async function handleSubmit() {
    setLocalErr(null);
    const items: SaleLineInput[] = [];
    try {
      for (const row of lines) {
        if (!row.product_id) continue;
        const qty = Number(row.quantity) || 0;
        const unit = moneyInputToNumber(row.unit_price);
        const pr = productById.get(row.product_id);
        if (!pr) throw new Error(t("business.errorPickProduct"));
        if (!validateQuantity(qty, pr.unit_of_measure)) {
          throw new Error(t("business.errorQtyInvalid"));
        }
        if (Number(pr.stock) < qty) {
          throw new Error(
            t("business.errorInsufficientStock", { name: pr.name, stock: String(pr.stock) })
          );
        }
        const line_total = multiplyMoney(qty, unit);
        items.push({
          product_id: row.product_id,
          quantity: qty,
          unit_price: unit,
          line_total,
        });
      }
      if (items.length === 0) throw new Error(t("business.errorAddLine"));

      if (collectionMode !== "full" && !customerId) {
        throw new Error(t("business.errorCustomerRequiredCredit"));
      }
      if (collectionMode === "partial") {
        const partial = moneyInputToNumber(partialAmount);
        if (partial <= 0 || partial >= totalPreview) {
          throw new Error(t("business.errorPartialAmount"));
        }
      }

      const amountPaid =
        collectionMode === "full"
          ? null
          : collectionMode === "credit"
            ? 0
            : moneyInputToNumber(partialAmount);

      await onSubmit({
        customer_id: customerId || null,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
        payment_method: paymentMethod,
        apply_card_surcharge: paymentMethod === "card" && applyCardSurcharge,
        amount_paid: amountPaid,
        items,
      });
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : t("common.errorSave"));
    }
  }

  const pickerProducts = products.filter((p) => p.is_active);

  const detailsContent = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="sale-customer">{t("business.customer")}</Label>
        <NativeSelect
          id="sale-customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-11 text-base sm:h-10"
        >
          <option value="">{t("business.walkInNoCustomer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sale-payment">{t("business.paymentMethod")}</Label>
        <NativeSelect
          id="sale-payment"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="h-11 text-base sm:h-10"
          required
        >
          <option value="cash">{t("business.paymentCash")}</option>
          <option value="card">{t("business.paymentCard")}</option>
          <option value="transfer">{t("business.paymentTransfer")}</option>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sale-date">{t("business.date")}</Label>
        <Input
          id="sale-date"
          type="datetime-local"
          value={dateLocal}
          onChange={(e) => setDateLocal(e.target.value)}
          required
          className="h-11 text-base sm:h-10"
        />
      </div>

      {paymentMethod === "card" ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{t("business.cardSurcharge")}</span>
            <span className="tabular-nums text-base font-semibold">{fmt(cardSurchargePreview)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("business.cardSurchargeNotifyHint")}</p>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-background p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              checked={applyCardSurcharge}
              onChange={(e) => setApplyCardSurcharge(e.target.checked)}
            />
            <span className="text-sm leading-snug">{t("business.applyCardSurcharge")}</span>
          </label>
        </div>
      ) : null}

      <div className="space-y-3 sm:col-span-2">
        <Label>{t("business.collectionMode")}</Label>
        <div className="flex flex-wrap gap-2">
          {(["full", "partial", "credit"] as CollectionMode[]).map((mode) => (
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
            <Label htmlFor="sale-partial-amount">{t("business.amountPaidToday")}</Label>
            <MoneyInput
              id="sale-partial-amount"
              className="h-11 max-w-xs text-base"
              value={partialAmount}
              onChange={setPartialAmount}
            />
          </div>
        ) : null}
        {collectionMode === "credit" ? (
          <p className="text-sm text-muted-foreground">{t("business.creditSaleHint")}</p>
        ) : null}
        {collectionMode !== "full" && !customerId ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t("business.customerRequiredForCredit")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="sale-notes">{t("business.notes")}</Label>
        <Textarea
          id="sale-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("business.saleNotesPlaceholder")}
          rows={3}
          className="min-h-[5rem] resize-y text-base"
        />
      </div>
    </div>
  );

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

  const linesContent = (
    <>
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
              <TableHead className="min-w-[14rem]">{t("business.product")}</TableHead>
              <TableHead className="min-w-[6rem] text-right">{t("business.qty")}</TableHead>
              <TableHead className="min-w-[8rem] text-right">{t("business.unitPrice")}</TableHead>
              <TableHead className="min-w-[8rem] text-right">{t("business.lineTotal")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((row) => {
              const lineTotal = lineTotals.get(row.key) ?? 0;
              const pr = row.product_id ? productById.get(row.product_id) : undefined;
              const qtyProps = qtyInputProps(row.product_id);
              return (
                <TableRow key={row.key}>
                  <TableCell>
                    <ProductPicker
                      products={pickerProducts}
                      value={row.product_id}
                      onValueChange={(productId) => setLine(row.key, { product_id: productId })}
                      showStock
                      className="h-10 w-full min-w-[12rem]"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <Input
                        {...qtyProps}
                        className="ml-auto h-10 w-24 text-right text-base tabular-nums"
                        value={row.quantity}
                        onChange={(e) => setLine(row.key, { quantity: e.target.value })}
                      />
                      {pr ? (
                        <span className="text-[0.65rem] text-muted-foreground">
                          {t(`business.uom.${pr.unit_of_measure}`)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyInput
                      className="ml-auto h-10 w-32 text-right text-base"
                      value={row.unit_price}
                      onChange={(v) => setLine(row.key, { unit_price: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right text-base font-semibold tabular-nums">
                    {fmt(lineTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("business.removeLine")}
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
    </>
  );

  const summaryExtra = (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{t("business.subtotal")}</span>
        <span className="tabular-nums font-medium">{fmt(subtotalPreview)}</span>
      </div>
      {paymentMethod === "card" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("business.cardSurcharge")}</span>
            <span className="tabular-nums font-medium">{fmt(cardSurchargePreview)}</span>
          </div>
          {!applyCardSurcharge ? (
            <p className="text-xs text-muted-foreground">{t("business.surchargeNotCharged")}</p>
          ) : null}
        </>
      ) : null}
      {collectionMode !== "full" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("business.amountPaidToday")}</span>
            <span className="tabular-nums font-medium">{fmt(amountPaidPreview)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="font-medium">{t("business.balanceDue")}</span>
            <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
              {fmt(balanceDuePreview)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <DocumentFormPage
      backHref="/dashboard/business/sales"
      backLabel={t("business.backToSales")}
      title={t("business.newSaleTitle")}
      description={t("business.newSaleDescription")}
      detailsTitle={t("business.documentDetails")}
      detailsContent={detailsContent}
      linesTitle={t("business.lineItems")}
      linesContent={linesContent}
      totalLabel={t("business.totalToCharge")}
      totalFormatted={fmt(totalPreview)}
      summaryExtra={summaryExtra}
      summaryTitle={t("business.summary")}
      cancelLabel={t("common.cancel")}
      submitLabel={t("business.saveSale")}
      savingLabel={t("common.saving")}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onSubmit={() => void handleSubmit()}
      error={localErr}
    />
  );
}
