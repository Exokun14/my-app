// ============================================================
// OverviewPage.tsx — live API data + cover photo backend + colour wheel
// ============================================================

'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";
import {
  useOverviewData,
  type Company,
  type Branch,
  type PosDevice,
  type License,
  type UINotif,
  type InfoData,
} from "../../Hooks/usePortalData";
import type { AuthUser } from "../../Services/api.service";
import CoverPhotoCropper from "../../Components/CoverPhotoCropper";
import BranchPOSPanel from "../../Components/BranchPOSPanel";
import { portalUsersAPI } from "../../Services/api.service";

type CPView = "overview" | "tickets" | "users" | "settings";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface MSAExpirationData {
  branch: string;
  msaEnd: string;
  daysLeft: number;
  status: "active" | "expiring" | "overdue";
}

interface BrandingState {
  coverPhotoUrl: string | null;   // persisted URL from backend
  coverPhotoLocal: string | null; // optimistic local preview
  brandColor: string | null;      // persisted hex colour
  derivedColor: string | null;    // auto-extracted from logo
  saving: boolean;
  savingColor: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO COLOUR EXTRACTION
// Draws the logo image on a hidden canvas and picks the dominant pixel colour.
// ─────────────────────────────────────────────────────────────────────────────
async function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const SIZE = 40; // small sample is fast enough
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve("#f97316"); return; }
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

      // Simple bucket: count non-white, non-transparent pixels
      const buckets: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;                          // transparent
        if (r > 220 && g > 220 && b > 220) continue;   // white-ish
        const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
        buckets[key] = (buckets[key] ?? 0) + 1;
      }

      const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
      if (!top) { resolve("#f97316"); return; }
      const [rr, gg, bb] = top[0].split(",").map(Number);
      const hex = "#" + [rr, gg, bb].map(v => v.toString(16).padStart(2, "0")).join("");
      resolve(hex);
    };
    img.onerror = () => resolve("#f97316");
    img.src = imageSrc;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API CALLS  (adjust base URL / auth headers to match your setup)
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function uploadCoverPhoto(companyId: number, file: File): Promise<string> {
  const form = new FormData();
  form.append("cover_photo", file);
  const res = await fetch(`${API_BASE}/api/companies/${companyId}/cover-photo`, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: { "X-XSRF-TOKEN": getCsrfToken() },
  });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.cover_photo_url as string;
}

