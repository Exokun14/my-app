// ============================================================
//  RetailTicketsPage.tsx
//  FIX: Added onLogout prop → passed to <Header onLogout={onLogout} />
// ============================================================

'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";

type CPView = "overview" | "tickets" | "users" | "settings";
type TicketStatus = "open" | "pending" | "closed";

interface Ticket { id: string; sub: string; time: string; branch: string; }
interface Notification {
  id: number; type: "warn" | "error" | "info" | "success" | "purple";
  title: string; desc: string; time: string; read: boolean;
}

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
  { label: "Printer / Scanner",  count: 3, color: "#6d28d9" },
  { label: "Software / License", count: 2, color: "#ca8a04" },
  { label: "Other",              count: 2, color: "#0369a1" },
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

const DonutChart: React.FC<{ data: typeof COMMON_ISSUES }> = ({ data }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 42, cx = 58, cy = 58;
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
      <svg width="116" height="116" viewBox="0 0 116 116" style={{ flexShrink: 0, overflow: "visible" }}>
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
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "default", padding: "4px 6px", borderRadius: 7, background: hovered === s.i ? `${s.color}10` : "transparent", transition: "background .15s" }}>
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

interface TicketsPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void; // FIX
}

const RetailTicketsPage: React.FC<TicketsPageProps> = ({ onNavigate, onLogout }) => {
  const { msg, show, toast }      = useToast();
  const [activeStatus, setActive] = useState<TicketStatus>("open");
  const [notifs, setNotifs]       = useState<Notification[]>(NOTIFS_INIT);
  const [notifOpen, setNotifOpen] = useState(false);

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar activePage="tickets" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0, overflow:"hidden" }}>
        {/* FIX: onLogout wired in */}
        <Header
          user={{ initials:"CL", name:"Chris Lee", role:"System Admin", company:"Nike Retail" }}
          clientLabel="Nike Retail"
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
                <div className="g2">
                  <Stat ico="si-r" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>} value={TICKETS.open.length} label="Open Tickets" />
                  <Stat ico="si-g" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 8.5l3.5 3.5 7.5-7.5"/></svg>} value={TICKETS.closed.length} label="Resolved This Month" />
                </div>
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
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(109,40,217,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#6d28d9" strokeWidth="1.5"><path d="M2 12h12M2 8h8M2 4h5"/></svg>
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
                      <div style={{ background: "rgba(109,40,217,0.05)", border: "1px solid rgba(109,40,217,0.1)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6d28d9", flexShrink: 0, marginTop: 3 }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 2 }}>Recommendation</div>
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