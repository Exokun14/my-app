// ============================================================
// BranchModal.tsx — Standalone branch detail modal
// Matches the original RetailOverviewPage inline BranchModal
// design exactly. Adds:
//   - brandColor prop → header gradient uses the color wheel color
//   - warranty status text per device
//   - Edit / Remove / Add POS / Delete Branch (admin + manager only)
// Drop into: app/Components/BranchModal.tsx
// ============================================================

'use client'

import React, { useRef, useEffect, useState } from "react";
import type { Branch, PosDevice, License } from "../Hooks/usePortalData";
import type { AuthUser } from "../Services/api.service";

export interface BranchModalProps {
  branch:        Branch;
  posDevices:    PosDevice[];
  licenses:      License[];
  branches:      Branch[];
  user:          AuthUser | null;
  brandColor?:   string | null;   // from heroColor in OverviewPage / RetailOverviewPage
  onClose:       () => void;
  onSelectPOS?:  (pos: PosDevice) => void;
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

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function canManage(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.role === "manager";
}

function warrantyStatus(device: PosDevice): "under" | "out" | null {
  if (device.under_warranty === true)  return "under";
  if (device.under_warranty === false) return "out";
  if (!device.warranty_end)            return null;
  return new Date(device.warranty_end) > new Date() ? "under" : "out";
}

const BranchModal: React.FC<BranchModalProps> = ({
  branch, posDevices, licenses, branches, user, brandColor, onClose, onSelectPOS,
}) => {
  const ref          = useClickOutside<HTMLDivElement>(onClose);
  const isManager    = canManage(user);
  const isFnB        = user?.industry === "fnb";

  const branchDevices = posDevices.filter(d => d.branch_id === branch.id);

  // MSA — from license sa_end if available, else from device msa_end
  const branchLicense = isFnB
    ? licenses.find(l => l.license_key === branch.license_tag) ?? licenses[0] ?? null
    : licenses[0] ?? null;

  const msaEnds  = branchDevices.map(d => d.msa_end).filter(Boolean) as string[];
  const msaEnd   = branchLicense?.sa_end ?? msaEnds.sort().at(-1);
  const msaDays  = msaEnd ? Math.ceil((new Date(msaEnd).getTime() - Date.now()) / 86_400_000) : null;
  const msaStatus = (() => {
    if (msaDays === null) return { label: "UNKNOWN",       color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    if (msaDays <= 0)     return { label: "EXPIRED",       color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    if (msaDays <= 30)    return { label: "EXPIRING SOON", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    return                       { label: "ACTIVE",        color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  })();

  // Header gradient — use brandColor if provided, else original blue for retail / orange for F&B
  const defaultColor = isFnB ? "#f97316" : "#0284c7";
  const headerColor  = brandColor ?? defaultColor;
  const headerGrad   = `linear-gradient(135deg, ${headerColor}, ${headerColor}cc)`;

  // Company name subtitle
  const subtitle = `${user?.company_name ?? "—"} · ${isFnB ? "Aloha" : "Retail"}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,7,36,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002, padding: 20 }}>
      <div ref={ref} style={{ width: 600, maxWidth: "96vw", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── Header — original design, color from brandColor ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: headerGrad, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="9" cy="7" r="1.8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{branch.site ?? branch.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{subtitle}</div>
          </div>
          {branch.license_tag && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "5px 10px" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>{branch.license_tag}</span>
            </div>
          )}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Body — original layout ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1, padding: "18px 20px" }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(13,148,136,0.07)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(13,148,136,0.18)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0d9488", lineHeight: 1 }}>{branchDevices.length}</div>
              <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>POS Machines</div>
            </div>
            <div style={{ background: "rgba(2,132,199,0.07)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(2,132,199,0.18)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0284c7", lineHeight: 1 }}>
                {isFnB ? (branch.seats ?? "—") : branches.length}
              </div>
              <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 4, fontWeight: 500 }}>
                {isFnB ? "Seats" : "Total Branches"}
              </div>
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

          {/* License card — shown below stats, matches screenshots */}
          {branchLicense && (
            <div style={{ background: isFnB ? "rgba(249,115,22,0.04)" : "rgba(124,58,237,0.04)", border: `1px solid ${isFnB ? "rgba(249,115,22,0.15)" : "rgba(124,58,237,0.12)"}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: isFnB ? "rgba(249,115,22,0.1)" : "rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={isFnB ? "#f97316" : "#7c3aed"} strokeWidth="1.5"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" as const }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "#8e7ec0" }}>Active License</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: isFnB ? "rgba(249,115,22,0.08)" : "rgba(124,58,237,0.08)", color: isFnB ? "#c2410c" : "#6d28d9", border: `1px solid ${isFnB ? "rgba(249,115,22,0.2)" : "rgba(124,58,237,0.15)"}` }}>
                    {isFnB ? "Unique per branch" : "Shared — all branches"}
                  </span>
                  {!isFnB && branchLicense.seats != null && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#0d9488", marginLeft: "auto" }}>
                      {branches.length} / {branchLicense.seats}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: isFnB ? "#f97316" : "#7c3aed", letterSpacing: "0.01em", marginBottom: 3 }}>
                  {branchLicense.license_key}
                </div>
                <div style={{ fontSize: 10, color: "#8e7ec0", marginBottom: 6 }}>
                  {isFnB
                    ? `This license is exclusively assigned to the ${branch.site ?? branch.name} branch.`
                    : `This shared license is automatically applied to all branches under ${user?.company_name ?? "this company"}.`}
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {branchLicense.sa_start && (
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: "#b8aed8", letterSpacing: "0.07em", textTransform: "uppercase" as const }}>MSA Start</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#18103a" }}>{fmtDate(branchLicense.sa_start)}</div>
                    </div>
                  )}
                  {branchLicense.sa_end && (
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: "#b8aed8", letterSpacing: "0.07em", textTransform: "uppercase" as const }}>MSA End</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: msaStatus.color }}>{fmtDate(branchLicense.sa_end)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* POS devices — original layout + warranty text + role-gated Edit/Remove */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#8e7ec0", letterSpacing: "0.13em", textTransform: "uppercase" as const }}>
                POS Devices at this Location ({branchDevices.length})
              </div>
              {isManager && (
                <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10"/></svg>
                  Add POS
                </button>
              )}
            </div>

            {branchDevices.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#8e7ec0", fontSize: 12, background: "#f2f0fb", borderRadius: 12, border: "1.5px dashed rgba(124,58,237,0.22)" }}>
                No POS machines assigned to this location yet.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {branchDevices.map(device => {
                const ws = warrantyStatus(device);
                return (
                  <div key={device.id} style={{ borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)", background: "#fff", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#18103a", marginBottom: 4 }}>{device.model ?? `Device #${device.id}`}</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
                          {[
                            { label: "Serial", val: device.serial ?? "—" },
                            { label: "IP",     val: device.ip_address ?? "—" },
                            { label: "OS",     val: device.os ?? "—" },
                            { label: "Warranty End", val: device.warranty_end ?? "—" },
                          ].map(({ label, val }) => (
                            <span key={label} style={{ fontSize: 10.5, color: "#8e7ec0" }}>
                              <span style={{ fontWeight: 600, color: "#4a3870" }}>{label}: </span>{val}
                            </span>
                          ))}
                        </div>
                        {/* Warranty status — new value, same text style as existing labels */}
                        {ws !== null && (
                          <div style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: ws === "under" ? "#16a34a" : "#dc2626" }}>
                            {ws === "under" ? "Under Warranty" : "Out of Warranty"}
                          </div>
                        )}
                      </div>
                      {/* Original View button — kept; Edit/Remove added for managers */}
                      {isManager ? (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => onSelectPOS?.(device)}
                            style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(124,58,237,0.2)", background: "#f5f3ff", color: "#6d28d9", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            ✏ Edit
                          </button>
                          <button style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(220,38,38,0.2)", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
                            🗑 Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { onClose(); onSelectPOS?.(device); }}
                          style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(124,58,237,0.2)", background: "#f5f3ff", color: "#6d28d9", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer — original + Delete Branch for managers ── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(124,58,237,0.1)", background: "#f8f7ff", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {isManager
            ? <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(220,38,38,0.25)", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                🗑 Delete Branch
              </button>
            : <div />
          }
          <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)", background: "#fff", fontSize: 12, fontWeight: 600, color: "#4a3870", cursor: "pointer", fontFamily: "inherit" }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default BranchModal;