async function saveBrandColor(companyId: number, color: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/api/companies/${companyId}/brand-color`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": getCsrfToken(),
    },
    credentials: "include",
    body: JSON.stringify({ brand_color: color }),
  });
  if (!res.ok) throw new Error("Color save failed");
}

async function fetchBranding(companyId: number): Promise<{ cover_photo_url: string | null; brand_color: string | null }> {
  const res = await fetch(`${API_BASE}/api/companies/${companyId}/branding`, { credentials: "include" });
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today  = new Date();
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getSoonestMSAFromLicenses(licenses: License[]): string | null {
  const dates = licenses.map(l => l.sa_end).filter(Boolean) as string[];
  if (!dates.length) return null;
  return dates.sort()[0];
}

const NOTIF_ICONS: Record<string, JSX.Element> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8l1.5.9"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg]   = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => {
    setMsg(m); setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2600);
  };
  return { msg, show, toast };
}

function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR WHEEL PICKER MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface ColorPickerModalProps {
  currentColor: string;
  derivedColor: string | null;
  onSave: (color: string | null) => void;  // null = reset to derived
  onClose: () => void;
  saving: boolean;
}

const PRESET_COLORS = [
  "#f97316", "#ea580c", "#dc2626", "#e11d48",
  "#db2777", "#9333ea", "#7c3aed", "#4f46e5",
  "#2563eb", "#0284c7", "#0891b2", "#059669",
  "#16a34a", "#ca8a04", "#b45309", "#78716c",
  "#334155", "#1e293b",
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ currentColor, derivedColor, onSave, onClose, saving }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const [picked, setPicked] = useState(currentColor);

  const effective = picked || derivedColor || "#f97316";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10010, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", fontFamily: "'DM Sans',sans-serif", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#18103a" }}>Brand Colour</div>
            <div style={{ fontSize: 11, color: "#8e7ec0", marginTop: 2 }}>Used in your hero banner gradient</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(124,58,237,0.12)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#8e7ec0" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <div style={{ padding: "18px 22px" }}>

          {/* Live preview strip */}
          <div style={{ height: 52, borderRadius: 12, background: `linear-gradient(135deg, ${effective}, ${effective}bb)`, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.06)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.08)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.04em", position: "relative", zIndex: 1, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>Preview — {effective.toUpperCase()}</span>
          </div>

          {/* Native colour wheel */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ position: "relative" }}>
              <input
                type="color"
                value={picked || (derivedColor ?? "#f97316")}
                onChange={e => setPicked(e.target.value)}
                style={{ width: 52, height: 52, borderRadius: 12, border: "2px solid rgba(124,58,237,0.2)", cursor: "pointer", padding: 2, background: "none" }}
              />
              <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 700, color: "#8e7ec0", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>WHEEL</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8e7ec0", marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" }}>Hex value</div>
              <input
                type="text"
                value={picked}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setPicked(v);
                }}
                placeholder={derivedColor ?? "#f97316"}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.2)", fontSize: 13, fontWeight: 600, color: "#18103a", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Preset swatches */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8e7ec0", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>Quick picks</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setPicked(c)}
                  style={{ width: 28, height: 28, borderRadius: 7, background: c, border: picked === c ? "3px solid #7c3aed" : "2px solid rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform 0.12s, border 0.12s", boxShadow: picked === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Logo-derived chip */}
          {derivedColor && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(124,58,237,0.05)", borderRadius: 10, border: "1px solid rgba(124,58,237,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: derivedColor, flexShrink: 0, border: "1px solid rgba(0,0,0,0.1)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#18103a" }}>Logo colour — {derivedColor.toUpperCase()}</div>
                <div style={{ fontSize: 10, color: "#8e7ec0" }}>Auto-extracted from your logo</div>
              </div>
              <button
                onClick={() => setPicked("")}
                style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: "3px 7px", borderRadius: 6, background: "rgba(124,58,237,0.08)" }}
              >Use this</button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 22px 18px", borderTop: "1px solid rgba(124,58,237,0.08)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#4a3870" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(picked || null)}
            disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", color: "#fff", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {saving && <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
            Save Colour
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS (design preserved exactly from original)
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="i-row"><span className="i-k">{label}</span><span className="i-v">{children}</span></div>
);

const SL: React.FC<{ children: React.ReactNode; mt?: number }> = ({ children, mt = 10 }) => (
  <div className="gx-sec-lbl" style={{ marginTop: mt }}>{children}</div>
);

const STAT_CFG: Record<string, { iconBg: string; iconColor: string; accent: string }> = {
  "si-p":   { iconBg: "linear-gradient(135deg,#ede9fe,#ddd6fe)", iconColor: "#7c3aed", accent: "#7c3aed" },
  "si-t":   { iconBg: "linear-gradient(135deg,#ccfbf1,#99f6e4)", iconColor: "#0d9488", accent: "#0d9488" },
  "si-key": { iconBg: "linear-gradient(135deg,#fef3c7,#fde68a)", iconColor: "#d97706", accent: "#d97706" },
};

const Stat: React.FC<{ ico: string; icon: JSX.Element; value: React.ReactNode; label: string; onClick?: () => void }> = ({ ico, icon, value, label, onClick }) => {
  const [hov, setHov] = React.useState(false);
  const cfg = STAT_CFG[ico] ?? STAT_CFG["si-p"];
  return (
    <div className="gx-stat" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: 1, minWidth: 130, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start", padding: "14px 16px 12px", borderRadius: 14, background: "#fff", border: `1px solid ${hov ? cfg.accent + "44" : "rgba(124,58,237,0.1)"}`, boxShadow: hov ? `0 6px 24px ${cfg.accent}18` : "0 1px 4px rgba(15,10,35,0.04)", transition: "all 0.18s", cursor: onClick ? "pointer" : "default", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${cfg.accent},${cfg.accent}88)`, borderRadius: "14px 14px 0 0", opacity: hov ? 1 : 0.5, transition: "opacity 0.18s" }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: cfg.iconBg, color: cfg.iconColor, marginBottom: 8 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#18103a", lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#8e7ec0", marginTop: 4, letterSpacing: "0.01em" }}>{label}</div>
      </div>
    </div>
  );
};

