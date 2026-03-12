/**
 * RetailOverviewPage.tsx
 * MERGED: UI/layout from CSS-variable version + live DB logic from migrated version.
 * - Live data: useOverviewData() hook (branches, posDevices, licenses, uiNotifs)
 * - UI: Hero banner, stat cards, General Info panel, POS grid with branch grouping,
 *       MSA modal, Branch modal, POS modal, Edit Info modal, Filter popover, Toast
 */

'use client'

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  useOverviewData,
  type Branch,
  type PosDevice,
  type InfoData,
} from "../../Hooks/usePortalData";
import { type AuthUser } from "../../Services/api.service";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";

// ─── Props ────────────────────────────────────────────────────────────────────

type CPView = "overview" | "tickets" | "users" | "settings";

interface Props {
  user?:       AuthUser | null;
  onLogout?:   () => void;
  onNavigate?: (view: CPView) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(s?: string | null): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000);
}

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

// ─── MSA stat card ────────────────────────────────────────────────────────────

const MSAStatCard: React.FC<{ onClick: () => void; devices: PosDevice[] }> = ({ onClick, devices }) => {
  const [hov, setHov] = useState(false);

  let soonestDays: number | null = null;
  for (const d of devices) {
    if (!d.msa_end) continue;
    const days = Math.ceil((new Date(d.msa_end).getTime() - Date.now()) / 86_400_000);
    if (soonestDays === null || days < soonestDays) soonestDays = days;
  }

  const expired = soonestDays !== null && soonestDays <= 0;
  const urgent  = soonestDays !== null && soonestDays > 0 && soonestDays <= 30;
  const ok      = soonestDays !== null && soonestDays > 30;

  const accent    = expired ? "#dc2626" : urgent ? "#d97706" : "#16a34a";
  const iconBg    = expired ? "linear-gradient(135deg,#fef2f2,#fecaca)" : urgent ? "linear-gradient(135deg,#fffbeb,#fde68a)" : "linear-gradient(135deg,#f0fdf4,#bbf7d0)";
  const badgeText = expired ? "EXPIRED" : urgent ? "EXPIRING SOON" : ok ? `${soonestDays}d left` : "—";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="gx-stat"
      style={{
        padding: "14px 16px 12px", borderRadius: 14,
        background: hov ? "#faf9ff" : "#fff",
        border: `1px solid ${hov ? "rgba(124,58,237,0.3)" : expired ? "#fecaca" : urgent ? "#fde68a" : "rgba(124,58,237,0.1)"}`,
        boxShadow: hov ? "0 6px 24px rgba(124,58,237,0.12)" : "0 1px 4px rgba(15,10,35,0.04)",
        cursor: "pointer", transition: "all 0.18s",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: "14px 14px 0 0", opacity: hov ? 1 : 0.6, transition: "opacity 0.18s" }} />
      <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 6, background: hov ? accent + "18" : "rgba(124,58,237,0.07)", border: `1px solid ${hov ? accent + "40" : "rgba(124,58,237,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={hov ? accent : "#8e7ec0"} strokeWidth="1.8" style={{ transition: "all 0.18s", transform: hov ? "translateX(1px)" : "translateX(0)" }}><path d="M2 1.5l3 2.5-3 2.5"/></svg>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: accent, marginBottom: 10 }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></svg>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#18103a" }}>MSA Expiry</span>
          {(expired || urgent || ok) && (
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em", color: accent, background: accent + "15", border: `1px solid ${accent}35`, borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap" }}>
              {badgeText}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#8e7ec0", fontWeight: 500 }}>Click to view details</span>
        </div>
      </div>
    </div>
  );
};

// ─── Sites + Seats card ───────────────────────────────────────────────────────

const SitesSeatsStat: React.FC<{ sites: number; seats: number }> = ({ sites, seats }) => {
  const [hov, setHov] = useState(false);
  const accent = "#0284c7";
  return (
    <div
      className="gx-stat"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 130, padding: "14px 16px 12px", borderRadius: 14,
        background: "#fff",
        border: `1px solid ${hov ? accent + "44" : "rgba(124,58,237,0.1)"}`,
        boxShadow: hov ? `0 6px 24px ${accent}18` : "0 1px 4px rgba(15,10,35,0.04)",
        transition: "all 0.18s", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: "14px 14px 0 0", opacity: hov ? 1 : 0.5, transition: "opacity 0.18s" }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e0f2fe,#bae6fd)", color: accent, marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="7" r="3"/><path d="M8 12s-4-2.5-4-5a4 4 0 0 1 8 0c0 2.5-4 5-4 5z"/></svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ paddingRight: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#18103a", lineHeight: 1, letterSpacing: "-0.5px" }}>{sites}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8e7ec0", marginTop: 4 }}>Site</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(124,58,237,0.12)", marginRight: 12 }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#18103a", lineHeight: 1, letterSpacing: "-0.5px" }}>{seats}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8e7ec0", marginTop: 4 }}>Seats</div>
        </div>
      </div>
    </div>
  );
};

// ─── Generic stat card ────────────────────────────────────────────────────────

const StatCard: React.FC<{ icon: React.ReactNode; value: React.ReactNode; label: string; iconBg: string; iconColor: string; accent: string }> = ({ icon, value, label, iconBg, iconColor, accent }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="gx-stat"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 130, padding: "14px 16px 12px", borderRadius: 14,
        background: "#fff",
        border: `1px solid ${hov ? accent + "44" : "rgba(124,58,237,0.1)"}`,
        boxShadow: hov ? `0 6px 24px ${accent}18` : "0 1px 4px rgba(15,10,35,0.04)",
        transition: "all 0.18s", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: "14px 14px 0 0", opacity: hov ? 1 : 0.5, transition: "opacity 0.18s" }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor, marginBottom: 8 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#18103a", lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#8e7ec0", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
};

// ─── MSA Expiry Modal ─────────────────────────────────────────────────────────

const MSAModal: React.FC<{ devices: PosDevice[]; branches: Branch[]; onClose: () => void }> = ({ devices, branches, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);

  const branchMSA = branches.map(b => {
    const branchDevices = devices.filter(d => d.branch_id === b.id);
    const ends = branchDevices.map(d => d.msa_end).filter(Boolean) as string[];
    const msaEnd = ends.sort().at(-1);
    const daysLeft = msaEnd ? Math.ceil((new Date(msaEnd).getTime() - Date.now()) / 86_400_000) : null;
    const status: "active" | "expiring" | "overdue" = daysLeft === null ? "active" : daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "expiring" : "active";
    return { branch: b.name, msaEnd: msaEnd ?? null, daysLeft, status };
  }).sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18103a" }}>MSA Expiration Details</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {branchMSA.map((item, idx) => {
              const expired  = item.status === "overdue";
              const expiring = item.status === "expiring";
              const accent   = expired ? "#dc2626" : expiring ? "#d97706" : "#16a34a";
              const bg       = expired ? "#fef2f2" : expiring ? "#fffbeb" : "#f0fdf4";
              const border   = expired ? "#fecaca" : expiring ? "#fde68a" : "#bbf7d0";
              const badge    = expired ? "EXPIRED" : expiring ? "EXPIRING SOON" : "ACTIVE";
              const daysLabel = item.daysLeft === null ? "—" : item.daysLeft <= 0 ? "Expired" : `${item.daysLeft} days`;
              return (
                <div key={idx} style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${border}`, background: bg, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#18103a" }}>{item.branch}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: accent + "20", color: accent }}>{badge}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#8e7ec0", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>MSA End Date</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#18103a" }}>{fmtDate(item.msaEnd)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#8e7ec0", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Days Remaining</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: accent }}>{daysLabel}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {branchMSA.length === 0 && <p style={{ fontSize: 13, color: "#8e7ec0", textAlign: "center", padding: "24px 0" }}>No MSA data available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Branch detail modal ──────────────────────────────────────────────────────

const BranchModal: React.FC<{ branch: Branch; devices: PosDevice[]; onClose: () => void; onSelectDevice: (d: PosDevice) => void }> = ({ branch, devices, onClose, onSelectDevice }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const branchDevices = devices.filter(d => d.branch_id === branch.id);

  const msaEnds = branchDevices.map(d => d.msa_end).filter(Boolean) as string[];
  const msaEnd  = msaEnds.sort().at(-1);
  const msaDays = msaEnd ? Math.ceil((new Date(msaEnd).getTime() - Date.now()) / 86_400_000) : null;
  const msaStatus = (() => {
    if (msaDays === null) return { label: "UNKNOWN", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    if (msaDays <= 0)     return { label: "EXPIRED",       color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    if (msaDays <= 30)    return { label: "EXPIRING SOON", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    return                       { label: "ACTIVE",        color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  })();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,7,36,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002, padding: 20 }}>
      <div ref={ref} style={{ width: 600, maxWidth: "96vw", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Blue retail header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "linear-gradient(135deg,#0284c7,#0ea5e9)", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="9" cy="7" r="1.8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{branch.site ?? branch.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Nike · Retail</div>
          </div>
          {branch.license_tag && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "5px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{branch.license_tag}</span>
            </div>
          )}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1, padding: "18px 20px" }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(13,148,136,0.07)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(13,148,136,0.18)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0d9488", lineHeight: 1 }}>{branchDevices.length}</div>
              <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>POS Machines</div>
            </div>
            <div style={{ background: "rgba(2,132,199,0.07)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(2,132,199,0.18)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0284c7", lineHeight: 1 }}>{branch.seats ?? "—"}</div>
              <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>Seats</div>
            </div>
            <div style={{ background: msaStatus.bg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${msaStatus.border}`, textAlign: "center", position: "relative", overflow: "hidden" }}>
              <span style={{ position: "absolute", top: 6, right: 6, fontSize: 7.5, fontWeight: 800, color: msaStatus.color, background: msaStatus.color + "18", border: `1px solid ${msaStatus.color}40`, borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap" }}>
                {msaStatus.label}
              </span>
              <div style={{ fontSize: 14, fontWeight: 800, color: msaStatus.color, lineHeight: 1.3, marginTop: 6 }}>{fmtDate(msaEnd)}</div>
              {msaDays !== null && msaDays > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: msaStatus.color, opacity: 0.8, marginTop: 2 }}>{msaDays}d left</div>}
              <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>MSA Expiry</div>
            </div>
          </div>

          {/* POS list */}
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#8e7ec0", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>POS Devices at this Location ({branchDevices.length})</div>
            {branchDevices.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#8e7ec0", fontSize: 12, background: "#f2f0fb", borderRadius: 12, border: "1.5px dashed rgba(124,58,237,0.22)" }}>
                No POS machines assigned to this location yet.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {branchDevices.map(device => (
                <div key={device.id} style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)", background: "#fff", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#18103a", marginBottom: 4 }}>{device.model ?? `Device #${device.id}`}</div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {[
                          { label: "Serial", val: device.serial ?? "—" },
                          { label: "IP",     val: device.ip_address ?? "—" },
                          { label: "OS",     val: device.os ?? "—" },
                        ].map(({ label, val }) => (
                          <span key={label} style={{ fontSize: 10.5, color: "#8e7ec0" }}>
                            <span style={{ fontWeight: 600, color: "#4a3870" }}>{label}: </span>{val}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => { onClose(); onSelectDevice(device); }}
                      style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(124,58,237,0.2)", background: "#f5f3ff", color: "#6d28d9", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(124,58,237,0.1)", background: "#f8f7ff", padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)", background: "#fff", fontSize: 12, fontWeight: 600, color: "#4a3870", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── POS device modal ─────────────────────────────────────────────────────────

const PosModal: React.FC<{ device: PosDevice; branches: Branch[]; onClose: () => void }> = ({ device, branches, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const branchName = branches.find(b => b.id === device.branch_id)?.name ?? "—";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18103a" }}>{device.model ?? `Device #${device.id}`}</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {[
            { label: "Serial",       value: device.serial ?? "—" },
            { label: "IP Address",   value: device.ip_address ?? "—" },
            { label: "OS",           value: device.os ?? "—" },
            { label: "Status",       value: device.status ?? "—" },
            { label: "Branch",       value: branchName },
            { label: "MSA Start",    value: fmtDate(device.msa_start) },
            { label: "MSA End",      value: fmtDate(device.msa_end) },
            { label: "Warranty End", value: fmtDate(device.warranty_end) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(124,58,237,0.05)" }}>
              <span style={{ fontSize: 11, color: "#8e7ec0", fontWeight: 500, minWidth: 100 }}>{label}</span>
              <span style={{ fontSize: 12, color: "#18103a", fontWeight: 600, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 24px 20px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 10, background: "#000", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Info modal ──────────────────────────────────────────────────────────

const EditInfoModal: React.FC<{ info: InfoData; onSave: (d: InfoData) => void; onClose: () => void }> = ({ info, onSave, onClose }) => {
  const [form, setForm] = useState<InfoData>({ ...info });
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18103a" }}>Edit Information</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(Object.keys(form) as (keyof InfoData)[]).filter(k => k !== "keyNo").map(key => (
              <div key={key}>
                <label style={lbl}>{key.replace(/([A-Z])/g, " $1").trim()}</label>
                <input style={inp} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

// ─── Filter popover ───────────────────────────────────────────────────────────

const FilterPopover: React.FC<{
  branches: Branch[];
  filterBranch: string;
  filterStatus: string;
  onBranch: (v: string) => void;
  onStatus: (v: string) => void;
  onReset: () => void;
  onClose: () => void;
}> = ({ branches, filterBranch, filterStatus, onBranch, onStatus, onReset, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const sel: React.CSSProperties = { width: "100%", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px", outline: "none", background: "#fff", fontFamily: "inherit" };
  return (
    <div ref={ref} style={{ position: "absolute", top: 42, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 10, minWidth: 180 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Branch</div>
      <select style={sel} value={filterBranch} onChange={e => onBranch(e.target.value)}>
        <option value="all">All branches</option>
        {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
      </select>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", margin: "10px 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</div>
      <select style={sel} value={filterStatus} onChange={e => onStatus(e.target.value)}>
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="offline">Offline</option>
        <option value="maintenance">Maintenance</option>
      </select>
      <button onClick={onReset} style={{ marginTop: 10, width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, fontWeight: 600, color: "#6d28d9", cursor: "pointer", fontFamily: "inherit" }}>Reset filters</button>
    </div>
  );
};

// ─── Notification panel ───────────────────────────────────────────────────────

const NOTIF_COLORS: Record<string, string> = {
  warn:    "bg-yellow-50 border-yellow-300 text-yellow-800",
  error:   "bg-red-50 border-red-300 text-red-800",
  info:    "bg-blue-50 border-blue-300 text-blue-800",
  success: "bg-green-50 border-green-300 text-green-800",
  purple:  "bg-purple-50 border-purple-300 text-purple-800",
};

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active:      "bg-green-100 text-green-700",
  offline:     "bg-red-100 text-red-700",
  maintenance: "bg-yellow-100 text-yellow-700",
};

function statusPill(status?: string) {
  const s   = (status ?? "offline").toLowerCase();
  const cls = STATUS_STYLE[s] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RetailOverviewPage({ user, onLogout, onNavigate }: Props) {
  const companyId = user?.company_id ?? null;
  const {
    company, branches, posDevices, licenses, uiNotifs,
    info, setInfo, loading, markRead, markAllRead,
  } = useOverviewData(companyId);

  const { msg, show, toast } = useToast();

  // ── UI state ─────────────────────────────────────────────────
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [msaModalOpen, setMsaModalOpen] = useState(false);
  const [branchModal,  setBranchModal]  = useState<Branch | null>(null);
  const [posModal,     setPosModal]     = useState<PosDevice | null>(null);
  const [infoEditOpen, setInfoEditOpen] = useState(false);
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [bgHov,        setBgHov]        = useState(false);
  const [bgSrc,        setBgSrc]        = useState("/Nike-store.png");
  const bgInput = useRef<HTMLInputElement>(null);

  // ── Derived ───────────────────────────────────────────────────
  const license   = licenses[0] ?? null;
  const totalSits = branches.length;
  const totalSeats = branches.reduce((acc, b) => acc + (b.seats ?? 0), 0);
  const unread    = uiNotifs.filter(n => !n.read).length;

  const posGrouped = useMemo(() => {
    const filtered = posDevices.filter(p => {
      const bMatch = filterBranch === "all" || String(p.branch_id) === filterBranch;
      const sMatch = filterStatus === "all" || (p.status ?? "").toLowerCase() === filterStatus;
      return bMatch && sMatch;
    });
    return branches.map(b => ({
      branch:  b,
      devices: filtered.filter(p => p.branch_id === b.id),
    }));
  }, [posDevices, branches, filterBranch, filterStatus]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
        <Sidebar activePage="overview" onNavigate={onNavigate as (view: string) => void} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Header
            user={{ initials: user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "??", name: user?.name ?? "User", role: user?.position ?? "Manager", company: "Retail" }}
            clientLabel="Nike"
            notificationCount={unread}
            onNotificationClick={() => setNotifOpen(o => !o)}
            onLogout={onLogout}
          />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, border: "4px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <p style={{ fontSize: 13, color: "#6b7280" }}>Loading your overview…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <Sidebar activePage="overview" onNavigate={onNavigate as (view: string) => void} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        <Header
          user={{ initials: user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "??", name: user?.name ?? "User", role: user?.position ?? "Manager", company: "Retail" }}
          clientLabel="Nike"
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "14px 20px", overflow: "hidden", minHeight: 0 }}>

              {/* ── Hero ─────────────────────────────────────────── */}
              <div className="gx-hero" style={{ padding: 0, flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "stretch" }}>
                {/* LEFT — black gradient */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px 18px 20px", background: "linear-gradient(135deg,#1a1a1a,#000)", flexShrink: 0, zIndex: 2, position: "relative" }}>
                  <div style={{ width: 72, height: 72, background: "#fff", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img src="/nike.svg" alt="Nike" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="gx-hero-title">{company?.name ?? "Nike"}</div>
                    <div className="gx-hero-sub">{branches[0]?.site ?? "HQ"} · Retail · Acct Manager: {company?.account_manager ?? "—"}</div>
                    <div className="gx-hero-badges">
                      <div className="gx-status-pill"><div className="sdot" />Active Account</div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 0, right: -32, width: 32, height: "100%", background: "linear-gradient(to right,#000,transparent)", zIndex: 3 }} />
                </div>
                {/* RIGHT — cover photo */}
                <div
                  style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "pointer" }}
                  onMouseEnter={() => setBgHov(true)}
                  onMouseLeave={() => setBgHov(false)}
                  onClick={() => bgInput.current?.click()}
                >
                  <img src={bgSrc} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", zIndex: 0, filter: bgHov ? "brightness(0.55)" : "none", transition: "filter 0.2s" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 1 }} />
                  <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", opacity: bgHov ? 1 : 0, transition: "opacity 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="14" height="11" rx="2"/><circle cx="8" cy="8.5" r="2.5"/><path d="M5.5 3l1-2h3l1 2"/></svg>
                      Change Cover Photo
                    </div>
                  </div>
                  <input ref={bgInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setBgSrc(URL.createObjectURL(f)); }} />
                </div>
              </div>

              {/* ── Stat cards ────────────────────────────────────── */}
              <div className="g4" style={{ flexShrink: 0, gap: 14 }}>
                <StatCard
                  icon={<svg width="19" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>}
                  value={posDevices.filter(p => (p.status ?? "").toLowerCase() === "active").length}
                  label="Active POS"
                  iconBg="linear-gradient(135deg,#ede9fe,#ddd6fe)"
                  iconColor="#7c3aed"
                  accent="#7c3aed"
                />
                <StatCard
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>}
                  value={posDevices.length}
                  label="Total POS"
                  iconBg="linear-gradient(135deg,#ccfbf1,#99f6e4)"
                  iconColor="#0d9488"
                  accent="#0d9488"
                />
                <MSAStatCard onClick={() => setMsaModalOpen(true)} devices={posDevices} />
                <SitesSeatsStat sites={totalSits} seats={totalSeats} />
              </div>

              {/* ── Two-column content ────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0, alignItems: "stretch" }}>

                {/* General Info */}
                <div className="gx-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(124,58,237,0.1)", flexShrink: 0, margin: "-1px -1px 0" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#18103a" }}>General Information</span>
                    <button
                      onClick={() => setInfoEditOpen(true)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: "#4a3870", background: "#f2f0fb", border: "1px solid rgba(124,58,237,0.1)", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>
                      Edit Info
                    </button>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0 } as React.CSSProperties}>
                    {[
                      { section: "PRIMARY CONTACT", rows: [
                        { label: "Store Name",     val: info.storeName },
                        { label: "Contact Person", val: info.contactPerson },
                        { label: "Email",          val: info.email },
                        { label: "Phone",          val: info.phone },
                      ]},
                      { section: "ALTERNATE CONTACT", rows: [
                        { label: "Contact Person", val: info.altContactPerson },
                        { label: "Email",          val: info.altEmail },
                        { label: "Phone",          val: info.altPhone },
                      ]},
                    ].map(({ section, rows }) => (
                      <React.Fragment key={section}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 10 }}>{section}</div>
                        {rows.map(({ label, val }) => (
                          <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                            <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, minWidth: 100 }}>{label}</span>
                            <span style={{ fontSize: 11.5, color: "#18103a", fontWeight: 600, textAlign: "right", wordBreak: "break-all" }}>{val || "—"}</span>
                          </div>
                        ))}
                      </React.Fragment>
                    ))}

                    {/* Account details */}
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>ACCOUNT DETAILS</div>
                    {[
                      { label: "Acct Manager", val: company?.account_manager ?? "—", color: "#7c3aed" },
                      { label: "User Role",    val: user?.position ?? "Manager",     color: undefined },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, minWidth: 100 }}>{label}</span>
                        <span style={{ fontSize: 11.5, color: color ?? "#18103a", fontWeight: 600 }}>{val}</span>
                      </div>
                    ))}

                    {/* License */}
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#b8aed8", marginBottom: 4, marginTop: 12 }}>LICENSE</div>
                    {[
                      { label: "License Key", val: license?.license_key ?? "—" },
                      { label: "SA Start",    val: fmtDate(license?.sa_start) },
                      { label: "SA End",      val: fmtDate(license?.sa_end) },
                      { label: "Krunch #",    val: license?.krunch_version ?? "—" },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(124,58,237,0.05)", minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, minWidth: 100 }}>{label}</span>
                        <span style={{ fontSize: 11.5, color: "#18103a", fontWeight: 600, textAlign: "right" }}>{val}</span>
                      </div>
                    ))}

                    {/* Branch locations */}
                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(124,58,237,0.1)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#4a3870", marginBottom: 10 }}>Branch Locations</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {branches.map(b => (
                          <button
                            key={b.id}
                            onClick={() => setBranchModal(b)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))", color: "#0c4a6e", fontSize: 10.5, fontWeight: 700, borderRadius: 7, border: "1px solid rgba(2,132,199,0.18)", cursor: "pointer", transition: "all 0.14s", fontFamily: "inherit" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                            {b.name}
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
                          </button>
                        ))}
                        {branches.length === 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>No branches available</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* POS Machines */}
                <div className="gx-card" style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="gx-card-title">POS Machines</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(109,40,217,0.09)", color: "#6d28d9" }}>{posDevices.length} devices</span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <button
                        className="btn btn-s btn-xs"
                        onClick={() => setFilterOpen(o => !o)}
                      >
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}><path d="M2 4h10M4 7h6M6 10h2"/></svg>
                        Filter
                        {(filterBranch !== "all" || filterStatus !== "all") && (
                          <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#6d28d9" }} />
                        )}
                      </button>
                      {filterOpen && (
                        <FilterPopover
                          branches={branches}
                          filterBranch={filterBranch}
                          filterStatus={filterStatus}
                          onBranch={setFilterBranch}
                          onStatus={setFilterStatus}
                          onReset={() => { setFilterBranch("all"); setFilterStatus("all"); setFilterOpen(false); }}
                          onClose={() => setFilterOpen(false)}
                        />
                      )}
                    </div>
                  </div>

                  <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {posGrouped.map(({ branch, devices }) => (
                        <div key={branch.id}>
                          <button
                            onClick={() => setBranchModal(branch)}
                            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))", border: "1px solid rgba(2,132,199,0.18)", borderRadius: 6, padding: "3px 10px" }}>
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#0c4a6e" }}>{branch.name}</span>
                            </div>
                            {branch.license_tag && (
                              <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(217,119,6,0.1)", color: "#92400e", padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(217,119,6,0.2)" }}>
                                {branch.license_tag}
                              </span>
                            )}
                            <span style={{ fontSize: 10.5, color: "#8e7ec0", fontWeight: 600 }}>{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
                          </button>

                          {devices.length === 0 ? (
                            <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginLeft: 4 }}>No devices match filter.</p>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
                              {devices.map(device => (
                                <button
                                  key={device.id}
                                  onClick={() => setPosModal(device)}
                                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #f0f0f4", background: "#fff", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", textAlign: "left" }}
                                  onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "none"; }}
                                >
                                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(109,40,217,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#6d28d9" strokeWidth="1.5"><rect x="2" y="3" width="16" height="11" rx="1.5"/><path d="M7 18h6M10 14v4"/></svg>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#18103a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{device.model ?? `Device #${device.id}`}</div>
                                    <div style={{ fontSize: 9.5, color: "#8e7ec0", marginTop: 1 }}>{device.ip_address ?? "—"}</div>
                                    <div style={{ marginTop: 3 }}>{statusPill(device.status)}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {branches.length === 0 && (
                        <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af" }}>
                          <p style={{ fontSize: 14, fontWeight: 600 }}>No branch data available.</p>
                          <p style={{ fontSize: 12, marginTop: 4 }}>Branch and device information will appear here once loaded.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}

      {msaModalOpen && (
        <MSAModal devices={posDevices} branches={branches} onClose={() => setMsaModalOpen(false)} />
      )}

      {branchModal && (
        <BranchModal
          branch={branchModal}
          devices={posDevices}
          onClose={() => setBranchModal(null)}
          onSelectDevice={d => { setBranchModal(null); setPosModal(d); }}
        />
      )}

      {posModal && (
        <PosModal device={posModal} branches={branches} onClose={() => setPosModal(null)} />
      )}

      {infoEditOpen && (
        <EditInfoModal
          info={info}
          onSave={d => { setInfo(d); toast("Information updated!"); }}
          onClose={() => setInfoEditOpen(false)}
        />
      )}

      {/* Notification panel */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNotifOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">
                Notifications {unread > 0 && <span className="ml-1 text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">{unread} new</span>}
              </h3>
              <div className="flex items-center gap-2">
                {unread > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>}
                <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {uiNotifs.length === 0 && <p className="text-sm text-gray-400 text-center mt-8">No notifications.</p>}
              {uiNotifs.map(n => (
                <div key={n.id} className={`p-3 rounded-lg border text-sm ${NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info} ${n.read ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{n.title}</p>
                      <p className="mt-0.5 text-xs opacity-80">{n.desc}</p>
                      <p className="mt-1 text-xs opacity-60">{n.time}</p>
                    </div>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-xs underline whitespace-nowrap opacity-70 hover:opacity-100">Mark read</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`gx-toast ${show ? "show" : ""}`}><div className="gx-toast-dot" /><span>{msg}</span></div>
    </div>
  );
}
