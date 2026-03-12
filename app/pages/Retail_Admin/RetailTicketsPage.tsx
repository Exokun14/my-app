// ============================================================
//  RetailTicketsPage.tsx  —  Retail (Nike / SM / Ayala)
//  Added: Ticket Analytics header, AI Summary, Volume Trend,
//         Tickets by Product Team, Tickets by Category,
//         Tickets by Client donut, Backlog Health
// ============================================================

'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
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
    { id: "#00000001", sub: "POS 1 connectivity issue",    time: "2h ago",  branch: "SM Mall" },
    { id: "#00000002", sub: "Barcode scanner error",       time: "3h ago",  branch: "Ayala"   },
    { id: "#00000003", sub: "Receipt printer offline",     time: "5h ago",  branch: "SM Mall" },
    { id: "#00000004", sub: "Card reader sync failure",    time: "6h ago",  branch: "Ayala"   },
    { id: "#00000005", sub: "Display calibration issue",   time: "1d ago",  branch: "SM Mall" },
    { id: "#00000006", sub: "Software license renewal",    time: "1d ago",  branch: "SM Mall" },
    { id: "#00000007", sub: "POS 3 network timeout",       time: "2d ago",  branch: "Ayala"   },
    { id: "#00000008", sub: "Hardware error on POS 4",     time: "2d ago",  branch: "SM Mall" },
  ],
  pending: [
    { id: "#00000009",  sub: "POS firmware update review", time: "3d ago",  branch: "SM Mall" },
    { id: "#00000010",  sub: "User access audit pending",  time: "4d ago",  branch: "Ayala"   },
    { id: "#00000011",  sub: "Hardware warranty claim",    time: "5d ago",  branch: "SM Mall" },
  ],
  closed: [
    { id: "#00000012",  sub: "POS 2 reboot resolved",      time: "1wk ago", branch: "SM Mall" },
    { id: "#00000013",  sub: "Network switch replaced",    time: "1wk ago", branch: "Ayala"   },
    { id: "#00000014",  sub: "Software patch applied",     time: "2wk ago", branch: "SM Mall" },
    { id: "#00000015",  sub: "Printer driver reinstalled", time: "2wk ago", branch: "Ayala"   },
  ],
};

const COMMON_ISSUES = [
  { label: "Hardware Error",     count: 4, color: "#dc2626" },
  { label: "Network / Timeout",  count: 3, color: "#0d9488" },
  { label: "Printer / Scanner",  count: 3, color: "#0369a1" },
  { label: "Software / License", count: 2, color: "#ca8a04" },
  { label: "Other",              count: 2, color: "#9ca3af" },
];

// Ticket Volume Trend — 7 days of data
const TREND_DATA = [
  { day: "Mon", newT: 12, resolved: 11, critical: 2 },
  { day: "Tue", newT: 15, resolved: 13, critical: 3 },
  { day: "Wed", newT: 11, resolved: 14, critical: 1 },
  { day: "Thu", newT: 17, resolved: 12, critical: 4 },
  { day: "Fri", newT: 13, resolved: 12, critical: 2 },
  { day: "Sat", newT: 9,  resolved: 11, critical: 1 },
  { day: "Sun", newT: 4,  resolved: 3,  critical: 0 },
];

// Tickets by Category
const CATEGORIES = [
  { label: "POS Hardware",          count: 28, color: "#0369a1", change: +18 },
  { label: "Network / Connectivity",count: 19, color: "#0d9488", change: +7  },
  { label: "Software / App",        count: 16, color: "#6d28d9", change: -5  },
  { label: "Account / Access",      count: 10, color: "#ca8a04", change: -2  },
  { label: "Printer / Scanner",     count: 5,  color: "#dc2626", change: +3  },
  { label: "Other",                 count: 2,  color: "#9ca3af", change: 0   },
];


