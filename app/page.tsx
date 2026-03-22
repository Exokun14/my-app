/* ==============================================================
   app/page.tsx  ·  Root entry point

   Auth state machine:
     null            → show Login
     role=admin      → show DashboardAdmin (Company Database)
     role=user
       industry=fnb       → OverviewPage      (F&B client portal)
       industry=retail    → RetailOverviewPage (Retail client portal)
       industry=warehouse → WarehouseOverviewPage (future)
       industry=null      → fallback to F&B portal

   FIX: auth state is persisted in sessionStorage so a page
   refresh doesn't drop the user back to the login screen.
   sessionStorage clears automatically when the browser tab
   is closed, so it's safe — no stale tokens sitting around.

   FIX: handleLogout now calls POST /logout on the Laravel
   backend (Sanctum session) before clearing local state,
   so the server-side session is properly invalidated.

   FIX: added `mounted` guard so the portal never renders
   server-side or before sessionStorage has been read.
   This prevents companyId from ever being null on first
   render when a session exists.
   ============================================================== */

'use client';

import { useState, useEffect, useCallback } from "react";

import LoginAdmin, { AuthUser } from "./pages/Login/logUser";
import DashboardAdmin           from "./pages/Dashboard_Admin_Main/DashboardAdmin";
import ClientPortal             from "./pages/Client_Admin/ClientPortal";
import ChatWidget               from "./Components/ChatWidget";

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole     = "admin" | "manager" | "user";
export type UserIndustry = "fnb" | "retail" | "warehouse" | null;

interface AuthState {
  role:     UserRole;
  industry: UserIndustry;
  user:     AuthUser;
}

const SESSION_KEY = "gx_auth";
const API_BASE    = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Laravel Sanctum logout ───────────────────────────────────────────────────
function getXsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function fortifyLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/logout`, {
      method:      "POST",
      credentials: "include",
      headers: {
        "Accept":            "application/json",
        "X-Requested-With":  "XMLHttpRequest",
        "X-XSRF-TOKEN":      getXsrfToken(),
      },
    });
  } catch (err) {
    console.error("[Auth] Logout request failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {

  // `mounted` prevents any render until the client has read sessionStorage,
  // eliminating the SSR/hydration mismatch and the companyId=null first render.
  const [mounted, setMounted] = useState(false);
  const [auth,    setAuth]    = useState<AuthState | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setAuth(JSON.parse(saved) as AuthState);
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const handleLoginSuccess = useCallback((role: UserRole, industry: UserIndustry, user: AuthUser) => {
    const next: AuthState = { role, industry, user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setAuth(next);
  }, []);

  const handleLogout = useCallback(async () => {
    await fortifyLogout();
    sessionStorage.removeItem(SESSION_KEY);
    setAuth(null);
  }, []);

  // Hold off rendering until sessionStorage has been read
  if (!mounted) return null;

  // ── Not logged in ──
  if (!auth) {
    return <LoginAdmin onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Admin → Company Database ──
  if (auth.role === "admin") {
    return (
      <>
        <DashboardAdmin user={auth.user} onLogout={handleLogout} />
        <ChatWidget user={auth.user} />
      </>
    );
  }

  // ── Client user / manager → industry-specific portal ──
  if (auth.role === "user" || auth.role === "manager") {
    return (
      <>
        <ClientPortal industry={auth.industry} user={auth.user} onLogout={handleLogout} />
        <ChatWidget user={auth.user} />
      </>
    );
  }

  // Fallback
  return <LoginAdmin onLoginSuccess={handleLoginSuccess} />;
}
