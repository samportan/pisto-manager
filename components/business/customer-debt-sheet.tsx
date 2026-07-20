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
import { useRecordCustomerPayment } from "@/hooks/useSalePayments";
import { useOpenSalesByCustomer } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { Contact } from "@/lib/db/contacts";
import { previewCustomerPaymentFifo } from "@/lib/db/sale-payments";
import type { PaymentMethod } from "@/lib/db/sales";
import { formatMoneyDisplay } from "@/lib/format-money";
import { formatMoneyInputValue } from "@/lib/money";

type Props = {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function paymentStatusLabel(
  status: string,
  t: (key: string) => string
): string {
  if (status === "partial") return t("business.paymentStatusPartial");
  if (status === "credit") return t("business.paymentStatusCredit");
  return t("business.paymentStatusPaid");
}

export function CustomerDebtSheet({ contact, open, onOpenChange }: Props) {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { sales, isLoading } = useOpenSalesByCustomer(open && contact ? contact.id : null);
  const { recordCustomerPayment, isRecording } = useRecordCustomerPayment();

  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");

  const totalDue = React.useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.balance_due), 0),
    [sales]
  );

  const parsedAmount = moneyInputToNumber(amount);
  const preview = React.useMemo(
    () =>
      previewCustomerPaymentFifo(
        sales.map((s) => ({
          id: s.id,
          date: s.date,
          balance_due: Number(s.balance_due),
        })),
        parsedAmount > 0 ? parsedAmount : 0
      ),
    [sales, parsedAmount]
  );

  React.useEffect(() => {
    if (open && contact) {
      setAmount("");
      setPaymentMethod("cash");
      setDateLocal(toDatetimeLocalValue(new Date()));
      setNotes("");
    }
  }, [open, contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;
    if (parsedAmount <= 0) {
      toast.error("business.errorPaymentAmount");
      return;
    }
    if (parsedAmount > totalDue) {
      toast.error("business.errorPaymentExceedsBalance");
      return;
    }
    try {
      await recordCustomerPayment({
        customer_id: contact.id,
        amount: parsedAmount,
        payment_method: paymentMethod,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
      });
      toast.success("toast.customerPaymentRecorded");
      onOpenChange(false);
    } catch (err) {
      toast.errorFrom(err);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.collectCustomerDebt")}</SheetTitle>
          <SheetDescription>
            {contact
              ? t("business.collectCustomerDebtDescription", {
                  name: contact.name,
                  balance: fmt(totalDue),
                })
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("business.balanceDue")}</p>
              <p className="text-xl font-semibold tabular-nums">{fmt(totalDue)}</p>
            </div>
            {contact ? (
              <Link
                href={`/dashboard/business/sales?customer=${contact.id}`}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                {t("business.viewCustomerSales")}
              </Link>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("business.openSales")}</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("business.noOpenSales")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {sales.map((sale) => (
                  <li key={sale.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 space-y-0.5">
                      <p className="tabular-nums text-sm">
                        {new Date(sale.date).toLocaleString(intlLocale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {paymentStatusLabel(sale.payment_status, t)}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {t("business.saleTotalShort", { total: fmt(sale.total) })}
                        </span>
                      </div>
                    </div>
                    <p className="shrink-0 tabular-nums text-sm font-medium text-amber-600 dark:text-amber-400">
                      {fmt(sale.balance_due)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {sales.length > 0 ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="customer-payment-amount">{t("business.paymentAmount")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setAmount(formatMoneyInputValue(totalDue))}
                  >
                    {t("business.collectAll")}
                  </Button>
                </div>
                <MoneyInput
                  id="customer-payment-amount"
                  className="h-11 text-base"
                  value={amount}
                  onChange={setAmount}
                  required
                />
              </div>

              {preview.length > 0 ? (
                <div className="space-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("business.paymentAllocationPreview")}
                  </p>
                  <ul className="space-y-1">
                    {preview.map((row) => (
                      <li
                        key={row.sale_id}
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
                <Label htmlFor="customer-payment-method">{t("business.paymentMethod")}</Label>
                <NativeSelect
                  id="customer-payment-method"
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
                <Label htmlFor="customer-payment-date">{t("business.date")}</Label>
                <Input
                  id="customer-payment-date"
                  type="datetime-local"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-payment-notes">{t("business.notes")}</Label>
                <Textarea
                  id="customer-payment-notes"
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
                <Button type="submit" className="flex-1" disabled={isRecording || totalDue <= 0}>
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
