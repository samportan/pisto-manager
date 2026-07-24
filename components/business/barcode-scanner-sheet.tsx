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
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden p-0",
          "inset-x-0 top-0 bottom-0 w-full rounded-none border-0",
          "data-[side=bottom]:h-[100dvh] data-[side=bottom]:max-h-[100dvh]",
          "sm:inset-y-0 sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:w-full sm:max-w-md sm:border-l",
          "sm:data-[side=bottom]:h-full sm:data-[side=bottom]:max-h-none"
        )}
      >
        <SheetHeader className="relative z-20 shrink-0 space-y-0 border-b border-border bg-background px-4 py-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5 pr-1">
              <SheetTitle className="flex items-center gap-2 text-base">
                <ScanBarcode className="size-5 shrink-0" aria-hidden />
                <span className="truncate">{title ?? t("business.scanBarcode")}</span>
              </SheetTitle>
              <SheetDescription className="line-clamp-2 text-xs sm:text-sm">
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
              className="size-11 shrink-0 touch-manipulation sm:size-10"
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

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[8%] py-[18%] sm:px-10 sm:py-16">
            <div
              className={cn(
                "relative w-full max-w-md",
                "aspect-[3/1] max-h-[28dvh] min-h-[4.5rem] sm:max-h-[12rem]",
                "rounded-xl border-2 border-white/85",
                "shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
              )}
              aria-hidden
            />
          </div>

          <div
            className={cn(
              "relative z-10 mt-auto space-y-3",
              "bg-gradient-to-t from-black/90 via-black/55 to-transparent",
              "px-4 pt-12 text-center text-white",
              "pb-[max(1rem,env(safe-area-inset-bottom))]"
            )}
          >
            {status === "starting" ? (
              <p className="text-sm">{t("business.barcodeCameraStarting")}</p>
            ) : null}
            {status === "scanning" && !errorMessage ? (
              <p className="text-sm text-white/90">{t("business.barcodeAimHint")}</p>
            ) : null}
            {errorMessage ? (
              <div className="space-y-3 rounded-xl bg-background/95 p-4 text-left text-foreground">
                <p className="text-sm leading-snug">{errorMessage}</p>
                <Button
                  type="button"
                  className="h-11 w-full touch-manipulation"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.close")}
                </Button>
              </div>
            ) : null}
            {continuous && status === "scanning" && !errorMessage ? (
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full touch-manipulation"
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
