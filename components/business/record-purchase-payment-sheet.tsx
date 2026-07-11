"use client";

import * as React from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { useRecordPurchasePayment } from "@/hooks/usePurchasePayments";
import { useT } from "@/hooks/useTranslations";
import type { PurchasePaymentMethod, PurchaseWithMeta } from "@/lib/db/purchases";
import { formatMoneyDisplay } from "@/lib/format-money";
import { toDatetimeLocalValue } from "@/components/business/add-sale-form";

type Props = {
  purchase: PurchaseWithMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function RecordPurchasePaymentSheet({
  purchase,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { recordPayment, isRecording } = useRecordPurchasePayment();

  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PurchasePaymentMethod>("cash");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && purchase) {
      setAmount("");
      setPaymentMethod("cash");
      setDateLocal(toDatetimeLocalValue(new Date()));
      setNotes("");
      setError(null);
    }
  }, [open, purchase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchase) return;
    setError(null);
    const parsed = moneyInputToNumber(amount);
    if (parsed <= 0) {
      setError(t("business.errorPaymentAmount"));
      return;
    }
    if (parsed > Number(purchase.balance_due)) {
      setError(t("business.errorPaymentExceedsBalance"));
      return;
    }
    try {
      await recordPayment({
        purchase_id: purchase.id,
        amount: parsed,
        payment_method: paymentMethod,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.errorSave"));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.recordSupplierPayment")}</SheetTitle>
          <SheetDescription>
            {purchase
              ? t("business.recordSupplierPaymentDescription", {
                  balance: fmt(Number(purchase.balance_due)),
                })
              : null}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-4 py-4">
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="purchase-payment-amount">{t("business.paymentAmount")}</Label>
            <MoneyInput
              id="purchase-payment-amount"
              className="h-11 text-base"
              value={amount}
              onChange={setAmount}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-payment-method">{t("business.supplierPaymentMethod")}</Label>
            <NativeSelect
              id="purchase-payment-method"
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
            <Label htmlFor="purchase-payment-date">{t("business.date")}</Label>
            <Input
              id="purchase-payment-date"
              type="datetime-local"
              value={dateLocal}
              onChange={(e) => setDateLocal(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-payment-notes">{t("business.notes")}</Label>
            <Textarea
              id="purchase-payment-notes"
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
            <Button type="submit" className="flex-1" disabled={isRecording}>
              {isRecording ? (
                <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
              ) : (
                t("business.savePayment")
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
