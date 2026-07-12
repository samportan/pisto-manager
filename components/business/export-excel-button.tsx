"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";

type ExportExcelButtonProps = {
  label: string;
  onExport: () => Promise<void>;
  isExporting?: boolean;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
  successMessageKey?: string;
};

export function ExportExcelButton({
  label,
  onExport,
  isExporting = false,
  icon: Icon = Download,
  variant = "outline",
  successMessageKey = "toast.exportReady",
}: ExportExcelButtonProps) {
  const { t } = useT();
  const toast = useAppToast();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className="gap-1.5"
      disabled={isExporting}
      onClick={async () => {
        try {
          await onExport();
          toast.success(successMessageKey);
        } catch (e) {
          toast.errorMessage(e instanceof Error ? e.message : t("business.exportError"));
        }
      }}
    >
      {isExporting ? <Spinner className="size-4" /> : <Icon className="size-4" aria-hidden />}
      {isExporting ? t("business.exporting") : label}
    </Button>
  );
}
