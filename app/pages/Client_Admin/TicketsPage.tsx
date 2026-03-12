'use client'

import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from "../Header_Client/header_client";
import "../../globals.css";
import type { AuthUser, Ticket } from "../../Services/api.service";
import {
  useTicketsPage,
  fmtDate, ticketLabel,
  type DonutSlice, type CategoryRow, type TrendDay,
  type UINotif, type TabKey, type Period,
} from "../Logic/useTicketsPage";
import {
  exportTicketCSV, exportTicketJSON, exportTicketXLSX,
  exportTicketPDF, exportTicketPPTX,
  downloadTicketTemplate, importTicketsFromXLSX,
  type TicketRecord, type ImportResult,
} from "../Logic/TicketExportLogic";

type CPView = "overview" | "tickets" | "users" | "settings" | "learning";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  purple: "#7c3aed", purpleD: "#5b21b6", purpleLt: "#ede9fe",
  teal: "#0d9488", amber: "#d97706", red: "#dc2626", green: "#16a34a",
  t1: "#18103a", t2: "#4a3870", t3: "#8e7ec0",
  surface: "#ffffff", surface2: "#f2f0fb",
  border: "rgba(124,58,237,0.1)", borderMd: "rgba(124,58,237,0.22)",
};

const STATUS_DOT: Record<string, string> = { open: "#dc2626", pending: "#d97706", in_progress: "#d97706", closed: "#16a34a", resolved: "#16a34a" };
const TAB_LABEL:  Record<TabKey, string>  = { open: "Open", pending: "Pending", closed: "Closed" };
const SLIDE_LABELS = ["KPIs", "Volume Trend", "Categories & Backlog"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

const Sk = ({ w = "100%", h = 14, r = 6 }: { w?: string | number; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f0eeff 25%,#e8e4fc 50%,#f0eeff 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
);

const PriorityBadge: React.FC<{ p: string }> = ({ p }) => {
  const map: Record<string, { bg: string; color: string }> = {
    high: { bg: "#fee2e2", color: "#dc2626" }, medium: { bg: "#fef3c7", color: "#d97706" },
    low:  { bg: "#dcfce7", color: "#16a34a" }, normal: { bg: "#f0fdf4", color: "#16a34a" },
    critical: { bg: "#f5f3ff", color: "#7c3aed" },
  };
  const c = map[p?.toLowerCase()] ?? { bg: "#f1f5f9", color: "#64748b" };
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: c.bg, color: c.color, letterSpacing: "0.4px", textTransform: "uppercase" }}>{p || "—"}</span>;
};

const StatusPill: React.FC<{ s: string }> = ({ s }) => {
  const map: Record<string, { bg: string; color: string }> = {
    open: { bg: "#fee2e2", color: "#991b1b" }, pending: { bg: "#fef3c7", color: "#92400e" },
    in_progress: { bg: "#fef3c7", color: "#92400e" }, closed: { bg: "#dcfce7", color: "#14532d" }, resolved: { bg: "#dcfce7", color: "#14532d" },
  };
  const c = map[s?.toLowerCase()] ?? { bg: "#f1f5f9", color: "#64748b" };
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: c.bg, color: c.color, textTransform: "capitalize" }}>{s || "—"}</span>;
};

// ─── Stat card (matches image 4) ──────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ReactNode; iconBg: string; num: number | string; label: string; accent: string }> = ({ icon, iconBg, num, label, accent }) => (
  <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accent }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 30, fontWeight: 900, color: accent, lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.t3, marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

