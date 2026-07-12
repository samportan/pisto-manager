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
import { useRecordSalePayment } from "@/hooks/useSalePayments";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { PaymentMethod, SaleWithMeta } from "@/lib/db/sales";
import { formatMoneyDisplay } from "@/lib/format-money";
import { toDatetimeLocalValue } from "@/components/business/add-sale-form";

type Props = {
  sale: SaleWithMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function RecordPaymentSheet({ sale, open, onOpenChange, onSuccess }: Props) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { recordPayment, isRecording } = useRecordSalePayment();

  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open && sale) {
      setAmount("");
      setPaymentMethod("cash");
      setDateLocal(toDatetimeLocalValue(new Date()));
      setNotes("");
    }
  }, [open, sale]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sale) return;
    const parsed = moneyInputToNumber(amount);
    if (parsed <= 0) {
      toast.error("business.errorPaymentAmount");
      return;
    }
    if (parsed > Number(sale.balance_due)) {
      toast.error("business.errorPaymentExceedsBalance");
      return;
    }
    try {
      await recordPayment({
        sale_id: sale.id,
        amount: parsed,
        payment_method: paymentMethod,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
      });
      toast.success("toast.paymentRecorded");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.errorFrom(err);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.recordPayment")}</SheetTitle>
          <SheetDescription>
            {sale
              ? t("business.recordPaymentDescription", { balance: fmt(Number(sale.balance_due)) })
              : null}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t("business.paymentAmount")}</Label>
            <MoneyInput
              id="payment-amount"
              className="h-11 text-base"
              value={amount}
              onChange={setAmount}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method">{t("business.paymentMethod")}</Label>
            <NativeSelect
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="h-11 text-base"
            >
              <option value="cash">{t("business.paymentCash")}</option>
              <option value="card">{t("business.paymentCard")}</option>
              <option value="transfer">{t("business.paymentTransfer")}</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">{t("business.date")}</Label>
            <Input
              id="payment-date"
              type="datetime-local"
              value={dateLocal}
              onChange={(e) => setDateLocal(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-notes">{t("business.notes")}</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
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
