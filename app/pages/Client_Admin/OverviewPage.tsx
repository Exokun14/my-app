// ============================================================
//  OverviewPage.tsx  —  MERGED (v1 + v2)
//  Features:
//   • AuthUser prop integration (v2) + getInitials/formatRole
//   • Hero with cover photo + changeable background (v1)
//   • MSA Stat Card + MSA Expiration Modal (v1)
//   • Branch-grouped POS grid with filter (v1 layout) + icon grid option
//   • Add POS Modal (v2)
//   • Branch Modal with BranchStatCard + BranchMSACard (v1)
//   • Edit Info Modal (v2 styled)
//   • Notification Panel
//   • onLogout wired through
// ============================================================

'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";
import type { AuthUser } from "../../Services/api.service";
import { formatRole } from "../../Services/api.service";

type CPView = "overview" | "tickets" | "users" | "settings";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type POSStatus = "online" | "warning";

interface POSDevice {
  id: string; st: POSStatus; model: string; serial: string;
  ip: string; os: string; branch: string; msaStart: string; msaEnd: string; warranty: string;
}

interface InfoData {
  storeName: string; contactPerson: string; email: string; phone: string;
  altContactPerson: string; altEmail: string; altPhone: string; keyNo: string;
}

interface Notification {
  id: number; type: "warn" | "error" | "info" | "success" | "purple";
  title: string; desc: string; time: string; read: boolean;
}

