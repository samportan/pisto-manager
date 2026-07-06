"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Product } from "@/lib/db/products";
import type { Contact } from "@/lib/db/contacts";
import type { SaleLineInput } from "@/lib/db/sales";

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Line = { key: string; product_id: string; quantity: string; unit_price: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  customers: Contact[];
  onSubmit: (payload: {
    customer_id: string | null;
    date: string;
    notes: string | null;
    items: SaleLineInput[];
  }) => Promise<void>;
  isSubmitting?: boolean;
};

export function AddSaleSheet({
  open,
  onOpenChange,
  products,
  customers,
  onSubmit,
  isSubmitting,
}: Props) {
  const [customerId, setCustomerId] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([
    { key: crypto.randomUUID(), product_id: "", quantity: "1", unit_price: "0" },
  ]);
  const [localErr, setLocalErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLocalErr(null);
    setCustomerId("");
    setDateLocal(toDatetimeLocalValue(new Date()));
    setNotes("");
    setLines([{ key: crypto.randomUUID(), product_id: "", quantity: "1", unit_price: "0" }]);
  }, [open]);

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

  const totalPreview = React.useMemo(() => {
    let sum = 0;
    for (const row of lines) {
      if (!row.product_id) continue;
      const q = Number(row.quantity) || 0;
      const u = Number(row.unit_price) || 0;
      sum += q * u;
    }
    return sum;
  }, [lines]);

  async function handleSubmit() {
    setLocalErr(null);
    const items: SaleLineInput[] = [];
    try {
      for (const row of lines) {
        if (!row.product_id) continue;
        const qty = Number(row.quantity) || 0;
        const unit = Number(row.unit_price) || 0;
        if (qty <= 0) throw new Error("Quantity must be positive.");
        const pr = productById.get(row.product_id);
        if (!pr) throw new Error("Pick a product on every line.");
        if (Number(pr.stock) < qty) {
          throw new Error(`Not enough stock for ${pr.name} (have ${pr.stock}).`);
        }
        const line_total = Math.round(qty * unit * 100) / 100;
        items.push({
          product_id: row.product_id,
          quantity: qty,
          unit_price: unit,
          line_total,
        });
      }
      if (items.length === 0) throw new Error("Add at least one line with a product.");
      const dateIso = new Date(dateLocal).toISOString();
      await onSubmit({
        customer_id: customerId || null,
        date: dateIso,
        notes: notes.trim() || null,
        items,
      });
      onOpenChange(false);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Could not save");
      throw err;
    }
  }

  const pickerProducts = products.filter((p) => p.is_active);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left shrink-0">
          <SheetTitle>New sale</SheetTitle>
          <SheetDescription>
            Customer optional (walk-in). Each line pulls stock when you save.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit().catch(() => {});
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-6">
            {localErr ? (
              <p className="text-sm text-destructive" role="alert">
                {localErr}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sale-customer">Customer</Label>
                <NativeSelect
                  id="sale-customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Walk-in (no customer)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-date">Date</Label>
                <Input
                  id="sale-date"
                  type="datetime-local"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sale-notes">Notes</Label>
                <Textarea
                  id="sale-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Invoice ref, payment, etc."
                  rows={2}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-base">Line items</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addLine}>
                  <Plus className="size-3.5" />
                  Add line
                </Button>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
                {lines.map((row) => {
                  const q = Number(row.quantity) || 0;
                  const u = Number(row.unit_price) || 0;
                  const lineTotal = Math.round(q * u * 100) / 100;
                  return (
                    <div
                      key={row.key}
                      className="grid gap-2 rounded-lg border border-border/80 bg-card p-3 sm:grid-cols-12 sm:items-end"
                    >
                      <div className="space-y-1 sm:col-span-5">
                        <span className="text-xs font-medium text-muted-foreground">Product</span>
                        <NativeSelect
                          value={row.product_id}
                          onChange={(e) => setLine(row.key, { product_id: e.target.value })}
                          required
                        >
                          <option value="">Select…</option>
                          {pickerProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (stock {p.stock})
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">Qty</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => setLine(row.key, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">Unit price</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={row.unit_price}
                          onChange={(e) => setLine(row.key, { unit_price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">Line total</span>
                        <Input readOnly className="tabular-nums" value={String(lineTotal)} />
                      </div>
                      <div className="flex justify-end sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove line"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(row.key)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Document total</span>
              <span className="text-lg font-bold tabular-nums">{totalPreview.toFixed(2)}</span>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t border-border bg-card/50 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save sale"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
