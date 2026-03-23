// ============================================================
//  TicketsPage.tsx  —  F&B (Popeyes)
//  FIX: Added paddingTop: 56 to gx-main to offset fixed header
// ============================================================

'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from '../Header/header_main';
import "../../globals.css";

type CPView = "overview" | "tickets" | "users" | "settings";
type TicketStatus = "open" | "pending" | "closed";
type Period = "7D" | "30D" | "90D";

interface Ticket { id: string; sub: string; time: string; branch: string; }
interface Notification {
  id: number; type: "warn" | "error" | "info" | "success" | "purple";
  title: string; desc: string; time: string; read: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const TICKETS: Record<TicketStatus, Ticket[]> = {
  open: [
    { id: "#89323930193", sub: "Hardware error on POS 3",    time: "2h ago",  branch: "Manila" },
    { id: "#89323930194", sub: "Network timeout on POS 5",   time: "3h ago",  branch: "Manila" },
    { id: "#89323930195", sub: "Receipt printer offline",    time: "5h ago",  branch: "Makati" },
    { id: "#89323930196", sub: "Card reader sync failure",   time: "6h ago",  branch: "Manila" },
    { id: "#89323930197", sub: "Display calibration issue",  time: "1d ago",  branch: "Makati" },
    { id: "#89323930198", sub: "Software license renewal",   time: "1d ago",  branch: "Manila" },
    { id: "#89323930199", sub: "POS 2 connectivity drop",    time: "2d ago",  branch: "Makati" },
    { id: "#89323930200", sub: "Barcode scanner error",      time: "2d ago",  branch: "Manila" },
  ],
  pending: [
    { id: "#89323930181", sub: "POS firmware update review", time: "3d ago",  branch: "Manila" },
    { id: "#89323930182", sub: "User access audit pending",  time: "4d ago",  branch: "Makati" },
    { id: "#89323930183", sub: "Hardware warranty claim",    time: "5d ago",  branch: "Makati" },
  ],
  closed: [
    { id: "#89323930170", sub: "POS 4 reboot resolved",      time: "1wk ago", branch: "Manila" },
    { id: "#89323930171", sub: "Network switch replaced",    time: "1wk ago", branch: "Makati" },
    { id: "#89323930172", sub: "Software patch applied",     time: "2wk ago", branch: "Manila" },
    { id: "#89323930173", sub: "Printer driver reinstalled", time: "2wk ago", branch: "Makati" },
  ],
};

const COMMON_ISSUES = [
  { label: "Hardware Error",     count: 4, color: "#dc2626" },
  { label: "Network / Timeout",  count: 3, color: "#0d9488" },
  { label: "Printer / Scanner",  count: 3, color: "#6d28d9" },
  { label: "Software / License", count: 2, color: "#ca8a04" },
  { label: "Other",              count: 2, color: "#0369a1" },
];

const TREND_DATA = [
  { day: "Mon", newT: 16, resolved: 14, critical: 3 },
  { day: "Tue", newT: 18, resolved: 15, critical: 4 },
  { day: "Wed", newT: 15, resolved: 17, critical: 2 },
  { day: "Thu", newT: 20, resolved: 16, critical: 5 },
  { day: "Fri", newT: 14, resolved: 13, critical: 2 },
  { day: "Sat", newT: 8,  resolved: 10, critical: 1 },
  { day: "Sun", newT: 5,  resolved: 2,  critical: 1 },
];

const CATEGORIES = [
  { label: "POS Hardware",           count: 33, color: "#6d28d9", change: +22 },
  { label: "Software / App",         count: 21, color: "#0369a1", change: -8  },
  { label: "Network / Connectivity", count: 17, color: "#0d9488", change: +5  },
  { label: "Account / Access",       count: 14, color: "#ca8a04", change: -3  },
  { label: "Hardware Other",         count: 7,  color: "#dc2626", change: +1  },
  { label: "Other",                  count: 4,  color: "#9ca3af", change: 0   },
];

const NOTIFS_INIT: Notification[] = [
  { id: 1, type: "warn",    title: "SA Expiry Notice",       desc: "Your Software Assurance ends May 31, 2025. Contact your account manager to renew.", time: "Just now",    read: false },
  { id: 2, type: "error",   title: "Open Ticket Alert",      desc: "Ticket #89323930193 — Hardware error on POS 3 has been open for 2+ hours.",           time: "2 hours ago", read: false },
  { id: 3, type: "info",    title: "New Ticket Submitted",   desc: "Ticket #89323930200 — Barcode scanner error has been filed for Manila branch.",        time: "2 days ago",  read: false },
  { id: 4, type: "success", title: "Ticket Resolved",        desc: "Ticket #89323930170 — POS 4 reboot issue has been marked as resolved.",                time: "1 week ago",  read: true  },
  { id: 5, type: "purple",  title: "Account Manager Update", desc: "Maria Santos has updated your account details. Review the changes in Overview.",       time: "1 week ago",  read: true  },
];

const NOTIF_ICONS: Record<string, JSX.Element> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8l1.5.9"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

const STATUS_DOT:   Record<TicketStatus, string> = { open: "dot-r", pending: "dot-y", closed: "dot-g" };
const STATUS_COLOR: Record<TicketStatus, string> = { open: "var(--red)", pending: "var(--a)", closed: "var(--grn)" };
const TAB_LABEL:    Record<TicketStatus, string> = { open: "Open", pending: "Pending", closed: "Closed" };

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState(""); const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => { setMsg(m); setShow(true); clearTimeout(timer.current); timer.current = setTimeout(() => setShow(false), 2600); };
  return { msg, show, toast };
}
function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

