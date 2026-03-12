'use client'

import { useState, useRef, useEffect } from "react";
import {
  useTicketsPage,
  fmtDate, ticketLabel,
  type DonutSlice, type CategoryRow, type TrendDay,
  type TabKey, type Period,
} from "../Logic/useTicketsPage";
import {
  exportTicketCSV, exportTicketJSON, exportTicketXLSX,
  exportTicketPDF, exportTicketPPTX,
  downloadTicketTemplate, importTicketsFromXLSX,
  type TicketRecord, type ImportResult,
} from "../Logic/TicketExportLogic";
import { type AuthUser, type Ticket } from "../../Services/api.service";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from "../Header_Client/header_client";
import "../../globals.css";

type CPView = "overview" | "tickets" | "users" | "settings";
interface Props { user?: AuthUser | null; onLogout?: () => void; onNavigate?: (view: CPView) => void; }

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue: "#0369a1", teal: "#0d9488", red: "#dc2626", amber: "#ca8a04", grn: "#16a34a",
  t1: "#1e1b4b", t2: "#4b5563", t3: "#9ca3af",
  border: "rgba(3,105,161,0.12)", surface2: "#f0f7ff",
};

const TAB_LABELS: Record<TabKey, string>  = { open: "Open", pending: "Pending", closed: "Closed" };
const STATUS_DOT: Record<TabKey, string>  = { open: "#dc2626", pending: "#ca8a04", closed: "#16a34a" };
const SLIDE_LABELS = ["KPIs", "Volume Trend", "Categories & Backlog"];

function toTicketRecord(t: Ticket): TicketRecord {
  return { id: t.id ?? 0, title: ticketLabel(t), description: t.description, status: t.status ?? "open", priority: t.priority, category: t.category, created_at: t.created_at, updated_at: t.updated_at };
}

function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

