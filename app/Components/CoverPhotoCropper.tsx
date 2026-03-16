'use client'

// ============================================================
// CoverPhotoCropper.tsx
// A canvas-based crop modal for cover photos.
// Supports: pan (drag), zoom (scroll / pinch), aspect-ratio lock,
// and outputs a cropped File ready for upload.
//
// Usage:
//   <CoverPhotoCropper
//     file={rawFile}           // File from <input type="file">
//     aspectRatio={16 / 9}     // optional, defaults to 16/5 (banner)
//     onConfirm={(croppedFile) => handleUpload(croppedFile)}
//     onCancel={() => setCropperOpen(false)}
//   />
// ============================================================

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CoverPhotoCropperProps {
  file: File;
  aspectRatio?: number;       // width / height  (default: 16/5 — wide banner)
  outputMime?: string;        // default: "image/jpeg"
  outputQuality?: number;     // 0–1, default 0.92
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}

interface Transform {
  x: number;   // pan offset in canvas-pixels
  y: number;
  scale: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ASPECT = 1600 / 162;  // matches Popeyes-bg_1.jpg (1600 × 162 px)
const MIN_SCALE      = 0.25;
const MAX_SCALE      = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const CoverPhotoCropper: React.FC<CoverPhotoCropperProps> = ({
  file,
  aspectRatio = DEFAULT_ASPECT,
  outputMime = "image/jpeg",
  outputQuality = 0.92,
  onConfirm,
  onCancel,
}) => {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const imgRef          = useRef<HTMLImageElement | null>(null);
  const transformRef    = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const isDragging      = useRef(false);
  const lastPointer     = useRef({ x: 0, y: 0 });
  const lastPinchDist   = useRef<number | null>(null);
  const animFrame       = useRef<number>(0);

  // canvas logical size (set once layout is known)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 250 });
  const [imageReady, setImageReady] = useState(false);
  const [zoom, setZoom]             = useState(1);   // mirrors transformRef for display
  const [outputSize, setOutputSize] = useState({ w: 1600, h: 500 });

  // ── Load image from file ──────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    loadImage(url).then(img => {
      imgRef.current = img;
      URL.revokeObjectURL(url);
      setImageReady(true);
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Measure container and set canvas size ─────────────────────────────────
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = Math.round(w / aspectRatio);
      setCanvasSize({ w, h });
      // Output resolution: 2× display, capped at 1600px wide (native size of cover photo)
      const outW = Math.min(w * 2, 1600);
      setOutputSize({ w: outW, h: Math.round(outW / aspectRatio) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspectRatio]);

  // ── Fit image to canvas on first ready ────────────────────────────────────
  useEffect(() => {
    if (!imageReady || !imgRef.current) return;
    fitImage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageReady, canvasSize]);

  function fitImage() {
    const img = imgRef.current;
    if (!img) return;
    const { w, h } = canvasSize;
    const scaleX = w / img.naturalWidth;
    const scaleY = h / img.naturalHeight;
    const scale  = Math.max(scaleX, scaleY);   // cover — no blank edges
    const x = (w - img.naturalWidth  * scale) / 2;
    const y = (h - img.naturalHeight * scale) / 2;
    transformRef.current = { x, y, scale };
    setZoom(scale);
    render();
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx  = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h }       = canvasSize;
    const { x, y, scale } = transformRef.current;

    ctx.clearRect(0, 0, w, h);

    // Checkerboard background (shows transparent areas if any)
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);

    // Crop-frame overlay — faint edge darkening to hint the crop boundary
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.setLineDash([]);