// ─────────────────────────────────────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────────────────────────────────────
const DonutChart: React.FC<{ data: typeof COMMON_ISSUES; size?: number }> = ({ data, size = 116 }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 42; const cx = 58; const cy = 58;
  const circumference = 2 * Math.PI * r;
  const gap = 2;
  let cumulative = 0;
  const slices = data.map((d, i) => {
    const pct = d.count / total;
    const len = pct * circumference - gap;
    const offset = cumulative;
    cumulative += pct * circumference;
    return { ...d, len, offset, pct, i };
  });
  const active = hovered !== null ? slices[hovered] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1, minHeight: 0 }}>
      <svg width={size} height={size} viewBox="0 0 116 116" style={{ flexShrink: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f4" strokeWidth="18" />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {slices.map((s) => (
            <circle key={s.i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
              strokeWidth={hovered === s.i ? 22 : 18}
              strokeDasharray={`${s.len} ${circumference}`}
              strokeDashoffset={-s.offset} strokeLinecap="butt"
              style={{ transition: "stroke-width .15s", cursor: "pointer" }}
              onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)} />
          ))}
        </g>
        {active ? (
          <>
            <text x={cx} y={cy - 7} textAnchor="middle" fontSize="17" fontWeight="800" fill={active.color}>{active.count}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={active.color}>{Math.round(active.pct * 100)}%</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#1e1b4b">{total}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fontWeight="700" fill="#9ca3af" letterSpacing="0.08em">TOTAL</text>
          </>
        )}
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {slices.map((s) => (
          <div key={s.i} onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "default", padding: "4px 6px", borderRadius: 7,
              background: hovered === s.i ? `${s.color}10` : "transparent", transition: "background .15s" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#374151", flex: 1, fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: s.color, minWidth: 14, textAlign: "right" as const }}>{s.count}</span>
            <span style={{ fontSize: 9.5, color: "#9ca3af", minWidth: 28, textAlign: "right" as const }}>{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const Stat: React.FC<{ ico: string; icon: JSX.Element; value: React.ReactNode; label: string }> = ({ ico, icon, value, label }) => (
  <div className="gx-stat">
    <div className={`gx-stat-ico ${ico}`}>{icon}</div>
    <div><div className="gx-stat-num">{value}</div><div className="gx-stat-lbl">{label}</div></div>
  </div>
);

const NotifPanel: React.FC<{ notifs: Notification[]; onRead: (id: number) => void; onMarkAll: () => void; onClose: () => void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div className="gx-notif-panel" ref={ref}>
      <div className="gx-np-hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="gx-np-title">Notifications</span>
          <span className={`gx-np-unread ${unread === 0 ? "all-read" : ""}`}>{unread > 0 ? `${unread} unread` : "All read"}</span>
        </div>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all as read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.map(n => (
          <div key={n.id} className={`gx-ni ${n.read ? "" : "unread"}`} onClick={() => onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NOTIF_ICONS[n.type]}</div>
            <div className="gx-ni-body">
              <div className="gx-ni-title">{n.title}</div>
              <div className="gx-ni-desc">{n.desc}</div>
              <div className="gx-ni-time">{n.time}</div>
            </div>
            {!n.read && <div className="gx-ni-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  purple: "#7c3aed", purpleD: "#5b21b6", purpleLt: "#ede9fe",
  teal: "#0d9488", amber: "#d97706", red: "#dc2626", green: "#16a34a",
  t1: "#18103a", t2: "#4a3870", t3: "#8e7ec0", t4: "#b8aed8",
  surface: "#ffffff", surface2: "#f2f0fb",
  border: "rgba(124,58,237,0.1)", borderMd: "rgba(124,58,237,0.22)",
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Analytics Header
const AnalyticsHeader: React.FC<{ period: Period; onPeriod: (p: Period) => void; onExport: () => void }> = ({ period, onPeriod, onExport }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
    <h2 style={{ fontSize: 19, fontWeight: 400, color: C.t1, margin: 0, fontFamily: "'DM Serif Display', serif", whiteSpace: "nowrap" as const }}>
      Ticket <em style={{ fontStyle: "italic", color: C.purple }}>Analytics</em>
    </h2>
    <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(124,58,237,0.15),transparent)", minWidth: 20 }} />
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
      <span style={{ fontSize: 9.5, color: C.t3, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const }}>Period</span>
      {(["7D","30D","90D"] as Period[]).map(p => (
        <button key={p} onClick={() => onPeriod(p)} style={{
          padding: "5px 14px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
          border: period === p ? `1.5px solid ${C.purple}` : `1.5px solid rgba(124,58,237,0.16)`,
          background: period === p ? C.purple : "#fff",
          color: period === p ? "#fff" : C.t2,
          boxShadow: period === p ? "0 2px 10px rgba(124,58,237,0.3)" : "none",
          transition: "all .14s", fontFamily: "inherit",
        }}>{p}</button>
      ))}
      <button onClick={onExport} style={{
        padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
        fontSize: 11.5, fontWeight: 600, color: "#fff", fontFamily: "inherit",
        background: "linear-gradient(135deg,#7c3aed,#0d9488)",
        boxShadow: "0 2px 10px rgba(124,58,237,0.28)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12">
          <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/>
        </svg>
        Export Report
      </button>
    </div>
  </div>
);

// 2. KPI Cards
const KpiCard: React.FC<{ label: string; num: React.ReactNode; unit?: string; delta: string; dir: "up"|"dn"; sub: string; accent: string; bar: number }> = ({ label, num, unit, delta, dir, sub, accent, bar }) => {
  const deltaBg    = dir === "up" ? "rgba(220,38,38,0.1)"  : "rgba(22,163,74,0.1)";
  const deltaColor = dir === "up" ? C.red : C.green;
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, padding: "20px 20px 16px" }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: accent, opacity: 0.06, pointerEvents: "none" }} />
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: C.t3, marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: "-1px", color: accent }}>{num}</div>
        {unit && <div style={{ fontSize: 12, fontWeight: 600, paddingBottom: 2, color: C.t3 }}>{unit}</div>}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, marginBottom: 8, background: deltaBg, color: deltaColor }}>
        {dir === "up" ? "▲" : "▼"} {delta}
      </div>
      <div style={{ fontSize: 10.5, color: C.t3, marginBottom: 12 }}>{sub}</div>
      <div style={{ height: 3, borderRadius: 2, background: C.surface2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: accent, width: `${bar}%`, transition: "width .7s ease" }} />
      </div>
    </div>
  );
};

const TicketKPIs: React.FC = () => (
  <div style={{ display: "flex", gap: 12 }}>
    <div style={{ flex: 1 }}>
      <KpiCard label="Total Tickets" num={96} delta="+12% vs prev period" dir="up" sub="Last 7 days" accent={C.purple} bar={68} />
    </div>
    <div style={{ flex: 1 }}>
      <KpiCard label="Avg Resolution" num={3.2} unit="hrs" delta="−0.4h improvement" dir="dn" sub="Time to close ticket" accent={C.teal} bar={52} />
    </div>
  </div>
);

// 4. Ticket Volume Trend card
const VolumeTrendCard: React.FC = () => {
  const W = 520, H = 120;
  const pad = { t: 8, b: 8, l: 4, r: 4 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const maxV = Math.max(...TREND_DATA.flatMap(d => [d.newT, d.resolved, d.critical]));
  const xs   = TREND_DATA.map((_, i) => pad.l + (i / (TREND_DATA.length - 1)) * iW);
  const yOf  = (v: number) => pad.t + iH - (v / maxV) * iH;
  const mkPts = (key: "newT"|"resolved"|"critical") => TREND_DATA.map((d, i) => `${xs[i].toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" ");
  const mkArea = (key: "newT"|"resolved"|"critical") => {
    const pts = TREND_DATA.map((d, i) => `${xs[i].toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" L");
    return `M${xs[0].toFixed(1)},${(pad.t+iH).toFixed(1)} L${pts} L${xs[xs.length-1].toFixed(1)},${(pad.t+iH).toFixed(1)} Z`;
  };
  const gridYs = [0.25,0.5,0.75,1].map(f => (pad.t + iH*(1-f)).toFixed(1));
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, marginBottom: 2 }}>Ticket Volume Trend</div>
          <div style={{ fontSize: 10, color: C.t3 }}>Daily new &amp; closed tickets — last 7 days</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, padding: "4px 10px", borderRadius: 20, background: C.surface2, border: `1px solid ${C.border}`, color: C.t3, whiteSpace: "nowrap" as const }}>7 Days</span>
      </div>
      <div style={{ position: "relative", height: 120 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {gridYs.map((y,i) => <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="rgba(124,58,237,0.07)" strokeWidth="1"/>)}
          <path d={mkArea("resolved")}   fill="#16a34a" fillOpacity="0.07"/>
          <path d={mkArea("newT")}       fill="#7c3aed" fillOpacity="0.07"/>
          <polyline points={mkPts("resolved")}   fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={mkPts("newT")}       fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={mkPts("critical")}   fill="none" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
        </svg>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const, marginTop: 12 }}>
        {[["#7c3aed","New"],["#16a34a","Resolved"],["#dc2626","Critical"]].map(([col,lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.t2 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }}/>
            {lbl}
          </div>
        ))}
      </div>
      <div style={{ background: C.surface2, borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: C.t3, marginBottom: 6 }}>📊 Trend Summary</div>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>96 tickets created, 87 resolved over 7 days. Net backlog change: +9. Peak volume mid-period likely linked to a system update rollout.</div>
      </div>
    </div>
  );
};

