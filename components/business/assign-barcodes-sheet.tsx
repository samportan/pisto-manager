"use client";

import * as React from "react";
import { ScanBarcode, Search } from "lucide-react";

import { BarcodeScannerSheet } from "@/components/business/barcode-scanner-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PendingLabel } from "@/components/ui/pending-label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useHardwareBarcodeScan } from "@/hooks/useHardwareBarcodeScan";
import { useAppToast } from "@/hooks/useAppToast";
import { useT } from "@/hooks/useTranslations";
import { normalizeProductCode } from "@/lib/barcode/normalize";
import { playScanErrorSound, playScanSuccessSound } from "@/lib/barcode/scan-feedback";
import type { Product } from "@/lib/db/products";
import { findProductByCode } from "@/lib/product-search";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onAssign: (productId: string, barcode: string) => Promise<void>;
  isAssigning?: boolean;
};

function missingBarcode(p: Product): boolean {
  return !normalizeProductCode(p.barcode ?? "");
}

export function AssignBarcodesSheet({
  open,
  onOpenChange,
  products,
  onAssign,
  isAssigning,
}: Props) {
  const { t } = useT();
  const toast = useAppToast();
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const selectedIdRef = React.useRef(selectedId);
  selectedIdRef.current = selectedId;

  const withoutBarcode = React.useMemo(
    () => products.filter(missingBarcode).sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withoutBarcode;
    return withoutBarcode.filter((p) => {
      const hay = [p.name, p.sku ?? ""].join(" ").toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [withoutBarcode, query]);

  const selected = withoutBarcode.find((p) => p.id === selectedId) ?? null;
  const doneCount = products.length - withoutBarcode.length;

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedId(null);
      setScannerOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (selectedId && !withoutBarcode.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, withoutBarcode]);

  const assignCode = React.useCallback(
    async (code: string) => {
      const productId = selectedIdRef.current;
      if (!productId) {
        playScanErrorSound();
        toast.error("business.assignBarcodePickFirst");
        return;
      }
      const normalized = normalizeProductCode(code);
      if (!normalized) return;

      const product = products.find((p) => p.id === productId);
      if (!product) {
        playScanErrorSound();
        toast.error("business.assignBarcodePickFirst");
        return;
      }

      const taken = findProductByCode(products, normalized);
      if (taken && taken.id !== productId) {
        playScanErrorSound();
        toast.error("business.barcodeDuplicate");
        return;
      }

      try {
        await onAssign(productId, normalized);
        playScanSuccessSound();
        toast.success("business.assignBarcodeSaved", {
          name: product.name,
          code: normalized,
        });
        setSelectedId(null);
        setScannerOpen(false);
      } catch (err) {
        playScanErrorSound();
        toast.errorFrom(err);
      }
    },
    [onAssign, products, toast]
  );

  useHardwareBarcodeScan({
    enabled: open && !!selectedId && !scannerOpen && !isAssigning,
    onScan: (code) => {
      void assignCode(code);
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>{t("business.assignBarcodesTitle")}</SheetTitle>
            <SheetDescription>{t("business.assignBarcodesDescription")}</SheetDescription>
            <p className="pt-1 text-xs text-muted-foreground">
              {t("business.assignBarcodesProgress", {
                missing: String(withoutBarcode.length),
                done: String(doneCount),
                total: String(products.length),
              })}
            </p>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("business.searchProducts")}
                  className="h-11 pl-9 text-base sm:h-10"
                />
              </div>

              {selected ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("business.assignBarcodeSelected")}
                  </p>
                  <p className="truncate font-medium">{selected.name}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      className="h-11 flex-1 gap-1.5 touch-manipulation"
                      disabled={isAssigning}
                      onClick={() => setScannerOpen(true)}
                    >
                      {isAssigning ? (
                        <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
                      ) : (
                        <>
                          <ScanBarcode className="size-4" />
                          {t("business.scanToAssign")}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 touch-manipulation"
                      disabled={isAssigning}
                      onClick={() => setSelectedId(null)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("business.assignBarcodeScanHint")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("business.assignBarcodePickHint")}
                </p>
              )}
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {withoutBarcode.length === 0
                    ? t("business.assignBarcodesAllDone")
                    : t("business.noProductsMatch")}
                </li>
              ) : (
                filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={isAssigning}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted",
                        selectedId === p.id && "bg-secondary/20 ring-1 ring-secondary/40"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        {p.sku ? (
                          <span className="block truncate text-xs text-muted-foreground tabular-nums">
                            {t("business.sku")} {p.sku}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {p.stock}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </SheetContent>
      </Sheet>

      <BarcodeScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(code) => {
          void assignCode(code);
        }}
        title={selected ? t("business.scanToAssign") : undefined}
        description={
          selected
            ? t("business.assignBarcodeForProduct", { name: selected.name })
            : undefined
        }
      />
    </>
  );
}
