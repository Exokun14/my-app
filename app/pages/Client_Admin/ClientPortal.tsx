/* ==============================================================
   app/pages/Client_Admin/ClientPortal.tsx

   Thin router: receives the user's industry + role from root page.tsx
   and renders the matching portal pages.

   Retail industry now uses Retail-branded pages for all views.
   ============================================================== */

'use client';

import React, { useState } from "react";

import OverviewPage         from "./OverviewPage";
import TicketsPage          from "./TicketsPage";
import UsersPage            from "./UsersPage";
import SettingsPage         from "./SettingsPage";

import RetailOverviewPage   from "../Retail_Admin/RetailOverviewPage";
import RetailTicketsPage    from "../Retail_Admin/RetailTicketsPage";
import RetailUsersPage      from "../Retail_Admin/RetailUsersPage";
import RetailSettingsPage   from "../Retail_Admin/RetailSettingsPage";

import LearningCenter       from "../Learning_Module/page";

import type { AuthUser }    from "../../Services/api.service";
import type { UserIndustry, UserRole } from "../../page";

// Types
export type CPView = "overview" | "tickets" | "users" | "settings" | "learning";

interface ClientPortalProps {
  industry: UserIndustry;
  role?: UserRole;
  onLogout?: () => void;
  user?: AuthUser | null;
}

export default function ClientPortal({ industry, role = "user", onLogout, user }: ClientPortalProps) {
  const [view, setView] = useState<CPView>("overview");

  if (view === "learning") return <LearningCenter role={role} onBack={() => setView("overview")} />;

  // ── Retail industry ───────────────────────────────────────
  if (industry === "retail") {
    switch (view) {
      case "tickets":  return <RetailTicketsPage  onNavigate={setView} onLogout={onLogout} user={user} />;
      case "users":    return <RetailUsersPage    onNavigate={setView} onLogout={onLogout} user={user} />;
      case "settings": return <RetailSettingsPage onNavigate={setView} onLogout={onLogout} user={user} />;
      default:         return <RetailOverviewPage onNavigate={setView} onLogout={onLogout} user={user} />;
    }
  }

  // ── Warehouse (placeholder) ───────────────────────────────
  if (industry === "warehouse") {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"sans-serif", color:"#666" }}>
        Warehouse portal coming soon.
      </div>
    );
  }

  // ── F&B / default ─────────────────────────────────────────
  switch (view) {
    case "tickets":  return <TicketsPage  onNavigate={setView} onLogout={onLogout} user={user} />;
    case "users":    return <UsersPage    onNavigate={setView} onLogout={onLogout} user={user} />;
    case "settings": return <SettingsPage onNavigate={setView} onLogout={onLogout} user={user} />;
    default:         return <OverviewPage onNavigate={setView} onLogout={onLogout} user={user} />;
  }
}