// 5. Tickets by Category card
const CategoriesCard: React.FC = () => {
  const catTotal = CATEGORIES.reduce((s,c) => s+c.count, 0);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 20px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, marginBottom: 2 }}>Tickets by Category</div>
        <div style={{ fontSize: 10, color: C.t3 }}>Volume &amp; week-over-week change</div>
      </div>
      <div>
        {CATEGORIES.map((c, idx) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 0, padding: "5px 0", borderBottom: idx < CATEGORIES.length-1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: c.color, flexShrink: 0, marginRight: 12 }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: C.t1, flex: "1 1 0", minWidth: 0, paddingRight: 14 }}>{c.label}</div>
            <div style={{ width: 96, height: 6, borderRadius: 3, background: C.surface2, overflow: "hidden", flexShrink: 0, marginRight: 14 }}>
              <div style={{ height: "100%", borderRadius: 3, opacity: 0.75, background: c.color, width: `${(c.count/catTotal)*100}%` }} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, width: 26, textAlign: "right" as const, marginRight: 12 }}>{c.count}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, width: 54, textAlign: "right" as const, color: c.change > 0 ? C.red : c.change < 0 ? C.green : C.t3 }}>
              {c.change > 0 ? `▲ +${c.change}%` : c.change < 0 ? `▼ ${c.change}%` : "—"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: C.surface2, borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: C.t3, marginBottom: 6 }}>🔍 Category Findings</div>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>POS Hardware dominates at 34% of tickets (+22%). Software issues declined 8% — recent app updates appear effective. Network tickets rose slightly; monitor for infrastructure concerns.</div>
      </div>
    </div>
  );
};

