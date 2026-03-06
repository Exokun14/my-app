/* ==============================================================
   RIPPLE CANVAS EFFECT  ·  Effects/RippleCanvas.tsx
    On Click Ripple Effect
   ============================================================== */

"use client";

import { useEffect, useRef } from "react";
import { initRippleCanvas } from "../pages/Login/loginUtils";

export default function RippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = initRippleCanvas(canvasRef.current);
    return () => cleanup();
  }, []);

  return <canvas id="rippleCanvas" ref={canvasRef} />;
}