// ============================================================
//  RetailOverviewPage.tsx
// ============================================================


'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";

type CPView = "overview" | "tickets" | "users" | "settings";
interface RetailOverviewPageProps {
  onNavigate: (view: CPView) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type POSStatus = "online" | "warning";
interface POSDevice {
  id: string; st: POSStatus; model: string; serial: string;
  ip: string; os: string; branch: string; msaStart: string; msaEnd: string; warranty: string;
}
interface RetailInfoData {
  storeName: string; contactPerson: string; email: string; phone: string;
  altContactPerson: string; altEmail: string; altPhone: string;
}
interface BranchLocation { name: string; site: string; seats: number; }
interface Notification {
  id: number; type: "warn"|"error"|"info"|"success"|"purple";
  title: string; desc: string; time: string; read: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const POS_DATA: POSDevice[] = [
  { id:"POS 1", st:"online", model:"PAX A920", serial:"SN-90011-00001", ip:"192.168.4.10", os:"Android 10.0 — POS v4.1.1", branch:"SM Mall",  msaStart:"Jan 15, 2025", msaEnd:"Jan 15, 2027", warranty:"Jan 15, 2026" },
  { id:"POS 2", st:"online", model:"PAX A920", serial:"SN-90012-00002", ip:"192.168.4.11", os:"Android 10.0 — POS v4.1.1", branch:"Ayala",    msaStart:"Jan 15, 2025", msaEnd:"Jan 15, 2027", warranty:"Jan 15, 2026" },
  { id:"POS 3", st:"online", model:"PAX A920", serial:"SN-90013-00003", ip:"192.168.4.12", os:"Android 10.0 — POS v4.1.1", branch:"SM Mall",  msaStart:"Jan 15, 2025", msaEnd:"Jan 15, 2027", warranty:"Jan 15, 2026" },
  { id:"POS 4", st:"online", model:"PAX A920", serial:"SN-90014-00004", ip:"192.168.4.13", os:"Android 10.0 — POS v4.0.9", branch:"SM Mall",  msaStart:"Jan 15, 2025", msaEnd:"Jan 15, 2027", warranty:"Jan 15, 2026" },
];

const BRANCHES: BranchLocation[] = [
  { name:"SM Mall", site:"SM Mall of Asia",   seats: 6 },
  { name:"Ayala",   site:"Ayala Center Cebu", seats: 4 },
];

const TOTAL_SITES = BRANCHES.length;
const TOTAL_SEATS = BRANCHES.reduce((s, b) => s + b.seats, 0);

const DEFAULT_INFO: RetailInfoData = {
  storeName:"Nike", contactPerson:"Chris Lee", email:"chris@nike.com", phone:"+63 2 7555 1212",
  altContactPerson:"Faye Uy", altEmail:"faye@nike.com", altPhone:"+63 928 222 4012",
};

const LICENSE = { id:"LIC-NKE-2025-0115", saStart:"Jan 15, 2025", saEnd:"Jun 14, 2026", krunch:"KRN-12044" };

const NOTIFS_INIT: Notification[] = [
  { id:1, type:"warn",    title:"SA Expiry Notice",     desc:"Your Software Assurance ends Jun 14, 2026. Contact your account manager to renew.", time:"Just now",    read:false },
  { id:2, type:"error",   title:"Open Ticket Alert",    desc:"Ticket #00000001 — POS 1 connectivity issue at SM Mall has been open for 2+ hours.", time:"2 hours ago", read:false },
  { id:3, type:"info",    title:"New Ticket Submitted", desc:"Ticket #00000002 — Barcode scanner error at Ayala branch has been filed.",           time:"1 day ago",   read:false },
  { id:4, type:"success", title:"Ticket Resolved",      desc:"Ticket #00000003 — POS 3 reboot issue has been marked as resolved.",                 time:"1 week ago",  read:true  },
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

const STAT_CFG: Record<string, { border: string; num: string; bg: string }> = {
  "si-p":    { border:"#6d28d9", num:"#6d28d9", bg:"rgba(109,40,217,0.08)" },
  "si-t":    { border:"#0d9488", num:"#0d9488", bg:"rgba(13,148,136,0.08)" },
  "si-r":    { border:"#dc2626", num:"#dc2626", bg:"rgba(220,38,38,0.08)"  },
  "si-site": { border:"#0369a1", num:"#0369a1", bg:"rgba(3,105,161,0.08)"  },
  "si-seat": { border:"#7c3aed", num:"#7c3aed", bg:"rgba(124,58,237,0.08)" },
};
const Stat: React.FC<{ ico: string; icon: JSX.Element; value: React.ReactNode; label: string }> = ({ ico, icon, value, label }) => {
  const c = STAT_CFG[ico] ?? STAT_CFG["si-p"];
  return (
    <div className="gx-stat" style={{ padding:"16px 20px", gap:14, borderLeft:`3px solid ${c.border}`, border:`1px solid var(--bdr)`, borderLeftWidth:3, borderLeftColor:c.border, borderRadius:"0 10px 10px 0" }}>
      <div style={{ width:46, height:46, borderRadius:12, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", color:c.border, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:32, fontWeight:800, lineHeight:1, color:c.num }}>{value}</div>
        <div style={{ fontSize:11, marginTop:4, color:"var(--c3)" }}>{label}</div>
      </div>
    </div>
  );
};

// ── Filter Popover ────────────────────────────────────────────────────────────
const FilterPopover: React.FC<{ branches:string[]; selected:string[]; onChange:(b:string[])=>void; onClose:()=>void; posData:POSDevice[] }> = ({ branches, selected, posData, onChange, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const toggle = (b: string) => onChange(selected.includes(b) ? selected.filter(x=>x!==b) : [...selected,b]);
  return (
    <div ref={ref} style={{ position:"absolute", top:38, right:80, zIndex:50, background:"#fff", borderRadius:14, padding:"14px 16px", boxShadow:"0 8px 32px rgba(109,40,217,0.18)", border:"1px solid rgba(109,40,217,0.12)", minWidth:200 }}>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:"rgba(0,0,0,0.35)", marginBottom:10 }}>Filter by Branch</div>
      {branches.map(b => {
        const count = posData.filter(p => p.branch === b).length;
        const checked = selected.includes(b);
        return (
          <div key={b} onClick={()=>toggle(b)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 6px", borderRadius:8, cursor:"pointer", background:checked?"#f5f3ff":"transparent", marginBottom:4, transition:"background .15s" }}>
            <div style={{ width:16, height:16, borderRadius:4, border:checked?"2px solid #6d28d9":"2px solid #d1d5db", background:checked?"#6d28d9":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {checked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 5l2.5 2.5 3.5-4"/></svg>}
            </div>
            <span style={{ fontSize:12, fontWeight:500, color:"#1e1b4b", flex:1 }}>{b}</span>
            <span style={{ fontSize:10, fontWeight:700, color:"#6d28d9", background:"#ede9fe", borderRadius:6, padding:"1px 7px" }}>{count} POS</span>
          </div>
        );
      })}
      <div style={{ borderTop:"1px solid rgba(109,40,217,0.1)", marginTop:8, paddingTop:8 }}>
        <button onClick={()=>onChange([])} style={{ background:"none", border:"none", fontSize:11, color:"#6d28d9", cursor:"pointer", fontWeight:600 }}>✕ Clear filter</button>
      </div>
    </div>
  );
};

// ── POS Grid ──────────────────────────────────────────────────────────────────
const PosGrid: React.FC<{ onSelect:(p:POSDevice)=>void; filterBranch:string[] }> = ({ onSelect, filterBranch }) => {
  const [hovered, setHovered] = useState<string|null>(null);
  const filtered = filterBranch.length > 0 ? POS_DATA.filter(p=>filterBranch.includes(p.branch)) : POS_DATA;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
      {filtered.map((p) => (
        <div key={p.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          <div style={{ fontSize:9.5, fontWeight:600, color:"var(--c3)" }}>{p.id}</div>
          <div
            onClick={()=>onSelect(p)}
            onMouseEnter={()=>setHovered(p.id)}
            onMouseLeave={()=>setHovered(null)}
            style={{
              width:"100%", aspectRatio:"1", borderRadius:13, cursor:"pointer",
              border:hovered===p.id?"2px solid #6d28d9":"1.5px solid rgba(109,40,217,0.12)",
              background:hovered===p.id?"#f5f3ff":"#fafafa",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:0, position:"relative", overflow:"hidden",
              boxShadow:hovered===p.id?"0 0 0 4px rgba(109,40,217,0.08)":"none",
              transition:"all .2s ease",
            }}
          >
            <img src="/pos-icon.png" alt="POS" style={{ width:28, height:28, objectFit:"contain", filter:hovered===p.id?"invert(27%) sepia(90%) saturate(800%) hue-rotate(245deg) brightness(80%)":"invert(60%)", transition:"filter .2s ease" }} />
            {hovered===p.id && (
              <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"#6d28d9", color:"#fff", fontSize:8.5, fontWeight:700, textAlign:"center", padding:"3px 0", letterSpacing:".04em" }}>View</div>
            )}
          </div>
          <div style={{ fontSize:8.5, color:"var(--c3)", textAlign:"center" }}>{p.branch}</div>
        </div>
      ))}
    </div>
  );
};

// ── POS Modal ─────────────────────────────────────────────────────────────────
const POSModal: React.FC<{ pos:POSDevice; onClose:()=>void }> = ({ pos, onClose }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:8000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }} onClick={onClose}>
    <div style={{ width:560, maxWidth:"94vw", background:"#fff", borderRadius:20, overflow:"hidden", animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ background:"linear-gradient(135deg,#0d3d3a 0%,#0f766e 100%)", padding:"18px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <img src="/pos-icon.png" alt="POS" style={{ width:28, height:28, objectFit:"contain", filter:"brightness(0) invert(1)", opacity:0.9 }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{pos.id}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2 }}>{pos.branch}</div>
        </div>
        <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12"/></svg>
        </button>
      </div>
      <div style={{ padding:"16px 20px 20px", background:"#f0f2f7" }}>
        {[["Model",pos.model],["Serial No.",pos.serial],["IP Address",pos.ip],["OS / Version",pos.os],["MSA Start",pos.msaStart],["MSA End",pos.msaEnd],["Warranty",pos.warranty]].map(([l,v])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(109,40,217,0.07)" }}>
            <span style={{ fontSize:11.5, color:"rgba(0,0,0,0.38)", fontWeight:500 }}>{l}</span>
            <span style={{ fontSize:11.5, color:"#3b1f7a", fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Branch Modal — FIXED: maxHeight + flex layout so POS list scrolls ─────────
const BranchModal: React.FC<{ branch:BranchLocation; onClose:()=>void; onSelectPOS:(p:POSDevice)=>void }> = ({ branch, onClose, onSelectPOS }) => {
  const branchPOS = POS_DATA.filter(p => p.branch === branch.name);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:8100, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:"#fff", borderRadius:20, boxShadow:"0 32px 80px rgba(0,0,0,0.25)",
        width:560, maxWidth:"94vw",
        // FIX: constrain height, use flex column so content never overflows
        maxHeight:"90vh", display:"flex", flexDirection:"column",
        overflow:"hidden", animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)"
      }}>
        {/* Header — flexShrink:0 so it never compresses */}
        <div style={{ background:"linear-gradient(135deg,#0d3d3a 0%,#0f766e 100%)", padding:"22px 26px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:"#fff", letterSpacing:"-0.01em" }}>{branch.name}</div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.65)", marginTop:3 }}>{branch.site}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Stats row — flexShrink:0 */}
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #f0f0f0", flexShrink:0 }}>
          {[
            { label:"POS Machines", value:branchPOS.length, color:"#6d28d9", bg:"#f5f3ff" },
            { label:"Seats",        value:branch.seats,     color:"#0d9488", bg:"#f0fdfa" },
            { label:"Total Sites",  value:TOTAL_SITES,      color:"#0369a1", bg:"#f0f9ff" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ flex:1, padding:"16px 10px", textAlign:"center", background:bg, borderRight:"1px solid #f0f0f0" }}>
              <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10.5, fontWeight:600, color:"rgba(0,0,0,0.45)", marginTop:5, letterSpacing:".04em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* POS list — FIX: flex:1 + overflowY:auto so it scrolls instead of overlapping */}
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

        {/* Footer — flexShrink:0 so it stays pinned at bottom */}
        <div style={{ padding:"14px 24px 22px", display:"flex", justifyContent:"flex-end", flexShrink:0, borderTop:"1px solid #f0f0f0" }}>
          <button className="btn btn-s btn-sm" onClick={onClose} style={{ borderRadius:10, padding:"7px 22px", fontSize:12 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Info Modal ───────────────────────────────────────────────────────────
const EditInfoModal: React.FC<{ data:RetailInfoData; onSave:(d:RetailInfoData)=>void; onClose:()=>void }> = ({ data, onSave, onClose }) => {
  const [form, setForm] = useState(data);
  const set = (k: keyof RetailInfoData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}));
  const inp: React.CSSProperties = { width:"100%", padding:"8px 11px", border:"1.5px solid rgba(109,40,217,0.12)", borderRadius:8, fontSize:12, fontFamily:"inherit", color:"#1e1b4b", background:"#f4f3fb", outline:"none" };
  const lbl: React.CSSProperties = { fontSize:10.5, fontWeight:600, color:"rgba(0,0,0,0.4)", marginBottom:4, display:"block" };
  const sec: React.CSSProperties = { fontSize:9, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase" as const, color:"#fff", padding:"3px 8px", borderRadius:5, display:"inline-block", marginBottom:10, marginTop:14 };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:8000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }} onClick={onClose}>
      <div style={{ width:480, maxWidth:"94vw", maxHeight:"90vh", background:"#fff", borderRadius:20, overflow:"hidden", animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)", display:"flex", flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:"linear-gradient(135deg,#0d3d3a,#0f766e)", padding:"16px 20px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8z"/></svg>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Edit Information</div>
            <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.7)" }}>Update retail account details</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:"auto", width:28, height:28, borderRadius:8, border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12"/></svg>
          </button>
        </div>
        <div style={{ padding:"6px 22px 16px", overflowY:"auto", flex:1 }}>
          <span style={{ ...sec, background:"#6d28d9" }}>Primary Contact</span>
          <div style={{ display:"grid", gap:8 }}>
            {([["storeName","Store Name"],["contactPerson","Contact Person"],["email","Email"],["phone","Phone"]] as [keyof RetailInfoData,string][]).map(([k,l])=>(
              <div key={k}><label style={lbl}>{l}</label><input style={inp} value={form[k]} onChange={set(k)} /></div>
            ))}
          </div>
          <span style={{ ...sec, background:"#0d9488" }}>Alternate Contact</span>
          <div style={{ display:"grid", gap:8 }}>
            {([["altContactPerson","Contact Person"],["altEmail","Email"],["altPhone","Phone"]] as [keyof RetailInfoData,string][]).map(([k,l])=>(
              <div key={k}><label style={lbl}>{l}</label><input style={inp} value={form[k]} onChange={set(k)} /></div>
            ))}
          </div>
        </div>
        <div className="gx-em-foot" style={{ flexShrink:0 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={()=>{onSave(form);onClose();}}>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:10,height:10 }}><path d="M2 6l2.5 3 5.5-5"/></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Notification Panel ────────────────────────────────────────────────────────
const NotifPanel: React.FC<{ notifs:Notification[]; onRead:(id:number)=>void; onMarkAll:()=>void; onClose:()=>void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const unread = notifs.filter(n=>!n.read).length;
  return (
    <div ref={ref} className="gx-notif-panel">
      <div className="gx-np-hdr">
        <span className="gx-np-title">Notifications</span>
        <span className={`gx-np-unread ${unread===0?"all-read":""}`}>{unread===0?"All read":`${unread} unread`}</span>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.map(n=>(
          <div key={n.id} className={`gx-ni${n.read?"":" unread"}`} onClick={()=>onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NOTIF_ICONS[n.type]}</div>
            <div className="gx-ni-body"><div className="gx-ni-title">{n.title}</div><div className="gx-ni-desc">{n.desc}</div><div className="gx-ni-time">{n.time}</div></div>
            {!n.read&&<div className="gx-ni-dot"/>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
interface RetailOverviewPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void; // FIX
}

const RetailOverviewPage: React.FC<RetailOverviewPageProps> = ({ onNavigate, onLogout }) => {
  const { msg, show, toast }              = useToast();
  const [info, setInfo]                   = useState<RetailInfoData>(DEFAULT_INFO);
  const [editOpen, setEditOpen]           = useState(false);
  const [selectedPOS, setSelectedPOS]     = useState<POSDevice|null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchLocation|null>(null);
  const [filterOpen, setFilterOpen]       = useState(false);
  const [filterBranch, setFilterBranch]   = useState<string[]>([]);
  const [notifs, setNotifs]               = useState<Notification[]>(NOTIFS_INIT);
  const [notifOpen, setNotifOpen]         = useState(false);

  const unread      = notifs.filter(n=>!n.read).length;
  const readNotif   = (id:number) => setNotifs(ns=>ns.map(n=>n.id===id?{...n,read:true}:n));
  const markAllRead = () => setNotifs(ns=>ns.map(n=>({...n,read:true})));

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar activePage="overview" onNavigate={onNavigate as (view:string)=>void} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0, overflow:"hidden" }}>
        <Header
          user={{ initials:"CL", name:"Chris Lee", role:"System Admin", company:"Nike Retail" }}
          clientLabel="Nike"
          notificationCount={unread}
          onNotificationClick={()=>setNotifOpen(o=>!o)}
          onLogout={onLogout}
        />
        <div className="gx-main">
          <div className="gx-view">
            <div className="gx-scroll-page">
              {/* Hero */}
              <div className="gx-hero" style={{ padding:"18px 14px" }}>
                <div style={{ width:72, height:72, background:"#fff", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.7)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                  <img src="/nike.svg" alt="Nike" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="gx-hero-title">Nike</div>
                  <div className="gx-hero-sub">SM Mall HQ · Retail · Acct Manager: Renz Talentino</div>
                  <div className="gx-hero-badges">
                    <span className="gx-hero-badge">{LICENSE.id}</span>
                    <div className="gx-status-pill"><div className="sdot" />Active Account</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, flexShrink:0 }}>
                <Stat ico="si-p"    value={13}          label="Users"        icon={<svg width="19" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>} />
                <Stat ico="si-t"    value={`${POS_DATA.length}/${POS_DATA.length}`} label="Total POS" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>} />
                <Stat ico="si-r"    value={0}           label="Open Tickets" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>} />
                <Stat ico="si-site" value={TOTAL_SITES}  label="Sites"        icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>} />
                <Stat ico="si-seat" value={TOTAL_SEATS}  label="Seats"        icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 3v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V3M3 13h10M6 10v3M10 10v3"/></svg>} />
              </div>

              {/* Two columns */}
              <div className="g2" style={{ alignItems:"start" }}>

                {/* General Info */}
                <div className="gx-card" style={{ display:"flex", flexDirection:"column" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <span className="gx-card-title">General Information</span>
                    <button className="btn btn-s btn-xs" onClick={()=>setEditOpen(true)}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:11,height:11 }}><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
                      Edit Info
                    </button>
                  </div>
                  <SL mt={2}>Primary Contact</SL>
                  <InfoRow label="Store Name">{info.storeName}</InfoRow>
                  <InfoRow label="Contact Person">{info.contactPerson}</InfoRow>
                  <InfoRow label="Email"><span style={{ fontSize:9.5 }}>{info.email}</span></InfoRow>
                  <InfoRow label="Phone">{info.phone}</InfoRow>
                  <SL>Alternate Contact</SL>
                  <InfoRow label="Contact Person">{info.altContactPerson}</InfoRow>
                  <InfoRow label="Email">{info.altEmail}</InfoRow>
                  <InfoRow label="Phone">{info.altPhone}</InfoRow>
                  <SL>Account Details</SL>
                  <InfoRow label="Acct Manager"><span style={{ color:"var(--p)", fontWeight:600 }}>Renz Talentino</span></InfoRow>
                  <InfoRow label="User Role">System Admin</InfoRow>
                  <div className="gx-lic-card" style={{ marginTop:10 }}>
                    <div className="gx-lic-label">License</div>
                    <div className="gx-lic-id">{LICENSE.id}</div>
                    <InfoRow label="SA Start">{LICENSE.saStart}</InfoRow>
                    <InfoRow label="SA End">
                      <span style={{ color:"#16a34a", fontWeight:600 }}>
                        {LICENSE.saEnd}
                        <span style={{ fontSize:9, background:"rgba(22,163,74,0.1)", color:"#16a34a", padding:"1px 5px", borderRadius:4, marginLeft:4 }}>Active</span>
                      </span>
                    </InfoRow>
                    <InfoRow label="Krunch #">
                      <span style={{ color:"var(--p)", fontWeight:600 }}>{LICENSE.krunch}</span>
                    </InfoRow>
                  </div>
                  <SL>Branch Locations</SL>
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginTop:6, paddingBottom:4 }}>
                    {BRANCHES.map(b=>(
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
                <div className="gx-card" style={{ display:"flex", flexDirection:"column", position:"relative" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <span className="gx-card-title">POS Machines</span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="btn btn-s btn-xs" onClick={()=>setFilterOpen(o=>!o)} style={{ position:"relative" }}>
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:10,height:10 }}><path d="M2 4h10M4 7h6M6 10h2"/></svg> Filter
                        {filterBranch.length>0 && <span style={{ position:"absolute", top:-4, right:-4, width:8, height:8, borderRadius:"50%", background:"#6d28d9" }} />}
                      </button>
                    </div>
                  </div>
                  {filterOpen && (
                    <FilterPopover
                      branches={[...new Set(POS_DATA.map(p=>p.branch))]}
                      selected={filterBranch}
                      onChange={setFilterBranch}
                      onClose={()=>setFilterOpen(false)}
                      posData={POS_DATA}
                    />
                  )}
                  <PosGrid onSelect={setSelectedPOS} filterBranch={filterBranch} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`gx-toast ${show?"show":""}`}><div className="gx-toast-dot"/><span>{msg}</span></div>
        {selectedPOS && <POSModal pos={selectedPOS} onClose={()=>setSelectedPOS(null)} />}
        {selectedBranch && <BranchModal branch={selectedBranch} onClose={()=>setSelectedBranch(null)} onSelectPOS={p=>{ setSelectedBranch(null); setSelectedPOS(p); }} />}
        {editOpen && <EditInfoModal data={info} onSave={(d)=>{ setInfo(d); toast("Information updated!"); }} onClose={()=>setEditOpen(false)} />}
        {notifOpen && <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={()=>setNotifOpen(false)} />}
      </div>
    </div>
  );
};

export default RetailOverviewPage;