// 6. Backlog Health card
const BacklogHealthCard: React.FC = () => {
  const items = [
    { n: 7, label: "Fresh",   sub: "< 24h open",    bg: "rgba(22,163,74,0.08)",  bdr: "rgba(22,163,74,0.2)",  col: C.green },
    { n: 4, label: "Aging",   sub: "24h – 72h",     bg: "rgba(217,119,6,0.08)",  bdr: "rgba(217,119,6,0.2)",  col: C.amber },
    { n: 2, label: "Overdue", sub: "> 72h open",     bg: "rgba(220,38,38,0.08)",  bdr: "rgba(220,38,38,0.2)",  col: C.red   },
  ];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 20px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, marginBottom: 2 }}>Backlog Health</div>
          <div style={{ fontSize: 10, color: C.t3 }}>Open ticket age &amp; risk breakdown</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, padding: "4px 10px", borderRadius: 20, background: C.surface2, border: `1px solid ${C.border}`, color: C.t3, whiteSpace: "nowrap" as const }}>Live</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {items.map(({ n, label, sub, bg, bdr, col }) => (
          <div key={label} style={{ flex: 1, padding: "12px 8px", background: bg, borderRadius: 10, border: `1px solid ${bdr}`, textAlign: "center" as const }}>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-1px", color: col }}>{n}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" as const, color: C.t3, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", gap: 2, marginBottom: 6 }}>
        {[{pct:54,col:C.green},{pct:31,col:C.amber},{pct:15,col:C.red}].map(({pct,col},i) => (
          <div key={i} style={{ height: "100%", borderRadius: 4, background: col, width: `${pct}%`, transition: "width .7s ease" }}/>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.t3 }}>
        <span>🟢 54% fresh</span><span>🟡 31% aging</span><span>🔴 15% overdue</span>
      </div>
      <div style={{ background: C.surface2, borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: C.t3, marginBottom: 6 }}>🩺 Backlog Findings</div>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.65 }}>2 tickets have been open &gt;72h and need immediate attention. 15% overdue rate — within acceptable range. Manila branch holds the most aging items.</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────
const SLIDE_LABELS = ["KPIs", "Volume Trend", "Categories & Backlog"];

const AnalyticsCarousel: React.FC<{ period: Period; onPeriod: (p: Period) => void; onExport: () => void; slide: number; onSlide: (n: number) => void }> = ({ period, onPeriod, onExport, slide, onSlide }) => {
  const [dir, setDir]     = useState<1 | -1>(1);
  const [anim, setAnim]   = useState(false);
  const touchX            = useRef<number | null>(null);
  const total             = SLIDE_LABELS.length;

  const go = (next: number) => {
    if (next === slide) return;
    setDir(next > slide ? 1 : -1);
    setAnim(true);
    setTimeout(() => { onSlide(next); setAnim(false); }, 220);
  };
  const prev = () => go((slide - 1 + total) % total);
  const next = () => go((slide + 1) % total);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchX.current = null;
  };

  const slideStyle: React.CSSProperties = {
    transition: anim ? "opacity .2s ease, transform .22s ease" : "none",
    opacity: anim ? 0 : 1,
    transform: anim ? `translateX(${dir * 24}px)` : "translateX(0)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <AnalyticsHeader period={period} onPeriod={onPeriod} onExport={onExport} />
      <div style={{ position: "relative" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={slideStyle}>
          {slide === 0 && <TicketKPIs />}
          {slide === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <VolumeTrendCard />
            </div>
          )}
          {slide === 2 && (
            <div className="g2" style={{ alignItems: "start" }}>
              <CategoriesCard />
              <BacklogHealthCard />
            </div>
          )}
        </div>
        <button onClick={prev} style={{ position: "absolute", top: "50%", left: -18, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.borderMd}`, background: "#fff", boxShadow: "0 2px 8px rgba(124,58,237,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, color: C.purple }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6.5 2L3.5 5l3 3"/></svg>
        </button>
        <button onClick={next} style={{ position: "absolute", top: "50%", right: -18, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.borderMd}`, background: "#fff", boxShadow: "0 2px 8px rgba(124,58,237,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, color: C.purple }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3.5 2l3 3-3 3"/></svg>
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDE_LABELS.map((_, i) => (
            <button key={i} onClick={() => go(i)} style={{ width: slide === i ? 20 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0, background: slide === i ? C.purple : "rgba(124,58,237,0.2)", transition: "all .25s ease" }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>{SLIDE_LABELS[slide]}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS PAGE
// ─────────────────────────────────────────────────────────────────────────────
interface UserProfile {
  id:           number;
  username:     string;
  role:         string;
  accessLevel:  string;
  fullName:     string;
  initials:     string;
  position:     string;
  company:      string;
  companyId:    number | null;
  profilePhoto: string | null;
}

interface TicketsPageProps {
  onNavigate:   (view: CPView) => void;
  onLogout?:    () => void;
  userProfile?: UserProfile | null;
}

const TicketsPage: React.FC<TicketsPageProps> = ({ onNavigate, onLogout, userProfile }) => {
  const { msg, show, toast }      = useToast();
  const [activeStatus, setActive] = useState<TicketStatus>("open");
  const [notifs, setNotifs]       = useState<Notification[]>(NOTIFS_INIT);
  const [notifOpen, setNotifOpen] = useState(false);
  const [period, setPeriod]       = useState<Period>("7D");
  const [slide, setSlide]         = useState(0);

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar activePage="tickets" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0, overflow:"hidden" }}>
        <Header
          user={{
            initials:     userProfile?.initials     ?? '',
            fullName:     userProfile?.fullName     ?? '',
            position:     userProfile?.position     ?? '',
            company:      userProfile?.company      ?? '',
            profilePhoto: userProfile?.profilePhoto ?? null,
          }}
          logoSrc="/geniex-logo.png"
          brandSlotMode="client"
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />
        {/* ── FIX: paddingTop offsets the fixed 56px header ── */}
        <div className="gx-main" style={{ paddingTop: 56 }}>
          <div className="gx-view">
            <div className="gx-ph">
              <div className="gx-ph-title">Support <em>Tickets</em></div>
              <div className="gx-ph-rule" />
            </div>
            <div className="gx-scroll">
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Tab row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div className="gx-tkt-tabs">
                    {(["open", "pending", "closed"] as TicketStatus[]).map(s => (
                      <button key={s} className={`gx-tkt-tab ${activeStatus === s ? `tab-${s}` : ""}`} onClick={() => setActive(s)}>
                        <span className={`dot ${STATUS_DOT[s]}`} style={{ width: 5, height: 5 }} />
                        {TAB_LABEL[s]}
                        <span className="gx-tkt-n">{TICKETS[s].length}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(109,40,217,0.18),transparent)" }} />
                  <button className="btn btn-s btn-sm" onClick={() => toast("Exporting tickets…")}>Export</button>
                </div>

                {/* Stats */}
                <div className="g2">
                  <Stat ico="si-r" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>} value={8} label="Open Tickets" />
                  <Stat ico="si-g" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 8.5l3.5 3.5 7.5-7.5"/></svg>} value={42} label="Resolved This Month" />
                </div>

                {/* ── ANALYTICS CAROUSEL ── */}
                <AnalyticsCarousel period={period} onPeriod={setPeriod} onExport={() => toast("Exporting report…")} slide={slide} onSlide={setSlide} />

                {/* ── ORIGINAL CONTENT — only visible on slide 0 ── */}
                {slide === 0 && (
                  <div className="g2" style={{ alignItems: "start" }}>
                    {/* Common Issues donut chart + Summary */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="gx-card" style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <span className="gx-card-title">Common Issues</span>
                          <span className="gx-card-sub">All time</span>
                        </div>
                        <DonutChart data={COMMON_ISSUES} />
                      </div>
                      {/* Summary & Findings */}
                      <div className="gx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(109,40,217,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#6d28d9" strokeWidth="1.5"><path d="M2 12h12M2 8h8M2 4h5"/></svg>
                          </div>
                          <span className="gx-card-title" style={{ margin: 0 }}>Summary &amp; Findings</span>
                        </div>
                        <div style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.12)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626", flexShrink: 0, marginTop: 3 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 2 }}>Top Issue: Hardware Error</div>
                            <div style={{ fontSize: 10.5, color: "var(--c2)", lineHeight: 1.5 }}>Hardware errors account for the highest volume at 29% of all tickets. Recurring faults suggest aging POS units at Manila branch may need proactive replacement or maintenance scheduling.</div>
                          </div>
                        </div>
                        <div style={{ background: "rgba(13,148,136,0.05)", border: "1px solid rgba(13,148,136,0.12)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0d9488", flexShrink: 0, marginTop: 3 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", marginBottom: 2 }}>Network &amp; Printer Issues Tied at 21%</div>
                            <div style={{ fontSize: 10.5, color: "var(--c2)", lineHeight: 1.5 }}>Network timeouts and printer/scanner failures each represent 21% of tickets. These may be linked to infrastructure instability — a network audit and peripheral firmware update is recommended.</div>
                          </div>
                        </div>
                        <div style={{ background: "rgba(109,40,217,0.05)", border: "1px solid rgba(109,40,217,0.1)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6d28d9", flexShrink: 0, marginTop: 3 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 2 }}>Recommendation</div>
                            <div style={{ fontSize: 10.5, color: "var(--c2)", lineHeight: 1.5 }}>Priority should be placed on hardware inspections and network stability at Manila branch. Scheduling a preventive maintenance visit within 2 weeks is advised to reduce recurring open tickets.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Ticket list */}
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 16px 12px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Ticket List</span>
                        <button style={{ fontSize: 10.5, fontWeight: 600, color: C.purple, background: "rgba(124,58,237,0.07)", border: `1px solid rgba(124,58,237,0.15)`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }} onClick={() => toast("Viewing all tickets")}>View All</button>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto" }}>
                        {TICKETS[activeStatus].map((t, idx) => (
                          <div key={t.id} onClick={() => toast(`Viewing ticket ${t.id}`)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, cursor: "pointer", borderBottom: idx < TICKETS[activeStatus].length-1 ? `1px solid ${C.border}` : "none", transition: "background .12s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[activeStatus], flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, flexShrink: 0, fontFamily: "monospace" }}>{t.id}</span>
                            <span style={{ fontSize: 11, color: C.t1, flex: 1, fontWeight: 500 }}>{t.sub} <span style={{ color: C.t4, fontSize: 9.5 }}>· {t.branch}</span></span>
                            <span style={{ fontSize: 10, color: C.t3, flexShrink: 0 }}>{t.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`gx-toast ${show ? "show" : ""}`}><div className="gx-toast-dot" /><span>{msg}</span></div>
      {notifOpen && <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
    </div>
  );
};

export default TicketsPage;