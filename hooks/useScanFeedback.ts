"use client";

import * as React from "react";

import {
  playScanErrorSound,
  playScanSuccessSound,
  type ScanBannerFeedback,
} from "@/lib/barcode/scan-feedback";

const FEEDBACK_MS = 1800;

export function useScanFeedback() {
  const [feedback, setFeedback] = React.useState<ScanBannerFeedback | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedback = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setFeedback(null);
  }, []);

  React.useEffect(() => () => clearFeedback(), [clearFeedback]);

  const showSuccess = React.useCallback(
    (next: Omit<ScanBannerFeedback, "tone">) => {
      playScanSuccessSound();
      if (timerRef.current) clearTimeout(timerRef.current);
      setFeedback({ ...next, tone: "success" });
      timerRef.current = setTimeout(() => {
        setFeedback(null);
        timerRef.current = null;
      }, FEEDBACK_MS);
    },
    []
  );

  const showError = React.useCallback((next: Omit<ScanBannerFeedback, "tone">) => {
    playScanErrorSound();
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ ...next, tone: "error" });
    timerRef.current = setTimeout(() => {
      setFeedback(null);
      timerRef.current = null;
    }, FEEDBACK_MS);
  }, []);

  return { feedback, showSuccess, showError, clearFeedback };
}
