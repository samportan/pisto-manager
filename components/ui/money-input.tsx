"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { parseMoneyInput, sanitizeMoneyInputOnChange } from "@/lib/money";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function MoneyInput({ value, onChange, className, onFocus, onBlur, ...props }: MoneyInputProps) {
  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (value === "0" || value === "0.00") {
      e.target.select();
    }
    onFocus?.(e);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseMoneyInput(value);
    if (parsed !== null && parsed === 0) {
      onChange("");
    }
    onBlur?.(e);
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      className={cn("tabular-nums", className)}
      value={value}
      onChange={(e) => onChange(sanitizeMoneyInputOnChange(value, e.target.value))}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

export function moneyInputToNumber(value: string, fallback = 0): number {
  return parseMoneyInput(value) ?? fallback;
}
