/**
 * usePortalData.ts
 * Shared data-fetching hooks used by all F&B and Retail portal pages.
 * Place this file at: app/hooks/usePortalData.ts
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  companiesAPI,
  branchesAPI,
  posDevicesAPI,
  licensesAPI,
  ticketsAPI,
  notificationsAPI,
  portalUsersAPI,
  type Company,
  type Branch,
  type PosDevice,
  type License,
  type Ticket,
  type Notification,
  type PortalUser,
} from "../Services/api.service";

export type { Company, Branch, PosDevice, License, Ticket, Notification, PortalUser };

export interface UINotif {
  id:    number;
  type:  "warn" | "error" | "info" | "success" | "purple";
  title: string;
  desc:  string;
  time:  string;
  read:  boolean;
}

export interface InfoData {
  storeName:        string;
  contactPerson:    string;
  email:            string;
  phone:            string;
  altContactPerson: string;
  altEmail:         string;
  altPhone:         string;
  keyNo:            string;
}

export interface AsyncState<T> {
  data:    T;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

const log = {
  start:   (label: string) => console.groupCollapsed(`🔄 [usePortalData] ${label} — fetching…`) || console.groupEnd(),
  success: (label: string, data: unknown) => {
    console.groupCollapsed(`✅ [usePortalData] ${label} — success`);
    console.log("   data:", data);
    console.groupEnd();
  },
  fail: (label: string, error: unknown) => {
    console.group(`❌ [usePortalData] ${label} — API error`);
    console.warn("   error:", error);
    console.groupEnd();
  },
  threw: (label: string, err: unknown) => {
    console.group(`💥 [usePortalData] ${label} — threw exception`);
    console.error("   exception:", err);
    console.groupEnd();
  },
  cancelled: (label: string) => console.log(`🚫 [usePortalData] ${label} — cancelled`),
  skipped:   (label: string, reason: string) => console.log(`⏭️  [usePortalData] ${label} — skipped: ${reason}`),
  refetch:   (label: string) => console.log(`🔁 [usePortalData] ${label} — refetch triggered`),
  action:    (label: string, meta?: unknown) => {
    console.groupCollapsed(`🔔 [usePortalData] ${label}`);
    if (meta) console.log("   meta:", meta);
    console.groupEnd();
  },
};

// ── Core generic hook ─────────────────────────────────────────────────────────
// KEY FIX: accepts an explicit `skip` flag. When skip=true the hook does NOT
// reset its data to the fallback and does NOT set loading=true — it just sits
// still with whatever data it already has (or the fallback on first mount).
function useAsync<T>(
  label:    string,
  fetcher:  () => Promise<{ success: boolean; data?: T; error?: string }>,
  fallback: T,
  skip:     boolean,
  deps:     unknown[] = [],
): AsyncState<T> {
  const [data,    setData]    = useState<T>(fallback);
  const [loading, setLoading] = useState(!skip); // not loading if we're skipping
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => {
    log.refetch(label);
    setTick(t => t + 1);
  }, [label]);

  // Keep a ref to the latest fetcher so the effect always calls current version
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  useEffect(() => {
    // ── CRITICAL FIX: if skip is true, do nothing — don't clear data ────────
    if (skip) {
      log.skipped(label, "companyId is null");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    log.start(label);

    fetcherRef.current()
      .then(res => {
        if (cancelled) { log.cancelled(label); return; }
        if (res.success && res.data !== undefined) {
          log.success(label, res.data);
          setData(res.data);
        } else {
          log.fail(label, res.error);
          setError(res.error ?? "Failed to load");
        }
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) { log.cancelled(label); return; }
        log.threw(label, err);
        setError(String(err));
        setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, tick, ...deps]);

  return { data, loading, error, refetch };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function toUINotif(n: Notification): UINotif {
  return {
    id:    n.id ?? 0,
    type:  (
      { warning: "warn", alert: "error", info: "info", success: "success" } as Record<string, UINotif["type"]>
    )[n.type ?? "info"] ?? "info",
    title: n.title   ?? "Notification",
    desc:  n.message,
    time:  n.created_at ? new Date(n.created_at).toLocaleDateString() : "",
    read:  n.read ?? false,
  };
}

export function companyToInfo(c: Company): InfoData {
  return {
    storeName:        c.name                ?? "",
    contactPerson:    c.contact_person      ?? "",
    email:            c.contact_email       ?? "",
    phone:            c.phone               ?? "",
    altContactPerson: c.alt_contact_person  ?? "",
    altEmail:         c.alt_contact_email   ?? "",
    altPhone:         c.alt_contact_phone   ?? "",
    keyNo: "1",
  };
}

// ── Resource hooks ────────────────────────────────────────────────────────────

export function useCompany(companyId: number | null) {
  return useAsync<Company | null>(
    "useCompany",
    () => companiesAPI.getById(companyId!),
    null,
    companyId === null,
    [companyId],
  );
}

export function useBranches(companyId: number | null) {
  return useAsync<Branch[]>(
    "useBranches",
    () => branchesAPI.getAll(companyId!),
    [],
    companyId === null,
    [companyId],
  );
}

export function usePosDevices(companyId: number | null) {
  return useAsync<PosDevice[]>(
    "usePosDevices",
    () => posDevicesAPI.getAll({ company_id: companyId! }),
    [],
    companyId === null,
    [companyId],
  );
}

export function useLicenses(companyId: number | null) {
  return useAsync<License[]>(
    "useLicenses",
    () => licensesAPI.getAll(companyId!),
    [],
    companyId === null,
    [companyId],
  );
}

export function useTickets(companyId: number | null) {
  return useAsync<Ticket[]>(
    "useTickets",
    () => ticketsAPI.getAll({ company_id: companyId! }),
    [],
    companyId === null,
    [companyId],
  );
}

export function usePortalUsers(companyId: number | null) {
  return useAsync<PortalUser[]>(
    "usePortalUsers",
    () => portalUsersAPI.getAll({ company_id: companyId! }),
    [],
    companyId === null,
    [companyId],
  );
}

export function useNotifications() {
  const state = useAsync<Notification[]>(
    "useNotifications",
    () => notificationsAPI.getAll(),
    [],
    false, // notifications don't depend on companyId — never skip
  );

  const markRead = useCallback(async (id: number) => {
    log.action("markRead", { id });
    const res = await notificationsAPI.markRead(id);
    if (res.success) {
      console.log(`✅ [usePortalData] markRead id=${id} — OK, refetching`);
      state.refetch();
    } else {
      console.warn(`❌ [usePortalData] markRead id=${id} — failed:`, res.error);
    }
  }, [state]);

  const markAllRead = useCallback(async () => {
    log.action("markAllRead");
    const res = await notificationsAPI.markAllRead();
    if (res.success) {
      console.log("✅ [usePortalData] markAllRead — OK, refetching");
      state.refetch();
    } else {
      console.warn("❌ [usePortalData] markAllRead — failed:", res.error);
    }
  }, [state]);

  const uiNotifs: UINotif[] = state.data.map(toUINotif);

  return { ...state, uiNotifs, markRead, markAllRead };
}

// ── Composite hook ────────────────────────────────────────────────────────────
export interface OverviewData {
  company:    Company | null;
  branches:   Branch[];
  posDevices: PosDevice[];
  licenses:   License[];
  uiNotifs:   UINotif[];
  info:       InfoData;
  setInfo:    React.Dispatch<React.SetStateAction<InfoData>>;
  loading:    boolean;
  error:      string | null;
  markRead:    (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh:     () => void;
}

export function useOverviewData(companyId: number | null): OverviewData {
  console.groupCollapsed(`🏁 [useOverviewData] init — companyId: ${companyId ?? "null"}`);
  console.log("   skip company/branches/pos/licenses:", companyId === null);
  console.groupEnd();

  const companyState  = useCompany(companyId);
  const branchesState = useBranches(companyId);
  const posState      = usePosDevices(companyId);
  const licensesState = useLicenses(companyId);
  const notifState    = useNotifications();

  const [info, setInfo] = useState<InfoData>({
    storeName: "", contactPerson: "", email: "", phone: "",
    altContactPerson: "", altEmail: "", altPhone: "", keyNo: "1",
  });

  useEffect(() => {
    if (companyState.data) {
      const mapped = companyToInfo(companyState.data);
      console.log("📋 [useOverviewData] company loaded → syncing InfoData:", mapped);
      setInfo(mapped);
    }
  }, [companyState.data]);

  // Only aggregate loading for hooks that are actually running
  const loading = companyId !== null
    ? (companyState.loading || branchesState.loading || posState.loading || licensesState.loading || notifState.loading)
    : notifState.loading;

  const errors = [companyState.error, branchesState.error, posState.error, licensesState.error, notifState.error].filter(Boolean);
  const error  = errors.length ? errors.join(" | ") : null;

  const refresh = useCallback(() => {
    console.log("🔁 [useOverviewData] refresh() called — refetching all");
    companyState.refetch();
    branchesState.refetch();
    posState.refetch();
    licensesState.refetch();
    notifState.refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    company:    companyState.data,
    branches:   branchesState.data,
    posDevices: posState.data,
    licenses:   licensesState.data,
    uiNotifs:   notifState.uiNotifs,
    info,
    setInfo,
    loading,
    error,
    markRead:    notifState.markRead,
    markAllRead: notifState.markAllRead,
    refresh,
  };
}
