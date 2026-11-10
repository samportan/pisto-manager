"use client";

import * as React from "react";
import { DocumentFormPage } from "@/components/business/document-form-page";
import {
  BarcodeScanPanel,
  ScanLog,
  type ScanLogItem,
} from "@/components/business/barcode-scan-panel";
import { ContactPicker } from "@/components/business/contact-picker";
import {
  DocumentLine,
  DocumentLineList,
  LineField,
  LineQty,
} from "@/components/business/document-lines";
import { ProductPicker } from "@/components/business/product-picker";
import { toDatetimeLocalValue } from "@/components/business/add-sale-form";
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
import { applyScanToDocumentLines } from "@/lib/barcode/apply-scan-to-lines";
import type { Product } from "@/lib/db/products";
import type { Contact } from "@/lib/db/contacts";
import type {
  PurchaseCreateMode,
  PurchaseLineInput,
  PurchasePaymentMethod,
} from "@/lib/db/purchases";
import { formatMoneyDisplay } from "@/lib/format-money";
import { formatMoneyInputValue, multiplyMoney, sumMoney } from "@/lib/money";
import { findProductByCode } from "@/lib/product-search";
import { isDecimalUom, validateQuantity } from "@/lib/uom";
export type PurchaseCollectionMode = "full" | "partial" | "credit";

type Line = { key: string; product_id: string; quantity: string; unit_cost: string };

export type PurchaseFormSubmitPayload = {
  supplier_id: string | null;
  date: string;
  notes: string | null;
  receipt_status: PurchaseCreateMode;
  expected_at: string | null;
  payment_method: PurchasePaymentMethod;
  amount_paid: number | null;
  fees_amount: number;
  fees_notes: string | null;
  items: PurchaseLineInput[];
};