const NOTIFS_INIT: Notification[] = [
  { id: 1, type: "warn",    title: "SA Expiry Notice",     desc: "Your Software Assurance ends Jun 14, 2026. Contact your account manager to renew.", time: "Just now",    read: false },
  { id: 2, type: "error",   title: "Open Ticket Alert",    desc: "Ticket #00000001 — POS 1 connectivity issue at SM Mall has been open for 2+ hours.", time: "2 hours ago", read: false },
  { id: 3, type: "info",    title: "New Ticket Submitted", desc: "Ticket #00000002 — Barcode scanner error at Ayala branch has been filed.",           time: "1 day ago",   read: false },
  { id: 4, type: "success", title: "Ticket Resolved",      desc: "Ticket #00000003 — POS 3 reboot issue has been marked as resolved.",                 time: "1 week ago",  read: true  },
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
// SPARKLINE / VOLUME TREND CHART
// ─────────────────────────────────────────────────────────────────────────────
const VolumeTrendChart: React.FC<{ data: typeof TREND_DATA }> = ({ data }) => {
  const W = 520; const H = 90; const pad = { t: 8, b: 20, l: 8, r: 8 };
  const iW = W - pad.l - pad.r; const iH = H - pad.t - pad.b;
  const maxV = Math.max(...data.flatMap(d => [d.newT, d.resolved, d.critical]));
  const xs = data.map((_, i) => pad.l + (i / (data.length - 1)) * iW);
  const yOf = (v: number) => pad.t + iH - (v / maxV) * iH;

  const line = (key: "newT" | "resolved" | "critical") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" ");

  const area = (key: "newT" | "resolved" | "critical") => {
    const pts = data.map((d, i) => `${xs[i].toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" L");
    return `M${xs[0].toFixed(1)},${(pad.t + iH).toFixed(1)} L${pts} L${xs[xs.length - 1].toFixed(1)},${(pad.t + iH).toFixed(1)} Z`;
  };

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        <defs>
          <linearGradient id="rga-new" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0369a1" stopOpacity=".18"/><stop offset="100%" stopColor="#0369a1" stopOpacity="0"/></linearGradient>
          <linearGradient id="rga-res" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity=".15"/><stop offset="100%" stopColor="#0d9488" stopOpacity="0"/></linearGradient>
          <linearGradient id="rga-crit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" stopOpacity=".12"/><stop offset="100%" stopColor="#dc2626" stopOpacity="0"/></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + iH * (1 - f)} y2={pad.t + iH * (1 - f)}
            stroke="#f0eef8" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        <path d={area("newT")} fill="url(#rga-new)" />
        <path d={area("resolved")} fill="url(#rga-res)" />
        <path d={area("critical")} fill="url(#rga-crit)" />
        <path d={line("newT")} fill="none" stroke="#0369a1" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("resolved")} fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("critical")} fill="none" stroke="#dc2626" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 3" />
        {data.map((d, i) => (
          <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="600">{d.day}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
        {[{ color: "#0369a1", label: "New" }, { color: "#0d9488", label: "Resolved" }, { color: "#dc2626", label: "Critical", dashed: true }].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 2" : undefined} /></svg>
            <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{label}</span>
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
// ANALYTICS SECTIONS (new)
// ─────────────────────────────────────────────────────────────────────────────

const AnalyticsHeader: React.FC<{ period: Period; onPeriod: (p: Period) => void; onExport: () => void }> = ({ period, onPeriod, onExport }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 2 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b" }}>
      Ticket <em style={{ fontStyle: "italic", color: "#0369a1" }}>Analytics</em>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: ".06em" }}>PERIOD</span>
      <div style={{ display: "flex", background: "#f0f7ff", borderRadius: 8, padding: 2, gap: 2 }}>
        {(["7D", "30D", "90D"] as Period[]).map(p => (
          <button key={p} onClick={() => onPeriod(p)}
            style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: period === p ? "#0369a1" : "transparent",
              color: period === p ? "#fff" : "#6b7280", transition: "all .15s", fontFamily: "inherit" }}>
            {p}
          </button>
        ))}
      </div>
      <button style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
        background: "#fff", boxShadow: "0 1px 4px rgba(3,105,161,0.15)", color: "#0369a1", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
        onClick={onExport}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 2v9M4 8l4 4 4-4M2 14h12"/>
        </svg>
        Export Report
      </button>
    </div>
  </div>
);

const TicketKPIs: React.FC = () => (
  <div style={{ display: "flex", gap: 14 }}>
    <div className="gx-card" style={{ flex: 1, padding: "14px 18px" }}>
      <div style={{ fontSize: 9.5, color: "#9ca3af", fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>TOTAL TICKETS</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#1e1b4b", lineHeight: 1 }}>80</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.08)", padding: "2px 6px", borderRadius: 5 }}>▼ +8%</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>Last 7 days</span>
      </div>
      <div style={{ height: 3, background: "linear-gradient(to right,#0369a1,#0d9488)", borderRadius: 2, marginTop: 10 }} />
    </div>
    <div className="gx-card" style={{ flex: 1, padding: "14px 18px" }}>
      <div style={{ fontSize: 9.5, color: "#9ca3af", fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>AVG RESOLUTION</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: "#1e1b4b", lineHeight: 1 }}>2.8</span>
        <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>hrs</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#0d9488", background: "rgba(13,148,136,0.08)", padding: "2px 6px", borderRadius: 5 }}>▲ −0.6h</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>time to close ticket</span>
      </div>
      <div style={{ height: 3, background: "linear-gradient(to right,#0d9488,#0369a1)", borderRadius: 2, marginTop: 10 }} />
    </div>
  </div>
);

// (AI Summary removed)

const VolumeTrendCard: React.FC = () => (
  <div className="gx-card" style={{ flex: 1 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div>
        <div className="gx-card-title">Ticket Volume Trend</div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Daily new &amp; closed tickets — last 7 days</div>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#0369a1", background: "rgba(3,105,161,0.08)", padding: "3px 9px", borderRadius: 6 }}>7 DAYS</span>
    </div>
    <VolumeTrendChart data={TREND_DATA} />
    <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(3,105,161,0.04)", borderRadius: 9, border: "1px solid rgba(3,105,161,0.08)" }}>
      <div style={{ fontSize: 9.5, color: "#0369a1", fontWeight: 700, letterSpacing: ".07em", marginBottom: 4 }}>📊 TREND SUMMARY</div>
      <p style={{ fontSize: 10.5, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
        80 tickets created, 76 resolved over 7 days. Net backlog change: +4. Peak volume mid-period likely linked to a POS firmware deployment at SM Mall.
      </p>
    </div>
  </div>
);

const CategoriesCard: React.FC = () => {
  const maxCount = Math.max(...CATEGORIES.map(c => c.count));
  return (
    <div className="gx-card">
      <div style={{ marginBottom: 12 }}>
        <div className="gx-card-title">Tickets by Category</div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Volume &amp; week-over-week change</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CATEGORIES.map((c) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#374151", flex: 1, fontWeight: 500 }}>{c.label}</span>
            <div style={{ width: 80, height: 5, background: "#f0f7ff", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${(c.count / maxCount) * 100}%`, background: c.color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#1e1b4b", minWidth: 20, textAlign: "right" as const }}>{c.count}</span>
            <span style={{ fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: "right" as const,
              color: c.change > 0 ? "#dc2626" : c.change < 0 ? "#0d9488" : "#9ca3af" }}>
              {c.change > 0 ? `▲+${c.change}%` : c.change < 0 ? `▼${c.change}%` : "—"}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(3,105,161,0.04)", borderRadius: 9, border: "1px solid rgba(3,105,161,0.08)" }}>
        <div style={{ fontSize: 9.5, color: "#0369a1", fontWeight: 700, letterSpacing: ".07em", marginBottom: 4 }}>🔍 CATEGORY FINDINGS</div>
        <p style={{ fontSize: 10.5, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
          POS Hardware leads at 35% (+18%). Network connectivity rising — infrastructure review recommended. Software issues are declining, suggesting recent patches are effective.
        </p>
      </div>
    </div>
  );
};

const BacklogHealthCard: React.FC = () => (
  <div className="gx-card">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div className="gx-card-title">Backlog Health</div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Open ticket age &amp; risk breakdown</div>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#0d9488", background: "rgba(13,148,136,0.1)", padding: "3px 9px", borderRadius: 6, border: "1px solid rgba(13,148,136,0.2)" }}>LIVE</span>
    </div>
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      {[
        { label: "FRESH", sub: "< 24h open", value: 6, color: "#0d9488" },
        { label: "AGING",  sub: "24h – 72h open", value: 3, color: "#ca8a04" },
        { label: "OVERDUE",sub: "> 72h open", value: 1, color: "#dc2626" },
      ].map(({ label, sub, value, color }) => (
        <div key={label} style={{ flex: 1, padding: "12px 10px", background: `${color}08`, borderRadius: 10, border: `1px solid ${color}20`, textAlign: "center" as const }}>
          <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color, marginTop: 4, letterSpacing: ".06em" }}>{label}</div>
          <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
        </div>
      ))}
    </div>
    <div style={{ height: 8, borderRadius: 6, overflow: "hidden", display: "flex", gap: 2 }}>
      <div style={{ flex: 60, background: "#0d9488", borderRadius: "6px 0 0 6px" }} />
      <div style={{ flex: 30, background: "#ca8a04" }} />
      <div style={{ flex: 10, background: "#dc2626", borderRadius: "0 6px 6px 0" }} />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
      {[{ label: "60% fresh", color: "#0d9488" }, { label: "30% aging", color: "#ca8a04" }, { label: "10% overdue", color: "#dc2626" }].map(({ label, color }) => (
        <span key={label} style={{ fontSize: 9, fontWeight: 700, color }}>{label}</span>
      ))}
    </div>
    <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(3,105,161,0.04)", borderRadius: 9, border: "1px solid rgba(3,105,161,0.08)" }}>
      <div style={{ fontSize: 9.5, color: "#0369a1", fontWeight: 700, letterSpacing: ".07em", marginBottom: 4 }}>⚠️ BACKLOG FINDINGS</div>
      <p style={{ fontSize: 10.5, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
        1 ticket has been open &gt;72h and needs immediate attention. 10% overdue rate — within acceptable range. SM Markets holds the most aging items.
      </p>
    </div>
  </div>
);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Analytics header always visible */}
      <AnalyticsHeader period={period} onPeriod={onPeriod} onExport={onExport} />

      {/* Carousel wrapper */}
      <div style={{ position: "relative" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        {/* Slide content */}
        <div style={slideStyle}>
          {slide === 0 && <TicketKPIs />}
          {slide === 1 && <VolumeTrendCard />}
          {slide === 2 && (
            <div className="g2" style={{ alignItems: "start" }}>
              <CategoriesCard />
              <BacklogHealthCard />
            </div>
          )}
        </div>

        {/* Prev arrow */}
        <button onClick={prev} style={{
          position: "absolute", top: "50%", left: -18, transform: "translateY(-50%)",
          width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(3,105,161,0.18)",
          background: "#fff", boxShadow: "0 2px 8px rgba(3,105,161,0.12)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10, color: "#0369a1",
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6.5 2L3.5 5l3 3"/></svg>
        </button>

        {/* Next arrow */}
        <button onClick={next} style={{
          position: "absolute", top: "50%", right: -18, transform: "translateY(-50%)",
          width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(3,105,161,0.18)",
          background: "#fff", boxShadow: "0 2px 8px rgba(3,105,161,0.12)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10, color: "#0369a1",
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3.5 2l3 3-3 3"/></svg>
        </button>
      </div>

      {/* Dot nav + label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDE_LABELS.map((_, i) => (
            <button key={i} onClick={() => go(i)} style={{
              width: slide === i ? 20 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
              background: slide === i ? "#0369a1" : "rgba(3,105,161,0.2)",
              transition: "all .25s ease",
            }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{SLIDE_LABELS[slide]}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RETAIL TICKETS PAGE
// ─────────────────────────────────────────────────────────────────────────────
interface TicketsPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void;
}

const RetailTicketsPage: React.FC<TicketsPageProps> = ({ onNavigate, onLogout }) => {
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
          user={{ initials:"RJ", name:"Rence Joven", role:"Manager", company:"Retail" }}
          clientLabel="Nike"
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />
        <div className="gx-main">
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
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(3,105,161,0.18),transparent)" }} />
                  <button className="btn btn-s btn-sm" onClick={() => toast("Exporting tickets…")}>Export</button>
                </div>

                {/* Stats */}
                <div className="g2">
                  <Stat ico="si-r" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>} value={TICKETS.open.length} label="Open Tickets" />
                  <Stat ico="si-g" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 8.5l3.5 3.5 7.5-7.5"/></svg>} value={TICKETS.closed.length} label="Resolved This Month" />
                </div>

                {/* ── ANALYTICS CAROUSEL ── */}
                <AnalyticsCarousel period={period} onPeriod={setPeriod} onExport={() => toast("Exporting report…")} slide={slide} onSlide={setSlide} />

                {/* ── ORIGINAL CONTENT — only visible on slide 0 ── */}
                {slide === 0 && (
                  <div className="g2" style={{ alignItems: "start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="gx-card" style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <span className="gx-card-title">Common Issues</span>
                          <span className="gx-card-sub">All time</span>
                        </div>
                        <DonutChart data={COMMON_ISSUES} />
                      </div>
                      <div className="gx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(3,105,161,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#0369a1" strokeWidth="1.5"><path d="M2 12h12M2 8h8M2 4h5"/></svg>
                          </div>
                          <span className="gx-card-title" style={{ margin: 0 }}>Summary &amp; Findings</span>
                        </div>
                        <div style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.12)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626", flexShrink: 0, marginTop: 3 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 2 }}>Top Issue: Hardware Error</div>
                            <div style={{ fontSize: 10.5, color: "var(--c2)", lineHeight: 1.5 }}>Hardware errors lead at 29% of all tickets. Recurring faults are concentrated at SM Mall branch — proactive POS unit inspection or replacement is recommended before peak retail season.</div>
                          </div>
                        </div>
                        <div style={{ background: "rgba(13,148,136,0.05)", border: "1px solid rgba(13,148,136,0.12)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0d9488", flexShrink: 0, marginTop: 3 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", marginBottom: 2 }}>Network &amp; Printer Issues Tied at 21%</div>
                            <div style={{ fontSize: 10.5, color: "var(--c2)", lineHeight: 1.5 }}>Network timeouts and peripheral errors are equally prevalent across SM Mall and Ayala branches. A coordinated firmware update and network stability check across both sites is advised.</div>
                          </div>
                        </div>
                        <div style={{ background: "rgba(3,105,161,0.05)", border: "1px solid rgba(3,105,161,0.1)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0369a1", flexShrink: 0, marginTop: 3 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", marginBottom: 2 }}>Recommendation</div>
                            <div style={{ fontSize: 10.5, color: "var(--c2)", lineHeight: 1.5 }}>Schedule a preventive maintenance visit at SM Mall within 2 weeks. Consider deploying a spare POS unit to Ayala branch as contingency given the volume of connectivity-related tickets.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="gx-card" style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span className="gx-card-title">Ticket List</span>
                        <button className="btn btn-s btn-xs" onClick={() => toast("Viewing all tickets")}>View All</button>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto" }}>
                        {TICKETS[activeStatus].map(t => (
                          <div key={t.id} className="gx-t-row" onClick={() => toast(`Viewing ticket ${t.id}`)}>
                            <span className="dot" style={{ width: 5, height: 5, background: STATUS_COLOR[activeStatus], borderRadius: "50%", flexShrink: 0 }} />
                            <span className="gx-t-id">{t.id}</span>
                            <span className="gx-t-sub">{t.sub} <span style={{ color: "var(--c3)", fontSize: 9 }}>· {t.branch}</span></span>
                            <span className="gx-t-time">{t.time}</span>
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

export default RetailTicketsPage;