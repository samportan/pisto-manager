"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/hooks/useTranslations";

type ExportExcelButtonProps = {
  label: string;
  onExport: () => Promise<void>;
  isExporting?: boolean;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export function ExportExcelButton({
  label,
  onExport,
  isExporting = false,
  icon: Icon = Download,
  variant = "outline",
}: ExportExcelButtonProps) {
  const { t } = useT();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        className="gap-1.5"
        disabled={isExporting}
        onClick={async () => {
          setError(null);
          try {
            await onExport();
          } catch (e) {
            setError(e instanceof Error ? e.message : t("business.exportError"));
          }
        }}
      >
        {isExporting ? <Spinner className="size-4" /> : <Icon className="size-4" aria-hidden />}
        {isExporting ? t("business.exporting") : label}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
