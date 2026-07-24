"use client";

import * as React from "react";

import { normalizeProductCode } from "@/lib/barcode/normalize";

type Options = {
  enabled: boolean;
  onScan: (code: string) => void;
  /** Ignore wedge input while typing in these roles/types */
  ignoreWhenFocused?: boolean;
};

const INTER_KEY_MS = 80;
const MIN_CODE_LENGTH = 4;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function useHardwareBarcodeScan({
  enabled,
  onScan,
  ignoreWhenFocused = true,
}: Options) {
  const bufferRef = React.useRef("");
  const lastKeyAtRef = React.useRef(0);
  const onScanRef = React.useRef(onScan);

  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  React.useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      return;
    }

    function flushIfComplete() {
      const code = normalizeProductCode(bufferRef.current);
      bufferRef.current = "";
      if (code.length >= MIN_CODE_LENGTH) {
        onScanRef.current(code);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (ignoreWhenFocused && isEditableTarget(e.target)) return;

      const now = Date.now();
      if (now - lastKeyAtRef.current > INTER_KEY_MS) {
        bufferRef.current = "";
      }
      lastKeyAtRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= MIN_CODE_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          flushIfComplete();
        } else {
          bufferRef.current = "";
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, ignoreWhenFocused]);
}
