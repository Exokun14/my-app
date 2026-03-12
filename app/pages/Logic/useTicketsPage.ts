// ============================================================
//  Logic/useTicketsPage.ts
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ticketsAPI,
  notificationsAPI,
  formatRole,
  type AuthUser,
  type Ticket,
  type Notification,
} from "../../Services/api.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabKey  = "open" | "pending" | "closed";
export type Period  = "7D" | "30D" | "90D";

export interface UINotif {
  id:    number;
  type:  "warn" | "error" | "info" | "success" | "purple";
  title: string;
  desc:  string;
  time:  string;
  read:  boolean;
}

export interface DonutSlice {
  label: string;
  count: number;
  color: string;
}

export interface CategoryRow {
  label:  string;
  count:  number;
  color:  string;
  change: number;
}

export interface TrendDay {
  day:      string;
  newT:     number;
  resolved: number;
  critical: number;
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const CATEGORY_COLOR_MAP: Record<string, string> = {
  "POS Hardware":           "#6d28d9",
  "Software / App":         "#0369a1",
  "Network / Connectivity": "#0d9488",
  "Account / Access":       "#ca8a04",
  "Hardware Other":         "#dc2626",
  "Hardware Error":         "#dc2626",
  "Network / Timeout":      "#0d9488",
  "Printer / Scanner":      "#6d28d9",
  "Software / License":     "#ca8a04",
  "Other":                  "#9ca3af",
};

const FALLBACK_COLORS = [
  "#6d28d9","#0369a1","#0d9488","#ca8a04","#dc2626",
  "#ec4899","#14b8a6","#f97316","#6366f1","#84cc16",
];

function colorFor(label: string, index: number): string {
  return CATEGORY_COLOR_MAP[label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ─── Derive TREND data from real ticket timestamps ────────────────────────────

export function deriveTrendData(tickets: Ticket[], days = 7): TrendDay[] {
  const now = new Date();

  // Build one slot per day (oldest → newest)
  const slots: TrendDay[] = [];
  const slotStarts: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    slotStarts.push(d.getTime());
    slots.push({
      day:      days <= 7
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      newT:     0,
      resolved: 0,
      critical: 0,
    });
  }

  const dayFloor = (iso: string) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  for (const t of tickets) {
    // created tickets
    if (t.created_at) {
      const ts  = dayFloor(t.created_at);
      const idx = slotStarts.indexOf(ts);
      if (idx !== -1) {
        slots[idx].newT += 1;
        if ((t.priority ?? "").toLowerCase() === "critical") slots[idx].critical += 1;
      }
    }
    // resolved tickets — use updated_at as the close date
    const s = (t.status ?? "").toLowerCase();
    if ((s === "closed" || s === "resolved") && t.updated_at) {
      const ts  = dayFloor(t.updated_at);
      const idx = slotStarts.indexOf(ts);
      if (idx !== -1) slots[idx].resolved += 1;
    }
  }

  return slots;
}

// ─── Derive CATEGORIES ────────────────────────────────────────────────────────

export function deriveCategories(tickets: Ticket[]): CategoryRow[] {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    const key = t.category?.trim() || "Other";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({ label, count, color: colorFor(label, i), change: 0 }));
}

// ─── Derive COMMON ISSUES (donut) ─────────────────────────────────────────────

export function deriveCommonIssues(tickets: Ticket[]): DonutSlice[] {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    const key = t.category?.trim() || "Other";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count], i) => ({ label, count, color: colorFor(label, i) }));
}

// ─── Derive AVG resolution time (hours) ──────────────────────────────────────

