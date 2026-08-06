"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useVisualViewportRect } from "@/hooks/use-visual-viewport";
import { cn } from "@/lib/utils";

type MobilePickerSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  search: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function MobilePickerSheet({
  open,
  onClose,
  title,
  closeLabel,
  search,
  children,
  className,
}: MobilePickerSheetProps) {
  const [mounted, setMounted] = React.useState(false);
  const viewport = useVisualViewportRect(open && mounted);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed z-[100]"
      style={{
        top: viewport.offsetTop,
        left: viewport.offsetLeft,
        width: viewport.width,
        height: viewport.height,
      }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-0 flex flex-col bg-background shadow-xl",
          className
        )}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="shrink-0 border-b border-border p-3">{search}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  );
}
