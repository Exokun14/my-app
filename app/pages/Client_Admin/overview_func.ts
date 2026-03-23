// overview_func.ts
// ─────────────────────────────────────────────────────────────────────────────
// All data, types, static datasets, helper functions, and hooks for
// OverviewPage.tsx — the page component is purely presentational.
// ─────────────────────────────────────────────────────────────────────────────

import { JSX, useRef, useState, useEffect } from "react";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type CPView = "overview" | "tickets" | "users" | "settings";
export type POSStatus = "online" | "warning";

export interface POSDevice {
  id: string; st: POSStatus; model: string; serial: string;
  os: string; branch: string; msaStart: string; msaEnd: string; warranty: string;
  licenseNumber?: string;
}

/** Legacy static shape — kept for BranchModal backward compat */
export interface BranchLocation { name: string; site: string; company: string; }

/** Real branch row from the `branches` DB table */
export interface DBBranch {
  id: number;
  company_id: number | null;
  branch_name: string | null;
  license_number: string | null;
  msa_start_date: string | null;  // "YYYY-MM-DD"
  msa_end_date: string | null;    // "YYYY-MM-DD"
  implementation_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PeripheralItem {
  id: string; model: string; serial: string; warrantyDate: string;
}

export interface InfoData {
  storeName: string; contactPerson: string; email: string; phone: string;
  altContactPerson: string; altEmail: string; altPhone: string;
  altContactPerson2: string; altEmail2: string; altPhone2: string;
  krunchNum: string; activationCode: string;
  accountManager?: string;
}

export interface Notification {
  id: number; type: "warn" | "error" | "info" | "success" | "purple";
  title: string; desc: string; time: string; read: boolean;
}

export interface MSAExpirationData {
  branch: string; msaEnd: string; daysLeft: number;
  status: "active" | "expiring" | "overdue";
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
export const C = {
  purple: "#7c3aed", purpleD: "#5b21b6", purpleLt: "#ede9fe",
  teal: "#0d9488", amber: "#d97706", red: "#dc2626", green: "#16a34a",
  t1: "#18103a", t2: "#4a3870", t3: "#8e7ec0", t4: "#b8aed8",
  surface: "#ffffff", surface2: "#f2f0fb",
  border: "rgba(124,58,237,0.1)", borderMd: "rgba(124,58,237,0.22)",
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA / EMBEDDED DATABASES  (kept for POS / Peripherals / MSA stat card)
// ─────────────────────────────────────────────────────────────────────────────
export const POS_DATA: POSDevice[] = [
  { id: "POS 1", st: "online", model: "PAX A920", serial: "SN-80381-94285", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Oct 01, 2022", msaEnd: "Mar 31, 2026", warranty: "Oct 01, 2025", licenseNumber: "LIC-POP-MNL-0601" },
  { id: "POS 2", st: "online", model: "PAX A920", serial: "SN-80382-94286", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Oct 01, 2022", msaEnd: "Mar 31, 2026", warranty: "Oct 01, 2025", licenseNumber: "LIC-POP-MNL-0601" },
  { id: "POS 3", st: "online", model: "PAX A920", serial: "SN-80383-94287", os: "Android 10.0 — POS v4.0.9", branch: "Makati Branch", msaStart: "Nov 01, 2022", msaEnd: "Mar 01, 2026", warranty: "Nov 01, 2025", licenseNumber: "LIC-POP-MKT-0602" },
  { id: "POS 4", st: "online", model: "PAX A920", serial: "SN-80384-94288", os: "Android 10.0 — POS v4.1.1", branch: "Makati Branch", msaStart: "Nov 01, 2022", msaEnd: "Mar 01, 2026", warranty: "Nov 01, 2025", licenseNumber: "LIC-POP-MKT-0602" },
  { id: "POS 5", st: "online", model: "PAX A920", serial: "SN-80385-94289", os: "Android 10.0 — POS v4.1.1", branch: "Manila Branch",  msaStart: "Dec 01, 2021", msaEnd: "Mar 31, 2026", warranty: "Dec 01, 2024", licenseNumber: "LIC-POP-MNL-0601" },
];

/** Legacy static branches — used only by BranchModal POS lookup.
 *  The Branches table now uses live DBBranch data from the API. */
export const BRANCHES: BranchLocation[] = [
  { name: "Manila",  site: "Manila Branch",  company: "Popeyes" },
  { name: "Makati",  site: "Makati Branch",  company: "Popeyes" },
];

export const BRANCH_LICENSES: Record<string, string> = {
  "Manila Branch":  "LIC-POP-MNL-0601",
  "Makati Branch":  "LIC-POP-MKT-0602",
};

export const BRANCH_MSA_ENDS: Record<string, string> = {
  "Manila Branch":  "Mar 31, 2026",
  "Makati Branch":  "Mar 01, 2026",
};

// ─── Embedded peripherals database (keyed by POS id) ─────────────────────────
export const PERIPHERALS_DB: Record<string, PeripheralItem[]> = {
  "POS 1": [
    { id: "p1-1", model: "Epson TM-T82X Receipt Printer",  serial: "EP-T82X-00421", warrantyDate: "2026-10-01" },
    { id: "p1-2", model: "Honeywell Barcode Scanner 1900",  serial: "HW-1900-88231", warrantyDate: "2025-11-15" },
    { id: "p1-3", model: "Customer Display Pole DP-220",    serial: "DP-220-33741",  warrantyDate: "2027-03-20" },
  ],
  "POS 2": [
    { id: "p2-1", model: "Epson TM-T82X Receipt Printer",  serial: "EP-T82X-00422", warrantyDate: "2026-10-01" },
    { id: "p2-2", model: "Zebra DS2208 Barcode Scanner",   serial: "ZB-DS2208-4421", warrantyDate: "2026-05-30" },
  ],
  "POS 3": [
    { id: "p3-1", model: "Star TSP143III Receipt Printer", serial: "ST-TSP143-0931", warrantyDate: "2025-11-01" },
    { id: "p3-2", model: "Honeywell Barcode Scanner 1900", serial: "HW-1900-88244", warrantyDate: "2025-11-15" },
    { id: "p3-3", model: "Cash Drawer APG VB320",           serial: "APG-VB320-1102", warrantyDate: "2026-08-10" },
    { id: "p3-4", model: "Customer Display Pole DP-220",   serial: "DP-220-33750",  warrantyDate: "2027-03-20" },
  ],
  "POS 4": [
    { id: "p4-1", model: "Star TSP143III Receipt Printer", serial: "ST-TSP143-0932", warrantyDate: "2025-11-01" },
  ],
  "POS 5": [
    { id: "p5-1", model: "Epson TM-T82X Receipt Printer",  serial: "EP-T82X-00425", warrantyDate: "2026-10-01" },
    { id: "p5-2", model: "Zebra DS2208 Barcode Scanner",   serial: "ZB-DS2208-4425", warrantyDate: "2026-05-30" },
    { id: "p5-3", model: "Cash Drawer APG VB320",           serial: "APG-VB320-1105", warrantyDate: "2026-08-10" },
  ],
};

export const DEFAULT_INFO: InfoData = {
  storeName: "", contactPerson: "", email: "", phone: "",
  altContactPerson: "", altEmail: "", altPhone: "",
  altContactPerson2: "", altEmail2: "", altPhone2: "",
  krunchNum: "", activationCode: "", accountManager: "",
};

export const NOTIFS_INIT: Notification[] = [
  { id: 1, type: "warn",    title: "MSA Expiry Notice",       desc: "Manila Branch MSA ends March 31, 2026. Contact your account manager to renew.",  time: "Just now",    read: false },
  { id: 2, type: "error",   title: "MSA Expiry Alert",        desc: "Makati Branch MSA ends April 6, 2026. Renewal required soon.",                    time: "2 hours ago", read: false },
  { id: 3, type: "info",    title: "New Ticket Submitted",    desc: "Ticket #89323930200 — Barcode scanner error has been filed for Manila branch.",    time: "2 days ago",  read: false },
  { id: 4, type: "success", title: "Ticket Resolved",         desc: "Ticket #89323930170 — POS 4 reboot issue has been marked as resolved.",            time: "1 week ago",  read: true  },
  { id: 5, type: "purple",  title: "Account Manager Update",  desc: "Maria Santos has updated your account details. Review the changes in Overview.",   time: "1 week ago",  read: true  },
];

export const NOTIF_ICONS: Record<string, JSX.Element> = {
  warn:    React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }, React.createElement("circle", { cx: "8", cy: "8", r: "6.5" }), React.createElement("path", { d: "M8 5.5V8M8 10.5v.5" })),
  error:   React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }, React.createElement("circle", { cx: "8", cy: "8", r: "6.5" }), React.createElement("path", { d: "M8 5.5V8l1.5.9" })),
  info:    React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }, React.createElement("circle", { cx: "8", cy: "8", r: "6.5" }), React.createElement("path", { d: "M8 7v4M8 5.5v.5" })),
  success: React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }, React.createElement("path", { d: "M3 8.5l3.5 3.5 6.5-6.5" })),
  purple:  React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }, React.createElement("path", { d: "M2 13s2.5-4 6-4 6 4 6 4" }), React.createElement("circle", { cx: "8", cy: "6", r: "2.5" })),
};

