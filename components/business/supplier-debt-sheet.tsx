"use client";

import * as React from "react";
import Link from "next/link";

import { toDatetimeLocalValue } from "@/components/business/add-sale-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, moneyInputToNumber } from "@/components/ui/money-input";
import { PendingLabel } from "@/components/ui/pending-label";
import { NativeSelect } from "@/components/ui/select-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  useOpenPurchasesBySupplier,
  useRecordSupplierPayment,
} from "@/hooks/usePurchasePayments";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { Contact } from "@/lib/db/contacts";
import { previewSupplierPaymentFifo } from "@/lib/db/purchase-payments";
import type { PurchasePaymentMethod } from "@/lib/db/purchases";
import { formatMoneyDisplay } from "@/lib/format-money";
import { formatMoneyInputValue, isMoneyGreater, sumMoney } from "@/lib/money";

type Props = {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Pay one or several open purchases of a supplier with a single payment.
 * The amount is split oldest-first across the purchases that are checked.
 */
export function SupplierDebtSheet({ contact, open, onOpenChange }: Props) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { purchases, isLoading } = useOpenPurchasesBySupplier(
    open && contact ? contact.id : null
  );
  const { recordSupplierPayment, isRecording } = useRecordSupplierPayment();

  // Purchases the user unchecked. Everything else is selected, including new rows.
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set());
  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PurchasePaymentMethod>("cash");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open && contact) {
      setExcluded(new Set());
      setAmount("");
      setPaymentMethod("cash");
      setDateLocal(toDatetimeLocalValue(new Date()));
      setNotes("");
    }
  }, [open, contact]);

  const totalDue = React.useMemo(
    () => sumMoney(...purchases.map((p) => Number(p.balance_due))),
    [purchases]
  );

  const selectedPurchases = React.useMemo(
    () => purchases.filter((p) => !excluded.has(p.id)),
    [purchases, excluded]
  );

  const selectedDue = React.useMemo(
    () => sumMoney(...selectedPurchases.map((p) => Number(p.balance_due))),
    [selectedPurchases]
  );

  const allSelected = purchases.length > 0 && selectedPurchases.length === purchases.length;

  const parsedAmount = moneyInputToNumber(amount);
  const preview = React.useMemo(
    () =>
      previewSupplierPaymentFifo(
        selectedPurchases.map((p) => ({
          id: p.id,
          date: p.date,
          balance_due: Number(p.balance_due),
        })),
        parsedAmount > 0 ? parsedAmount : 0
      ),
    [selectedPurchases, parsedAmount]
  );

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setExcluded(allSelected ? new Set(purchases.map((p) => p.id)) : new Set());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;
    if (selectedPurchases.length === 0) {
      toast.error("business.errorSelectPurchase");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("business.errorPaymentAmount");
      return;
    }
    if (isMoneyGreater(parsedAmount, selectedDue)) {
      toast.error("business.errorPaymentExceedsBalance");
      return;
    }
    try {
      await recordSupplierPayment({
        supplier_id: contact.id,
        amount: parsedAmount,
        payment_method: paymentMethod,
        purchase_ids: selectedPurchases.map((p) => p.id),
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
      });
      toast.success("toast.supplierPaymentRecorded");
      onOpenChange(false);
    } catch (err) {
      toast.errorFrom(err);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.paySupplierDebt")}</SheetTitle>
          <SheetDescription>
            {contact
              ? t("business.paySupplierDebtDescription", {
                  name: contact.name,
                  balance: fmt(totalDue),
                })
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("business.payableToSupplier")}</p>
              <p className="text-xl font-semibold tabular-nums">{fmt(totalDue)}</p>
            </div>
            <Link
              href="/dashboard/business/purchases"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              {t("business.viewSupplierPurchases")}
            </Link>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t("business.openPurchases")}</p>
              {purchases.length > 1 ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  {t("business.selectAllPurchases")}
                </label>
              ) : null}
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("business.noOpenPurchases")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {purchases.map((purchase) => {
                  const checked = !excluded.has(purchase.id);
                  return (
                    <li key={purchase.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-primary"
                          checked={checked}
                          onChange={() => toggle(purchase.id)}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="tabular-nums text-sm">
                            {new Date(purchase.date).toLocaleDateString(intlLocale, {
                              dateStyle: "medium",
                            })}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {purchase.payment_status === "partial"
                                ? t("business.paymentStatusPartial")
                                : t("business.paymentStatusCredit")}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {t("business.purchaseTotalShort", { total: fmt(purchase.total) })}
                            </span>
                          </div>
                          {purchase.notes ? (
                            <p className="truncate text-xs text-muted-foreground">{purchase.notes}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 tabular-nums text-sm font-medium text-amber-600 dark:text-amber-400">
                          {fmt(purchase.balance_due)}
                        </p>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {purchases.length > 0 ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="supplier-payment-amount">{t("business.paymentAmount")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={selectedPurchases.length === 0}
                    onClick={() => setAmount(formatMoneyInputValue(selectedDue))}
                  >
                    {t("business.paySelected")}
                  </Button>
                </div>
                <MoneyInput
                  id="supplier-payment-amount"
                  className="h-11 text-base"
                  value={amount}
                  onChange={setAmount}
                  required
                />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t("business.selectedPurchasesBalance", {
                    count: selectedPurchases.length,
                    balance: fmt(selectedDue),
                  })}
                </p>
              </div>

              {preview.length > 0 ? (
                <div className="space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("business.paymentAllocationPreview")}
                  </p>
                  <ul className="space-y-1">
                    {preview.map((row) => (
                      <li
                        key={row.purchase_id}
                        className="flex justify-between gap-2 text-sm tabular-nums"
                      >
                        <span className="text-muted-foreground">
                          {new Date(row.date).toLocaleDateString(intlLocale, {
                            dateStyle: "medium",
                          })}
                        </span>
                        <span>{fmt(row.applied)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="supplier-payment-method">{t("business.supplierPaymentMethod")}</Label>
                <NativeSelect
                  id="supplier-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
                  className="h-11 text-base"
                >
                  <option value="cash">{t("business.paymentCash")}</option>
                  <option value="transfer">{t("business.paymentTransfer")}</option>
                  <option value="credit">{t("business.paymentCredit")}</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-date">{t("business.date")}</Label>
                <Input
                  id="supplier-payment-date"
                  type="datetime-local"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-notes">{t("business.notes")}</Label>
                <Textarea
                  id="supplier-payment-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isRecording || selectedPurchases.length === 0}
                >
                  {isRecording ? (
                    <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
                  ) : (
                    t("business.savePayment")
                  )}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
