"use client";

import { useEffect } from "react";

export function PointerTracker() {
  useEffect(() => {
    let frameId = 0;
    let pendingPointerPosition: { x: number; y: number } | null = null;

    const updatePointer = (x: number, y: number) => {
      document.documentElement.style.setProperty("--mouse-x", `${x}px`);
      document.documentElement.style.setProperty("--mouse-y", `${y}px`);
    };

    const flushPointerUpdate = () => {
      frameId = 0;

      if (pendingPointerPosition == null) {
        return;
      }

      updatePointer(pendingPointerPosition.x, pendingPointerPosition.y);
      pendingPointerPosition = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pendingPointerPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(flushPointerUpdate);
    };

    updatePointer(window.innerWidth / 2, window.innerHeight / 2);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return null;
}
