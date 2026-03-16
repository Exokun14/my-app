// app/Hooks/useAuthUser.ts
//
// Builds the <Header user={...}> shape from an AuthUser.
// Pass the user object that was already fetched at login (from page.tsx)
// to avoid an extra GET /api/user on every page mount.
//
// Usage:
//   import { useAuthUser } from "../../Hooks/useAuthUser";
//
//   const { headerUser } = useAuthUser(propUser);
//   <Header user={headerUser} />

import { useState, useEffect, useRef } from "react";
import api, { type AuthUser, formatRole } from "../Services/api.service";
import clearAuthCookies from "../Utils/clearAuthCookies";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "John Doe" → "JD",  "Administrator" → "AD" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Converts AuthUser → the { initials, name, role, company } shape
 * that <Header user={...}> expects. Safe to call with null (returns
 * loading placeholders so the header doesn't crash while fetching).
 */
function buildHeaderUser(user: AuthUser | null) {
  return {
    initials: user ? getInitials(user.name) : "··",
    name:     user?.name         ?? "Loading...",
    role:     formatRole(user?.role),
    company:  user?.company_name ?? "",
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param initialUser  Pass the AuthUser already fetched at login (from page.tsx
 *                     via props). When provided, skips the GET /api/user call
 *                     entirely. Falls back to fetching if not supplied.
 */
export function useAuthUser(initialUser?: AuthUser | null) {
  const [user,    setUser]    = useState<AuthUser | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [error,   setError]   = useState<string | null>(null);

  // Prevent double-fetch from React strict-mode double mount in dev
  const fetched = useRef(false);

  useEffect(() => {
    // If a user was passed in as a prop, no need to fetch
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      return;
    }

    if (fetched.current) return;
    fetched.current = true;

    console.log("[useAuthUser] no user prop — falling back to GET /api/user");

    api.auth.getUser().then(r => {
      if (r.success && r.data) {
        console.log("[useAuthUser] ✅", r.data.name, "|", r.data.role, "|", r.data.company_name);
        setUser(r.data);
      } else {
        console.warn("[useAuthUser] ❌ failed:", r.error);
        clearAuthCookies();
        setError(r.error ?? "Unknown error");
      }
      setLoading(false);
    }).catch((err: unknown) => {
      console.error("[useAuthUser] ❌ unexpected error:", err);
      clearAuthCookies();
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    loading,
    error,
    headerUser: buildHeaderUser(user),
  };
}
