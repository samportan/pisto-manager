"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { DocumentFormPage } from "@/components/business/document-form-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Product } from "@/lib/db/products";
import type { Contact } from "@/lib/db/contacts";
import type { SaleLineInput } from "@/lib/db/sales";
import { formatMoney } from "@/lib/format-money";
import { multiplyMoney, sumMoney } from "@/lib/money";

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
    items: SaleLineInput[];
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export function AddSaleForm({ products, customers, onSubmit, onCancel, isSubmitting }: Props) {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });

  const [customerId, setCustomerId] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([
    { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_price: "0" },
  ]);
  const [localErr, setLocalErr] = React.useState<string | null>(null);

  const productById = React.useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.product_id !== undefined && patch.product_id) {
          const pr = productById.get(patch.product_id);
          if (pr) next.unit_price = String(pr.sale_price ?? 0);
        }
        return next;
      })
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_price: "0" },
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
      const u = Number(row.unit_price) || 0;
      totals.set(row.key, multiplyMoney(q, u));
    }
    return totals;
  }, [lines]);

  const totalPreview = React.useMemo(() => {
    const values: number[] = [];
    for (const row of lines) {
      if (!row.product_id) continue;
      values.push(lineTotals.get(row.key) ?? 0);
    }
    return sumMoney(...values);
  }, [lines, lineTotals]);

  async function handleSubmit() {
    setLocalErr(null);
    const items: SaleLineInput[] = [];
    try {
      for (const row of lines) {
        if (!row.product_id) continue;
        const qty = Number(row.quantity) || 0;
        const unit = Number(row.unit_price) || 0;
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error(t("business.errorQtyPositive"));
        }
        const pr = productById.get(row.product_id);
        if (!pr) throw new Error(t("business.errorPickProduct"));
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
      await onSubmit({
        customer_id: customerId || null,
        date: new Date(dateLocal).toISOString(),
        notes: notes.trim() || null,
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

  const linesContent = (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
          <Plus className="size-4" />
          {t("business.addLine")}
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {lines.map((row) => {
          const lineTotal = lineTotals.get(row.key) ?? 0;
          return (
            <div key={row.key} className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">{t("business.product")}</Label>
                <NativeSelect
                  value={row.product_id}
                  onChange={(e) => setLine(row.key, { product_id: e.target.value })}
                  className="h-11 text-base"
                >
                  <option value="">{t("business.selectProduct")}</option>
                  {pickerProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({t("business.stockLabel", { count: String(p.stock) })})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">{t("business.qty")}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    className="h-11 text-base tabular-nums"
                    value={row.quantity}
                    onChange={(e) => setLine(row.key, { quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">{t("business.unitPrice")}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className="h-11 text-base tabular-nums"
                    value={row.unit_price}
                    onChange={(e) => setLine(row.key, { unit_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                <span className="text-sm font-medium text-muted-foreground">{t("business.lineTotal")}</span>
                <span className="text-lg font-bold tabular-nums">{fmt(lineTotal)}</span>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(row.key)}
                >
                  <Trash2 className="size-4" />
                  {t("business.removeLine")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
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
              return (
                <TableRow key={row.key}>
                  <TableCell>
                    <NativeSelect
                      value={row.product_id}
                      onChange={(e) => setLine(row.key, { product_id: e.target.value })}
                      className="h-10 w-full min-w-[12rem]"
                    >
                      <option value="">{t("business.selectProduct")}</option>
                      {pickerProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({t("business.stockLabel", { count: String(p.stock) })})
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="1"
                      className="ml-auto h-10 w-24 text-right text-base tabular-nums"
                      value={row.quantity}
                      onChange={(e) => setLine(row.key, { quantity: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="ml-auto h-10 w-32 text-right text-base tabular-nums"
                      value={row.unit_price}
                      onChange={(e) => setLine(row.key, { unit_price: e.target.value })}
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
      totalLabel={t("business.documentTotal")}
      totalFormatted={fmt(totalPreview)}
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