export const COUNTRY_CODES = [
  { code: "+63", flag: "🇵🇭" }, { code: "+1",   flag: "🇺🇸" }, { code: "+44",  flag: "🇬🇧" },
  { code: "+61", flag: "🇦🇺" }, { code: "+64",  flag: "🇳🇿" }, { code: "+65",  flag: "🇸🇬" },
  { code: "+60", flag: "🇲🇾" }, { code: "+66",  flag: "🇹🇭" }, { code: "+62",  flag: "🇮🇩" },
  { code: "+84", flag: "🇻🇳" }, { code: "+82",  flag: "🇰🇷" }, { code: "+81",  flag: "🇯🇵" },
  { code: "+86", flag: "🇨🇳" }, { code: "+91",  flag: "🇮🇳" }, { code: "+971", flag: "🇦🇪" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER / PURE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the number of days from today until a date string. Negative = past. */
export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Returns a display label + color for an MSA end date. */
export function msaEndStatus(msaEnd?: string): { label: string; color: string } {
  if (!msaEnd) return { label: "—", color: "#b8aed8" };
  const days = getDaysUntil(msaEnd);
  const label = new Date(msaEnd).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (days <= 0)  return { label, color: "#dc2626" };
  if (days <= 30) return { label, color: "#d97706" };
  return { label, color: "#16a34a" };
}

/**
 * msaEndStatusFromDBDate — same as msaEndStatus but accepts a raw
 * "YYYY-MM-DD" date string directly from the branches table.
 */
export function msaEndStatusFromDBDate(msaEnd?: string | null): { label: string; color: string } {
  if (!msaEnd) return { label: "—", color: "#b8aed8" };
  const days = getDaysUntil(msaEnd);
  const label = new Date(msaEnd).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (days <= 0)  return { label, color: "#dc2626" };
  if (days <= 30) return { label, color: "#d97706" };
  return { label, color: "#16a34a" };
}

/** Derives per-branch MSA data sorted by days remaining. */
export function getMSAExpirationData(): MSAExpirationData[] {
  const branchMSA = new Map<string, string>();
  POS_DATA.forEach(pos => { if (!branchMSA.has(pos.branch)) branchMSA.set(pos.branch, pos.msaEnd); });
  const result: MSAExpirationData[] = [];
  branchMSA.forEach((msaEnd, branch) => {
    const daysLeft = getDaysUntil(msaEnd);
    result.push({ branch, msaEnd, daysLeft, status: daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "expiring" : "active" });
  });
  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Returns count of branches that are expiring or overdue. */
export function getExpiringCount(): number {
  return getMSAExpirationData().filter(d => d.status === "expiring" || d.status === "overdue").length;
}

/** Returns the soonest MSA days remaining across all POS devices. */
export function getSoonestMSADays(): number | null {
  let soonest: number | null = null;
  POS_DATA.forEach(pos => {
    if (!pos.msaEnd) return;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = Math.ceil((new Date(pos.msaEnd).getTime() - now.getTime()) / 86400000);
    if (soonest === null || d < soonest) soonest = d;
  });
  return soonest;
}

/** Formats a date string to "Mon D, YYYY". */
export function formatWarrantyDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Generates warranty status from a date string. */
export function warrantyStatus(d: string): { color: string; label: string; bg: string; border: string } {
  if (!d) return { color: "#b8aed8", label: "No date",    bg: "rgba(184,174,216,0.1)", border: "rgba(184,174,216,0.2)" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0)  return { color: "#dc2626", label: "Expired",        bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.25)"  };
  if (days <= 30) return { color: "#d97706", label: `${days}d left`,  bg: "rgba(217,119,6,0.08)",  border: "rgba(217,119,6,0.25)"  };
  if (days <= 90) return { color: "#0d9488", label: `${days}d left`,  bg: "rgba(13,148,136,0.08)", border: "rgba(13,148,136,0.25)" };
  return               { color: "#16a34a", label: `${days}d left`,  bg: "rgba(22,163,74,0.08)",  border: "rgba(22,163,74,0.25)"  };
}

/** Generates a random unique id string. */
export function genId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/** Derives the branch MSA status badge config from a raw "YYYY-MM-DD" date. */
export function getBranchMSAStatusFromDate(msaEndRaw?: string | null): {
  label: string; color: string; bg: string; border: string; daysLeft: number | null; displayDate: string;
} {
  const daysLeft = msaEndRaw ? getDaysUntil(msaEndRaw) : null;
  const displayDate = msaEndRaw
    ? new Date(msaEndRaw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
  if (daysLeft === null)  return { label: "UNKNOWN",       color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0", daysLeft, displayDate };
  if (daysLeft <= 0)      return { label: "EXPIRED",       color: "#dc2626", bg: "#fef2f2", border: "#fecaca", daysLeft, displayDate };
  if (daysLeft <= 30)     return { label: "EXPIRING SOON", color: "#d97706", bg: "#fffbeb", border: "#fde68a", daysLeft, displayDate };
  if (daysLeft <= 90)     return { label: "DUE SOON",      color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4", daysLeft, displayDate };
  return                         { label: "ACTIVE",         color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", daysLeft, displayDate };
}

/** Legacy version — kept for BranchModal which still uses BRANCH_MSA_ENDS. */
export function getBranchMSAStatus(site: string): {
  label: string; color: string; bg: string; border: string; daysLeft: number | null; displayDate: string;
} {
  const msaEndRaw = BRANCH_MSA_ENDS[site];
  return getBranchMSAStatusFromDate(msaEndRaw);
}

// ─────────────────────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost";

/**
 * Fetch all branches for a given company from GET /api/branches?company_id=X.
 * Returns an empty array on error so callers don't need to handle exceptions.
 */
export async function fetchBranches(companyId: number): Promise<DBBranch[]> {
  try {
    const res = await fetch(`${API_BASE}/api/branches?company_id=${companyId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json: { success: boolean; branches: DBBranch[] } = await res.json();
    return json.success && Array.isArray(json.branches) ? json.branches : [];
  } catch (err) {
    console.error("[fetchBranches]", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/** Toast notification hook. */
export function useToast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => {
    setMsg(m); setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2600);
  };
  return { msg, show, toast };
}

/** Calls cb when a mousedown occurs outside of the returned ref. */
export function useClickOutside<T extends HTMLElement>(cb: () => void) {
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