// ============================================================
//  OverviewPage.tsx
//  FIX: Added onLogout prop to OverviewPageProps and passed
//  it into <Header onLogout={onLogout} /> so the Sign Out
//  button in the header calls back up to root page.tsx.
// ============================================================

'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";

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

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const POS_DATA: POSDevice[] = [
  { id: "POS 1", st: "online", model: "PAX A920", serial: "SN-80381-94285", ip: "192.168.3.10", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Oct 01, 2022", msaEnd: "Oct 01, 2024", warranty: "Oct 01, 2025" },
  { id: "POS 2", st: "online", model: "PAX A920", serial: "SN-80382-94286", ip: "192.168.3.11", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Oct 01, 2022", msaEnd: "Oct 01, 2024", warranty: "Oct 01, 2025" },
  { id: "POS 3", st: "online", model: "PAX A920", serial: "SN-80383-94287", ip: "192.168.3.12", os: "Android 10.0 — POS v4.0.9", branch: "Makati Branch", msaStart: "Nov 01, 2022", msaEnd: "Nov 01, 2024", warranty: "Nov 01, 2025" },
  { id: "POS 4", st: "online", model: "PAX A920", serial: "SN-80384-94288", ip: "192.168.3.13", os: "Android 10.0 — POS v4.1.1", branch: "Makati Branch", msaStart: "Nov 01, 2022", msaEnd: "Nov 01, 2024", warranty: "Nov 01, 2025" },
  { id: "POS 5", st: "online", model: "PAX A920", serial: "SN-80385-94289", ip: "192.168.3.14", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Dec 01, 2021", msaEnd: "Dec 01, 2023", warranty: "Dec 01, 2024" },
];

interface BranchLocation { name: string; site: string; company: string; }
const BRANCHES: BranchLocation[] = [
  { name: "Manila",  site: "Manila Branch",  company: "Popeyes" },
  { name: "Makati",  site: "Makati Branch",  company: "Popeyes" },
];

const DEFAULT_INFO: InfoData = {
  storeName: "Popeyes", contactPerson: "John Doe", email: "john@popeyes.com", phone: "+63 2 8444 3003",
  altContactPerson: "Rica Cruz", altEmail: "rica@popeyes.com", altPhone: "+63 919 333 4003", keyNo: "4",
};

const NOTIFS_INIT: Notification[] = [
  { id: 1, type: "warn",    title: "SA Expiry Notice",       desc: "Your Software Assurance ends May 31, 2025. Contact your account manager to renew.",  time: "Just now",    read: false },
  { id: 2, type: "error",   title: "Open Ticket Alert",      desc: "Ticket #89323930193 — Hardware error on POS 3 has been open for 2+ hours.",            time: "2 hours ago", read: false },
  { id: 3, type: "info",    title: "New Ticket Submitted",   desc: "Ticket #89323930200 — Barcode scanner error has been filed for Manila branch.",         time: "2 days ago",  read: false },
  { id: 4, type: "success", title: "Ticket Resolved",        desc: "Ticket #89323930170 — POS 4 reboot issue has been marked as resolved.",                 time: "1 week ago",  read: true  },
  { id: 5, type: "purple",  title: "Account Manager Update", desc: "Maria Santos has updated your account details. Review the changes in Overview.",        time: "1 week ago",  read: true  },
];

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
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="i-row"><span className="i-k">{label}</span><span className="i-v">{children}</span></div>
);
const SL: React.FC<{ children: React.ReactNode; mt?: number }> = ({ children, mt = 10 }) => (
  <div className="gx-sec-lbl" style={{ marginTop: mt }}>{children}</div>
);
const STAT_ACCENT: Record<string, string> = {
  "si-p":   "#6d28d9",
  "si-t":   "#0d9488",
  "si-r":   "#dc2626",
  "si-key": "#ca8a04",
};
const STAT_NUM_COLOR: Record<string, string> = {
  "si-p":   "#6d28d9",
  "si-t":   "#0d9488",
  "si-r":   "#dc2626",
  "si-key": "#ca8a04",
};

const Stat: React.FC<{ ico: string; icon: JSX.Element; value: React.ReactNode; label: string }> = ({ ico, icon, value, label }) => (
  <div className="gx-stat" style={{
    padding: "16px 20px", gap: 14,
    borderLeft: `3px solid ${STAT_ACCENT[ico] ?? "#6d28d9"}`,
    borderTop: "1px solid var(--bdr)", borderRight: "1px solid var(--bdr)", borderBottom: "1px solid var(--bdr)",
    borderRadius: "0 10px 10px 0",
  }}>
    <div className={`gx-stat-ico ${ico}`} style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0 }}>{icon}</div>
    <div>
      <div className="gx-stat-num" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: STAT_NUM_COLOR[ico] ?? "var(--c1)" }}>{value}</div>
      <div className="gx-stat-lbl" style={{ fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

// ── Filter Popover ───────────────────────────────────────────────────────────
const FilterPopover: React.FC<{
  branches: string[]; selected: string[]; posData: POSDevice[];
  onChange: (b: string[]) => void; onClose: () => void;
}> = ({ branches, selected, posData, onChange, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const toggle = (b: string) => onChange(selected.includes(b) ? selected.filter(x => x !== b) : [...selected, b]);
  return (
    <div ref={ref} style={{
      position: "absolute", top: 38, right: 80, zIndex: 50,
      background: "#fff", borderRadius: 14, padding: "14px 16px",
      boxShadow: "0 8px 32px rgba(109,40,217,0.18)", border: "1px solid rgba(109,40,217,0.12)",
      minWidth: 200,
    }}>
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
        <button onClick={() => onChange([])} style={{ background: "none", border: "none", fontSize: 11, color: "#6d28d9", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          ✕ Clear filter
        </button>
      </div>
    </div>
  );
};

// ── Add POS Modal ────────────────────────────────────────────────────────────
const AddPosModal: React.FC<{ onAdd: (msg: string) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = React.useState({ model: "", serial: "", ip: "", os: "Android 10.0 — POS v4.1.0", branch: "Manila", user: "None" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid rgba(109,40,217,0.12)", borderRadius: 10, fontSize: 12.5, fontFamily: "inherit", color: "#1e1b4b", background: "#f4f3fb", outline: "none", fontWeight: 500 };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 };
  const secStyle: React.CSSProperties = { fontSize: 9.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 12, marginTop: 18, display: "flex", alignItems: "center", gap: 8 };
  return (
    <div className="gx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.2)", width: 480, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg, #3b0764, #6d28d9 60%, #0f766e)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          <button className="btn btn-p btn-sm" onClick={() => onAdd("POS device added successfully!")}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M7 3v8M3 7h8"/></svg>+ Add POS</button>
        </div>
      </div>
    </div>
  );
};

// ── POS Grid ─────────────────────────────────────────────────────────────────
const PosGrid: React.FC<{ onSelect: (pos: POSDevice) => void; filterBranch: string[] }> = ({ onSelect, filterBranch }) => {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const filtered = filterBranch.length > 0 ? POS_DATA.filter(p => filterBranch.includes(p.branch.replace(" Branch", ""))) : POS_DATA;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {filtered.map((pos, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--c3)" }}>{pos.id}</div>
          <div onClick={() => onSelect(pos)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ width: "100%", aspectRatio: "1", borderRadius: 13, cursor: "pointer", border: hovered === i ? "2px solid #6d28d9" : "1.5px solid rgba(109,40,217,0.12)", background: hovered === i ? "#f5f3ff" : "#fafafa", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, position: "relative", overflow: "hidden", boxShadow: hovered === i ? "0 0 0 4px rgba(109,40,217,0.08)" : "none", transition: "all .2s ease" }}>
            <img src="/pos-icon.png" alt="POS" style={{ width: 28, height: 28, objectFit: "contain", filter: hovered === i ? "invert(27%) sepia(90%) saturate(800%) hue-rotate(245deg) brightness(80%)" : "invert(60%)", transition: "filter .2s ease" }} />
            {hovered === i && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#6d28d9", color: "#fff", fontSize: 8.5, fontWeight: 700, textAlign: "center", padding: "3px 0", letterSpacing: ".04em" }}>View</div>}
          </div>
          <div style={{ fontSize: 8.5, color: "var(--c3)", textAlign: "center" }}>{pos.branch.replace(" Branch", "")}</div>
        </div>
      ))}
    </div>
  );
};

// ── POS Modal ─────────────────────────────────────────────────────────────────
const POSModal: React.FC<{ pos: POSDevice; onClose: () => void }> = ({ pos, onClose }) => (
  <div className="gx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.25)", width: 560, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
      <div style={{ background: "linear-gradient(135deg, #0d3d3a 0%, #0f766e 100%)", padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{pos.id} — {pos.model}</div>
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

// ── Branch Modal ──────────────────────────────────────────────────────────────
const BranchModal: React.FC<{
  branch: BranchLocation; onClose: () => void;
  onSelectPOS: (p: POSDevice) => void; keyNo: string;
}> = ({ branch, onClose, onSelectPOS, keyNo }) => {
  const branchPOS = POS_DATA.filter(p => p.branch === branch.site);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:8000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 32px 80px rgba(0,0,0,0.25)", width:560, maxWidth:"94vw", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background:"linear-gradient(135deg,#0d3d3a 0%,#0f766e 100%)", padding:"22px 26px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:"#fff", letterSpacing:"-0.01em" }}>{branch.name}</div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.65)", marginTop:3 }}>{branch.company}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ display:"flex", borderBottom:"1px solid #f0f0f0", flexShrink:0 }}>
          {[
            { label:"POS Machines", value:branchPOS.length, color:"#6d28d9", bg:"#f5f3ff" },
            { label:"Keys / Store",  value:keyNo,            color:"#ca8a04", bg:"#fffbeb" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ flex:1, padding:"18px 10px", textAlign:"center", background:bg, borderRight:"1px solid #f0f0f0" }}>
              <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10.5, fontWeight:600, color:"rgba(0,0,0,0.45)", marginTop:5, letterSpacing:".04em" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"20px 24px 10px", overflowY:"auto", flex:1 }}>
          {branchPOS.length === 0 ? (
            <div style={{ textAlign:"center", color:"rgba(0,0,0,0.3)", fontSize:12, padding:"20px 0" }}>No POS assigned to this branch.</div>
          ) : (
            <>
              <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase" as const, color:"rgba(0,0,0,0.3)", marginBottom:10 }}>POS Specifications</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {branchPOS.map(pos => (
                  <div key={pos.id} style={{ background:"#f8f7fe", borderRadius:12, padding:"12px 16px", border:"1px solid rgba(109,40,217,0.1)" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#6d28d9" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color:"#1e1b4b" }}>{pos.id}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:"#6d28d9", background:"#ede9fe", borderRadius:6, padding:"2px 8px" }}>{pos.model}</span>
                      </div>
                      <button onClick={() => { onSelectPOS(pos); onClose(); }} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#6d28d9", background:"#ede9fe", border:"1px solid rgba(109,40,217,0.2)", borderRadius:8, padding:"4px 11px", cursor:"pointer" }}>
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
                        Edit
                      </button>
                    </div>
                    {([["Serial Number", pos.serial], ["IP Address", pos.ip], ["OS Version", pos.os]] as [string,string][]).map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderTop:"1px solid rgba(0,0,0,0.05)" }}>
                        <span style={{ fontSize:11, color:"rgba(0,0,0,0.38)", fontWeight:500 }}>{k}</span>
                        <span style={{ fontSize:11, color:"#3b1f7a", fontWeight:600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ padding:"14px 24px 22px", display:"flex", justifyContent:"flex-end", flexShrink:0, borderTop:"1px solid #f0f0f0" }}>
          <button className="btn btn-s btn-sm" onClick={onClose} style={{ borderRadius:10, padding:"7px 22px", fontSize:12 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Info Modal ───────────────────────────────────────────────────────────
const EditInfoModal: React.FC<{ data: InfoData; onSave: (d: InfoData) => void; onClose: () => void }> = ({ data, onSave, onClose }) => {
  const [form, setForm] = useState<InfoData>({ ...data });
  const set = (k: keyof InfoData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--bdr)", borderRadius: 10, fontSize: 12.5, fontFamily: "inherit", color: "#3b1f7a", fontWeight: 500, background: "var(--surf2)", outline: "none", transition: "border-color .15s" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block" };
  const secBase: React.CSSProperties = { fontSize: 9.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 12, marginTop: 18, display: "flex", alignItems: "center", gap: 8 };
  return (
    <div className="gx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.18)", width: 480, maxWidth: "94vw", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg, #3b0764, #6d28d9, #0f766e)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

// ── Notification Panel ────────────────────────────────────────────────────────
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
// OVERVIEW PAGE
// ─────────────────────────────────────────────────────────────────────────────
interface OverviewPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void;  // FIX: added onLogout prop
}

const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, onLogout }) => {
  const { msg, show, toast }                = useToast();
  const [selectedPOS, setSelectedPOS]       = useState<POSDevice | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchLocation | null>(null);
  const [editOpen, setEditOpen]             = useState(false);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [addPosOpen, setAddPosOpen]         = useState(false);
  const [filterBranch, setFilterBranch]     = useState<string[]>([]);
  const [info, setInfo]                     = useState<InfoData>(DEFAULT_INFO);
  const [notifs, setNotifs]                 = useState<Notification[]>(NOTIFS_INIT);
  const [notifOpen, setNotifOpen]           = useState(false);

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar activePage="overview" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0, overflow:"hidden" }}>
        {/* FIX: pass onLogout into Header so Sign Out works */}
        <Header
          user={{ initials:"JD", name:"John Doe", role:"System Admin" }}
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div className="gx-scroll-page">
              {/* Hero */}
              <div className="gx-hero" style={{ padding: "18px 20px" }}>
                <div style={{ width: 72, height: 72, background: "#fff", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <img src="/Popeyes.png" alt="Popeyes" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gx-hero-title">Popeyes Philippines</div>
                  <div className="gx-hero-sub">Manila HQ · F&amp;B · Acct Manager: Maria Santos</div>
                  <div className="gx-hero-badges">
                    <span className="gx-hero-badge">LIC-POP-2024-0601</span>
                    <div className="gx-status-pill"><div className="sdot" />Active Account</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="g4" style={{ flexShrink: 0, gap: 14 }}>
                <Stat ico="si-p"   icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>}                value={9}          label="Users" />
                <Stat ico="si-t"   icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>}                value="5/5"        label="Total POS" />
                <Stat ico="si-r"   icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>}                            value={8}          label="Open Tickets" />
                <Stat ico="si-key" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="7" r="3.5"/><path d="M9 9.5l5 5M12 12l1.5-1.5"/></svg>}                value={info.keyNo} label="Keys/Store" />
              </div>

              {/* Two columns */}
              <div className="g2" style={{ alignItems: "flex-start" }}>
                {/* General Info */}
                <div className="gx-card" style={{ display:"flex", flexDirection:"column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="gx-card-title">General Information</span>
                    <button className="btn btn-s btn-xs" onClick={() => setEditOpen(true)}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 11, height: 11 }}><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
                      Edit Info
                    </button>
                  </div>
                  <InfoRow label="Store Name">{info.storeName}</InfoRow>
                  <InfoRow label="Contact Person">{info.contactPerson}</InfoRow>
                  <InfoRow label="Email"><span style={{ fontSize: 9.5 }}>{info.email}</span></InfoRow>
                  <InfoRow label="Phone">{info.phone}</InfoRow>
                  <SL>Alternate Contact</SL>
                  <InfoRow label="Contact Person">{info.altContactPerson}</InfoRow>
                  <InfoRow label="Email">{info.altEmail}</InfoRow>
                  <InfoRow label="Phone">{info.altPhone}</InfoRow>
                  <SL>Account Details</SL>
                  <InfoRow label="Acct Manager"><span style={{ color: "var(--p)", fontWeight: 600 }}>Maria Santos</span></InfoRow>
                  <InfoRow label="User Role">System Admin</InfoRow>
                  <SL>Keys</SL>
                  <InfoRow label="Keys No. per Store">{info.keyNo}</InfoRow>
                  <div className="gx-lic-card">
                    <div className="gx-lic-label">License</div>
                    <div className="gx-lic-id">LIC-POP-2024-0601</div>
                    <InfoRow label="SA Start">Jun 1, 2024</InfoRow>
                    <InfoRow label="SA End">
                      <span style={{ color: "var(--a)", fontWeight: 600 }}>
                        Mar 15, 2026{" "}
                        <span style={{ fontSize: 9, background: "rgba(234,88,12,0.1)", color: "var(--a)", padding: "1px 5px", borderRadius: 4 }}>13d left</span>
                      </span>
                    </InfoRow>
                  </div>
                  <SL>Branch Locations</SL>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6, paddingBottom:4 }}>
                    {BRANCHES.map(b => (
                      <button key={b.name} onClick={() => setSelectedBranch(b)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, border:"1px solid rgba(109,40,217,0.18)", background:"#f5f3ff", cursor:"pointer", fontFamily:"inherit" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#ede9fe")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#f5f3ff")}
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#6d28d9" strokeWidth="1.8"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>
                        <span style={{ fontSize:11, fontWeight:600, color:"#5b21b6" }}>{b.name}</span>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#9b7fd4" strokeWidth="1.5"><path d="M3 2l4 3-4 3"/></svg>
                      </button>
                    ))}
                  </div>
                </div>

                {/* POS Machines */}
                <div className="gx-card" style={{ display: "flex", flexDirection: "column", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span className="gx-card-title">POS Machines</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-s btn-xs" onClick={() => setFilterOpen(o => !o)} style={{ position: "relative" }}>
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}><path d="M2 4h10M4 7h6M6 10h2"/></svg> Filter
                        {filterBranch.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#6d28d9" }} />}
                      </button>
                    </div>
                  </div>
                  {filterOpen && <FilterPopover branches={[...new Set(POS_DATA.map(p => p.branch.replace(' Branch','')))] } selected={filterBranch} onChange={setFilterBranch} onClose={() => setFilterOpen(false)} posData={POS_DATA} />}
                  <PosGrid onSelect={setSelectedPOS} filterBranch={filterBranch} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`gx-toast ${show ? "show" : ""}`}><div className="gx-toast-dot" /><span>{msg}</span></div>
        {selectedPOS && <POSModal pos={selectedPOS} onClose={() => setSelectedPOS(null)} />}
        {selectedBranch && (
          <BranchModal
            branch={selectedBranch}
            onClose={() => setSelectedBranch(null)}
            onSelectPOS={p => { setSelectedBranch(null); setSelectedPOS(p); }}
            keyNo={info.keyNo}
          />
        )}
        {addPosOpen && <AddPosModal onAdd={(msg) => { toast(msg); setAddPosOpen(false); }} onClose={() => setAddPosOpen(false)} />}
        {editOpen && <EditInfoModal data={info} onSave={(d) => { setInfo(d); toast("Information updated successfully!"); }} onClose={() => setEditOpen(false)} />}
        {notifOpen && <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
      </div>
    </div>
  );
};

export default OverviewPage;