"use client";

import * as React from "react";
import {
  BarcodeScanPanel,
  ScanLog,
  type ScanLogItem,
} from "@/components/business/barcode-scan-panel";
import { ContactPicker } from "@/components/business/contact-picker";
import { DocumentFormPage } from "@/components/business/document-form-page";
import {
  DocumentLine,
  DocumentLineList,
  LineField,
  LineQty,
} from "@/components/business/document-lines";
import { ProductPicker } from "@/components/business/product-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, moneyInputToNumber } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { useHardwareBarcodeScan } from "@/hooks/useHardwareBarcodeScan";
import { playScanErrorSound, playScanSuccessSound } from "@/lib/barcode/scan-feedback";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { CollectionMode } from "@/hooks/useSales";
import { applyScanToDocumentLines } from "@/lib/barcode/apply-scan-to-lines";
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
import { findProductByCode } from "@/lib/product-search";
import { sumQuantitiesByProduct } from "@/lib/stock";
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
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const [scanLog, setScanLog] = React.useState<ScanLogItem[]>([]);

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
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [lastScannedKey, setLastScannedKey] = React.useState<string | null>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const productById = React.useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const pickerProducts = React.useMemo(
    () => products.filter((p) => p.is_active),
    [products]
  );

  React.useEffect(() => {
    if (paymentMethod !== "card") {
      setApplyCardSurcharge(false);
    }
  }, [paymentMethod]);

  const handleBarcodeScan = React.useCallback(
    (code: string) => {
      const product = findProductByCode(pickerProducts, code, { activeOnly: true });
      const result = applyScanToDocumentLines(linesRef.current, product, {
        priceField: "sale_price",
      });
      if (!result.ok) {
        playScanErrorSound();
        const title = t(
          result.reason === "inactive"
            ? "business.scanProductInactive"
            : "business.scanProductNotFound"
        );
        setScanLog((prev) =>
          [{ id: crypto.randomUUID(), tone: "error" as const, title }, ...prev].slice(0, 4)
        );
        return;
      }
      const matched = result.lines.find((row) => row.product_id === result.product.id);
      setLines(result.lines as Line[]);
      if (matched) setLastScannedKey(matched.key);
      const qty = matched?.quantity ?? "1";
      const unit = moneyInputToNumber(matched?.unit_price ?? "");
      playScanSuccessSound();
      setScanLog((prev) =>
        [
          {
            id: crypto.randomUUID(),
            tone: "success" as const,
            title: result.product.name,
            detail:
              result.action === "added"
                ? t("business.scanAddedSubtitle", { qty })
                : t("business.scanIncrementedSubtitle", { qty }),
            amount: fmt(multiplyMoney(Number(qty) || 0, unit)),
          },
          ...prev,
        ].slice(0, 4)
      );
    },
    [fmt, pickerProducts, t]
  );

  useHardwareBarcodeScan({
    enabled: !isSubmitting && !scannerOpen,
    onScan: handleBarcodeScan,
  });

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
        const line_total = multiplyMoney(qty, unit);
        items.push({
          product_id: row.product_id,
          quantity: qty,
          unit_price: unit,
          line_total,
        });
      }
      if (items.length === 0) throw new Error(t("business.errorAddLine"));

      // The same product may be on several lines: stock has to cover the total.
      for (const [productId, requested] of sumQuantitiesByProduct(items)) {
        const pr = productById.get(productId);
        if (pr && Number(pr.stock) < requested) {
          throw new Error(
            t("business.errorInsufficientStock", { name: pr.name, stock: String(pr.stock) })
          );
        }
      }

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
      toast.errorFrom(err);
    }
  }

  const detailsContent = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="sale-customer">{t("business.customer")}</Label>
        <ContactPicker
          id="sale-customer"
          contacts={customers}
          value={customerId}
          onValueChange={setCustomerId}
          allowEmpty
          emptyLabel={t("business.walkInNoCustomer")}
          searchPlaceholder={t("business.searchCustomers")}
          noMatchLabel={t("business.noCustomersMatch")}
          className="h-11 text-base sm:h-10"
        />
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
      <DocumentLineList
        hint={scannerOpen ? undefined : t("business.scanReady")}
        addLabel={t("business.addLine")}
        onAdd={addLine}
        scanLabel={t("business.scanBarcode")}
        onScan={scannerOpen ? undefined : () => setScannerOpen(true)}
        scanDisabled={isSubmitting}
        notice={
          <>
            <BarcodeScanPanel
              active={scannerOpen}
              onScan={handleBarcodeScan}
              onClose={() => setScannerOpen(false)}
            />
            <ScanLog
              label={t("business.lastScan")}
              items={scannerOpen ? scanLog : scanLog.slice(0, 1)}
            />
          </>
        }
      >
        {lines.map((row) => {
          const lineTotal = lineTotals.get(row.key) ?? 0;
          const pr = row.product_id ? productById.get(row.product_id) : undefined;
          const qtyProps = qtyInputProps(row.product_id);
          return (
            <DocumentLine
              key={row.key}
              highlighted={lastScannedKey === row.key}
              removeLabel={t("business.removeLine")}
              removeDisabled={lines.length <= 1}
              onRemove={() => removeLine(row.key)}
              total={fmt(lineTotal)}
              product={
                <ProductPicker
                  products={pickerProducts}
                  value={row.product_id}
                  onValueChange={(productId) => setLine(row.key, { product_id: productId })}
                  showStock
                  className="h-11 w-full"
                />
              }
            >
              <LineField label={t("business.qty")}>
                <LineQty
                  value={row.quantity}
                  onChange={(quantity) => setLine(row.key, { quantity })}
                  step={qtyProps.step}
                  min={qtyProps.min}
                  inputMode={qtyProps.inputMode}
                  suffix={pr ? t(`business.uom.${pr.unit_of_measure}`) : undefined}
                  decreaseLabel={`${t("business.qty")} −`}
                  increaseLabel={`${t("business.qty")} +`}
                />
              </LineField>
              <LineField label={t("business.unitPrice")}>
                <MoneyInput
                  className="h-11 text-base"
                  value={row.unit_price}
                  onChange={(unit_price) => setLine(row.key, { unit_price })}
                />
              </LineField>
            </DocumentLine>
          );
        })}
      </DocumentLineList>
    </>
  );

  const hasBreakdown = paymentMethod === "card" || collectionMode !== "full";
  const summaryExtra = hasBreakdown ? (
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
            <span className="tabular-nums font-semibold text-warning">
              {fmt(balanceDuePreview)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  ) : null;

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
    />
  );
}