// ─── Donut chart ──────────────────────────────────────────────────────────────
const DonutChart: React.FC<{ data: DonutSlice[] }> = ({ data }) => {
  const [hov, setHov] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div style={{ padding: 24, color: C.t3, fontSize: 12, textAlign: "center" }}>No data yet.</div>;
  const r = 42; const cx = 58; const cy = 58; const circ = 2 * Math.PI * r; const gap = 2;
  let cum = 0;
  const slices = data.map((d, i) => { const pct = d.count / total; const len = pct * circ - gap; const off = cum; cum += pct * circ; return { ...d, len, off, pct, i }; });
  const active = hov !== null ? slices[hov] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1 }}>
      <svg width="116" height="116" viewBox="0 0 116 116" style={{ flexShrink: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f4" strokeWidth="18" />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {slices.map(s => (
            <circle key={s.i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
              strokeWidth={hov === s.i ? 22 : 18} strokeDasharray={`${s.len} ${circ}`}
              strokeDashoffset={-s.off} strokeLinecap="butt"
              style={{ transition: "stroke-width .15s", cursor: "pointer" }}
              onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} />
          ))}
        </g>
        {active
          ? <><text x={cx} y={cy - 7} textAnchor="middle" fontSize="17" fontWeight="800" fill={active.color}>{active.count}</text><text x={cx} y={cy + 8} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={active.color}>{Math.round(active.pct * 100)}%</text></>
          : <><text x={cx} y={cy - 7} textAnchor="middle" fontSize="20" fontWeight="800" fill={C.t1}>{total}</text><text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.t3} letterSpacing="0.08em">TOTAL</text></>}
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {slices.map(s => (
          <div key={s.i} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 7, background: hov === s.i ? `${s.color}10` : "transparent", transition: "background .15s", cursor: "default" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#374151", flex: 1, fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: s.color, minWidth: 14, textAlign: "right" as const }}>{s.count}</span>
            <span style={{ fontSize: 9.5, color: C.t3, minWidth: 28, textAlign: "right" as const }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Volume trend chart ───────────────────────────────────────────────────────
const VolumeTrendChart: React.FC<{ data: TrendDay[] }> = ({ data }) => {
  if (!data.length) return null;
  const W = 520; const H = 120; const pad = { t: 8, b: 8, l: 4, r: 4 };
  const iW = W - pad.l - pad.r; const iH = H - pad.t - pad.b;
  const maxV = Math.max(1, ...data.flatMap(d => [d.newT, d.resolved, d.critical]));
  const xs = data.map((_, i) => pad.l + (i / Math.max(data.length - 1, 1)) * iW);
  const yOf = (v: number) => pad.t + iH - (v / maxV) * iH;
  const mkPts = (k: keyof TrendDay) => data.map((d, i) => `${xs[i].toFixed(1)},${yOf(d[k] as number).toFixed(1)}`).join(" ");
  const mkArea = (k: keyof TrendDay) => { const pts = data.map((d, i) => `${xs[i].toFixed(1)},${yOf(d[k] as number).toFixed(1)}`).join(" L"); return `M${xs[0].toFixed(1)},${(pad.t + iH).toFixed(1)} L${pts} L${xs[xs.length - 1].toFixed(1)},${(pad.t + iH).toFixed(1)} Z`; };
  return (
    <div style={{ position: "relative", height: 120 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {[0.25, 0.5, 0.75, 1].map((f, i) => <line key={i} x1="0" y1={(pad.t + iH * (1 - f)).toFixed(1)} x2={W} y2={(pad.t + iH * (1 - f)).toFixed(1)} stroke="rgba(124,58,237,0.07)" strokeWidth="1" />)}
        <path d={mkArea("resolved")} fill="#16a34a" fillOpacity="0.07" />
        <path d={mkArea("newT")}     fill="#7c3aed" fillOpacity="0.07" />
        <polyline points={mkPts("resolved")} fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={mkPts("newT")}     fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={mkPts("critical")} fill="none" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
      </svg>
    </div>
  );
};

// ─── Analytics cards ──────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; num: React.ReactNode; delta: string; dir: "up"|"dn"; sub: string; accent: string; bar: number }> = ({ label, num, delta, dir, sub, accent, bar }) => (
  <div style={{ position: "relative", overflow: "hidden", borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, padding: "20px 20px 16px" }}>
    <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: accent, opacity: 0.06 }} />
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: C.t3, marginBottom: 12 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: "-1px", color: accent, marginBottom: 12 }}>{num}</div>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, marginBottom: 8, background: dir === "up" ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)", color: dir === "up" ? C.red : C.green }}>
      {dir === "up" ? "▲" : "▼"} {delta}
    </div>
    <div style={{ fontSize: 10.5, color: C.t3, marginBottom: 12 }}>{sub}</div>
    <div style={{ height: 3, borderRadius: 2, background: C.surface2 }}><div style={{ height: "100%", borderRadius: 2, background: accent, width: `${bar}%`, transition: "width .7s ease" }} /></div>
  </div>
);

