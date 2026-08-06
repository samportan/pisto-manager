"use client";

import * as React from "react";

export type VisualViewportRect = {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
};

function readVisualViewport(): VisualViewportRect {
  const vv = window.visualViewport;
  if (!vv) {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  return {
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  };
}

export function useVisualViewportRect(enabled = true): VisualViewportRect {
  const [rect, setRect] = React.useState<VisualViewportRect>(() => ({
    offsetTop: 0,
    offsetLeft: 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  React.useEffect(() => {
    if (!enabled) return;

    const update = () => setRect(readVisualViewport());
    update();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return rect;
}
