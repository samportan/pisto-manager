"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";
import { PendingLabel } from "@/components/ui/pending-label";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onError?: (error: unknown) => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel,
  variant = "default",
  isPending,
  onConfirm,
  onError,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          )}
        >
          <Dialog.Title className="font-heading text-base font-semibold text-foreground">
            {title}
          </Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={variant === "destructive" ? "destructive" : "default"}
              disabled={isPending}
              onClick={() => {
                void (async () => {
                  try {
                    await Promise.resolve(onConfirm());
                    onOpenChange(false);
                  } catch (err) {
                    onError?.(err);
                  }
                })();
              }}
            >
              {isPending ? (
                <PendingLabel label={pendingLabel ?? confirmLabel} spinnerClassName="size-3.5" />
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
