/**
 * usePortalData.ts
 * Shared data-fetching hooks used by all F&B and Retail portal pages.
 * Place this file at: app/hooks/usePortalData.ts
 */

import { useState, useEffect, useCallback } from "react";
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

// ── Generic async state ───────────────────────────────────────────────────────

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useAsync<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  fallback: T,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data,    setData]    = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data !== undefined) setData(res.data);
        else setError(res.error ?? "Failed to load");
        setLoading(false);
      })
      .catch(err => {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch };
}

// ── Resource hooks ────────────────────────────────────────────────────────────

export function useCompany(companyId: number | null) {
  return useAsync<Company | null>(
    () => companyId
      ? companiesAPI.getById(companyId)
      : Promise.resolve({ success: true, data: null }),
    null,
    [companyId],
  );
}

export function useBranches(companyId: number | null) {
  return useAsync<Branch[]>(
    () => companyId
      ? branchesAPI.getAll(companyId)
      : Promise.resolve({ success: true, data: [] }),
    [],
    [companyId],
  );
}

export function usePosDevices(companyId: number | null) {
  return useAsync<PosDevice[]>(
    () => companyId
      ? posDevicesAPI.getAll({ company_id: companyId })
      : Promise.resolve({ success: true, data: [] }),
    [],
    [companyId],
  );
}

export function useLicenses(companyId: number | null) {
  return useAsync<License[]>(
    () => companyId
      ? licensesAPI.getAll(companyId)
      : Promise.resolve({ success: true, data: [] }),
    [],
    [companyId],
  );
}

export function useTickets(companyId: number | null) {
  return useAsync<Ticket[]>(
    () => companyId
      ? ticketsAPI.getAll({ company_id: companyId })
      : Promise.resolve({ success: true, data: [] }),
    [],
    [companyId],
  );
}

export function usePortalUsers(companyId: number | null) {
  return useAsync<PortalUser[]>(
    () => companyId
      ? portalUsersAPI.getAll({ company_id: companyId })
      : Promise.resolve({ success: true, data: [] }),
    [],
    [companyId],
  );
}

export function useNotifications() {
  const state = useAsync<Notification[]>(
    () => notificationsAPI.getAll(),
    [],
  );

  const markRead = useCallback(async (id: number) => {
    await notificationsAPI.markRead(id);
    state.refetch();
  }, [state]);

  const markAllRead = useCallback(async () => {
    await notificationsAPI.markAllRead();
    state.refetch();
  }, [state]);

  return { ...state, markRead, markAllRead };
}