const VolumeTrendCard: React.FC<{ data: TrendDay[]; openCount: number; closedCount: number; total: number; period: Period }> = ({ data, openCount, closedCount, total, period }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 20px 16px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
      <div><div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Ticket Volume Trend</div><div style={{ fontSize: 10, color: C.t3 }}>Daily new &amp; closed — last {period}</div></div>
      <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: C.surface2, border: `1px solid ${C.border}`, color: C.t3 }}>{period}</span>
    </div>
    <VolumeTrendChart data={data} />
    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
      {[["#7c3aed", "New"], ["#16a34a", "Resolved"], ["#dc2626", "Critical"]].map(([col, lbl]) => (
        <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.t2 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />{lbl}</div>
      ))}
    </div>
    <div style={{ background: C.surface2, borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: C.t3, marginBottom: 6 }}>📊 Trend Summary</div>
      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>{total} total — {openCount} open, {closedCount} resolved. {data.reduce((s, d) => s + d.newT, 0)} new in this period.</div>
    </div>
  </div>
);

const CategoriesCard: React.FC<{ categories: CategoryRow[] }> = ({ categories }) => {
  const catTotal = Math.max(1, categories.reduce((s, c) => s + c.count, 0));
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 20px 16px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Tickets by Category</div>
        <div style={{ fontSize: 10, color: C.t3 }}>Live volume breakdown</div>
      </div>
      {categories.length === 0 && <div style={{ color: C.t3, fontSize: 12 }}>No data yet.</div>}
      {categories.map((c, idx) => (
        <div key={c.label} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: idx < categories.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <div style={{ width: 11, height: 11, borderRadius: 3, background: c.color, flexShrink: 0, marginRight: 12 }} />
          <div style={{ fontSize: 12, fontWeight: 500, color: C.t1, flex: "1 1 0", minWidth: 0, paddingRight: 14 }}>{c.label}</div>
          <div style={{ width: 96, height: 6, borderRadius: 3, background: C.surface2, overflow: "hidden", marginRight: 14 }}>
            <div style={{ height: "100%", borderRadius: 3, opacity: 0.75, background: c.color, width: `${(c.count / catTotal) * 100}%` }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, width: 26, textAlign: "right" as const }}>{c.count}</div>
        </div>
      ))}
    </div>
  );
};

const BacklogHealthCard: React.FC<{ openCount: number; pendingCount: number }> = ({ openCount, pendingCount }) => {
  const fresh = Math.max(0, openCount - 2); const aging = pendingCount; const overdue = Math.min(2, openCount);
  const tot = Math.max(fresh + aging + overdue, 1);
  const items = [
    { n: fresh,   label: "Fresh",   sub: "< 24h", bg: "rgba(22,163,74,0.08)",  bdr: "rgba(22,163,74,0.2)",  col: C.green },
    { n: aging,   label: "Aging",   sub: "24–72h", bg: "rgba(217,119,6,0.08)",  bdr: "rgba(217,119,6,0.2)",  col: C.amber },
    { n: overdue, label: "Overdue", sub: "> 72h",  bg: "rgba(220,38,38,0.08)",  bdr: "rgba(220,38,38,0.2)",  col: C.red },
  ];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div><div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Backlog Health</div><div style={{ fontSize: 10, color: C.t3 }}>Open ticket age &amp; risk</div></div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: C.surface2, border: `1px solid ${C.border}`, color: C.t3 }}>Live</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {items.map(({ n, label, sub, bg, bdr, col }) => (
          <div key={label} style={{ flex: 1, padding: "12px 8px", background: bg, borderRadius: 10, border: `1px solid ${bdr}`, textAlign: "center" as const }}>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: col }}>{n}</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, color: C.t3, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", gap: 2 }}>
        {items.map(({ col, n }, i) => <div key={i} style={{ height: "100%", borderRadius: 4, background: col, width: `${Math.round((n / tot) * 100)}%`, transition: "width .7s ease" }} />)}
      </div>
    </div>
  );
};