interface MSAExpirationData {
  branch: string;
  msaEnd: string;
  daysLeft: number;
  status: "active" | "expiring" | "overdue";
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const POS_DATA: POSDevice[] = [
  { id: "POS 1", st: "online", model: "PAX A920", serial: "SN-80381-94285", ip: "192.168.3.10", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Oct 01, 2022", msaEnd: "Mar 31, 2026", warranty: "Oct 01, 2025" },
  { id: "POS 2", st: "online", model: "PAX A920", serial: "SN-80382-94286", ip: "192.168.3.11", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Oct 01, 2022", msaEnd: "Mar 31, 2026", warranty: "Oct 01, 2025" },
  { id: "POS 3", st: "online", model: "PAX A920", serial: "SN-80383-94287", ip: "192.168.3.12", os: "Android 10.0 — POS v4.0.9", branch: "Makati Branch", msaStart: "Nov 01, 2022", msaEnd: "Mar 01, 2026", warranty: "Nov 01, 2025" },
  { id: "POS 4", st: "online", model: "PAX A920", serial: "SN-80384-94288", ip: "192.168.3.13", os: "Android 10.0 — POS v4.1.1", branch: "Makati Branch", msaStart: "Nov 01, 2022", msaEnd: "Mar 01, 2026", warranty: "Nov 01, 2025" },
  { id: "POS 5", st: "online", model: "PAX A920", serial: "SN-80385-94289", ip: "192.168.3.14", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Dec 01, 2021", msaEnd: "Mar 31, 2026", warranty: "Dec 01, 2024" },
];

interface BranchLocation { name: string; site: string; company: string; }
const BRANCHES: BranchLocation[] = [
  { name: "Manila",  site: "Manila Branch",  company: "Popeyes" },
  { name: "Makati",  site: "Makati Branch",  company: "Popeyes" },
];

const DEFAULT_INFO: InfoData = {
  storeName: "Popeyes", contactPerson: "Mics Hernandez", email: "mics@popeyes.com", phone: "+63 2 8444 3003",
  altContactPerson: "Rica Cruz", altEmail: "rica@popeyes.com", altPhone: "+63 919 333 4003", keyNo: "1",
};

const NOTIFS_INIT: Notification[] = [
  { id: 1, type: "warn",    title: "MSA Expiry Notice",       desc: "Manila Branch MSA ends March 31, 2026. Contact your account manager to renew.",  time: "Just now",    read: false },
  { id: 2, type: "error",   title: "MSA Expiry Alert",        desc: "Makati Branch MSA ends April 6, 2026. Renewal required soon.",                    time: "2 hours ago", read: false },
  { id: 3, type: "info",    title: "New Ticket Submitted",    desc: "Ticket #89323930200 — Barcode scanner error has been filed for Manila branch.",    time: "2 days ago",  read: false },
  { id: 4, type: "success", title: "Ticket Resolved",         desc: "Ticket #89323930170 — POS 4 reboot issue has been marked as resolved.",           time: "1 week ago",  read: true  },
  { id: 5, type: "purple",  title: "Account Manager Update",  desc: "Maria Santos has updated your account details. Review the changes in Overview.", time: "1 week ago",  read: true  },
];

const NOTIF_ICONS: Record<string, JSX.Element> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8l1.5.9"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getMSAExpirationData(): MSAExpirationData[] {
  const branchMSA = new Map<string, string>();
  POS_DATA.forEach(pos => { if (!branchMSA.has(pos.branch)) branchMSA.set(pos.branch, pos.msaEnd); });
  const result: MSAExpirationData[] = [];
  branchMSA.forEach((msaEnd, branch) => {
    const daysLeft = getDaysUntil(msaEnd);
    const status: "active"|"expiring"|"overdue" = daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "expiring" : "active";
    result.push({ branch, msaEnd, daysLeft, status });
  });
  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
// STAT CARD — from v1 (fancy with top accent bar + icon bg)
// ─────────────────────────────────────────────────────────────────────────────
const STAT_CFG: Record<string, { iconBg: string; iconColor: string; accent: string }> = {
  "si-p":   { iconBg: "linear-gradient(135deg,#ede9fe,#ddd6fe)", iconColor: "#7c3aed", accent: "#7c3aed" },
  "si-t":   { iconBg: "linear-gradient(135deg,#ccfbf1,#99f6e4)", iconColor: "#0d9488", accent: "#0d9488" },
  "si-r":   { iconBg: "linear-gradient(135deg,#fee2e2,#fecaca)", iconColor: "#dc2626", accent: "#dc2626" },
  "si-key": { iconBg: "linear-gradient(135deg,#fef3c7,#fde68a)", iconColor: "#d97706", accent: "#d97706" },
};

const Stat: React.FC<{ ico: string; icon: JSX.Element; value: React.ReactNode; label: string; onClick?: () => void }> = ({ ico, icon, value, label, onClick }) => {
  const [hov, setHov] = React.useState(false);
  const cfg = STAT_CFG[ico] ?? STAT_CFG["si-p"];
  return (
    <div
      className="gx-stat"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 130,
        display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start",
        padding: "14px 16px 12px",
        borderRadius: 14, background: "#fff",
        border: `1px solid ${hov ? cfg.accent + "44" : "rgba(124,58,237,0.1)"}`,
        boxShadow: hov ? `0 6px 24px ${cfg.accent}18` : "0 1px 4px rgba(15,10,35,0.04)",
        transition: "all 0.18s", cursor: onClick ? "pointer" : "default",
        position: "relative", overflow: "hidden",
      }}
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

// ─────────────────────────────────────────────────────────────────────────────
// MSA STAT CARD (v1)
// ─────────────────────────────────────────────────────────────────────────────
const MSAStatCard: React.FC<{ onClick: () => void; posDevices: { msaEnd?: string; branch: string }[] }> = ({ onClick, posDevices }) => {
  const [hov, setHov] = React.useState(false);
  let soonestDays: number | null = null;
  for (const pos of posDevices) {
    if (!pos.msaEnd) continue;
    const d = getDaysUntil(pos.msaEnd);
    if (soonestDays === null || d < soonestDays) soonestDays = d;
  }
  const expired = soonestDays !== null && soonestDays <= 0;
  const urgent  = soonestDays !== null && soonestDays > 0 && soonestDays <= 30;
  const ok      = soonestDays !== null && soonestDays > 30;
  const accent    = expired ? '#dc2626' : urgent ? '#d97706' : '#16a34a';
  const iconBg    = expired ? 'linear-gradient(135deg,#fef2f2,#fecaca)' : urgent ? 'linear-gradient(135deg,#fffbeb,#fde68a)' : 'linear-gradient(135deg,#f0fdf4,#bbf7d0)';
  const badgeText = expired ? 'EXPIRED' : urgent ? 'EXPIRING SOON' : ok ? `${soonestDays}d left` : '—';
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} className="gx-stat"
      style={{
        padding: "14px 16px 12px", borderRadius: 14,
        background: hov ? '#faf9ff' : '#fff',
        border: `1px solid ${hov ? 'rgba(124,58,237,0.3)' : expired ? '#fecaca' : urgent ? '#fde68a' : 'rgba(124,58,237,0.1)'}`,
        boxShadow: hov ? '0 6px 24px rgba(124,58,237,0.12)' : '0 1px 4px rgba(15,10,35,0.04)',
        cursor: 'pointer', transition: 'all 0.18s',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start',
      }}>
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
          {(expired || urgent || ok) && (
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: accent, background: accent + '15', border: `1px solid ${accent}35`, borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' as const }}>{badgeText}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>Click to view details</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#8e7ec0" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MSA EXPIRATION MODAL (v1)
// ─────────────────────────────────────────────────────────────────────────────
const MSAExpirationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const msaData = getMSAExpirationData();
  const ref = useClickOutside<HTMLDivElement>(onClose);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c1)" }}>MSA Expiration Details</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--bdr)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {msaData.map((item, idx) => {
              const colors = {
                active:   { bg: "#f0fdf9", border: "#16a34a", text: "#16a34a", badge: "DUE SOON",  badgeBg: "#dcfce7", badgeColor: "#16a34a" },
                expiring: { bg: "#fffbeb", border: "#d97706", text: "#d97706", badge: "EXPIRING",  badgeBg: "#fef3c7", badgeColor: "#d97706" },
                overdue:  { bg: "#fff1f2", border: "#e11d48", text: "#e11d48", badge: "EXPIRED",   badgeBg: "#ffe4e6", badgeColor: "#e11d48" },
              }[item.status];
              const daysLabel = item.daysLeft < 0 ? "Expired" : `${item.daysLeft} days`;
              return (
                <div key={idx} style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${colors.border}30`, background: colors.bg, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={colors.border} strokeWidth="1.8"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c1)" }}>{item.branch}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: colors.badgeBg, color: colors.badgeColor, letterSpacing: "0.4px" }}>{colors.badge}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--c3)", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 600 }}>MSA End Date</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c1)" }}>{item.msaEnd}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--c3)", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 600 }}>Days Remaining</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{daysLabel}</div>
                    </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// FILTER POPOVER (v2 styled)
// ─────────────────────────────────────────────────────────────────────────────
const FilterPopover: React.FC<{ branches: string[]; selected: string[]; posData: POSDevice[]; onChange: (b: string[]) => void; onClose: () => void }> = ({ branches, selected, posData, onChange, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const toggle = (b: string) => onChange(selected.includes(b) ? selected.filter(x => x !== b) : [...selected, b]);
  return (
    <div ref={ref} style={{ position: "absolute", top: 38, right: 80, zIndex: 50, background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 8px 32px rgba(109,40,217,0.18)", border: "1px solid rgba(109,40,217,0.12)", minWidth: 200 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.35)", marginBottom: 10 }}>Filter by Branch</div>
      {branches.map(b => {
        const count = posData.filter(p => p.branch.replace(" Branch","") === b).length;
        const checked = selected.includes(b);
        return (
          <div key={b} onClick={() => toggle(b)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, cursor: "pointer", background: checked ? "#f5f3ff" : "transparent", marginBottom: 4, transition: "background .15s" }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: checked ? "2px solid #6d28d9" : "2px solid #d1d5db", background: checked ? "#6d28d9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
              {checked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 5l2.5 2.5 3.5-4"/></svg>}
            </div>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#6d28d9" strokeWidth="1.5"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#1e1b4b", flex: 1 }}>{b}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6d28d9", background: "#ede9fe", borderRadius: 6, padding: "1px 7px" }}>{count} POS</span>
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid rgba(109,40,217,0.1)", marginTop: 8, paddingTop: 8 }}>
        <button onClick={() => onChange([])} style={{ background: "none", border: "none", fontSize: 11, color: "#6d28d9", cursor: "pointer", fontWeight: 600 }}>✕ Clear filter</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POS GRID — branch-grouped layout from v1
// ─────────────────────────────────────────────────────────────────────────────
const PosGrid: React.FC<{ onSelect: (pos: POSDevice) => void; filterBranch: string[] }> = ({ onSelect, filterBranch }) => {
  const filtered = filterBranch.length > 0
    ? POS_DATA.filter(p => filterBranch.includes(p.branch.replace(" Branch", "")))
    : POS_DATA;
  const byBranch = filtered.reduce<Record<string, POSDevice[]>>((acc, pos) => {
    if (!acc[pos.branch]) acc[pos.branch] = [];
    acc[pos.branch].push(pos); return acc;
  }, {});
  const licenseTag: Record<string, string> = {
    "Manila Branch": "LIC-POP-MNL-0601",
    "Makati Branch": "LIC-POP-MKT-0602",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Object.entries(byBranch).sort(([a], [b]) => a.localeCompare(b)).map(([branch, devices]) => (
        <div key={branch}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))", border: "1px solid rgba(2,132,199,0.18)", borderRadius: 6, padding: "3px 10px" }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0c4a6e" }}>{branch}</span>
            </div>
            {licenseTag[branch] && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(217,119,6,0.1)", color: "#92400e", padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(217,119,6,0.2)" }}>{licenseTag[branch]}</span>
            )}
            <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 600 }}>{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(2,132,199,0.12),transparent)" }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {devices.map(pos => (
              <div key={pos.id} onClick={() => onSelect(pos)}
                onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.border = "1.5px solid rgba(124,58,237,0.28)"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(124,58,237,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#faf9ff"; e.currentTarget.style.border = "1.5px solid rgba(124,58,237,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                style={{ background: "#faf9ff", border: "1.5px solid rgba(124,58,237,0.1)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer", transition: "all 0.14s", minWidth: 160, flex: "1 1 160px", maxWidth: 220, position: "relative", overflow: "hidden" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f2f0fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#18103a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pos.id} — {pos.model}</div>
                  <div style={{ fontSize: 9.5, color: "#8e7ec0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{pos.ip || "—"}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#b8aed8" strokeWidth="1.6"><path d="M4 2l4 4-4 4"/></svg>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POS MODAL (v2 styled — teal gradient header)
// ─────────────────────────────────────────────────────────────────────────────
const POSModal: React.FC<{ pos: POSDevice; onClose: () => void }> = ({ pos, onClose }) => (
  <div className="gx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.25)", width: 560, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
      <div style={{ background: "linear-gradient(135deg,#0d3d3a,#0f766e)", padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{pos.id} — {pos.model}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>Popeyes · {pos.branch}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>
      <div style={{ padding: "20px 24px 10px" }}>
        <div style={{ background: "#f0f2f7", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.3)", marginBottom: 14 }}>Device Specifications</div>
          {([ ["Device Model", pos.model, false], ["Serial Number", pos.serial, true], ["IP Address", pos.ip, true], ["OS Version", pos.os, false], ["Branch", pos.branch, false], ["MSA Start", pos.msaStart, false], ["MSA End", pos.msaEnd, false], ["Warranty Date", pos.warranty, false] ] as [string, string, boolean][]).map(([k, v, mono]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: 11.5, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>{k}</span>
              <span style={{ fontSize: 11.5, color: "#3b1f7a", fontWeight: 600, fontFamily: mono ? "monospace" : "inherit" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 24px 22px", display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-s btn-sm" onClick={onClose} style={{ borderRadius: 10, padding: "7px 22px", fontSize: 12 }}>Close</button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH MODAL helpers (v1)
// ─────────────────────────────────────────────────────────────────────────────
function BranchStatCard({ value, label, color, bg, border }: { value: number|string; label: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${border}`, textAlign: "center" as const }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function BranchMSACard({ posDevices }: { posDevices: { msaEnd?: string }[] }) {
  const ends = posDevices.map(p => p.msaEnd).filter(Boolean) as string[];
  const msaEnd = ends.length ? ends.sort().at(-1) : undefined;
  const days: number | null = (() => {
    if (!msaEnd) return null;
    return getDaysUntil(msaEnd);
  })();
  const status = (() => {
    if (days === null) return { label: "UNKNOWN",       color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    if (days <= 0)     return { label: "EXPIRED",       color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    if (days <= 30)    return { label: "EXPIRING SOON", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    if (days <= 90)    return { label: "DUE SOON",      color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" };
    return               { label: "ACTIVE",             color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  })();
  const displayDate = msaEnd ? new Date(msaEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const daysText = days === null ? null : days <= 0 ? "Expired" : `${days}d left`;
  return (
    <div style={{ background: status.bg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${status.border}`, textAlign: "center" as const, position: "relative" as const, overflow: "hidden" }}>
      <span style={{ position: "absolute" as const, top: 8, right: 8, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.06em", color: status.color, background: status.color + "18", border: `1px solid ${status.color}40`, borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap" as const }}>{status.label}</span>
      <div style={{ fontSize: 14, fontWeight: 800, color: status.color, lineHeight: 1.3, marginTop: 6 }}>{displayDate}</div>
      {daysText && <div style={{ fontSize: 10, fontWeight: 700, color: status.color, opacity: 0.8, marginTop: 2 }}>{daysText}</div>}
      <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>MSA Expiry</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH MODAL (v1 — orange header + stat cards + POS list)
// ─────────────────────────────────────────────────────────────────────────────
const BranchModal: React.FC<{ branch: BranchLocation; onClose: () => void; onSelectPOS: (pos: POSDevice) => void; keyNo: string }> = ({ branch, onClose, onSelectPOS, keyNo }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const branchPOS = POS_DATA.filter(p => p.branch === branch.site);
  const licenseTag: Record<string, string> = { "Manila Branch": "LIC-POP-MNL-0601", "Makati Branch": "LIC-POP-MKT-0602" };
  const license = licenseTag[branch.site] || "";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,7,36,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002, padding: 20 }}>
      <div ref={ref} style={{ width: 600, maxWidth: "96vw", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden", fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "linear-gradient(135deg,#d97706,#f59e0b)", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="9" cy="7" r="1.8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{branch.site}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{branch.company} · Aloha</div>
          </div>
          {license && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "5px 10px", flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{license}</span>
            </div>
          )}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1, padding: "18px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BranchStatCard value={branchPOS.length} label="POS Machines" color="#0d9488" bg="rgba(13,148,136,0.07)" border="rgba(13,148,136,0.18)" />
            <BranchMSACard posDevices={branchPOS} />
          </div>
          {license && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, padding: "10px 14px" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#d97706" strokeWidth="1.5"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#92400e", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 2 }}>Branch License (Aloha)</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#d97706" }}>{license}</div>
              </div>
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#8e7ec0", letterSpacing: "0.13em", textTransform: "uppercase" as const }}>POS Devices at this Branch</span>
              <span style={{ background: "#ede9fe", color: "#5b21b6", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{branchPOS.length}</span>
            </div>
            {branchPOS.length === 0 && (
              <div style={{ textAlign: "center" as const, padding: "24px", color: "#8e7ec0", fontSize: 12, background: "#f2f0fb", borderRadius: 12, border: "1.5px dashed rgba(124,58,237,0.22)" }}>No POS machines assigned to this branch yet.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {branchPOS.map(pos => (
                <div key={pos.id} style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)", background: "#fff", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#18103a", marginBottom: 4 }}>{pos.id} — {pos.model}</div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
                        {[{ label: "IP", val: pos.ip }, { label: "OS", val: pos.os.split(" — ")[0] }, { label: "MSA End", val: pos.msaEnd }].map(({ label, val }) => (
                          <span key={label} style={{ fontSize: 10.5, color: "#8e7ec0" }}>
                            <span style={{ fontWeight: 600, color: "#4a3870" }}>{label}: </span>{val}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { onSelectPOS(pos); onClose(); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#6d28d9", background: "#ede9fe", border: "1px solid rgba(109,40,217,0.2)", borderRadius: 8, padding: "4px 11px", cursor: "pointer" }}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(124,58,237,0.1)", background: "#f8f7ff", padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)", background: "#fff", fontSize: 12, fontWeight: 600, color: "#4a3870", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD POS MODAL (v2)
// ─────────────────────────────────────────────────────────────────────────────
const AddPosModal: React.FC<{ onAdd: (msg: string) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = React.useState({ model: "", serial: "", ip: "", os: "Android 10.0 — POS v4.1.0", branch: "Manila", user: "None" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid rgba(109,40,217,0.12)", borderRadius: 10, fontSize: 12.5, fontFamily: "inherit", color: "#1e1b4b", background: "#f4f3fb", outline: "none", fontWeight: 500 };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 };
  const secStyle: React.CSSProperties = { fontSize: 9.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 12, marginTop: 18, display: "flex", alignItems: "center", gap: 8 };
  return (
    <div className="gx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.2)", width: 480, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9 60%,#0f766e)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Add New POS</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Register a device and assign to branch</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "4px 22px 16px", overflowY: "auto", maxHeight: "70vh" }}>
          <div style={{ ...secStyle, color: "#6d28d9" }}><span style={{ flex: 1, height: 1, background: "#6d28d9", opacity: .2 }}/>Device Info<span style={{ flex: 1, height: 1, background: "#6d28d9", opacity: .2 }}/></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>Device Model <span style={{ color: "#dc2626" }}>*</span></label><input style={inputStyle} placeholder="e.g. PAX A920" value={form.model} onChange={set("model")} /></div>
            <div><label style={labelStyle}>Serial Number</label><input style={inputStyle} placeholder="Auto-generated if blank" value={form.serial} onChange={set("serial")} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>IP Address</label><input style={inputStyle} placeholder="Auto-assigned if blank" value={form.ip} onChange={set("ip")} /></div>
            <div><label style={labelStyle}>OS Version</label><input style={inputStyle} value={form.os} onChange={set("os")} /></div>
          </div>
          <div style={{ ...secStyle, color: "#0f766e" }}><span style={{ flex: 1, height: 1, background: "#0f766e", opacity: .2 }}/>Branch Assignment<span style={{ flex: 1, height: 1, background: "#0f766e", opacity: .2 }}/></div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Select Branch <span style={{ color: "#dc2626" }}>*</span></label>
            <select style={{ ...inputStyle, appearance: "none" }} value={form.branch} onChange={set("branch")}><option>Manila</option><option>Makati</option></select>
          </div>
          <div style={{ ...secStyle, color: "#d97706" }}><span style={{ flex: 1, height: 1, background: "#d97706", opacity: .2 }}/>Assign User (Optional)<span style={{ flex: 1, height: 1, background: "#d97706", opacity: .2 }}/></div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Assign User to this Branch</label>
            <select style={{ ...inputStyle, appearance: "none" }} value={form.user} onChange={set("user")}><option>None</option><option>John Doe</option><option>Ana Reyes</option><option>Kristina White</option></select>
          </div>
        </div>
        <div style={{ padding: "12px 22px 18px", borderTop: "1px solid rgba(109,40,217,0.1)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={() => onAdd("POS device added successfully!")}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M7 3v8M3 7h8"/></svg>
            + Add POS
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT INFO MODAL (v2 styled)
// ─────────────────────────────────────────────────────────────────────────────
const EditInfoModal: React.FC<{ data: InfoData; onSave: (d: InfoData) => void; onClose: () => void }> = ({ data, onSave, onClose }) => {
  const [form, setForm] = useState<InfoData>({ ...data });
  const set = (k: keyof InfoData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--bdr)", borderRadius: 10, fontSize: 12.5, fontFamily: "inherit", color: "#3b1f7a", fontWeight: 500, background: "var(--surf2)", outline: "none" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block" };
  const secBase: React.CSSProperties = { fontSize: 9.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 12, marginTop: 18, display: "flex", alignItems: "center", gap: 8 };
  return (
    <div className="gx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.18)", width: 480, maxWidth: "94vw", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9,#0f766e)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Edit Client Information</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Update contact and account details</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "6px 22px 16px", overflowY: "auto", flex: 1 }}>
          <div style={{ ...secBase, color: "#6d28d9" }}><span style={{flex:1,height:1,background:"#6d28d9",opacity:.2}}/>Primary Contact<span style={{flex:1,height:1,background:"#6d28d9",opacity:.2}}/></div>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Store Name</label><input style={inputStyle} value={form.storeName} onChange={set("storeName")} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><label style={labelStyle}>Contact Person</label><input style={inputStyle} value={form.contactPerson} onChange={set("contactPerson")} /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set("email")} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={set("phone")} /></div>
          <div style={{ ...secBase, color: "#0f766e" }}><span style={{flex:1,height:1,background:"#0f766e",opacity:.2}}/>Alternate Contact<span style={{flex:1,height:1,background:"#0f766e",opacity:.2}}/></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><label style={labelStyle}>Contact Person</label><input style={inputStyle} value={form.altContactPerson} onChange={set("altContactPerson")} /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.altEmail} onChange={set("altEmail")} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.altPhone} onChange={set("altPhone")} /></div>
          <div style={{ ...secBase, color: "#d97706" }}><span style={{flex:1,height:1,background:"#d97706",opacity:.2}}/>Account Details<span style={{flex:1,height:1,background:"#d97706",opacity:.2}}/></div>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Key No. per Store</label><input style={{ ...inputStyle, width: "48%" }} value={form.keyNo} onChange={set("keyNo")} /></div>
        </div>
        <div style={{ padding: "12px 22px 18px", borderTop: "1px solid var(--bdr)", display: "flex", justifyContent: "flex-end", gap: 8, background: "#fff" }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={() => { onSave(form); onClose(); }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 11, height: 11 }}><path d="M2.5 7.5l3 3 6-6"/></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PANEL
// ─────────────────────────────────────────────────────────────────────────────
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
// OVERVIEW PAGE — MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface OverviewPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void;
  user?: AuthUser | null;
}

const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, onLogout, user: propUser }) => {
  const { msg, show, toast }                = useToast();
  const [info, setInfo]                     = useState<InfoData>(DEFAULT_INFO);
  const [notifs, setNotifs]                 = useState<Notification[]>(NOTIFS_INIT);
  const [selectedPOS, setSelectedPOS]       = useState<POSDevice | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchLocation | null>(null);
  const [editOpen, setEditOpen]             = useState(false);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [addPosOpen, setAddPosOpen]         = useState(false);
  const [filterBranch, setFilterBranch]     = useState<string[]>([]);
  const [msaModalOpen, setMsaModalOpen]     = useState(false);
  const [bgHov, setBgHov]                   = useState(false);
  const [bgSrc, setBgSrc]                   = useState("/Popeyes-bg.jpg");
  const bgInput                             = useRef<HTMLInputElement>(null);

  const authUser = propUser ?? null;
  const headerUser = {
    initials: authUser ? getInitials(authUser.name) : "MH",
    name:     authUser?.name ?? "Mics Hernandez",
    role:     formatRole(authUser?.role) ?? "Manager",
  };

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <Sidebar activePage="overview" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header
          user={headerUser}
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "14px 20px 14px", overflow: "hidden", minHeight: 0 }}>

              {/* ── Hero — v1 (cover photo + orange brand) ── */}
              <div className="gx-hero" style={{ padding: 0, flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "stretch" }}>
                {/* LEFT — orange brand */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px 18px 20px", background: "linear-gradient(135deg,#f97316,#ea580c)", flexShrink: 0, zIndex: 2, position: "relative" }}>
                  <div style={{ width: 72, height: 72, background: "#fff", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img src="/Popeyes.png" alt="Popeyes" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="gx-hero-title">Popeyes Philippines</div>
                    <div className="gx-hero-sub">Manila HQ · Aloha</div>
                    <div className="gx-hero-badges">
                      <span className="gx-hero-badge">LIC-POP-2024-0601</span>
                      <div className="gx-status-pill"><div className="sdot" />Active Account</div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 0, right: -32, width: 32, height: "100%", background: "linear-gradient(to right,#ea580c,transparent)", zIndex: 3 }} />
                </div>
                {/* RIGHT — changeable cover photo */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "pointer" }}
                  onMouseEnter={() => setBgHov(true)}
                  onMouseLeave={() => setBgHov(false)}
                  onClick={() => bgInput.current?.click()}
                >
                  <img src={bgSrc} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", zIndex: 0, filter: bgHov ? "brightness(0.6)" : "none", transition: "filter 0.2s" }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1 }} />
                  <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: bgHov ? 1 : 0, transition: "opacity 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="14" height="11" rx="2"/><circle cx="8" cy="8.5" r="2.5"/><path d="M5.5 3l1-2h3l1 2"/></svg>
                      Change Cover Photo
                    </div>
                  </div>
                  <input ref={bgInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setBgSrc(URL.createObjectURL(file));
                  }} />
                </div>
              </div>

              {/* ── Stats — v1 fancy cards + MSA card ── */}
              <div className="g4" style={{ flexShrink: 0, gap: 14 }}>
                <Stat ico="si-p" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>} value={9} label="Users" />
                <Stat ico="si-t" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>} value="5/5" label="Total POS" />
                <MSAStatCard onClick={() => setMsaModalOpen(true)} posDevices={POS_DATA} />
                <Stat ico="si-key" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="7" r="3.5"/><path d="M9 9.5l5 5M12 12l1.5-1.5"/></svg>} value={info.keyNo} label="Keys/Store" />
              </div>

              {/* ── Two columns ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0, alignItems: "stretch" }}>

                {/* General Info */}
                <div className="gx-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(124,58,237,0.1)", flexShrink: 0, margin: "-1px -1px 0" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#18103a" }}>General Information</span>
                    <button onClick={() => setEditOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: "#4a3870", background: "#f2f0fb", border: "1px solid rgba(124,58,237,0.1)", cursor: "pointer", fontFamily: "inherit" }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.background="#fff"; el.style.borderColor="rgba(124,58,237,0.22)"; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.background="#f2f0fb"; el.style.borderColor="rgba(124,58,237,0.1)"; }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>
                      Edit Info
                    </button>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0, scrollbarWidth: "thin" as const, scrollbarColor: "rgba(124,58,237,0.15) transparent" } as React.CSSProperties}>
                    {[
                      { section: "PRIMARY CONTACT", rows: [{ label: "Store Name", val: info.storeName }, { label: "Contact Person", val: info.contactPerson }, { label: "Email", val: info.email }, { label: "Phone", val: info.phone }] },
                      { section: "ALTERNATE CONTACT", rows: [{ label: "Contact Person", val: info.altContactPerson }, { label: "Email", val: info.altEmail }, { label: "Phone", val: info.altPhone }] },
                    ].map(({ section, rows }) => (
                      <React.Fragment key={section}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: section !== "PRIMARY CONTACT" ? 12 : 0 }}>{section}</div>
                        {rows.map(item => (
                          <div key={item.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                            <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>{item.label}</span>
                            <span style={{ fontSize: 11.5, color: "#18103a", fontWeight: 600, textAlign: "right" as const, wordBreak: "break-all" as const }}>{item.val}</span>
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>ACCOUNT DETAILS</div>
                    {[
                      { label: "Acct Manager", val: <span style={{ color: "#7c3aed", fontWeight: 600 }}>Maria Santos</span> },
                      { label: "User Role",    val: <span style={{ fontWeight: 600 }}>{headerUser.role}</span> },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>{label}</span>
                        <span style={{ fontSize: 11.5 }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>KEYS</div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                      <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap" as const, flexShrink: 0, minWidth: 100 }}>Keys No. per Store</span>
                      <span style={{ fontSize: 11.5, color: "#d97706", fontWeight: 700 }}>{info.keyNo}</span>
                    </div>
                    {/* License card */}
                    <div className="gx-lic-card" style={{ marginTop: 12 }}>
                      <div className="gx-lic-label">License</div>
                      <div className="gx-lic-id">LIC-POP-2024-0601</div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11 }}>
                        <span style={{ color: "#8e7ec0" }}>SA Start</span><span style={{ fontWeight: 600, color: "#18103a" }}>Jun 1, 2024</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11 }}>
                        <span style={{ color: "#8e7ec0" }}>SA End</span>
                        <span style={{ color: "#d97706", fontWeight: 600 }}>Mar 31, 2026 <span style={{ fontSize: 9, background: "rgba(234,88,12,0.1)", padding: "1px 5px", borderRadius: 4 }}>~19d left</span></span>
                      </div>
                    </div>
                    {/* Branch locations */}
                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(124,58,237,0.1)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#4a3870", marginBottom: 10 }}>Branch Locations</div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                        {BRANCHES.map(b => (
                          <div key={b.name} onClick={() => setSelectedBranch(b)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))", color: "#0c4a6e", fontSize: 10.5, fontWeight: 700, borderRadius: 7, border: "1px solid rgba(2,132,199,0.18)", cursor: "pointer", transition: "all 0.14s" }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="linear-gradient(135deg,rgba(2,132,199,0.18),rgba(13,148,136,0.14))"; el.style.boxShadow="0 2px 8px rgba(2,132,199,0.15)"; }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))"; el.style.boxShadow="none"; }}
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                            {b.name}
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* POS Machines */}
                <div className="gx-card" style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="gx-card-title">POS Machines</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(109,40,217,0.09)", color: "#6d28d9" }}>{POS_DATA.length} devices</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
                      <button className="btn btn-p btn-xs" onClick={() => setAddPosOpen(true)}>
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M7 3v8M3 7h8"/></svg>
                        Add POS
                      </button>
                      <button className="btn btn-s btn-xs" onClick={() => setFilterOpen(o => !o)} style={{ position: "relative" }}>
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}><path d="M2 4h10M4 7h6M6 10h2"/></svg>
                        Filter
                        {filterBranch.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#6d28d9" }} />}
                      </button>
                    </div>
                  </div>
                  {filterOpen && (
                    <FilterPopover
                      branches={[...new Set(POS_DATA.map(p => p.branch.replace(" Branch", "")))]}
                      selected={filterBranch}
                      onChange={setFilterBranch}
                      onClose={() => setFilterOpen(false)}
                      posData={POS_DATA}
                    />
                  )}
                  <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                    <PosGrid onSelect={setSelectedPOS} filterBranch={filterBranch} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        <div className={`gx-toast ${show ? "show" : ""}`}><div className="gx-toast-dot" /><span>{msg}</span></div>

        {/* Modals */}
        {selectedPOS    && <POSModal pos={selectedPOS} onClose={() => setSelectedPOS(null)} />}
        {selectedBranch && <BranchModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} onSelectPOS={p => { setSelectedBranch(null); setSelectedPOS(p); }} keyNo={info.keyNo} />}
        {addPosOpen     && <AddPosModal onAdd={(m) => { toast(m); setAddPosOpen(false); }} onClose={() => setAddPosOpen(false)} />}
        {editOpen       && <EditInfoModal data={info} onSave={(d) => { setInfo(d); toast("Information updated successfully!"); }} onClose={() => setEditOpen(false)} />}
        {notifOpen      && <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
        {msaModalOpen   && <MSAExpirationModal onClose={() => setMsaModalOpen(false)} />}
      </div>
    </div>
  );
};

export default OverviewPage;