export function deriveAvgResolutionHrs(tickets: Ticket[]): number {
  const resolved = tickets.filter(t => {
    const s = (t.status ?? "").toLowerCase();
    return (s === "closed" || s === "resolved") && t.created_at && t.updated_at;
  });
  if (resolved.length === 0) return 0;
  const totalMs = resolved.reduce((sum, t) =>
    sum + (new Date(t.updated_at!).getTime() - new Date(t.created_at!).getTime()), 0);
  return Math.round((totalMs / resolved.length / 3_600_000) * 10) / 10;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const fmtDate = (s?: string | null): string =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export const getInitials = (name: string): string => {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

export const ticketLabel = (t: Ticket): string =>
  (t as any).subject ?? (t as any).title ?? "Untitled";

const toUINotif = (n: Notification): UINotif => ({
  id:    n.id ?? 0,
  type:  ({ warning: "warn", alert: "error", info: "info", success: "success" } as Record<string, UINotif["type"]>)[n.type ?? "info"] ?? "info",
  title: n.title ?? "Notification",
  desc:  n.message,
  time:  n.created_at ? new Date(n.created_at).toLocaleDateString() : "",
  read:  n.read ?? false,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTicketsPage(propUser?: AuthUser | null) {
  const companyId = propUser?.company_id ?? null;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifs,  setNotifs]  = useState<UINotif[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab,  setActiveTab]  = useState<TabKey>("open");
  const [selTicket,  setSelTicket]  = useState<Ticket | null>(null);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [period,     setPeriod]     = useState<Period>("7D");
  const [slide,      setSlide]      = useState(0);

  const [toastMsg,  setToastMsg]  = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setToastMsg(m); setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2600);
  }, []);

  const loadAll = useCallback(async (cid: number) => {
    setLoading(true);
    try {
      const [tR, nR] = await Promise.all([
        ticketsAPI.getAll({ company_id: cid }),
        notificationsAPI.getAll(),
      ]);
      if (tR.success && tR.data) setTickets(tR.data);
      if (nR.success && nR.data) setNotifs(nR.data.map(toUINotif));
    } catch (err) {
      console.error("[TicketsPage] error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    loadAll(companyId);
  }, [companyId, loadAll]);

  const markRead    = useCallback(async (id: number) => {
    await notificationsAPI.markRead(id);
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsAPI.markAllRead();
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  }, []);

  // ── Counts ───────────────────────────────────────────────────
  const unread       = notifs.filter(n => !n.read).length;
  const openCount    = tickets.filter(t => (t.status ?? "").toLowerCase() === "open").length;
  const pendingCount = tickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "pending" || s === "in_progress" || s === "in progress"; }).length;
  const closedCount  = tickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "closed" || s === "resolved"; }).length;

  const tabTickets = tickets.filter(t => {
    const s = (t.status ?? "").toLowerCase();
    if (activeTab === "open")    return s === "open";
    if (activeTab === "pending") return s === "pending" || s === "in_progress" || s === "in progress";
    return s === "closed" || s === "resolved";
  });

  const filtered = tabTickets.filter(t => {
    if (!search) return true;
    const label = ticketLabel(t).toLowerCase();
    return label.includes(search.toLowerCase()) || t.id?.toString().includes(search);
  });

  // ── Live analytics ───────────────────────────────────────────
  const periodDays   = period === "7D" ? 7 : period === "30D" ? 30 : 90;
  const trendData    = useMemo(() => deriveTrendData(tickets, periodDays),   [tickets, periodDays]);
  const categories   = useMemo(() => deriveCategories(tickets),              [tickets]);
  const commonIssues = useMemo(() => deriveCommonIssues(tickets),            [tickets]);
  const avgResHrs    = useMemo(() => deriveAvgResolutionHrs(tickets),        [tickets]);

  const headerUser = {
    initials: propUser ? getInitials(propUser.name) : "??",
    name:     propUser?.name ?? "User",
    role:     formatRole(propUser?.role) ?? "User",
  };

  return {
    tickets, notifs, loading,
    activeTab, setActiveTab,
    selTicket, setSelTicket,
    notifOpen, setNotifOpen,
    search,    setSearch,
    period,    setPeriod,
    slide,     setSlide,
    toastMsg, toastShow, toast,
    markRead, markAllRead,
    reload: () => companyId && loadAll(companyId),
    unread, openCount, pendingCount, closedCount, filtered,
    headerUser,
    trendData, categories, commonIssues, avgResHrs,
  };
}