type Props = {
  products: Product[];
  suppliers: Contact[];
  onSubmit: (payload: PurchaseFormSubmitPayload) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export function buildPurchaseLineItems(
  lines: Line[],
  productById: Map<string, Product>,
  t: (key: string) => string,
  options?: { includeReceived?: boolean }
): PurchaseLineInput[] {
  const items: PurchaseLineInput[] = [];
  for (const row of lines) {
    if (!row.product_id) continue;
    const qty = Number(row.quantity) || 0;
    const unit = moneyInputToNumber(row.unit_cost);
    const pr = productById.get(row.product_id);
    if (!pr) throw new Error(t("business.errorPickProduct"));
    if (!validateQuantity(qty, pr.unit_of_measure)) {
      throw new Error(t("business.errorQtyInvalid"));
    }
    const line_total = multiplyMoney(qty, unit);
    items.push({
      product_id: row.product_id,
      quantity_ordered: qty,
      quantity_received: options?.includeReceived ? qty : null,
      unit_cost: unit,
      line_total,
    });
  }
  if (items.length === 0) throw new Error(t("business.errorAddLine"));
  return items;
}

export function AddPurchaseForm({ products, suppliers, onSubmit, onCancel, isSubmitting }: Props) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const [scanLog, setScanLog] = React.useState<ScanLogItem[]>([]);

  const [receiptMode, setReceiptMode] = React.useState<PurchaseCreateMode>("received");
  const [supplierId, setSupplierId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PurchasePaymentMethod>("cash");
  const [collectionMode, setCollectionMode] = React.useState<PurchaseCollectionMode>("full");
  const [partialAmount, setPartialAmount] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [expectedAtLocal, setExpectedAtLocal] = React.useState("");
  const [feesAmount, setFeesAmount] = React.useState("");
  const [feesNotes, setFeesNotes] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([
    { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_cost: "" },
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

  const pickerProducts = React.useMemo(() => products.filter((p) => p.is_active), [products]);

  const handleBarcodeScan = React.useCallback(
    (code: string) => {
      const product = findProductByCode(pickerProducts, code, { activeOnly: true });
      const result = applyScanToDocumentLines(linesRef.current, product, {
        priceField: "cost_price",
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
      const unit = moneyInputToNumber(matched?.unit_cost ?? "");
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
    setLines((prev) => {
      if (patch.product_id) {
        const duplicate = prev.find(
          (row) => row.key !== key && row.product_id === patch.product_id
        );
        if (duplicate) {
          const current = prev.find((row) => row.key === key);
          const addQty = Number(current?.quantity) || 0;
          const mergedQty = (Number(duplicate.quantity) || 0) + addQty;
          return prev
            .filter((row) => row.key !== key)
            .map((row) =>
              row.key === duplicate.key
                ? { ...row, quantity: String(mergedQty || 1) }
                : row
            );
        }
      }

      return prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.product_id !== undefined && patch.product_id) {
          const pr = productById.get(patch.product_id);
          if (pr) {
            next.unit_cost = pr.cost_price > 0 ? formatMoneyInputValue(pr.cost_price) : "";
          }
        }
        return next;
      });
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_cost: "" },
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
      const u = moneyInputToNumber(row.unit_cost);
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

  const feesPreview = moneyInputToNumber(feesAmount);
  const totalPreview = sumMoney(subtotalPreview, feesPreview);

  function resolveAmountPaid(): number | null {
    if (receiptMode === "pending") return null;
    if (collectionMode === "full") return totalPreview;
    if (collectionMode === "partial") return moneyInputToNumber(partialAmount);
    return 0;
  }

  async function handleSubmit() {
    try {
      const items = buildPurchaseLineItems(lines, productById, t, {
        includeReceived: receiptMode === "received",
      });

      if (receiptMode === "received") {
        if (collectionMode === "partial") {
          const paid = moneyInputToNumber(partialAmount);
          if (paid <= 0 || paid > totalPreview) {
            throw new Error(t("business.errorPaymentAmount"));
          }
        }
        if (collectionMode !== "full" && !supplierId) {
          throw new Error(t("business.supplierRequiredForCredit"));
        }
      }

      await onSubmit({
        supplier_id: supplierId || null,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
        receipt_status: receiptMode,
        expected_at: expectedAtLocal ? new Date(expectedAtLocal).toISOString() : null,
        payment_method: paymentMethod,
        amount_paid: resolveAmountPaid(),
        fees_amount: feesPreview,
        fees_notes: feesNotes.trim() || null,
        items,
      });
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

  const detailsContent = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3 sm:col-span-2">
        <Label>{t("business.purchaseReceiptMode")}</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={receiptMode === "pending" ? "secondary" : "outline"}
            onClick={() => setReceiptMode("pending")}
          >
            {t("business.purchaseModePending")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={receiptMode === "received" ? "secondary" : "outline"}
            onClick={() => setReceiptMode("received")}
          >
            {t("business.purchaseModeReceiveNow")}
          </Button>
        </div>
        {receiptMode === "pending" ? (
          <p className="text-sm text-muted-foreground">{t("business.purchasePendingHint")}</p>
        ) : null}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="po-supplier">{t("business.supplier")}</Label>
        <ContactPicker
          id="po-supplier"
          contacts={suppliers}
          value={supplierId}
          onValueChange={setSupplierId}
          allowEmpty
          emptyLabel={t("business.noSupplier")}
          searchPlaceholder={t("business.searchSuppliers")}
          noMatchLabel={t("business.noSuppliersMatch")}
          className="h-11 text-base sm:h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="po-date">
          {receiptMode === "pending" ? t("business.orderDate") : t("business.date")}
        </Label>
        <Input
          id="po-date"
          type="datetime-local"
          value={dateLocal}
          onChange={(e) => setDateLocal(e.target.value)}
          required
          className="h-11 text-base sm:h-10"
        />
      </div>

      {receiptMode === "pending" ? (
        <div className="space-y-2">
          <Label htmlFor="po-expected">{t("business.expectedDelivery")}</Label>
          <Input
            id="po-expected"
            type="datetime-local"
            value={expectedAtLocal}
            onChange={(e) => setExpectedAtLocal(e.target.value)}
            className="h-11 text-base sm:h-10"
          />
        </div>
      ) : null}

      {receiptMode === "received" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="po-payment-method">{t("business.supplierPaymentMethod")}</Label>
            <NativeSelect
              id="po-payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
              className="h-11 text-base sm:h-10"
            >
              <option value="cash">{t("business.paymentCash")}</option>
              <option value="transfer">{t("business.paymentTransfer")}</option>
              <option value="credit">{t("business.paymentCredit")}</option>
            </NativeSelect>
          </div>

          <div className="space-y-3 sm:col-span-2">
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
                <Label htmlFor="po-partial-amount">{t("business.amountPaidToday")}</Label>
                <MoneyInput
                  id="po-partial-amount"
                  className="h-11 max-w-xs text-base"
                  value={partialAmount}
                  onChange={setPartialAmount}
                />
              </div>
            ) : null}
            {collectionMode === "credit" ? (
              <p className="text-sm text-muted-foreground">{t("business.creditPurchaseHint")}</p>
            ) : null}
            {collectionMode !== "full" && !supplierId ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t("business.supplierRequiredForCredit")}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="po-fees">{t("business.feesAmount")}</Label>
        <MoneyInput
          id="po-fees"
          className="h-11 text-base sm:h-10"
          value={feesAmount}
          onChange={setFeesAmount}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="po-fees-notes">{t("business.feesNotes")}</Label>
        <Input
          id="po-fees-notes"
          value={feesNotes}
          onChange={(e) => setFeesNotes(e.target.value)}
          placeholder={t("business.feesNotesPlaceholder")}
          className="h-11 text-base sm:h-10"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="po-notes">{t("business.notes")}</Label>
        <Textarea
          id="po-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("business.purchaseNotesPlaceholder")}
          rows={3}
          className="min-h-[5rem] resize-y text-base"
        />
      </div>
    </div>
  );

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
          const qtyLabel =
            receiptMode === "pending" ? t("business.qtyOrdered") : t("business.qty");
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
                  className="h-11 w-full"
                />
              }
            >
              <LineField label={qtyLabel}>
                <LineQty
                  value={row.quantity}
                  onChange={(quantity) => setLine(row.key, { quantity })}
                  step={qtyProps.step}
                  min={qtyProps.min}
                  inputMode={qtyProps.inputMode}
                  suffix={pr ? t(`business.uom.${pr.unit_of_measure}`) : undefined}
                  decreaseLabel={`${qtyLabel} −`}
                  increaseLabel={`${qtyLabel} +`}
                />
              </LineField>
              <LineField label={t("business.unitCost")}>
                <MoneyInput
                  className="h-11 text-base"
                  value={row.unit_cost}
                  onChange={(unit_cost) => setLine(row.key, { unit_cost })}
                />
              </LineField>
            </DocumentLine>
          );
        })}
      </DocumentLineList>
    </>
  );

  const hasBreakdown =
    feesPreview !== 0 || (receiptMode === "received" && collectionMode !== "full");
  const summaryExtra = hasBreakdown ? (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{t("business.subtotal")}</span>
        <span className="tabular-nums font-medium">{fmt(subtotalPreview)}</span>
      </div>
      {feesPreview !== 0 ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{t("business.feesAmount")}</span>
          <span className="tabular-nums font-medium">{fmt(feesPreview)}</span>
        </div>
      ) : null}
      {receiptMode === "received" && collectionMode !== "full" ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{t("business.amountPaid")}</span>
          <span className="tabular-nums font-medium">{fmt(resolveAmountPaid() ?? 0)}</span>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <DocumentFormPage
      backHref="/dashboard/business/purchases"
      backLabel={t("business.backToPurchases")}
      title={t("business.newPurchaseTitle")}
      description={t("business.newPurchaseDescription")}
      detailsTitle={t("business.documentDetails")}
      detailsContent={detailsContent}
      linesTitle={t("business.lineItems")}
      linesContent={linesContent}
      totalLabel={t("business.documentTotal")}
      totalFormatted={fmt(totalPreview)}
      summaryExtra={summaryExtra}
      summaryTitle={t("business.summary")}
      cancelLabel={t("common.cancel")}
      submitLabel={
        receiptMode === "pending"
          ? t("business.savePendingOrder")
          : t("business.savePurchase")
      }
      savingLabel={t("common.saving")}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onSubmit={() => void handleSubmit()}
    />
  );
}