const MSAStatCard: React.FC<{ onClick: () => void; licenses: License[] }> = ({ onClick, licenses }) => {
  const [hov, setHov] = React.useState(false);
  const soonestDate = getSoonestMSAFromLicenses(licenses);
  const soonestDays = soonestDate ? getDaysUntil(soonestDate) : null;
  const expired    = soonestDays !== null && soonestDays <= 0;
  const urgent     = soonestDays !== null && soonestDays > 0 && soonestDays <= 30;
  const ok         = soonestDays !== null && soonestDays > 30;
  const accent     = expired ? '#dc2626' : urgent ? '#d97706' : '#16a34a';
  const iconBg     = expired ? 'linear-gradient(135deg,#fef2f2,#fecaca)' : urgent ? 'linear-gradient(135deg,#fffbeb,#fde68a)' : 'linear-gradient(135deg,#f0fdf4,#bbf7d0)';
  const badgeText  = expired ? 'EXPIRED' : urgent ? 'EXPIRING SOON' : ok ? `${soonestDays}d left` : '—';
  const showBadge  = expired || urgent || ok;
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} className="gx-stat"
      style={{ padding: "14px 16px 12px", borderRadius: 14, background: hov ? '#faf9ff' : '#fff', border: `1px solid ${hov ? 'rgba(124,58,237,0.3)' : expired ? '#fecaca' : urgent ? '#fde68a' : 'rgba(124,58,237,0.1)'}`, boxShadow: hov ? '0 6px 24px rgba(124,58,237,0.12)' : expired ? '0 1px 8px rgba(220,38,38,0.08)' : urgent ? '0 1px 8px rgba(217,119,6,0.08)' : '0 1px 4px rgba(15,10,35,0.04)', cursor: 'pointer', transition: 'all 0.18s', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: '14px 14px 0 0', opacity: hov ? 1 : 0.6, transition: 'opacity 0.18s' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 6, background: hov ? accent + '18' : 'rgba(124,58,237,0.07)', border: `1px solid ${hov ? accent + '40' : 'rgba(124,58,237,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={hov ? accent : '#8e7ec0'} strokeWidth="1.8" style={{ transition: 'all 0.18s', transform: hov ? 'translateX(1px)' : 'translateX(0)' }}><path d="M2 1.5l3 2.5-3 2.5"/></svg>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: accent, marginBottom: 10 }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></svg>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#18103a' }}>MSA Expiry</span>
          {showBadge && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: accent, background: accent + '15', border: `1px solid ${accent}35`, borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' as const }}>{badgeText}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>Click to view details</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#8e7ec0" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
        </div>
      </div>
    </div>
  );
};

// MSA Expiration Modal
const MSAExpirationModal: React.FC<{ licenses: License[]; onClose: () => void }> = ({ licenses, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c1)" }}>MSA Expiration Details</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c2)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {licenses.length === 0 && <div style={{ textAlign: "center", color: "#8e7ec0", padding: 24 }}>No license data available.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {licenses.map((lic, idx) => {
              const daysLeft = lic.sa_end ? getDaysUntil(lic.sa_end) : 9999;
              const status: MSAExpirationData["status"] = daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "expiring" : "active";
              const statusColors = {
                active:   { bg: "#f0fdf9", border: "#16a34a", text: "#16a34a", badge: "ACTIVE",   badgeBg: "#dcfce7", badgeColor: "#16a34a" },
                expiring: { bg: "#fffbeb", border: "#d97706", text: "#d97706", badge: "DUE SOON", badgeBg: "#fef3c7", badgeColor: "#d97706" },
                overdue:  { bg: "#fff1f2", border: "#e11d48", text: "#e11d48", badge: "EXPIRED",  badgeBg: "#ffe4e6", badgeColor: "#e11d48" },
              };
              const colors = statusColors[status];
              const daysLabel = daysLeft < 0 ? "Expired" : `${daysLeft} days`;
              const endDate = lic.sa_end ? new Date(lic.sa_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
              return (
                <div key={idx} style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${colors.border}30`, background: colors.bg, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={colors.border} strokeWidth="1.8"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c1)" }}>{lic.license_key}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: colors.badgeBg, color: colors.badgeColor, letterSpacing: "0.4px" }}>{colors.badge}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div><div style={{ fontSize: 10, color: "var(--c3)", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 600 }}>SA End Date</div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--c1)" }}>{endDate}</div></div>
                    <div><div style={{ fontSize: 10, color: "var(--c3)", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 600 }}>Days Remaining</div><div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{daysLabel}</div></div>
                    <div><div style={{ fontSize: 10, color: "var(--c3)", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 600 }}>Version</div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--c1)" }}>{lic.krunch_version ?? "—"}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// POS Grid
