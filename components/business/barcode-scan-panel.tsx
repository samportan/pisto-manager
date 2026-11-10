"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { useCameraBarcodeScan } from "@/hooks/useCameraBarcodeScan";
import { useT } from "@/hooks/useTranslations";
import { cn } from "@/lib/utils";

export type ScanLogItem = {
  id: string;
  tone: "success" | "error";
  title: string;
  detail?: string;
  amount?: string;
};

export function BarcodeScanPanel({
  active,
  onScan,
  onClose,
}: {
  active: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const { videoRef, status, errorKey } = useCameraBarcodeScan({
    active,
    continuous: true,
    onScan,
  });

  React.useEffect(() => {
    if (!active) return;
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [active]);

  const errorMessage =
    errorKey === "camera_permission"
      ? t("business.barcodeCameraPermission")
      : errorKey === "camera_unsupported"
        ? t("business.barcodeCameraUnsupported")
        : errorKey
          ? t("business.barcodeCameraUnavailable")
          : null;

  if (!active) return null;

  return (
    <div ref={rootRef} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-32 overflow-hidden bg-black sm:h-40">
        <video
          ref={videoRef}
          className={cn("absolute inset-0 size-full object-cover", status === "error" && "opacity-0")}
          playsInline
          muted
          autoPlay
        />
        {status !== "error" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
            <div className="h-14 w-full max-w-xs rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-center text-xs text-white">
          {status === "starting"
            ? t("business.barcodeCameraStarting")
            : errorMessage
              ? null
              : t("business.barcodeAimHint")}
        </div>
        {errorMessage ? (
          <p className="absolute inset-0 flex items-center px-4 text-center text-sm leading-snug text-white">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className="p-3">
        <Button type="button" className="h-11 w-full" onClick={onClose}>
          {t("business.scanDone")}
        </Button>
      </div>
    </div>
  );
}

export function ScanLog({ label, items }: { label: string; items: ScanLogItem[] }) {
  if (!items.length) return null;
  const [latest, ...earlier] = items;

  return (
    <div className="rounded-xl border border-border" role="status" aria-live="polite">
      <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">{label}</p>
      <div
        className={cn(
          "flex items-baseline justify-between gap-3 px-3 py-3",
          latest.tone === "error" && "bg-destructive/10"
        )}
      >
        <div className="min-w-0">
          <p className="text-base font-medium leading-tight">{latest.title}</p>
          {latest.detail ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{latest.detail}</p>
          ) : null}
        </div>
        {latest.amount ? (
          <p className="shrink-0 text-lg font-medium tabular-nums tracking-tight">{latest.amount}</p>
        ) : null}
      </div>
      {earlier.length ? (
        <ul className="border-t border-border">
          {earlier.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className={cn("min-w-0 truncate", item.tone === "error" && "text-destructive")}>
                {item.title}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {item.amount ?? item.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
