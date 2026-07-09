"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/useTranslations";
import type { Product } from "@/lib/db/products";
import { filterProductsByName } from "@/lib/product-search";
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
    () => filterProductsByName(products, query),
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
    if (!open) return;
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
  }, [open]);

  React.useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

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
  }, [open, closePanel]);

  const triggerLabel = selected
    ? showStock
      ? `${selected.name} (${t("business.stockLabel", { count: String(selected.stock) })})`
      : selected.name
    : t("business.selectProduct");

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

      {open ? (
        <div
          style={panelStyle}
          className="rounded-lg border border-border bg-card shadow-lg"
        >
          <div className="relative border-b border-border p-2">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              placeholder={t("business.searchProducts")}
              className="h-9 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filteredProducts.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                {t("business.noProductsMatch")}
              </li>
            ) : (
              filteredProducts.map((p) => (
                <li key={p.id} role="option" aria-selected={p.id === value}>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted md:min-h-9",
                      p.id === value && "bg-muted"
                    )}
                    onClick={() => selectProduct(p.id)}
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    {showStock ? (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {t("business.stockLabel", { count: String(p.stock) })}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
