"use client";

import * as React from "react";
import { Check, ScanBarcode, X } from "lucide-react";

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
import type { ScanBannerFeedback } from "@/lib/barcode/scan-feedback";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  continuous?: boolean;
  /** fullscreen covers the viewport; dock leaves the form visible above */
  layout?: "fullscreen" | "dock";
  feedback?: ScanBannerFeedback | null;
  title?: string;
  description?: string;
};

export function BarcodeScannerSheet({
  open,
  onOpenChange,
  onScan,
  continuous = false,
  layout = "fullscreen",
  feedback = null,
  title,
  description,
}: Props) {
  const { t } = useT();
  const isDock = layout === "dock";

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

  const flashTone = feedback?.tone === "error" ? "error" : "success";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName={
          isDock
            ? "bg-black/25 supports-backdrop-filter:backdrop-blur-none"
            : "bg-black/40 supports-backdrop-filter:backdrop-blur-none"
        }
        className={cn(
          "gap-0 overflow-hidden p-0",
          isDock
            ? cn(
                "inset-x-0 bottom-0 top-auto w-full rounded-t-2xl border-t",
                "data-[side=bottom]:h-[min(52dvh,26rem)] data-[side=bottom]:max-h-[min(52dvh,26rem)]",
                "sm:data-[side=bottom]:h-[min(56dvh,28rem)] sm:data-[side=bottom]:max-h-[min(56dvh,28rem)]"
              )
            : cn(
                "inset-x-0 top-0 bottom-0 w-full rounded-none border-0",
                "data-[side=bottom]:h-[100dvh] data-[side=bottom]:max-h-[100dvh]",
                "sm:inset-y-0 sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:w-full sm:max-w-md sm:border-l",
                "sm:data-[side=bottom]:h-full sm:data-[side=bottom]:max-h-none"
              )
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

          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center",
              isDock ? "px-[10%] py-[12%]" : "px-[8%] py-[18%] sm:px-10 sm:py-16"
            )}
          >
            <div
              className={cn(
                "relative w-full max-w-md transition-[box-shadow,border-color] duration-200",
                "aspect-[3/1] max-h-[22dvh] min-h-[3.75rem] sm:max-h-[10rem]",
                "rounded-xl border-2",
                feedback
                  ? flashTone === "error"
                    ? "border-destructive shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]"
                    : "border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]"
                  : cn(
                      "border-white/85",
                      isDock
                        ? "shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"
                        : "shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    )
              )}
              aria-hidden
            />
          </div>

          {feedback ? (
            <div
              className={cn(
                "absolute inset-x-3 top-3 z-20 rounded-xl px-4 py-3 shadow-lg",
                flashTone === "error"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-emerald-600 text-white"
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {flashTone === "success" ? (
                  <Check className="mt-0.5 size-6 shrink-0" aria-hidden />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-tight">
                    {feedback.title}
                  </p>
                  {feedback.subtitle ? (
                    <p className="mt-0.5 text-sm opacity-95">{feedback.subtitle}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "relative z-10 mt-auto space-y-3",
              "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
              "px-4 pt-10 text-center text-white",
              "pb-[max(1rem,env(safe-area-inset-bottom))]"
            )}
          >
            {status === "starting" ? (
              <p className="text-sm">{t("business.barcodeCameraStarting")}</p>
            ) : null}
            {status === "scanning" && !errorMessage && !feedback ? (
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
