// ============================================================
// BranchPOSPanel.tsx — Branch table + BranchModal trigger
// Drop into: app/Components/BranchPOSPanel.tsx
// ============================================================

'use client'

import React, { useState } from "react";
import type { Branch, PosDevice, License } from "../Hooks/usePortalData";
import type { AuthUser } from "../Services/api.service";
import BranchModal from "./BranchModal";

export interface BranchPOSPanelProps {
  branches:    Branch[];
  posDevices:  PosDevice[];
  licenses:    License[];
  loading:     boolean;
  user:        AuthUser | null;
  brandColor?: string | null;
  onSelectPOS: (pos: PosDevice) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function canManage(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.role === "manager";
}

function fmtMonthYear(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function daysUntil(s?: string | null): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000);
}

function msaStatusStyle(saEnd?: string | null) {
  const days = daysUntil(saEnd);
  if (days === null) return { color: "#64748b", dot: "#94a3b8" };
  if (days <= 0)     return { color: "#dc2626", dot: "#dc2626" };
  if (days <= 30)    return { color: "#d97706", dot: "#d97706" };
  return                    { color: "#16a34a", dot: "#16a34a" };
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH ROW
// ─────────────────────────────────────────────────────────────────────────────
const BranchRow: React.FC<{
  branch:     Branch;
  licenseKey: string;
  devCount:   number;
  msaEnd:     string | null;
  msaStyle:   { color: string; dot: string };
  onView:     () => void;
}> = ({ branch, licenseKey, devCount, msaEnd, msaStyle, onView }) => {
  const [hov, setHov] = useState(false);
  const isActive = branch.active !== false; // default true if undefined

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ borderBottom: "1px solid rgba(124,58,237,0.05)", background: hov ? "rgba(124,58,237,0.025)" : "transparent", transition: "background 0.12s" }}
    >
      {/* Branch name + active dot */}
      <td style={{ padding: "12px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            title={isActive ? "Active" : "Inactive"}
            style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "#16a34a" : "#dc2626", flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#18103a" }}>{branch.name}</div>
            {branch.site && <div style={{ fontSize: 10.5, color: "#8e7ec0", marginTop: 1 }}>{branch.site}</div>}
          </div>
        </div>
      </td>

      {/* License key */}
      <td style={{ padding: "12px 10px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(124,58,237,0.07)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.15)", letterSpacing: "0.02em", whiteSpace: "nowrap" as const }}>
          {licenseKey}
        </span>
      </td>

      {/* POS count */}
      <td style={{ padding: "12px 10px", textAlign: "center" as const }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "rgba(124,58,237,0.09)", color: "#6d28d9", fontSize: 12, fontWeight: 800 }}>
          {devCount}
        </span>
      </td>

      {/* MSA End */}
      <td style={{ padding: "12px 10px", textAlign: "center" as const }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: msaStyle.color }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: msaStyle.dot, flexShrink: 0, display: "inline-block" }} />
          {fmtMonthYear(msaEnd)}
        </span>
      </td>

      {/* View button */}
      <td style={{ padding: "12px 10px", textAlign: "right" as const }}>
        <button
          onClick={onView}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.18)", background: hov ? "#f5f3ff" : "#fff", color: "#6d28d9", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s", whiteSpace: "nowrap" as const }}
        >
          View
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 2l4 4-4 4"/>
          </svg>
        </button>
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BranchPOSPanel: React.FC<BranchPOSPanelProps> = ({
  branches, posDevices, licenses, loading, user, brandColor, onSelectPOS,
}) => {
  const [search,         setSearch]         = useState("");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const isManager       = canManage(user);
  const isFnB           = user?.industry === "fnb";
  const sharedLicenseKey = licenses[0]?.license_key ?? "—";
  const totalSeats       = licenses[0]?.seats ?? null;

  const getLicenseKey = (b: Branch) => isFnB ? (b.license_tag ?? "—") : sharedLicenseKey;
  const getMsaEnd     = (b: Branch): string | null => {
    if (isFnB) return licenses.find(l => l.license_key === b.license_tag)?.sa_end ?? null;
    return licenses[0]?.sa_end ?? null;
  };

  const filtered = branches.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || getLicenseKey(b).toLowerCase().includes(q);
  });

  // Seats usage warning
  const usedSeats  = branches.length;
  const seatsLeft  = totalSeats !== null ? totalSeats - usedSeats : null;
  const seatsWarn  = seatsLeft !== null && seatsLeft <= 5;

  return (
    <>
      <div className="gx-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Card header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="gx-card-title">Branches</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(109,40,217,0.09)", color: "#6d28d9" }}>
              {branches.length}{totalSeats !== null ? `/${totalSeats}` : ""} {branches.length === 1 ? "branch" : "branches"}
            </span>
            {/* Seats warning */}
            {seatsWarn && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                ⚠ {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#aaa" strokeWidth="1.5" style={{ position: "absolute", left: 10 }}>
                <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>
              </svg>
              <input
                placeholder="Search branches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, borderRadius: 8, border: "1px solid var(--bdr)", background: "#f9fafb", outline: "none", width: 180, fontFamily: "inherit" }}
              />
            </div>
            {/* Add Branch — managers + admins only */}
            {isManager && (
              <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", background: totalSeats !== null && usedSeats >= totalSeats ? "#9ca3af" : "#7c3aed", color: "#fff", fontSize: 12, fontWeight: 700, cursor: totalSeats !== null && usedSeats >= totalSeats ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}
                title={totalSeats !== null && usedSeats >= totalSeats ? `Seat limit reached (${totalSeats}/${totalSeats})` : "Add a new branch"}
                disabled={totalSeats !== null && usedSeats >= totalSeats}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10"/></svg>
                Add Branch
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.15) transparent" } as React.CSSProperties}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "#8e7ec0", fontSize: 12 }}>Loading branches…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
                  {(["BRANCH", isFnB ? "LICENSE" : "SHARED LICENSE", "POS DEVICES", "MSA END", ""] as const).map((col, i) => (
                    <th key={i} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#b8aed8", letterSpacing: "0.08em", textAlign: (i === 2 ? "center" : i === 4 ? "right" : "left") as "left" | "center" | "right", whiteSpace: "nowrap" as const }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "32px", textAlign: "center" as const, color: "#8e7ec0", fontSize: 12 }}>
                      No branches found.
                    </td>
                  </tr>
                )}
                {filtered.map(branch => {
                  const licKey   = getLicenseKey(branch);
                  const msaEnd   = getMsaEnd(branch);
                  const mst      = msaStatusStyle(msaEnd);
                  const devCount = posDevices.filter(p => p.branch_id === branch.id).length;
                  return (
                    <BranchRow
                      key={branch.id}
                      branch={branch}
                      licenseKey={licKey}
                      devCount={devCount}
                      msaEnd={msaEnd}
                      msaStyle={mst}
                      onView={() => setSelectedBranch(branch)}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Branch detail modal ── */}
      {selectedBranch && (
        <BranchModal
          branch={selectedBranch}
          posDevices={posDevices}
          licenses={licenses}
          branches={branches}
          user={user}
          brandColor={brandColor}
          onClose={() => setSelectedBranch(null)}
          onSelectPOS={pos => { setSelectedBranch(null); onSelectPOS(pos); }}
        />
      )}
    </>
  );
};

export default BranchPOSPanel;