const PosGrid: React.FC<{ posDevices: PosDevice[]; branches: Branch[]; licenses: License[]; onSelect: (pos: PosDevice) => void; filterBranch: string[] }> = ({ posDevices, branches, licenses, onSelect, filterBranch }) => {
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]));
  const licenseKey = licenses[0]?.license_key ?? "";
  const filtered = filterBranch.length > 0 ? posDevices.filter(p => { const bName = branchMap[p.branch_id ?? -1]?.name ?? ""; return filterBranch.some(fb => bName.includes(fb)); }) : posDevices;
  const byBranch = filtered.reduce<Record<string, PosDevice[]>>((acc, pos) => { const bName = branchMap[pos.branch_id ?? -1]?.name ?? "Unassigned"; if (!acc[bName]) acc[bName] = []; acc[bName].push(pos); return acc; }, {});
  const statusColor: Record<string, string> = { active: "#16a34a", offline: "#dc2626", maintenance: "#d97706" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Object.entries(byBranch).sort(([a], [b]) => a.localeCompare(b)).map(([branch, devices]) => (
        <div key={branch}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#18103a" }}>{branch}</span>
            {licenseKey && <span style={{ fontSize: 10.5, fontWeight: 700, background: "rgba(217,119,6,0.12)", color: "#92400e", padding: "2px 9px", borderRadius: 5, border: "1px solid rgba(217,119,6,0.25)", letterSpacing: "0.02em" }}>{licenseKey}</span>}
            <span style={{ fontSize: 11, color: "#8e7ec0", fontWeight: 600 }}>{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {devices.map(pos => {
              const dotColor = statusColor[pos.status ?? "offline"] ?? "#8e7ec0";
              return (
                <div key={pos.id} onClick={() => onSelect(pos)}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f9f8ff"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.22)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(124,58,237,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}
                  style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer", transition: "all 0.14s", minWidth: 160, flex: "1 1 160px", maxWidth: 220, position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f2f0fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#18103a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pos.model ?? "Unknown"}</div>
                    <div style={{ fontSize: 10, color: "#8e7ec0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{pos.ip_address ?? "—"}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, color: (() => { const u = pos.under_warranty ?? (pos.warranty_end ? new Date(pos.warranty_end) > new Date() : null); return u === true ? "#16a34a" : u === false ? "#dc2626" : "#94a3b8"; })() }}>{(() => { const u = pos.under_warranty ?? (pos.warranty_end ? new Date(pos.warranty_end) > new Date() : null); return u === true ? "Under Warranty" : u === false ? "Out of Warranty" : ""; })()}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#c4bfe0" strokeWidth="1.6" style={{ flexShrink: 0 }}><path d="M4 2l4 4-4 4"/></svg>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {Object.keys(byBranch).length === 0 && <div style={{ textAlign: "center", padding: "32px", color: "#8e7ec0", fontSize: 12, background: "#f2f0fb", borderRadius: 12, border: "1.5px dashed rgba(124,58,237,0.22)" }}>No POS devices found.</div>}
    </div>
  );
};

// Filter Popover
const FilterPopover: React.FC<{ branchNames: string[]; selected: string[]; onChange: (s: string[]) => void; onClose: () => void; posDevices: PosDevice[]; branches: Branch[] }> = ({ branchNames, selected, onChange, onClose, posDevices, branches }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const toggle = (b: string) => selected.includes(b) ? onChange(selected.filter(x => x !== b)) : onChange([...selected, b]);
  return (
    <div ref={ref} style={{ position: "absolute", top: 42, right: 0, background: "#fff", border: "1px solid var(--bdr)", borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 10, minWidth: 160 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Filter by Branch</div>
      {branchNames.map(b => (
        <label key={b} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <input type="checkbox" checked={selected.includes(b)} onChange={() => toggle(b)} style={{ width: 14, height: 14, cursor: "pointer" }} />
          <span style={{ flex: 1, color: "var(--c2)" }}>{b}</span>
          <span style={{ fontSize: 10, color: "var(--c3)" }}>({posDevices.filter(p => (branchMap[p.branch_id ?? -1] ?? "") === b).length})</span>
        </label>
      ))}
      {selected.length > 0 && <button onClick={() => onChange([])} style={{ marginTop: 8, width: "100%", padding: "6px", borderRadius: 6, border: "1px solid var(--bdr)", background: "#fff", fontSize: 11, fontWeight: 600, color: "var(--p)", cursor: "pointer" }}>Clear All</button>}
    </div>
  );
};

// POS Modal
const POSModal: React.FC<{ pos: PosDevice; onClose: () => void }> = ({ pos, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const statusColor: Record<string, string> = { active: "#16a34a", offline: "#dc2626", maintenance: "#d97706" };
  const sc = statusColor[pos.status ?? "offline"] ?? "#8e7ec0";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c1)" }}>{pos.model ?? "POS Device"} Details</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c2)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { label: "Model", val: pos.model ?? "—" }, { label: "Serial", val: pos.serial ?? "—" },
            { label: "IP Address", val: pos.ip_address ?? "—" }, { label: "OS", val: pos.os ?? "—" },
            { label: "MSA Start", val: pos.msa_start ?? "—" }, { label: "MSA End", val: pos.msa_end ?? "—" },
            { label: "Warranty End", val: pos.warranty_end ?? "—" },
            { label: "Warranty Status", val: (() => { const u = pos.under_warranty ?? (pos.warranty_end ? new Date(pos.warranty_end) > new Date() : null); return u === true ? "Under Warranty" : u === false ? "Out of Warranty" : "Not assessed"; })() },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(124,58,237,0.06)" }}>
              <span style={{ fontSize: 11, color: "#8e7ec0", fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 12, color: "#18103a", fontWeight: 600 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}>
            <span style={{ fontSize: 11, color: "#8e7ec0", fontWeight: 500 }}>Status</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: sc, textTransform: "capitalize" }}>{pos.status ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Branch Modal helpers
function BranchStatCard({ value, label, color, bg, border }: { value: number | string; label: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${border}`, textAlign: "center" as const }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function BranchMSACard({ saEnd }: { saEnd?: string | null }) {
  const days: number | null = saEnd ? getDaysUntil(saEnd) : null;
  const status = (() => {
    if (days === null) return { label: "UNKNOWN", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    if (days <= 0)     return { label: "EXPIRED", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    if (days <= 30)    return { label: "EXPIRING SOON", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    if (days <= 90)    return { label: "DUE SOON", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" };
    return { label: "ACTIVE", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  })();
  const displayDate = saEnd ? new Date(saEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const daysText    = days === null ? null : days <= 0 ? "Expired" : `${days}d left`;
  return (
    <div style={{ background: status.bg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${status.border}`, textAlign: "center" as const, position: "relative" as const, overflow: "hidden" }}>
      <span style={{ position: "absolute" as const, top: 8, right: 8, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.06em", color: status.color, background: status.color + "18", border: `1px solid ${status.color}40`, borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap" as const }}>{status.label}</span>
      <div style={{ fontSize: 14, fontWeight: 800, color: status.color, lineHeight: 1.3, marginTop: 6 }}>{displayDate}</div>
      {daysText && <div style={{ fontSize: 10, fontWeight: 700, color: status.color, opacity: 0.8, marginTop: 2 }}>{daysText}</div>}
      <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>MSA Expiry</div>
    </div>
  );
}

const BranchModal: React.FC<{ branch: Branch; posDevices: PosDevice[]; licenses: License[]; onClose: () => void; onSelectPOS: (pos: PosDevice) => void }> = ({ branch, posDevices, licenses, onClose, onSelectPOS }) => {
  const ref       = useClickOutside<HTMLDivElement>(onClose);
  const branchPOS = posDevices.filter(p => p.branch_id === branch.id);
  const license   = licenses[0];
  const saEnd     = license?.sa_end ?? null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,7,36,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002, padding: 20 }}>
      <div ref={ref} style={{ width: 600, maxWidth: "96vw", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden", fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "linear-gradient(135deg,#d97706,#f59e0b)", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="9" cy="7" r="1.8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{branch.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{branch.site ?? ""}</div>
          </div>
          {branch.license_tag && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "5px 10px", flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>{branch.license_tag}</span>
            </div>
          )}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <BranchStatCard value={branchPOS.length} label="POS Devices" color="#7c3aed" bg="rgba(124,58,237,0.06)" border="rgba(124,58,237,0.15)" />
            <BranchStatCard value={branchPOS.filter(p => p.status === "active").length} label="Online" color="#16a34a" bg="rgba(22,163,74,0.06)" border="rgba(22,163,74,0.15)" />
            <BranchMSACard saEnd={saEnd} />
          </div>
          {branchPOS.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4a3870", letterSpacing: "0.04em", marginBottom: 4 }}>POS Devices in this branch</div>
              {branchPOS.map(pos => (
                <div key={pos.id} onClick={() => onSelectPOS(pos)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", transition: "all 0.14s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f2f0fb"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#18103a" }}>{pos.model ?? "Unknown"}</div>
                    <div style={{ fontSize: 10.5, color: "#8e7ec0" }}>{pos.serial ?? pos.ip_address ?? "—"}</div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#c4bfe0" strokeWidth="1.6"><path d="M4 2l4 4-4 4"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Edit Info Modal
const EditInfoModal: React.FC<{ data: InfoData; onSave: (d: InfoData) => void; onClose: () => void }> = ({ data, onSave, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const [form, setForm] = useState<InfoData>(data);
  const set = (k: keyof InfoData, v: string) => setForm(f => ({ ...f, [k]: v }));
  const fields: Array<{ label: string; key: keyof InfoData }> = [
    { label: "Store Name", key: "storeName" }, { label: "Contact Person", key: "contactPerson" },
    { label: "Email", key: "email" }, { label: "Phone", key: "phone" },
    { label: "Alt Contact Person", key: "altContactPerson" }, { label: "Alt Email", key: "altEmail" },
    { label: "Alt Phone", key: "altPhone" }, { label: "Keys No. per Store", key: "keyNo" },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c1)" }}>Edit Information</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c2)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--c3)", display: "block", marginBottom: 5 }}>{label}</label>
              <input value={(form[key] as string) ?? ""} onChange={e => set(key, e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--bdr)", fontSize: 13, color: "var(--c1)", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--bdr)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--bdr)", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--c2)" }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--p)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff" }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

// Notification Panel
const NotifPanel: React.FC<{ notifs: UINotif[]; onRead: (id: number) => void; onMarkAll: () => void; onClose: () => void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  return (
    <div ref={ref} style={{ position: "fixed", top: 70, right: 20, width: 380, maxHeight: "calc(100vh - 100px)", background: "#fff", borderRadius: 12, border: "1px solid var(--bdr)", boxShadow: "0 12px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", zIndex: 9999 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c1)" }}>Notifications</span>
        <button onClick={onMarkAll} style={{ fontSize: 11, fontWeight: 600, color: "var(--p)", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#8e7ec0", fontSize: 12 }}>No notifications</div>}
        {notifs.map(n => (
          <div key={n.id} onClick={() => onRead(n.id)} style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: n.read ? "#fff" : "#f9fafb", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={e => (e.currentTarget.style.background = n.read ? "#fff" : "#f9fafb")}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `var(--${n.type})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                {NOTIF_ICONS[n.type] ?? NOTIF_ICONS.info}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c1)", marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: "var(--c2)", lineHeight: 1.5 }}>{n.desc}</div>
                <div style={{ fontSize: 10, color: "var(--c3)", marginTop: 6 }}>{n.time}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--p)", flexShrink: 0, marginTop: 8 }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface OverviewPageProps {
  onNavigate: (view: CPView) => void;
  onLogout:   () => void;
  user?:      AuthUser | null;
}

const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, onLogout, user }) => {
  const companyId = user?.company_id ?? null;

  const {
    company, branches, posDevices, licenses,
    uiNotifs, info, setInfo,
    loading, markRead, markAllRead,
  } = useOverviewData(companyId);

  const [selectedPOS,    setSelectedPOS]    = useState<PosDevice | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [editOpen,       setEditOpen]       = useState(false);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [filterBranch,   setFilterBranch]   = useState<string[]>([]);
  const [msaModalOpen,   setMsaModalOpen]   = useState(false);
  const [bgHov,          setBgHov]          = useState(false);
  const [brandPanelHov,  setBrandPanelHov]  = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [posSearch,      setPosSearch]      = useState("");
  const [userCount,      setUserCount]      = useState<number | null>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // ── Branding state ─────────────────────────────────────────────────────────
  const [branding, setBranding] = useState<BrandingState>({
    coverPhotoUrl:   null,
    coverPhotoLocal: null,
    brandColor:      null,
    derivedColor:    null,
    saving:          false,
    savingColor:     false,
  });

  const { msg, show, toast } = useToast();

  const unread       = uiNotifs.filter(n => !n.read).length;
  const companyName  = company?.name ?? user?.company_name ?? "Loading…";
  const storeName    = info.storeName || companyName;
  const userInitials = (user?.name ?? "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const branchNames  = branches.map(b => b.name);

  // Effective values used in the hero
  const heroBg = branding.coverPhotoLocal ?? branding.coverPhotoUrl ?? "/Popeyes-bg.jpg";
  const heroColor = branding.brandColor ?? branding.derivedColor ?? "#f97316";
  const heroColorDark = heroColor + "dd";

  // ── Load saved branding on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    fetchBranding(companyId).then(data => {
      setBranding(prev => ({
        ...prev,
        coverPhotoUrl: data.cover_photo_url,
        brandColor:    data.brand_color,
      }));
    }).catch(() => {/* silently ignore – defaults are fine */});
  }, [companyId]);

  // ── Fetch user count for this company ──────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    portalUsersAPI.getAll({ company_id: companyId }).then(res => {
      if (res.success && res.data) setUserCount(res.data.length);
    });
  }, [companyId]);

  // ── Auto-extract dominant colour from the logo ─────────────────────────────
  useEffect(() => {
    extractDominantColor("/Popeyes.png").then(color => {
      setBranding(prev => ({ ...prev, derivedColor: color }));
    });
  }, []);

  // ── Cover photo upload handler ─────────────────────────────────────────────
  const handleCoverPhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    // Open the crop modal — actual upload happens after crop is confirmed
    setCropFile(file);
    // Reset the file input so the same file can be re-selected later
    e.target.value = "";
  }, [companyId]);

  // ── Called by CoverPhotoCropper once the user confirms their crop ──────────
  const handleCropConfirm = useCallback(async (croppedFile: File) => {
    if (!companyId) return;
    setCropFile(null);

    // Optimistic preview
    const localUrl = URL.createObjectURL(croppedFile);
    setBranding(prev => ({ ...prev, coverPhotoLocal: localUrl, saving: true }));

    try {
      const remoteUrl = await uploadCoverPhoto(companyId, croppedFile);
      setBranding(prev => ({
        ...prev,
        coverPhotoUrl:   remoteUrl,
        coverPhotoLocal: null,
        saving:          false,
      }));
      toast("Cover photo updated!");
    } catch {
      setBranding(prev => ({ ...prev, coverPhotoLocal: null, saving: false }));
      toast("Upload failed. Please try again.");
    }
  }, [companyId]);

  // ── Brand colour save handler ──────────────────────────────────────────────
  const handleSaveColor = useCallback(async (color: string | null) => {
    if (!companyId) return;
    setBranding(prev => ({ ...prev, savingColor: true }));
    try {
      await saveBrandColor(companyId, color);
      setBranding(prev => ({ ...prev, brandColor: color, savingColor: false }));
      setColorPickerOpen(false);
      toast(color ? "Brand colour saved!" : "Brand colour reset to logo default.");
    } catch {
      setBranding(prev => ({ ...prev, savingColor: false }));
      toast("Failed to save colour. Please try again.");
    }
  }, [companyId]);

  // Apply pos search filter
  const filteredPOS = posDevices.filter(p => {
    const matchSearch = posSearch
      ? (p.model ?? "").toLowerCase().includes(posSearch.toLowerCase()) ||
        (p.serial ?? "").toLowerCase().includes(posSearch.toLowerCase()) ||
        (p.ip_address ?? "").toLowerCase().includes(posSearch.toLowerCase())
      : true;
    const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
    const matchFilter = filterBranch.length > 0
      ? filterBranch.some(fb => (branchMap[p.branch_id ?? -1] ?? "").includes(fb))
      : true;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Spin keyframe injected once */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Sidebar activePage="overview" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header
          user={{ initials: userInitials, name: user?.name ?? "User", role: user?.role ?? "user" }}
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "14px 20px 14px", overflow: "hidden", minHeight: 0 }}>

              {/* ── Hero banner ──────────────────────────────────────────── */}
              <div className="gx-hero" style={{ padding: 0, flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "stretch" }}>

                {/* Left: brand panel */}
                <div
                  onMouseEnter={() => setBrandPanelHov(true)}
                  onMouseLeave={() => setBrandPanelHov(false)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px 18px 20px", background: `linear-gradient(135deg, ${heroColor}, ${heroColorDark})`, flexShrink: 0, zIndex: 2, position: "relative", transition: "background 0.4s ease" }}>
                  {/* Logo */}
                  <div style={{ width: 72, height: 72, background: "#fff", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img src="/Popeyes.png" alt="Popeyes" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="gx-hero-title">{companyName}</div>
                    <div className="gx-hero-sub">Aloha</div>
                    <div className="gx-hero-badges" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <div className="gx-status-pill"><div className="sdot" />{company?.active ? "Active Account" : "Account"}</div>

                      {/* Colour wheel button — only visible on hover */}
                      <button
                        onClick={() => setColorPickerOpen(true)}
                        title="Change brand colour"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)", transition: "opacity 0.2s ease, transform 0.2s ease, background 0.15s", opacity: brandPanelHov ? 1 : 0, transform: brandPanelHov ? "translateY(0)" : "translateY(4px)", pointerEvents: brandPanelHov ? "auto" : "none" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
                      >
                        {/* Colour wheel SVG icon */}
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1"/>
                          <path d="M10 1.5 A8.5 8.5 0 0 1 18.5 10" stroke="#ff6b6b" strokeWidth="3" fill="none" strokeLinecap="round"/>
                          <path d="M18.5 10 A8.5 8.5 0 0 1 10 18.5" stroke="#ffd93d" strokeWidth="3" fill="none" strokeLinecap="round"/>
                          <path d="M10 18.5 A8.5 8.5 0 0 1 1.5 10" stroke="#6bcb77" strokeWidth="3" fill="none" strokeLinecap="round"/>
                          <path d="M1.5 10 A8.5 8.5 0 0 1 10 1.5" stroke="#4d96ff" strokeWidth="3" fill="none" strokeLinecap="round"/>
                          <circle cx="10" cy="10" r="3" fill="white" opacity="0.9"/>
                        </svg>
                        Colour
                        {/* Swatch of current colour */}
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: heroColor, border: "1.5px solid rgba(255,255,255,0.7)", display: "inline-block" }} />
                      </button>
                    </div>
                  </div>

                  {/* Feather fade from panel to cover — wider, multi-stop */}
                  <div style={{ position: "absolute", top: 0, right: -80, width: 80, height: "100%", background: `linear-gradient(to right, ${heroColorDark}, transparent)`, zIndex: 3, transition: "background 0.4s ease" }} />
                </div>

                {/* Right: cover photo */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "pointer" }}
                  onMouseEnter={() => setBgHov(true)} onMouseLeave={() => setBgHov(false)}
                  onClick={() => bgInput.current?.click()}
                >
                  <img src={heroBg} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", zIndex: 0, transition: "filter 0.2s", filter: bgHov ? "brightness(0.6)" : "none" }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1 }} />
                  {/* Colour bleed from brand panel — fades hero colour into the photo */}
                  <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: "100%", background: `linear-gradient(to right, ${heroColorDark}ee 0%, ${heroColor}55 35%, transparent 100%)`, zIndex: 2, transition: "background 0.4s ease", pointerEvents: "none" }} />

                  {/* Hover overlay */}
                  <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: bgHov ? 1 : 0, transition: "opacity 0.2s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                      {branding.saving
                        ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Uploading…</>
                        : <><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="14" height="11" rx="2"/><circle cx="8" cy="8.5" r="2.5"/><path d="M5.5 3l1-2h3l1 2"/></svg> Change Cover Photo</>
                      }
                    </div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={bgInput}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleCoverPhotoChange}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="g4" style={{ flexShrink: 0, gap: 14 }}>
                <Stat ico="si-t"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>}
                  value={loading ? "…" : posDevices.length}
                  label="Total POS"
                />
                <Stat ico="si-p"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>}
                  value={loading || userCount === null ? "…" : userCount}
                  label="Users"
                />
                <MSAStatCard onClick={() => setMsaModalOpen(true)} licenses={licenses} />
              </div>

              {/* Two columns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0, alignItems: "stretch" }}>

                {/* General Info */}
                <div className="gx-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(124,58,237,0.1)", flexShrink: 0, margin: "-1px -1px 0" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#18103a" }}>General Information</span>
                    <button onClick={() => setEditOpen(true)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: "#4a3870", background: "#f2f0fb", border: "1px solid rgba(124,58,237,0.1)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#fff"; el.style.borderColor = "rgba(124,58,237,0.22)"; el.style.color = "#18103a"; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.background = "#f2f0fb"; el.style.borderColor = "rgba(124,58,237,0.1)"; el.style.color = "#4a3870"; }}
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>
                      Edit Info
                    </button>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0, scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.15) transparent" } as React.CSSProperties}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4 }}>PRIMARY CONTACT</div>
                    {[
                      { label: "Store Name",      val: info.storeName || "—" },
                      { label: "Contact Person",  val: info.contactPerson || "—" },
                      { label: "Email",           val: info.email || "—" },
                      { label: "Phone",           val: info.phone || "—" },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>{item.label}</span>
                        <span style={{ fontSize: 11.5, color: "#18103a", fontWeight: 600, textAlign: "right" as const, wordBreak: "break-all" as const }}>{item.val}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>ALTERNATE CONTACT</div>
                    {[
                      { label: "Contact Person",  val: info.altContactPerson || "—" },
                      { label: "Email",           val: info.altEmail || "—" },
                      { label: "Phone",           val: info.altPhone || "—" },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>{item.label}</span>
                        <span style={{ fontSize: 11.5, color: "#18103a", fontWeight: 600, textAlign: "right" as const, wordBreak: "break-all" as const }}>{item.val}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>ACCOUNT</div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                      <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>Acct Manager</span>
                      <span style={{ fontSize: 11.5, color: "#7c3aed", fontWeight: 600 }}>{company?.account_manager ?? "—"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                      <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>Role</span>
                      <span style={{ fontSize: 11.5, color: "#18103a", fontWeight: 600, textTransform: "capitalize" }}>{user?.role ?? "—"}</span>
                    </div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>KEYS</div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                      <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>Keys No. per Store</span>
                      <span style={{ fontSize: 11.5, color: "#d97706", fontWeight: 700 }}>{info.keyNo || "—"}</span>
                    </div>

                  </div>
                </div>

                {/* Branches + POS — new panel */}
                <BranchPOSPanel
                  branches={branches}
                  posDevices={posDevices}
                  licenses={licenses}
                  loading={loading}
                  user={user ?? null}
                  brandColor={branding.brandColor ?? branding.derivedColor}
                  onSelectPOS={p => setSelectedPOS(p)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`gx-toast ${show ? "show" : ""}`}><div className="gx-toast-dot" /><span>{msg}</span></div>

        {selectedPOS    && <POSModal pos={selectedPOS} onClose={() => setSelectedPOS(null)} />}
        {editOpen       && <EditInfoModal data={info} onSave={d => { setInfo(d); toast("Information updated successfully!"); }} onClose={() => setEditOpen(false)} />}
        {notifOpen      && <NotifPanel notifs={uiNotifs} onRead={markRead} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
        {msaModalOpen   && <MSAExpirationModal licenses={licenses} onClose={() => setMsaModalOpen(false)} />}
        {colorPickerOpen && (
          <ColorPickerModal
            currentColor={branding.brandColor ?? branding.derivedColor ?? "#f97316"}
            derivedColor={branding.derivedColor}
            onSave={handleSaveColor}
            onClose={() => setColorPickerOpen(false)}
            saving={branding.savingColor}
          />
        )}
        {cropFile && (
          <CoverPhotoCropper
            file={cropFile}
            aspectRatio={1600 / 162}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropFile(null)}
          />
        )}
      </div>
    </div>
  );
};

export default OverviewPage;
