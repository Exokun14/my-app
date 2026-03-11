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
   ============================================================== */

'use client';

import { useState } from "react";

import LoginAdmin     from "./pages/Login/logUser";
import DashboardAdmin from "./pages/Dashboard_Admin_Main/DashboardAdmin";
import ClientPortal   from "./pages/Client_Admin/ClientPortal";

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole     = "admin" | "user";
export type UserIndustry = "fnb" | "retail" | "warehouse" | null;

interface AuthState {
  role:     UserRole;
  industry: UserIndustry;
}

const SESSION_KEY = "gx_auth";

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {

  // Rehydrate from sessionStorage on first render — survives refresh,
  // but clears automatically when the browser tab is closed.
  const [auth, setAuth] = useState<AuthState | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as AuthState) : null;
    } catch {
      return null;
    }
  });

  // Called by logUser.tsx on successful login
  const handleLoginSuccess = (role: UserRole, industry: UserIndustry) => {
    const next: AuthState = { role, industry };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setAuth(next);
  };

  // Called by any Sign Out button in any portal / dashboard
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuth(null);
  };

  // ── Not logged in ──
  if (!auth) {
    return <LoginAdmin onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Admin → Company Database ──
  if (auth.role === "admin") {
    return <DashboardAdmin onLogout={handleLogout} />;
  }

  // ── Client user → industry-specific portal ──
  if (auth.role === "user") {
    return <ClientPortal industry={auth.industry} onLogout={handleLogout} />;
  }

  // Fallback
  return <LoginAdmin onLoginSuccess={handleLoginSuccess} />;
}
