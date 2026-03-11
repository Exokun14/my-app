// app/Hooks/useAuthUser.ts
//
// Fetches the authenticated user from GET /api/user once on mount.
// Use this in any component that needs to show the current user's
// name, role, or company — just like useToast() is used for toasts.
//
// Usage:
//   import { useAuthUser } from "../../Hooks/useAuthUser";
//
//   const { headerUser } = useAuthUser();
//   <Header user={headerUser} />

import { useState, useEffect, useRef } from "react";
import api, { type AuthUser, formatRole } from "../Services/api.service";

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
    role:     formatRole(user?.role),   // 'admin' → 'System Admin'
    company:  user?.company_name ?? "", // from companies.name via eager-load
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuthUser() {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Prevent double-fetch from React's strict-mode double mount in dev
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    console.log("[useAuthUser] fetching GET /api/user...");

    api.auth.getUser().then(r => {
      if (r.success && r.data) {
        console.log("[useAuthUser] ✅", r.data.name, "|", r.data.role, "|", r.data.company_name);
        setUser(r.data);
      } else {
        console.warn("[useAuthUser] ❌ failed:", r.error);
        setError(r.error ?? "Unknown error");
      }
      setLoading(false);
    });
  }, []);

  return {
    user,                        // raw AuthUser from the DB, or null
    loading,                     // true until the request completes
    error,                       // error message if the request failed
    headerUser: buildHeaderUser(user),  // ready-to-pass to <Header user={...}>
  };
}
