'use client'

// ============================================================
// IconCropper.tsx
// Canvas-based crop modal for course icons.
// Fixed 1:1 aspect ratio. Pan + zoom. Circular preview.
// Outputs a cropped File ready for upload.
//
// Usage:
//   <IconCropper
//     file={rawFile}
//     onConfirm={(croppedFile) => handleUpload(croppedFile)}
//     onCancel={() => setCropperOpen(false)}
//   />
// ============================================================

import React, {
  useCallback, useEffect, useRef, useState, useLayoutEffect,
} from "react";

interface IconCropperProps {
  file:          File;
  outputSize?:   number;   // output px (default 512)
  outputMime?:   string;
  outputQuality?: number;
  onConfirm: (cropped: File) => void;
  onCancel:  () => void;
}

interface Transform { x: number; y: number; scale: number; }

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src; });
}

const IconCropper: React.FC<IconCropperProps> = ({
  file, outputSize = 512, outputMime = "image/png", outputQuality = 0.95,
  onConfirm, onCancel,
}) => {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const imgRef         = useRef<HTMLImageElement | null>(null);
  const transformRef   = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const isDragging     = useRef(false);
  const lastPointer    = useRef({ x: 0, y: 0 });
  const lastPinchDist  = useRef<number | null>(null);
  const animFrame      = useRef<number>(0);

  const [canvasW,    setCanvasW]    = useState(400);
  const [imageReady, setImageReady] = useState(false);
  const [zoom,       setZoom]       = useState(1);
  const [showCircle, setShowCircle] = useState(true);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    loadImage(url).then(img => { imgRef.current = img; URL.revokeObjectURL(url); setImageReady(true); });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (imageReady) fitImage(); }, [imageReady, canvasW]);

  function fitImage() {
    const img = imgRef.current;
    if (!img) return;
    const scale = Math.max(canvasW / img.naturalWidth, canvasW / img.naturalHeight);
    const x = (canvasW - img.naturalWidth  * scale) / 2;
    const y = (canvasW - img.naturalHeight * scale) / 2;
    transformRef.current = { x, y, scale };
    setZoom(scale);
    render();
  }

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = canvasW;

    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, S, S);

    const { x, y, scale } = transformRef.current;
    ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);

    // Darken outside circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, S, S);
    ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(10,6,30,0.55)";
    ctx.fill();
    ctx.restore();

    // Circle outline
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rule-of-thirds (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo((S / 3) * i, 0); ctx.lineTo((S / 3) * i, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (S / 3) * i); ctx.lineTo(S, (S / 3) * i); ctx.stroke();
    }
  }, [canvasW]);

  useEffect(() => { render(); }, [canvasW, render]);

  function clampT(t: Transform): Transform {
    const img = imgRef.current;
    if (!img) return t;
    const iw = img.naturalWidth  * t.scale;
    const ih = img.naturalHeight * t.scale;
    return {
      scale: t.scale,
      x: clamp(t.x, Math.min(canvasW - iw, 0), Math.max(0, canvasW - iw)),
      y: clamp(t.y, Math.min(canvasW - ih, 0), Math.max(0, canvasW - ih)),
    };
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true; lastPointer.current = { x: e.clientX, y: e.clientY }; e.preventDefault();
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    const t = transformRef.current;
    transformRef.current = clampT({ ...t, x: t.x + dx, y: t.y + dy });
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(render);
  }, [render]);
  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const t = transformRef.current;
    const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / t.scale;
    transformRef.current = clampT({ scale: newScale, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio });
    setZoom(newScale);
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(render);
  }, [render]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) { isDragging.current = true; lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    if (e.touches.length === 2) { isDragging.current = false; lastPinchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
    e.preventDefault();
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastPointer.current.x;
      const dy = e.touches[0].clientY - lastPointer.current.y;
      lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const t = transformRef.current;
      transformRef.current = clampT({ ...t, x: t.x + dx, y: t.y + dy });
    }
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const factor = dist / lastPinchDist.current; lastPinchDist.current = dist;
      const t = transformRef.current;
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = mx - rect.left; const py = my - rect.top;
      const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = newScale / t.scale;
      transformRef.current = clampT({ scale: newScale, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio });
      setZoom(newScale);
    }
    cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(render);
    e.preventDefault();
  }, [render]);
  const onTouchEnd = useCallback(() => { isDragging.current = false; lastPinchDist.current = null; }, []);

  function adjustZoom(factor: number) {
    const t = transformRef.current; const S = canvasW;
    const newScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / t.scale;
    transformRef.current = clampT({ scale: newScale, x: S/2 - (S/2 - t.x) * ratio, y: S/2 - (S/2 - t.y) * ratio });
    setZoom(newScale); render();
  }

  async function handleConfirm() {
    const img = imgRef.current; if (!img) return;
    const { x, y, scale } = transformRef.current;
    const S = canvasW;
    const srcX = -x / scale; const srcY = -y / scale;
    const srcW =  S / scale; const srcH =  S / scale;
    const out = document.createElement("canvas");
    out.width = out.height = outputSize;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);
    out.toBlob(blob => {
      if (!blob) return;
      onConfirm(new File([blob], `icon.${outputMime === "image/png" ? "png" : "jpg"}`, { type: outputMime }));
    }, outputMime, outputQuality);
  }

  const fitZoomPct = imgRef.current
    ? Math.max(canvasW / imgRef.current.naturalWidth, canvasW / imgRef.current.naturalHeight)
    : 1;
  const zoomPct = Math.round((zoom / fitZoomPct) * 100);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,6,30,0.85)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10020, padding:16, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:520, boxShadow:"0 32px 80px rgba(0,0,0,0.45)", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px 14px", background:"linear-gradient(135deg,rgba(124,58,237,0.05),rgba(13,148,136,0.04))", borderBottom:"1px solid rgba(124,58,237,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(124,58,237,0.3)", fontSize:18 }}>🎨</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#18103a", letterSpacing:"-.01em" }}>Crop Course Icon</div>
              <div style={{ fontSize:11, color:"#8e7ec0", marginTop:2 }}>Drag · Scroll to zoom · Circle shows final result</div>
            </div>
          </div>
          <button onClick={onCancel} style={{ width:32, height:32, borderRadius:9, border:"1.5px solid rgba(124,58,237,0.15)", background:"#f5f3ff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#8e7ec0" }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        {/* Canvas */}
        <div ref={containerRef} style={{ width:"100%", position:"relative", userSelect:"none", cursor:isDragging.current ? "grabbing" : "grab", background:"#0f0a23", flexShrink:0 }}>
          <canvas ref={canvasRef} width={canvasW} height={canvasW}
            style={{ display:"block", width:"100%", height:"auto", touchAction:"none" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />
          {!imageReady && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#0f0a23", color:"rgba(255,255,255,0.5)", fontSize:13, gap:10 }}>
              <span style={{ width:20, height:20, border:"2px solid rgba(255,255,255,0.2)", borderTop:"2px solid #7c3aed", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
              Loading…
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(124,58,237,0.08)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", background:"#faf9ff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:180 }}>
            <button onClick={() => adjustZoom(0.85)} style={btnSm} title="Zoom out">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5"/><path d="M12 12l3 3M5 7h4"/></svg>
            </button>
            <input type="range" min={Math.round(MIN_SCALE*100)} max={Math.round(MAX_SCALE*100)} value={Math.round(zoom*100)}
              onChange={e => {
                const ns = Number(e.target.value)/100; const t = transformRef.current; const S = canvasW;
                const ratio = ns / t.scale;
                transformRef.current = clampT({ scale: ns, x: S/2-(S/2-t.x)*ratio, y: S/2-(S/2-t.y)*ratio });
                setZoom(ns); render();
              }}
              style={{ flex:1, height:4, cursor:"pointer", accentColor:"#7c3aed" }}
            />
            <button onClick={() => adjustZoom(1.15)} style={btnSm} title="Zoom in">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5"/><path d="M12 12l3 3M5 7h4M7 5v4"/></svg>
            </button>
            <span style={{ fontSize:11, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.08)", padding:"3px 8px", borderRadius:6, minWidth:40, textAlign:"center" }}>{zoomPct}%</span>
          </div>
          <button onClick={() => fitImage()} style={{ ...btnSm, padding:"6px 12px", gap:5, fontSize:11, fontWeight:600, color:"#4a3870" }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 8a6 6 0 1 0 1-3.5"/><path d="M2 4v4h4"/></svg>
            Reset
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px 16px", borderTop:"1px solid rgba(124,58,237,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div style={{ fontSize:10.5, color:"#a89dc8", display:"flex", alignItems:"center", gap:5 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#a89dc8" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>
            Output: {outputSize}×{outputSize}px PNG
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onCancel} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid rgba(124,58,237,0.18)", background:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", color:"#4a3870", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={!imageReady} style={{ padding:"9px 22px", borderRadius:9, border:"none", background:imageReady?"linear-gradient(135deg,#7c3aed,#0d9488)":"#d1d5db", fontSize:12, fontWeight:700, cursor:imageReady?"pointer":"not-allowed", color:"#fff", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7, boxShadow:imageReady?"0 4px 14px rgba(124,58,237,0.3)":"none", transition:"all 0.15s" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5l-7 7-3-3"/></svg>
              Use This Icon
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

const btnSm: React.CSSProperties = {
  width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
  borderRadius:7, border:"1.5px solid rgba(124,58,237,0.15)", background:"#fff",
  color:"#4a3870", cursor:"pointer", flexShrink:0, fontFamily:"inherit",
};

export default IconCropper;
