/* ==============================================================
   app/pages/Client_Admin/ClientPortal.tsx

   Thin router: receives the user's industry from root page.tsx
   and renders the matching overview portal.

   Add new industry branches here as you build them.
   ============================================================== */

'use client';

import React, { useState } from "react";

import OverviewPage       from "./OverviewPage";        // F&B
import RetailOverviewPage from "../Retail_Admin/RetailOverviewPage";  // Retail
import TicketsPage        from "./TicketsPage";
import UsersPage          from "./UsersPage";
import SettingsPage       from "./SettingsPage";

import type { UserIndustry } from "../../page";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CPView = "overview" | "tickets" | "users" | "settings";

interface ClientPortalProps {
  industry: UserIndustry;
  onLogout?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ClientPortal({ industry, onLogout }: ClientPortalProps) {
  const [view, setView] = useState<CPView>("overview");

  // ── Shared pages (same for all industries) ──
  if (view === "tickets")  return <TicketsPage  onNavigate={setView} onLogout={onLogout} />;
  if (view === "users")    return <UsersPage    onNavigate={setView} onLogout={onLogout} />;
  if (view === "settings") return <SettingsPage onNavigate={setView} onLogout={onLogout} />;

  // ── Overview — pick by industry ──
  switch (industry) {
    case "retail":
      return <RetailOverviewPage onNavigate={setView} onLogout={onLogout} />;

    case "warehouse":
      // TODO: build WarehouseOverviewPage
      return (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"sans-serif", color:"#666" }}>
          Warehouse portal coming soon.
        </div>
      );

    case "fnb":
    default:
      // Default fallback → F&B portal (Popeyes style)
      return <OverviewPage onNavigate={setView} onLogout={onLogout} />;
  }
}