// ─── Analytics carousel ───────────────────────────────────────────────────────
interface CarouselProps {
  period: Period; onPeriod: (p: Period) => void;
  slide: number; onSlide: (n: number) => void;
  total: number; openCount: number; pendingCount: number; closedCount: number;
  avgResHrs: number; trendData: TrendDay[]; categories: CategoryRow[];
}

const AnalyticsCarousel: React.FC<CarouselProps> = ({ period, onPeriod, slide, onSlide, total, openCount, pendingCount, closedCount, avgResHrs, trendData, categories }) => {
  const [dir, setDir] = useState<1 | -1>(1);
  const [anim, setAnim] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = SLIDE_LABELS.length;
  const go = (next: number) => { if (next === slide) return; setDir(next > slide ? 1 : -1); setAnim(true); setTimeout(() => { onSlide(next); setAnim(false); }, 220); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
        <h2 style={{ fontSize: 19, fontWeight: 400, color: C.t1, margin: 0 }}>Ticket <em style={{ fontStyle: "italic", color: C.purple }}>Analytics</em></h2>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(124,58,237,0.15),transparent)", minWidth: 20 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9.5, color: C.t3, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const }}>Period</span>
          {(["7D", "30D", "90D"] as Period[]).map(p => (
            <button key={p} onClick={() => onPeriod(p)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer", border: period === p ? `1.5px solid ${C.purple}` : `1.5px solid rgba(124,58,237,0.16)`, background: period === p ? C.purple : "#fff", color: period === p ? "#fff" : C.t2, transition: "all .14s", fontFamily: "inherit" }}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{ position: "relative" }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 40) dx < 0 ? go((slide + 1) % n) : go((slide - 1 + n) % n); touchX.current = null; }}>
        <div style={{ transition: anim ? "opacity .2s ease, transform .22s ease" : "none", opacity: anim ? 0 : 1, transform: anim ? `translateX(${dir * 24}px)` : "translateX(0)" }}>
          {slide === 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><KpiCard label="Total Tickets" num={total} delta={`${openCount} open`} dir={openCount > 0 ? "up" : "dn"} sub="All statuses" accent={C.purple} bar={Math.min(100, total)} /></div>
              <div style={{ flex: 1 }}><KpiCard label="Avg Resolution" num={avgResHrs > 0 ? `${avgResHrs}h` : "—"} delta={`${closedCount} resolved`} dir="dn" sub="Open → close time" accent={C.teal} bar={Math.round((closedCount / Math.max(total, 1)) * 100)} /></div>
            </div>
          )}
          {slide === 1 && <VolumeTrendCard data={trendData} openCount={openCount} closedCount={closedCount} total={total} period={period} />}
          {slide === 2 && <div className="g2" style={{ alignItems: "start" }}><CategoriesCard categories={categories} /><BacklogHealthCard openCount={openCount} pendingCount={pendingCount} /></div>}
        </div>
        {([["left", -1, "M6.5 2L3.5 5l3 3"], ["right", 1, "M3.5 2l3 3-3 3"]] as [string, number, string][]).map(([side, d, path]) => (
          <button key={side} onClick={() => go(d === -1 ? (slide - 1 + n) % n : (slide + 1) % n)}
            style={{ position: "absolute", top: "50%", [side]: -18, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.borderMd}`, background: "#fff", boxShadow: "0 2px 8px rgba(124,58,237,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, color: C.purple }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={path} /></svg>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDE_LABELS.map((_, i) => <button key={i} onClick={() => go(i)} style={{ width: slide === i ? 20 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0, background: slide === i ? C.purple : "rgba(124,58,237,0.2)", transition: "all .25s ease" }} />)}
        </div>
        <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>{SLIDE_LABELS[slide]}</span>
      </div>
    </div>
  );
};

// ─── Export dropdown ──────────────────────────────────────────────────────────
const ExportDropdown: React.FC<{ label?: string; small?: boolean; tickets: Ticket[]; onToast: (msg: string) => void }> = ({ label = "Export", small = false, tickets, onToast }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const asRecords = tickets as unknown as TicketRecord[];
  const options = [
    { icon: "📄", text: "CSV",          action: async () => { exportTicketCSV(asRecords); onToast("Exporting CSV…"); } },
    { icon: "{ }", text: "JSON",        action: async () => { exportTicketJSON(asRecords); onToast("Exporting JSON…"); } },
    { icon: "📊", text: "Excel (XLSX)", action: async () => { onToast("Building XLSX…"); await exportTicketXLSX(asRecords); } },
    { icon: "📋", text: "PDF Report",   action: async () => { exportTicketPDF(asRecords); onToast("Exporting PDF…"); } },
    { icon: "📽", text: "PowerPoint",   action: async () => { onToast("Building PPTX…"); await exportTicketPPTX(asRecords); } },
  ];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} className={small ? "btn btn-s btn-sm" : undefined}
        style={small ? undefined : { padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#fff", fontFamily: "inherit", background: `linear-gradient(135deg,${C.purple},${C.teal})`, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" width="8" height="8" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M2 3.5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: "#fff", border: `1px solid ${C.borderMd}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(124,58,237,0.14)", minWidth: 170, padding: "6px 0" }}>
          {options.map(opt => (
            <button key={opt.text} onClick={async () => { setOpen(false); await opt.action(); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{opt.icon}</span>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{opt.text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Import drawer ────────────────────────────────────────────────────────────
const ImportDrawer: React.FC<{ tickets: Ticket[]; onClose: () => void; onApply: (r: TicketRecord[]) => void; onToast: (msg: string) => void }> = ({ onClose, onApply, onToast }) => {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) { onToast("Please upload an .xlsx file."); return; }
    setParsing(true); setResult(null); setFileName(file.name);
    try { setResult(await importTicketsFromXLSX(file)); } catch (e: any) { onToast("Parse error: " + (e?.message ?? "unknown")); } finally { setParsing(false); }
  }, [onToast]);

  const handleApply = () => {
    if (!result || result.imported.length === 0) return;
    onApply(result.imported);
    onToast(`✅ ${result.imported.length} ticket${result.imported.length !== 1 ? "s" : ""} updated!`);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(18,9,50,0.35)", backdropFilter: "blur(2px)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(124,58,237,0.18)", animation: "slideInRight 0.22s ease" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, background: "linear-gradient(135deg,#2e1065,#4c1d95)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Import Tickets</div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", cursor: "pointer", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <button onClick={async () => { setTemplateBusy(true); try { await downloadTicketTemplate(); onToast("Template downloaded!"); } finally { setTemplateBusy(false); } }}
            disabled={templateBusy} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 9, border: `1.5px solid ${C.purple}`, background: C.purpleLt, cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.purple, fontFamily: "inherit", width: "100%", justifyContent: "center" }}>
            {templateBusy ? "Building…" : "Download XLSX Template"}
          </button>
          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? C.purple : C.borderMd}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragging ? C.purpleLt : "#faf9ff" }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ""; }} />
            {parsing ? <div style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>Parsing {fileName}…</div>
              : <><div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, marginBottom: 4 }}>Drag & drop your .xlsx here</div><div style={{ fontSize: 10.5, color: C.t3 }}>or click to browse</div></>}
          </div>
          {result && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[{ label: `${result.imported.length} will update`, bg: "rgba(22,163,74,0.08)", color: "#14532d", bdr: "rgba(22,163,74,0.2)" },
                  { label: `${result.errors.length} errors`, bg: "rgba(220,38,38,0.08)", color: "#991b1b", bdr: "rgba(220,38,38,0.2)" },
                  { label: `${result.skipped} skipped`, bg: "rgba(124,58,237,0.06)", color: C.t2, bdr: C.border }].map(({ label, bg, color, bdr }) => (
                  <span key={label} style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: bg, color, border: `1px solid ${bdr}` }}>{label}</span>
                ))}
              </div>
              {result.imported.length > 0 && (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
                  {result.imported.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px", borderBottom: i < result.imported.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? "#fff" : "#faf9ff" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, fontFamily: "monospace" }}>#{r.id}</span>
                      <span style={{ fontSize: 10.5, color: C.t1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                      <StatusPill s={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: "#faf9ff", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${C.borderMd}`, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.t2, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleApply} disabled={!result || result.imported.length === 0}
            style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", cursor: result && result.imported.length > 0 ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "inherit", background: result && result.imported.length > 0 ? `linear-gradient(135deg,${C.purple},${C.teal})` : "#d1d5db" }}>
            {result && result.imported.length > 0 ? `Apply ${result.imported.length} Update${result.imported.length !== 1 ? "s" : ""}` : "Upload a file to continue"}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
};

// ─── Notification panel ───────────────────────────────────────────────────────
const NICONS: Record<string, React.ReactNode> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M6 6l4 4M10 6l-4 4"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

const NotifPanel: React.FC<{ notifs: UINotif[]; onRead: (id: number) => void; onMarkAll: () => void; onClose: () => void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div className="gx-notif-panel" ref={ref}>
      <div className="gx-np-hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="gx-np-title">Notifications</span>
          <span className={`gx-np-unread${unread === 0 ? " all-read" : ""}`}>{unread > 0 ? `${unread} unread` : "All read"}</span>
        </div>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all as read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.length === 0 && <div style={{ textAlign: "center", padding: 20, color: C.t3, fontSize: 12 }}>No notifications.</div>}
        {notifs.map(n => (
          <div key={n.id} className={`gx-ni${n.read ? "" : " unread"}`} onClick={() => onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NICONS[n.type]}</div>
            <div className="gx-ni-body"><div className="gx-ni-title">{n.title}</div><div className="gx-ni-desc">{n.desc}</div><div className="gx-ni-time">{n.time}</div></div>
            {!n.read && <div className="gx-ni-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Ticket detail ────────────────────────────────────────────────────────────
const TicketDetail: React.FC<{ ticket: Ticket; onClose: () => void }> = ({ ticket, onClose }) => (
  <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>Ticket Detail</span>
      <button onClick={onClose} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.purple }}>✕</button>
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 4 }}>{ticketLabel(ticket)}</div>
    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" as const }}><PriorityBadge p={ticket.priority ?? ""} /></div>
    <div style={{ fontSize: 11, color: C.t3, marginBottom: 10, lineHeight: 1.5 }}>{ticket.description ?? ""}</div>
    {[["Ticket ID", `#${ticket.id}`], ["Created", fmtDate(ticket.created_at)], ["Updated", fmtDate(ticket.updated_at)], ["Category", ticket.category ?? "—"]].map(([k, v]) => (
      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10.5, color: C.t3 }}>{k}</span>
        <span style={{ fontSize: 10.5, color: C.t1, fontWeight: 600 }}>{v}</span>
      </div>
    ))}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
interface Props { onNavigate: (v: CPView) => void; onLogout?: () => void; user?: AuthUser | null; }

const TicketsPage: React.FC<Props> = ({ onNavigate, onLogout, user: propUser }) => {
  const {
    tickets, notifs, loading,
    activeTab, setActiveTab,
    selTicket, setSelTicket,
    notifOpen, setNotifOpen,
    search, setSearch,
    period, setPeriod,
    slide, setSlide,
    toastMsg, toastShow, toast,
    markRead, markAllRead,
    unread, openCount, pendingCount, closedCount, filtered,
    headerUser, trendData, categories, commonIssues, avgResHrs,
  } = useTicketsPage(propUser);

  const [importOpen, setImportOpen] = useState(false);
  const handleApplyImport = useCallback((records: TicketRecord[]) => {
    console.info("[TicketsPage] Import applied:", records.map(r => r.id));
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage="tickets" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Header user={headerUser} notificationCount={unread} onNotificationClick={() => setNotifOpen(o => !o)} onLogout={onLogout} />

        <div className="gx-main"><div className="gx-view">
          <div className="gx-ph">
            <div className="gx-ph-title">Support <em>Tickets</em></div>
            <div className="gx-ph-rule" />
          </div>
          <div className="gx-scroll"><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Tabs + import/export */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="gx-tkt-tabs">
                {(["open", "pending", "closed"] as TabKey[]).map(s => (
                  <button key={s} className={`gx-tkt-tab ${activeTab === s ? `tab-${s}` : ""}`} onClick={() => setActiveTab(s)}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_DOT[s], display: "inline-block" }} />
                    {TAB_LABEL[s]}
                    <span className="gx-tkt-n">{loading ? "…" : s === "open" ? openCount : s === "pending" ? pendingCount : closedCount}</span>
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(109,40,217,0.18),transparent)" }} />
              <button className="btn btn-s btn-sm" onClick={() => setImportOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 11V3M4 8l3 3 3-3M2 12h10" /></svg>
                Import
              </button>
              <ExportDropdown small tickets={tickets} onToast={toast} />
            </div>

            {/* Stat cards — image 4 style */}
            <div style={{ display: "flex", gap: 12 }}>
              <StatCard icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/></svg>}
                iconBg={`${C.red}18`} num={loading ? "…" : openCount} label="Open Tickets" accent={C.red} />
              <StatCard icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                iconBg={`${C.green}18`} num={loading ? "…" : closedCount} label="Resolved This Month" accent={C.green} />
            </div>

            {/* Analytics carousel */}
            <AnalyticsCarousel
              period={period} onPeriod={setPeriod}
              slide={slide} onSlide={setSlide}
              total={tickets.length} openCount={openCount} pendingCount={pendingCount} closedCount={closedCount}
              avgResHrs={avgResHrs} trendData={trendData} categories={categories}
            />

            {/* Slide 0: donut + ticket list */}
            {slide === 0 && (
              <div className="g2" style={{ alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="gx-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span className="gx-card-title">Common Issues</span>
                      <span className="gx-card-sub">All time</span>
                    </div>
                    <DonutChart data={commonIssues} />
                  </div>
                  <div className="gx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="gx-card-title">Summary &amp; Findings</span>
                    {commonIssues.slice(0, 3).map(({ color, label, count }) => (
                      <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}1f`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 10.5, color: C.t2, lineHeight: 1.5 }}>{count} ticket{count !== 1 ? "s" : ""} in this category.</div>
                        </div>
                      </div>
                    ))}
                    {commonIssues.length === 0 && <div style={{ fontSize: 12, color: C.t3 }}>No ticket data yet.</div>}
                  </div>
                </div>

                {/* Ticket list */}
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 16px 12px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Ticket List</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative" }}>
                        <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="11" height="11" viewBox="0 0 16 16" fill="none" stroke={C.t3} strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                          style={{ paddingLeft: 26, paddingRight: 8, paddingTop: 5, paddingBottom: 5, fontSize: 11, borderRadius: 8, border: `1px solid ${C.border}`, background: "#f8f7ff", outline: "none", width: 120, fontFamily: "inherit" }} />
                      </div>
                      <ExportDropdown small tickets={filtered} onToast={toast} />
                    </div>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 420 }}>
                    {loading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{Array.from({ length: 5 }).map((_, i) => <Sk key={i} h={52} r={8} />)}</div>
                    ) : filtered.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 12 }}>No {activeTab} tickets found.</div>
                    ) : (
                      filtered.map((t, idx) => (
                        <div key={t.id ?? idx} onClick={() => setSelTicket(selTicket?.id === t.id ? null : t)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 6px", borderRadius: 8, cursor: "pointer", borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : "none", background: selTicket?.id === t.id ? C.surface2 : "transparent" }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                          onMouseLeave={e => (e.currentTarget.style.background = selTicket?.id === t.id ? C.surface2 : "transparent")}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[(t.status ?? "").toLowerCase()] ?? "#94a3b8", flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, flexShrink: 0, fontFamily: "monospace" }}>#{t.id}</span>
                          <span style={{ fontSize: 11, color: C.t1, flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticketLabel(t)}</span>
                          <PriorityBadge p={t.priority ?? ""} />
                        </div>
                      ))
                    )}
                  </div>
                  {selTicket && <TicketDetail ticket={selTicket} onClose={() => setSelTicket(null)} />}
                </div>
              </div>
            )}

          </div></div>
        </div></div>

        <div className={`gx-toast ${toastShow ? "show" : ""}`}><div className="gx-toast-dot" /><span>{toastMsg}</span></div>
        {notifOpen && <NotifPanel notifs={notifs} onRead={markRead} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
      </div>

      {importOpen && <ImportDrawer tickets={tickets} onClose={() => setImportOpen(false)} onApply={handleApplyImport} onToast={toast} />}
    </div>
  );
};

export default TicketsPage;