    // Rule-of-thirds grid (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth   = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo((w / 3) * i, 0); ctx.lineTo((w / 3) * i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (h / 3) * i); ctx.lineTo(w, (h / 3) * i); ctx.stroke();
    }
  }, [canvasSize]);

  // Re-render whenever canvasSize changes
  useEffect(() => { render(); }, [canvasSize, render]);

  // ── Clamp pan so image always covers the canvas ───────────────────────────
  function clampTransform(t: Transform): Transform {
    const img = imgRef.current;
    if (!img) return t;
    const iw = img.naturalWidth  * t.scale;
    const ih = img.naturalHeight * t.scale;
    const { w, h } = canvasSize;
    const minX = w - iw;
    const minY = h - ih;
    return {
      scale: t.scale,
      x: clamp(t.x, Math.min(minX, 0), Math.max(0, minX)),
      y: clamp(t.y, Math.min(minY, 0), Math.max(0, minY)),
    };
  }

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current  = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    const t = transformRef.current;
    transformRef.current = clampTransform({ ...t, x: t.x + dx, y: t.y + dy });
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(render);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // ── Zoom via scroll ───────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const px     = e.clientX - rect.left;   // pointer in canvas-space
    const py     = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const t      = transformRef.current;
    const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio    = newScale / t.scale;
    // Zoom toward pointer
    const nx = px - (px - t.x) * ratio;
    const ny = py - (py - t.y) * ratio;
    transformRef.current = clampTransform({ scale: newScale, x: nx, y: ny });
    setZoom(newScale);
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(render);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // ── Touch: pan + pinch-zoom ───────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current  = true;
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
    e.preventDefault();
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastPointer.current.x;
      const dy = e.touches[0].clientY - lastPointer.current.y;
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const t = transformRef.current;
      transformRef.current = clampTransform({ ...t, x: t.x + dx, y: t.y + dy });
    }
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / lastPinchDist.current;
      lastPinchDist.current = dist;
      const t       = transformRef.current;
      const mx      = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my      = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const canvas  = canvasRef.current;
      if (!canvas) return;
      const rect    = canvas.getBoundingClientRect();
      const px      = mx - rect.left;
      const py      = my - rect.top;
      const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio    = newScale / t.scale;
      const nx = px - (px - t.x) * ratio;
      const ny = py - (py - t.y) * ratio;
      transformRef.current = clampTransform({ scale: newScale, x: nx, y: ny });
      setZoom(newScale);
    }
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(render);
    e.preventDefault();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const onTouchEnd = useCallback(() => {
    isDragging.current    = false;
    lastPinchDist.current = null;
  }, []);

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  function adjustZoom(factor: number) {
    const t        = transformRef.current;
    const { w, h } = canvasSize;
    const cx = w / 2;
    const cy = h / 2;
    const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio    = newScale / t.scale;
    const nx = cx - (cx - t.x) * ratio;
    const ny = cy - (cy - t.y) * ratio;
    transformRef.current = clampTransform({ scale: newScale, x: nx, y: ny });
    setZoom(newScale);
    render();
  }

  function resetCrop() { fitImage(); }

  // ── Produce cropped File ──────────────────────────────────────────────────
  async function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;

    const { w: cw, h: ch } = canvasSize;
    const { x, y, scale }  = transformRef.current;

    // Compute source rect in image-natural coordinates
    const srcX = -x / scale;
    const srcY = -y / scale;
    const srcW =  cw / scale;
    const srcH =  ch / scale;

    // Draw at output resolution
    const out = document.createElement("canvas");
    out.width  = outputSize.w;
    out.height = outputSize.h;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, out.width, out.height);

    out.toBlob(
      blob => {
        if (!blob) return;
        const ext      = outputMime === "image/png" ? "png" : "jpg";
        const cropped  = new File([blob], `cover.${ext}`, { type: outputMime });
        onConfirm(cropped);
      },
      outputMime,
      outputQuality,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const zoomPct = Math.round((zoom / (imgRef.current
    ? Math.max(
        canvasSize.w / imgRef.current.naturalWidth,
        canvasSize.h / imgRef.current.naturalHeight,
      )
    : 1)) * 100);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(10,6,30,0.85)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10020, padding: "16px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        width: "100%", maxWidth: 860,
        boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{
          padding: "18px 22px 14px",
          background: "linear-gradient(135deg,rgba(124,58,237,0.05),rgba(13,148,136,0.04))",
          borderBottom: "1px solid rgba(124,58,237,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: "linear-gradient(135deg,#7c3aed,#0d9488)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(124,58,237,0.3)", fontSize: 18,
            }}>🖼️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#18103a", letterSpacing: "-.01em" }}>
                Crop Cover Photo
              </div>
              <div style={{ fontSize: 11, color: "#8e7ec0", marginTop: 2 }}>
                Drag to pan · Scroll or pinch to zoom · {Math.round(aspectRatio * 100) / 100}:1 aspect ratio
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: 32, height: 32, borderRadius: 9,
              border: "1.5px solid rgba(124,58,237,0.15)",
              background: "#f5f3ff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#8e7ec0",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
        </div>

        {/* ── Canvas area ───────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            background: "#0f0a23",
            position: "relative",
            userSelect: "none",
            cursor: isDragging.current ? "grabbing" : "grab",
            flexShrink: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ display: "block", width: "100%", height: "auto", touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />

          {/* Loading overlay */}
          {!imageReady && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#0f0a23", color: "rgba(255,255,255,0.5)", fontSize: 13,
            }}>
              <span style={{
                width: 20, height: 20,
                border: "2px solid rgba(255,255,255,0.2)",
                borderTop: "2px solid #fff",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
                marginRight: 10,
              }} />
              Loading image…
            </div>
          )}

          {/* Corner brackets – decorative crop indicator */}
          {imageReady && (
            <>
              {[
                { top: 8, left: 8,   borderTop: "2px solid rgba(255,255,255,0.7)", borderLeft: "2px solid rgba(255,255,255,0.7)" },
                { top: 8, right: 8,  borderTop: "2px solid rgba(255,255,255,0.7)", borderRight: "2px solid rgba(255,255,255,0.7)" },
                { bottom: 8, left: 8,  borderBottom: "2px solid rgba(255,255,255,0.7)", borderLeft: "2px solid rgba(255,255,255,0.7)" },
                { bottom: 8, right: 8, borderBottom: "2px solid rgba(255,255,255,0.7)", borderRight: "2px solid rgba(255,255,255,0.7)" },
              ].map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 18, height: 18, pointerEvents: "none", ...s }} />
              ))}
            </>
          )}
        </div>

        {/* ── Controls bar ──────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 22px",
          borderTop: "1px solid rgba(124,58,237,0.08)",
          background: "#faf9ff",
          display: "flex", alignItems: "center", gap: 10,
          flexWrap: "wrap",
          flexShrink: 0,
        }}>
          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }}>
            <button
              onClick={() => adjustZoom(0.85)}
              style={btnStyle}
              title="Zoom out"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="5"/><path d="M12 12l3 3M5 7h4"/>
              </svg>
            </button>

            {/* Zoom slider */}
            <input
              type="range"
              min={Math.round(MIN_SCALE * 100)}
              max={Math.round(MAX_SCALE * 100)}
              value={Math.round(zoom * 100)}
              onChange={e => {
                const newScale = Number(e.target.value) / 100;
                const t = transformRef.current;
                const { w, h } = canvasSize;
                const cx = w / 2; const cy = h / 2;
                const ratio = newScale / t.scale;
                const nx = cx - (cx - t.x) * ratio;
                const ny = cy - (cy - t.y) * ratio;
                transformRef.current = clampTransform({ scale: newScale, x: nx, y: ny });
                setZoom(newScale);
                render();
              }}
              style={{
                flex: 1, height: 4, cursor: "pointer",
                accentColor: "#7c3aed",
              }}
            />

            <button
              onClick={() => adjustZoom(1.15)}
              style={btnStyle}
              title="Zoom in"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="5"/><path d="M12 12l3 3M5 7h4M7 5v4"/>
              </svg>
            </button>

            <span style={{
              fontSize: 11, fontWeight: 700, color: "#7c3aed",
              background: "rgba(124,58,237,0.08)",
              padding: "3px 8px", borderRadius: 6,
              minWidth: 44, textAlign: "center" as const,
            }}>
              {zoomPct}%
            </span>
          </div>

          {/* Reset */}
          <button
            onClick={resetCrop}
            style={{
              ...btnStyle,
              padding: "6px 12px",
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 600, color: "#4a3870",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 8a6 6 0 1 0 1-3.5"/><path d="M2 4v4h4"/>
            </svg>
            Reset
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "rgba(124,58,237,0.1)", flexShrink: 0 }} />

          {/* Cancel + Confirm */}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              onClick={onCancel}
              style={{
                padding: "9px 18px", borderRadius: 9,
                border: "1.5px solid rgba(124,58,237,0.18)",
                background: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", color: "#4a3870", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!imageReady}
              style={{
                padding: "9px 22px", borderRadius: 9, border: "none",
                background: imageReady
                  ? "linear-gradient(135deg,#7c3aed,#0d9488)"
                  : "#d1d5db",
                fontSize: 12, fontWeight: 700,
                cursor: imageReady ? "pointer" : "not-allowed",
                color: "#fff", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7,
                boxShadow: imageReady ? "0 4px 14px rgba(124,58,237,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 5l-7 7-3-3"/>
              </svg>
              Apply Crop
            </button>
          </div>
        </div>

        {/* Tip bar */}
        <div style={{
          padding: "12px 22px 14px",
          background: "rgba(124,58,237,0.02)",
          borderTop: "1px solid rgba(124,58,237,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#a89dc8" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/>
            </svg>
            <span style={{ fontSize: 10.5, color: "#a89dc8" }}>
              Output: {outputSize.w} × {outputSize.h}px · Drag to reposition · Everything inside the border is saved
            </span>
          </div>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared button style
// ─────────────────────────────────────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  width: 28, height: 28,
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 7,
  border: "1.5px solid rgba(124,58,237,0.15)",
  background: "#fff",
  color: "#4a3870",
  cursor: "pointer",
  flexShrink: 0,
  fontFamily: "inherit",
};

export default CoverPhotoCropper;
