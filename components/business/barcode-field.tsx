"use client";

import * as React from "react";
import { ScanBarcode } from "lucide-react";

import { BarcodeScannerSheet } from "@/components/business/barcode-scanner-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/useTranslations";
import { normalizeProductCode } from "@/lib/barcode/normalize";
import { playScanSuccessSound } from "@/lib/barcode/scan-feedback";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  duplicate?: boolean;
  className?: string;
};

export function BarcodeField({
  id = "barcode",
  value,
  onChange,
  disabled,
  duplicate,
  className,
}: Props) {
  const { t } = useT();
  const [scannerOpen, setScannerOpen] = React.useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{t("business.barcode")}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(normalizeProductCode(value))}
          placeholder={t("business.barcodePlaceholder")}
          disabled={disabled}
          inputMode="text"
          autoComplete="off"
          className="min-w-0 flex-1"
          aria-invalid={duplicate || undefined}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          disabled={disabled}
          aria-label={t("business.scanBarcode")}
          onClick={() => setScannerOpen(true)}
        >
          <ScanBarcode className="size-5" />
        </Button>
      </div>
      {duplicate ? (
        <p className="text-xs text-destructive">{t("business.barcodeDuplicate")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("business.barcodeHint")}</p>
      )}
      <BarcodeScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(code) => {
          playScanSuccessSound();
          onChange(code);
        }}
      />
    </div>
  );
}
