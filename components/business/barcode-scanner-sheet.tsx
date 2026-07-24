"use client";

import * as React from "react";
import { ScanBarcode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCameraBarcodeScan } from "@/hooks/useCameraBarcodeScan";
import { useT } from "@/hooks/useTranslations";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  continuous?: boolean;
  title?: string;
  description?: string;
};

export function BarcodeScannerSheet({
  open,
  onOpenChange,
  onScan,
  continuous = false,
  title,
  description,
}: Props) {
  const { t } = useT();
  const handleScan = React.useCallback(
    (code: string) => {
      onScan(code);
      if (!continuous) onOpenChange(false);
    },
    [continuous, onOpenChange, onScan]
  );

  const { videoRef, status, errorKey } = useCameraBarcodeScan({
    active: open,
    continuous,
    onScan: handleScan,
  });

  const errorMessage =
    errorKey === "camera_permission"
      ? t("business.barcodeCameraPermission")
      : errorKey === "camera_unsupported"
        ? t("business.barcodeCameraUnsupported")
        : errorKey
          ? t("business.barcodeCameraUnavailable")
          : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 bottom-0 h-[min(100dvh,40rem)] gap-0 overflow-hidden rounded-t-2xl p-0 sm:inset-x-auto sm:right-0 sm:bottom-0 sm:h-full sm:max-w-md sm:rounded-none"
      >
        <SheetHeader className="relative z-10 border-b border-border bg-background/95 px-4 py-3 text-left backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="flex items-center gap-2">
                <ScanBarcode className="size-5 shrink-0" aria-hidden />
                {title ?? t("business.scanBarcode")}
              </SheetTitle>
              <SheetDescription>
                {description ??
                  (continuous
                    ? t("business.scanBarcodeContinuousHint")
                    : t("business.scanBarcodeHint"))}
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={t("common.close")}
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="relative flex min-h-0 flex-1 flex-col bg-black">
          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 size-full object-cover",
              status === "error" && "opacity-0"
            )}
            playsInline
            muted
            autoPlay
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="aspect-[16/10] w-full max-w-sm rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>

          <div className="relative z-10 mt-auto space-y-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 text-center text-white">
            {status === "starting" ? (
              <p className="text-sm">{t("business.barcodeCameraStarting")}</p>
            ) : null}
            {status === "scanning" ? (
              <p className="text-sm text-white/90">{t("business.barcodeAimHint")}</p>
            ) : null}
            {errorMessage ? (
              <div className="space-y-3 rounded-xl bg-background/95 p-4 text-foreground">
                <p className="text-sm">{errorMessage}</p>
                <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
                  {t("common.close")}
                </Button>
              </div>
            ) : null}
            {continuous && status === "scanning" ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                {t("business.scanDone")}
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
