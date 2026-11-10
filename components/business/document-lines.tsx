"use client";

import type { ReactNode } from "react";
import { Check, Minus, Plus, ScanBarcode, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DocumentLineList({
  hint,
  onAdd,
  addLabel,
  onScan,
  scanLabel,
  scanDisabled,
  feedback,
  notice,
  children,
}: {
  hint?: string;
  onAdd: () => void;
  addLabel: string;
  onScan?: () => void;
  scanLabel?: string;
  scanDisabled?: boolean;
  feedback?: { tone?: "error" | "success"; title: string; subtitle?: string } | null;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {notice}
      <div className={cn("grid gap-2", onScan ? "sm:grid-cols-2" : "grid-cols-1")}>
        {onScan ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={scanDisabled}
            onClick={onScan}
          >
            <ScanBarcode className="size-4" aria-hidden />
            {scanLabel}
          </Button>
        ) : null}
        <Button type="button" className="h-11" onClick={onAdd}>
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Button>
      </div>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {feedback ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl px-4 py-3",
            feedback.tone === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-success text-success-foreground"
          )}
          role="status"
          aria-live="polite"
        >
          {feedback.tone === "success" ? (
            <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{feedback.title}</p>
            {feedback.subtitle ? (
              <p className="text-sm opacity-90">{feedback.subtitle}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}

export function DocumentLine({
  product,
  total,
  highlighted,
  onRemove,
  removeDisabled,
  removeLabel,
  children,
}: {
  product: ReactNode;
  total?: string;
  highlighted?: boolean;
  onRemove?: () => void;
  removeDisabled?: boolean;
  removeLabel?: string;
  children: ReactNode;
}) {
  return (
    <li className={cn("py-4 first:pt-1", highlighted && "-mx-4 bg-success/10 px-4")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{product}</div>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={removeLabel}
            disabled={removeDisabled}
            onClick={onRemove}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
        {children}
        {total ? (
          <p className="text-right text-lg font-medium tabular-nums tracking-tight md:ml-auto md:min-w-[6.5rem] md:pb-2">
            {total}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function DocumentLineRead({
  name,
  detail,
  total,
}: {
  name: string;
  detail: string;
  total: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>
      </div>
      <p className="shrink-0 text-base font-medium tabular-nums">{total}</p>
    </li>
  );
}

export function LineField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1.5 md:min-w-[9rem] md:flex-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function LineQty({
  value,
  onChange,
  step = "1",
  min = "1",
  inputMode = "numeric",
  suffix,
  decreaseLabel,
  increaseLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  step?: string;
  min?: string;
  inputMode?: "numeric" | "decimal";
  suffix?: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const stepN = Number(step) || 1;
  const minN = Number(min) || 0;

  function bump(direction: number) {
    const current = Number(value);
    const base = Number.isFinite(current) ? current : minN;
    const next = Math.max(minN, Math.round((base + direction * stepN) * 1000) / 1000);
    onChange(String(next));
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0"
        aria-label={decreaseLabel}
        onClick={() => bump(-1)}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <Input
        type="number"
        inputMode={inputMode}
        step={step}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-[4.5rem] px-1 text-center text-base tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0"
        aria-label={increaseLabel}
        onClick={() => bump(1)}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
      {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}