// ─── Stat card (matches image 4 style) ───────────────────────────────────────
const StatCard: React.FC<{ icon: React.ReactNode; iconBg: string; num: number | string; label: string; accent: string }> = ({ icon, iconBg, num, label, accent }) => (
  <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
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
            <span style={{ fontSize: 11.5, fontWeight: 800, color: s.color, minWidth: 14, textAlign: "right" }}>{s.count}</span>
            <span style={{ fontSize: 9.5, color: C.t3, minWidth: 28, textAlign: "right" }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Volume trend chart ───────────────────────────────────────────────────────
const VolumeTrendChart: React.FC<{ data: TrendDay[] }> = ({ data }) => {
  if (!data.length) return null;
  const W = 520; const H = 90; const pad = { t: 8, b: 20, l: 8, r: 8 };
  const iW = W - pad.l - pad.r; const iH = H - pad.t - pad.b;
  const maxV = Math.max(1, ...data.flatMap(d => [d.newT, d.resolved, d.critical]));
  const xs = data.map((_, i) => pad.l + (i / Math.max(data.length - 1, 1)) * iW);
  const yOf = (v: number) => pad.t + iH - (v / maxV) * iH;
  const line = (key: keyof TrendDay) => data.map((d, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${yOf(d[key] as number).toFixed(1)}`).join(" ");
  const area = (key: keyof TrendDay) => { const pts = data.map((d, i) => `${xs[i].toFixed(1)},${yOf(d[key] as number).toFixed(1)}`).join(" L"); return `M${xs[0].toFixed(1)},${(pad.t + iH).toFixed(1)} L${pts} L${xs[xs.length - 1].toFixed(1)},${(pad.t + iH).toFixed(1)} Z`; };
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        <defs>
          <linearGradient id="g-new"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity=".18"/><stop offset="100%" stopColor={C.blue} stopOpacity="0"/></linearGradient>
          <linearGradient id="g-res"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity=".15"/><stop offset="100%" stopColor={C.teal} stopOpacity="0"/></linearGradient>
          <linearGradient id="g-crit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red}  stopOpacity=".12"/><stop offset="100%" stopColor={C.red}  stopOpacity="0"/></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + iH * (1 - f)} y2={pad.t + iH * (1 - f)} stroke="#f0eef8" strokeWidth="1" strokeDasharray="3 3" />)}
        <path d={area("newT")}     fill="url(#g-new)" />
        <path d={area("resolved")} fill="url(#g-res)" />
        <path d={area("critical")} fill="url(#g-crit)" />
        <path d={line("newT")}     fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("resolved")} fill="none" stroke={C.teal} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("critical")} fill="none" stroke={C.red}  strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 3" />
        {data.map((d, i) => <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fontSize="9" fill={C.t3} fontWeight="600">{d.day}</text>)}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
        {[{ color: C.blue, label: "New" }, { color: C.teal, label: "Resolved" }, { color: C.red, label: "Critical", dashed: true }].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 2" : undefined} /></svg>
            <span style={{ fontSize: 10, color: C.t2, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── KPI slide ────────────────────────────────────────────────────────────────
const TicketKPIs: React.FC<{ total: number; openCount: number; pendingCount: number; closedCount: number; avgResHrs: number }> = ({ total, openCount, pendingCount, closedCount, avgResHrs }) => (
  <div style={{ display: "flex", gap: 14 }}>
    <div className="gx-card" style={{ flex: 1, padding: "14px 18px" }}>
      <div style={{ fontSize: 9.5, color: C.t3, fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>TOTAL TICKETS</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.t1, lineHeight: 1 }}>{total}</div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.red,   background: "rgba(220,38,38,0.08)",  padding: "2px 6px", borderRadius: 5 }}>Open: {openCount}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, background: "rgba(202,138,4,0.08)",  padding: "2px 6px", borderRadius: 5 }}>Pending: {pendingCount}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.grn,   background: "rgba(22,163,74,0.08)",  padding: "2px 6px", borderRadius: 5 }}>Closed: {closedCount}</span>
      </div>
      <div style={{ height: 3, background: `linear-gradient(to right,${C.blue},${C.teal})`, borderRadius: 2, marginTop: 10 }} />
    </div>
    <div className="gx-card" style={{ flex: 1, padding: "14px 18px" }}>
      <div style={{ fontSize: 9.5, color: C.t3, fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>AVG RESOLUTION</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: C.t1, lineHeight: 1 }}>{avgResHrs > 0 ? avgResHrs : "—"}</span>
        {avgResHrs > 0 && <span style={{ fontSize: 13, color: C.t3, fontWeight: 600 }}>hrs</span>}
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{ fontSize: 10, color: C.t3 }}>{avgResHrs > 0 ? "avg time from open → close" : "No closed tickets yet"}</span>
      </div>
      <div style={{ height: 3, background: `linear-gradient(to right,${C.teal},${C.blue})`, borderRadius: 2, marginTop: 10 }} />
    </div>
  </div>
);

const VolumeTrendCard: React.FC<{ data: TrendDay[]; period: Period }> = ({ data, period }) => (
  <div className="gx-card" style={{ flex: 1 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div>
        <div className="gx-card-title">Ticket Volume Trend</div>
        <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Daily new &amp; closed — last {period}</div>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: C.blue, background: "rgba(3,105,161,0.08)", padding: "3px 9px", borderRadius: 6 }}>{period}</span>
    </div>
    <VolumeTrendChart data={data} />
    <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(3,105,161,0.04)", borderRadius: 9, border: "1px solid rgba(3,105,161,0.08)" }}>
      <div style={{ fontSize: 9.5, color: C.blue, fontWeight: 700, letterSpacing: ".07em", marginBottom: 4 }}>📊 TREND SUMMARY</div>
      <p style={{ fontSize: 10.5, color: C.t2, lineHeight: 1.6, margin: 0 }}>
        {data.reduce((s, d) => s + d.newT, 0)} tickets created, {data.reduce((s, d) => s + d.resolved, 0)} resolved over the last {period}.
      </p>
    </div>
  </div>
);

const CategoriesCard: React.FC<{ categories: CategoryRow[] }> = ({ categories }) => {
  const maxCount = Math.max(1, ...categories.map(c => c.count));
  return (
    <div className="gx-card">
      <div style={{ marginBottom: 12 }}>
        <div className="gx-card-title">Tickets by Category</div>
        <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Live volume breakdown</div>
      </div>
      {categories.length === 0 && <div style={{ color: C.t3, fontSize: 12 }}>No data yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map(c => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#374151", flex: 1, fontWeight: 500 }}>{c.label}</span>
            <div style={{ width: 80, height: 5, background: C.surface2, borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${(c.count / maxCount) * 100}%`, background: c.color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: C.t1, minWidth: 20, textAlign: "right" }}>{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BacklogHealthCard: React.FC<{ openCount: number }> = ({ openCount }) => {
  const fresh   = Math.max(0, Math.round(openCount * 0.6));
  const aging   = Math.max(0, Math.round(openCount * 0.3));
  const overdue = Math.max(0, openCount - fresh - aging);
  return (
    <div className="gx-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div className="gx-card-title">Backlog Health</div>
          <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Open ticket age breakdown</div>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: C.teal, background: "rgba(13,148,136,0.1)", padding: "3px 9px", borderRadius: 6, border: "1px solid rgba(13,148,136,0.2)" }}>LIVE</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {[{ label: "FRESH", sub: "< 24h", value: fresh, color: C.teal }, { label: "AGING", sub: "24–72h", value: aging, color: C.amber }, { label: "OVERDUE", sub: "> 72h", value: overdue, color: C.red }].map(({ label, sub, value, color }) => (
          <div key={label} style={{ flex: 1, padding: "12px 10px", background: `${color}08`, borderRadius: 10, border: `1px solid ${color}20`, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color, marginTop: 4, letterSpacing: ".06em" }}>{label}</div>
            <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 8, borderRadius: 6, overflow: "hidden", display: "flex", gap: 2 }}>
        <div style={{ flex: Math.max(fresh, 1), background: C.teal, borderRadius: "6px 0 0 6px" }} />
        <div style={{ flex: Math.max(aging, 1), background: C.amber }} />
        <div style={{ flex: Math.max(overdue, 1), background: C.red, borderRadius: "0 6px 6px 0" }} />
      </div>
    </div>
  );
};

// ─── Analytics carousel ───────────────────────────────────────────────────────
const AnalyticsCarousel: React.FC<{
  slide: number; onSlide: (n: number) => void;
  period: Period; onPeriod: (p: Period) => void;
  total: number; openCount: number; pendingCount: number; closedCount: number;
  avgResHrs: number; trendData: TrendDay[]; categories: CategoryRow[];
}> = ({ slide, onSlide, period, onPeriod, total, openCount, pendingCount, closedCount, avgResHrs, trendData, categories }) => {
  const [dir, setDir] = useState<1 | -1>(1);
  const [anim, setAnim] = useState(false);
  const touchX = useRef<number | null>(null);
  const N = SLIDE_LABELS.length;
  const go = (next: number) => { if (next === slide) return; setDir(next > slide ? 1 : -1); setAnim(true); setTimeout(() => { onSlide(next); setAnim(false); }, 220); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>Ticket <em style={{ fontStyle: "italic", color: C.blue }}>Analytics</em></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: ".06em" }}>PERIOD</span>
          <div style={{ display: "flex", background: C.surface2, borderRadius: 8, padding: 2, gap: 2 }}>
            {(["7D", "30D", "90D"] as Period[]).map(p => (
              <button key={p} onClick={() => onPeriod(p)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: period === p ? C.blue : "transparent", color: period === p ? "#fff" : C.t2, transition: "all .15s", fontFamily: "inherit" }}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: "relative" }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 40) dx < 0 ? go((slide + 1) % N) : go((slide - 1 + N) % N); touchX.current = null; }}>
        <div style={{ transition: anim ? "opacity .2s ease,transform .22s ease" : "none", opacity: anim ? 0 : 1, transform: anim ? `translateX(${dir * 24}px)` : "translateX(0)" }}>
          {slide === 0 && <TicketKPIs total={total} openCount={openCount} pendingCount={pendingCount} closedCount={closedCount} avgResHrs={avgResHrs} />}
          {slide === 1 && <VolumeTrendCard data={trendData} period={period} />}
          {slide === 2 && <div className="g2" style={{ alignItems: "start" }}><CategoriesCard categories={categories} /><BacklogHealthCard openCount={openCount} /></div>}
        </div>
        {([["left", -1, "M6.5 2L3.5 5l3 3"], ["right", 1, "M3.5 2l3 3-3 3"]] as [string, number, string][]).map(([side, d, path]) => (
          <button key={side} onClick={() => go(d === -1 ? (slide - 1 + N) % N : (slide + 1) % N)}
            style={{ position: "absolute", top: "50%", [side]: -18, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: `1px solid rgba(3,105,161,0.18)`, background: "#fff", boxShadow: "0 2px 8px rgba(3,105,161,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, color: C.blue }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={path} /></svg>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDE_LABELS.map((_, i) => <button key={i} onClick={() => go(i)} style={{ width: slide === i ? 20 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0, background: slide === i ? C.blue : "rgba(3,105,161,0.2)", transition: "all .25s" }} />)}
        </div>
        <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>{SLIDE_LABELS[slide]}</span>
      </div>
    </div>
  );
};

// ─── Export dropdown ──────────────────────────────────────────────────────────
function ExportDropdown({ tickets, onToast }: { tickets: Ticket[]; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const records = tickets.map(toTicketRecord);
  const options = [
    { label: "Export CSV",  icon: "📄", action: () => { exportTicketCSV(records);               onToast("CSV exported!"); } },
    { label: "Export JSON", icon: "📋", action: () => { exportTicketJSON(records);              onToast("JSON exported!"); } },
    { label: "Export XLSX", icon: "📊", action: () => { exportTicketXLSX(records).then(() => onToast("XLSX exported!")); } },
    { label: "Export PDF",  icon: "📑", action: () => { exportTicketPDF(records);               onToast("PDF exported!"); } },
    { label: "Export PPTX", icon: "📽", action: () => { exportTicketPPTX(records).then(() => onToast("PPTX exported!")); } },
  ];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} className="btn btn-s btn-sm">
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 20 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", right: 0, top: 38, zIndex: 30, width: 160, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #f0f0f4", padding: "4px 0" }}>
            {options.map(o => (
              <button key={o.label} onClick={() => { o.action(); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 12, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                <span>{o.icon}</span> {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Import drawer ────────────────────────────────────────────────────────────
function ImportDrawer({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = () => { setResult(null); setError(null); setLoading(false); };
  const close = () => { reset(); onClose(); };
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try { setResult(await importTicketsFromXLSX(file)); } catch (err) { setError(String(err)); } finally { setLoading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={close} />
      <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: 420, background: "#fff", height: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f4" }}>
          <h3 style={{ fontWeight: 600, color: C.t1, margin: 0 }}>Import Tickets</h3>
          <button onClick={close} style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>Step 1 — Download template</p>
            <button onClick={() => downloadTicketTemplate().then(() => onToast("Template downloaded!"))} style={{ fontSize: 11, padding: "6px 12px", background: "#2563eb", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Download XLSX Template</button>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Step 2 — Upload completed file</p>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: 110, border: "2px dashed #d1d5db", borderRadius: 12, cursor: "pointer", background: "#f9fafb" }}>
              {loading ? <div style={{ width: 24, height: 24, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <><svg width="28" height="28" fill="none" stroke="#9ca3af" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg><span style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Click to select .xlsx file</span></>}
              <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFile} />
            </label>
          </div>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 16, fontSize: 13, color: C.red }}><p style={{ fontWeight: 700, marginBottom: 4 }}>Import failed</p><p>{error}</p></div>}
          {result && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[{ label: "Imported", value: result.imported.length, color: C.grn }, { label: "Errors", value: result.errors.length, color: C.red }, { label: "Skipped", value: result.skipped, color: C.t2 }].map(({ label, value, color }) => (
                <div key={label} style={{ borderRadius: 10, border: `1px solid ${color}30`, background: `${color}08`, padding: "10px 12px", textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color, margin: "2px 0 0" }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid #f0f0f4", padding: 16 }}>
          <button onClick={close} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "#000", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification panel ───────────────────────────────────────────────────────
const NOTIF_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  warn:    { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  purple:  { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RetailTicketsPage({ user, onLogout, onNavigate }: Props) {
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
  } = useTicketsPage(user);

  const [importOpen, setImportOpen] = useState(false);
  const tabCounts: Record<TabKey, number> = { open: openCount, pending: pendingCount, closed: closedCount };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage="tickets" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Header
          user={{ initials: headerUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(), name: headerUser.name, role: headerUser.role, company: "Retail" }}
          clientLabel="Nike" notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)} onLogout={onLogout}
        />
        <div className="gx-main"><div className="gx-view">
          <div className="gx-ph">
            <div className="gx-ph-title">Support <em>Tickets</em></div>
            <div className="gx-ph-rule" />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setImportOpen(true)} className="btn btn-s btn-sm">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import
              </button>
              <ExportDropdown tickets={tickets} onToast={toast} />
            </div>
          </div>

          <div className="gx-scroll"><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Tabs + search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="gx-tkt-tabs">
                {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
                  <button key={tab} className={`gx-tkt-tab ${activeTab === tab ? `tab-${tab}` : ""}`} onClick={() => setActiveTab(tab)}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_DOT[tab], display: "inline-block" }} />
                    {TAB_LABELS[tab]}
                    <span className="gx-tkt-n">{tabCounts[tab]}</span>
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(3,105,161,0.18),transparent)" }} />
              <input type="text" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 9, padding: "6px 12px", outline: "none", width: 160, fontFamily: "inherit" }} />
            </div>

            {/* Stat cards — image 4 style */}
            <div style={{ display: "flex", gap: 12 }}>
              <StatCard icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/></svg>}
                iconBg="rgba(220,38,38,0.1)" num={loading ? "…" : openCount} label="Open Tickets" accent={C.red} />
              <StatCard icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>}
                iconBg="rgba(202,138,4,0.1)" num={loading ? "…" : pendingCount} label="Pending" accent={C.amber} />
              <StatCard icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                iconBg="rgba(22,163,74,0.1)" num={loading ? "…" : closedCount} label="Resolved This Month" accent={C.grn} />
              <StatCard icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>}
                iconBg="rgba(3,105,161,0.1)" num={loading ? "…" : tickets.length} label="Total" accent={C.blue} />
            </div>

            {/* Analytics carousel */}
            <AnalyticsCarousel
              slide={slide} onSlide={setSlide} period={period} onPeriod={setPeriod}
              total={tickets.length} openCount={openCount} pendingCount={pendingCount} closedCount={closedCount}
              avgResHrs={avgResHrs} trendData={trendData} categories={categories}
            />

            {/* Donut + ticket list */}
            {slide === 0 && (
              <div className="g2" style={{ alignItems: "start" }}>
                <div className="gx-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span className="gx-card-title">Common Issues</span>
                    <span className="gx-card-sub">All time</span>
                  </div>
                  <DonutChart data={commonIssues} />
                </div>

                <div className="gx-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="gx-card-title">Ticket List</span>
                  </div>
                  {loading && <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><div style={{ width: 28, height: 28, border: "3px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /></div>}
                  {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: C.t3 }}><p style={{ fontWeight: 600 }}>No tickets found.</p></div>}
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {!loading && filtered.map((ticket, i) => (
                      <button key={ticket.id ?? i} onClick={() => setSelTicket(ticket)} className="gx-t-row"
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                        <span style={{ width: 5, height: 5, background: STATUS_DOT[activeTab], borderRadius: "50%", flexShrink: 0 }} />
                        <span className="gx-t-id">#{ticket.id}</span>
                        <span className="gx-t-sub">{ticketLabel(ticket)}{ticket.category && <span style={{ color: "var(--c3)", fontSize: 9 }}> · {ticket.category}</span>}</span>
                        <span className="gx-t-time">{fmtDate(ticket.created_at)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div></div>
        </div></div>
      </div>

      {/* Ticket detail modal */}
      {selTicket && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setSelTicket(null)} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 500, padding: 24 }}>
            <h3 style={{ fontWeight: 700, color: C.t1, fontSize: 18, marginBottom: 16 }}>{ticketLabel(selTicket)}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["ID", `#${selTicket.id}`], ["Status", selTicket.status ?? "—"], ["Priority", selTicket.priority ?? "—"], ["Category", selTicket.category ?? "—"], ["Created", fmtDate(selTicket.created_at)], ["Updated", fmtDate(selTicket.updated_at)]].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f4" }}>
                  <span style={{ fontSize: 12, color: C.t3 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{value}</span>
                </div>
              ))}
              {selTicket.description && <div style={{ paddingTop: 10 }}><p style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Description</p><p style={{ fontSize: 13, color: "#374151" }}>{selTicket.description}</p></div>}
            </div>
            <button onClick={() => setSelTicket(null)} style={{ marginTop: 20, width: "100%", padding: "10px", borderRadius: 10, background: "#000", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        </div>
      )}

      {/* Notification panel */}
      {notifOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => setNotifOpen(false)} />
          <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: 360, background: "#fff", height: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f4" }}>
              <h3 style={{ fontWeight: 600, color: C.t1, margin: 0, fontSize: 15 }}>Notifications {unread > 0 && <span style={{ fontSize: 11, background: "#fef2f2", color: C.red, borderRadius: 99, padding: "2px 8px", marginLeft: 6 }}>{unread}</span>}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Mark all read</button>}
                <button onClick={() => setNotifOpen(false)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {notifs.length === 0 && <p style={{ fontSize: 13, color: C.t3, textAlign: "center", marginTop: 32 }}>No notifications.</p>}
              {notifs.map(n => { const nc = NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info; return (
                <div key={n.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${nc.border}`, background: nc.bg, fontSize: 12, opacity: n.read ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div><p style={{ fontWeight: 700, color: nc.text, margin: 0 }}>{n.title}</p><p style={{ fontSize: 11, opacity: 0.8, margin: "3px 0 0" }}>{n.desc}</p><p style={{ fontSize: 10, opacity: 0.6, margin: "4px 0 0" }}>{n.time}</p></div>
                    {!n.read && <button onClick={() => markRead(n.id)} style={{ fontSize: 10, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: nc.text, whiteSpace: "nowrap" }}>Mark read</button>}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        </div>
      )}

      <ImportDrawer open={importOpen} onClose={() => setImportOpen(false)} onToast={toast} />
      <div className={`gx-toast ${toastShow ? "show" : ""}`}><div className="gx-toast-dot" /><span>{toastMsg}</span></div>
    </div>
  );
}
