"use client";

import * as React from "react";

import { BARCODE_DETECTOR_FORMATS } from "@/lib/barcode/formats";
import { normalizeProductCode } from "@/lib/barcode/normalize";

type ScanStatus = "idle" | "starting" | "scanning" | "error";

type Options = {
  active: boolean;
  continuous?: boolean;
  onScan: (code: string) => void;
};

const NATIVE_INTERVAL_MS = 250;
const COOLDOWN_MS = 1200;

function supportsBarcodeDetector(): boolean {
  return typeof window !== "undefined" && typeof window.BarcodeDetector === "function";
}

export function useCameraBarcodeScan({ active, continuous = false, onScan }: Options) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [status, setStatus] = React.useState<ScanStatus>("idle");
  const [errorKey, setErrorKey] = React.useState<string | null>(null);
  const onScanRef = React.useRef(onScan);
  const lastCodeRef = React.useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const continuousRef = React.useRef(continuous);
  const stopControlsRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  React.useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);

  const stop = React.useCallback(() => {
    stopControlsRef.current?.();
    stopControlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus((s) => (s === "error" ? s : "idle"));
  }, []);

  const emitScan = React.useCallback((raw: string): boolean => {
    const normalized = normalizeProductCode(raw);
    if (!normalized) return false;
    const now = Date.now();
    if (
      lastCodeRef.current.code === normalized &&
      now - lastCodeRef.current.at < COOLDOWN_MS
    ) {
      return false;
    }
    lastCodeRef.current = { code: normalized, at: now };
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        /* ignore */
      }
    }
    onScanRef.current(normalized);
    return true;
  }, []);

  React.useEffect(() => {
    if (!active) {
      stop();
      setErrorKey(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start() {
      setStatus("starting");
      setErrorKey(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException("Unsupported", "NotSupportedError");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("no_video");
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");

        if (supportsBarcodeDetector() && window.BarcodeDetector) {
          let detector: InstanceType<NonNullable<Window["BarcodeDetector"]>>;
          try {
            detector = new window.BarcodeDetector({
              formats: [...BARCODE_DETECTOR_FORMATS],
            });
          } catch {
            detector = new window.BarcodeDetector();
          }

          intervalId = setInterval(() => {
            void (async () => {
              const el = videoRef.current;
              if (!el || el.readyState < 2) return;
              try {
                const results = await detector.detect(el);
                const value = results[0]?.rawValue;
                if (!value) return;
                const accepted = emitScan(value);
                if (accepted && !continuousRef.current) stop();
              } catch {
                /* keep scanning */
              }
            })();
          }, NATIVE_INTERVAL_MS);
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (!result) return;
          const accepted = emitScan(result.getText());
          if (accepted && !continuousRef.current) stop();
        });
        stopControlsRef.current = () => {
          try {
            controls.stop();
          } catch {
            /* ignore */
          }
        };
      } catch (err) {
        if (cancelled) return;
        const key =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "camera_permission"
            : err instanceof DOMException &&
                (err.name === "NotFoundError" || err.name === "NotSupportedError")
              ? "camera_unsupported"
              : "camera_unavailable";
        setErrorKey(key);
        setStatus("error");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      stop();
    };
  }, [active, emitScan, stop]);

  return { videoRef, status, errorKey, stop };
}
