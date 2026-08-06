"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { MobilePickerSheet } from "@/components/business/mobile-picker-sheet";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/hooks/useTranslations";
import type { Product } from "@/lib/db/products";
import { filterProductsForPicker } from "@/lib/product-search";
import { cn } from "@/lib/utils";

type ProductPickerProps = {
  products: Product[];
  value: string;
  onValueChange: (productId: string) => void;
  showStock?: boolean;
  className?: string;
  disabled?: boolean;
};

export function ProductPicker({
  products,
  value,
  onValueChange,
  showStock,
  className,
  disabled,
}: ProductPickerProps) {
  const { t } = useT();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selected = React.useMemo(
    () => products.find((p) => p.id === value),
    [products, value]
  );

  const filteredProducts = React.useMemo(
    () => filterProductsForPicker(products, query),
    [products, query]
  );

  const closePanel = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const openPanel = React.useCallback(() => {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }, [disabled]);

  function selectProduct(id: string) {
    onValueChange(id);
    closePanel();
  }

  React.useEffect(() => {
    if (!open || isMobile) return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const estimatedPanelHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const spaceAbove = rect.top - 4;
      const openUpward = spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow;
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - rect.width - 4));
      setPanelStyle(
        openUpward
          ? {
              position: "fixed",
              bottom: window.innerHeight - rect.top + 4,
              top: "auto",
              left,
              width: rect.width,
              zIndex: 50,
            }
          : {
              position: "fixed",
              top: rect.bottom + 4,
              bottom: "auto",
              left,
              width: rect.width,
              zIndex: 50,
            }
      );
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, isMobile]);

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, isMobile]);

  React.useEffect(() => {
    if (!open || isMobile) return;

    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) closePanel();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isMobile, closePanel]);

  const triggerLabel = selected
    ? showStock
      ? `${selected.name} (${t("business.stockLabel", { count: String(selected.stock) })})`
      : selected.name
    : t("business.selectProduct");

  function secondaryLabel(p: Product): string | null {
    if (p.barcode) return p.barcode;
    if (p.sku) return p.sku;
    return null;
  }

  function renderSearchField() {
    return (
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={searchRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t("business.searchProducts")}
          className={cn("h-9 pl-9", isMobile && "h-11 text-base")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    );
  }

  function renderOptionsList(scrollable: boolean) {
    return (
      <ul role="listbox" className={cn("p-1", scrollable && "max-h-60 overflow-y-auto")}>
        {filteredProducts.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t("business.noProductsMatch")}
          </li>
        ) : (
          filteredProducts.map((p) => {
            const code = secondaryLabel(p);
            return (
              <li key={p.id} role="option" aria-selected={p.id === value}>
                <button
                  type="button"
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted md:min-h-9",
                    p.id === value && "bg-muted"
                  )}
                  onClick={() => selectProduct(p.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    {code ? (
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {code}
                      </span>
                    ) : null}
                  </span>
                  {showStock ? (
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {t("business.stockLabel", { count: String(p.stock) })}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        className={cn(
          "relative flex w-full min-w-0 items-center justify-between rounded-lg border border-border bg-card/50 py-2 pr-9 pl-3 text-left text-sm outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{triggerLabel}</span>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </button>

      {open && !isMobile ? (
        <div style={panelStyle} className="rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">{renderSearchField()}</div>
          {renderOptionsList(true)}
        </div>
      ) : null}

      {open && isMobile ? (
        <MobilePickerSheet
          open
          onClose={closePanel}
          title={t("business.searchProducts").replace(/[.…]+$/, "")}
          closeLabel={t("common.close")}
          search={renderSearchField()}
        >
          {renderOptionsList(false)}
        </MobilePickerSheet>
      ) : null}
    </div>
  );
}
