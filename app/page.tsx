<<<<<<< HEAD
/* ==============================================================
   ROOT PAGE  ·  app/page.tsx
   FIX: Added handleLogout — resets userRole to null so
   LoginAdmin re-renders automatically. Passed onLogout down
   to every client portal page so the Header can call it.
   ============================================================== */

'use client'

import { useState } from "react";

import LoginAdmin, { UserRole } from "./pages/Login/logUser";
import DashboardAdmin from "./pages/Dashboard_Admin_Main/DashboardAdmin";

import OverviewPage from "./pages/Client_Admin/OverviewPage";
import TicketsPage  from "./pages/Client_Admin/TicketsPage";
import UsersPage    from "./pages/Client_Admin/UsersPage";
import SettingsPage from "./pages/Client_Admin/SettingsPage";

import RetailOverviewPage from "./pages/Retail_Admin/RetailOverviewPage";
import RetailTicketsPage  from "./pages/Retail_Admin/RetailTicketsPage";
import RetailUsersPage    from "./pages/Retail_Admin/RetailUsersPage";

type CPView     = "overview" | "tickets" | "users" | "settings";
type ClientType = "fnb" | "retail";

export default function Home() {
  const [userRole, setUserRole]     = useState<UserRole | null>(null);
  const [view, setView]             = useState<CPView>("overview");
  const [clientType, setClientType] = useState<ClientType>("fnb");

  const navigate = (v: string) => setView(v as CPView);

  // Clears role → LoginAdmin re-renders automatically, no router.push needed
  const handleLogout = () => {
    setUserRole(null);
    setView("overview");
  };

  /* ── 1. Not logged in → show Login ─────────────────────── */
  if (!userRole) {
    return (
      <LoginAdmin
        onLoginSuccess={(role: UserRole) => {
          setUserRole(role);
          setView("overview");
        }}
      />
    );
  }

  /* ── 2a. Admin → DashboardAdmin ─────────────────────────── */
  if (userRole === "admin") {
    return <DashboardAdmin/>;
  }

  /* ── 2b. Client portal ──────────────────────────────────── */
  const DevSwitcher = () => (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9999,
      background: "#1e1b4b", borderRadius: 12, padding: "8px 12px",
      display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: ".08em" }}>
        CLIENT TYPE
      </span>
      {(["fnb", "retail"] as ClientType[]).map((t) => (
        <button key={t}
          onClick={() => { setClientType(t); setView("overview"); }}
          style={{
            padding: "4px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
            textTransform: "uppercase" as const,
            background: clientType === t ? (t === "fnb" ? "#6d28d9" : "#0369a1") : "rgba(255,255,255,0.1)",
            color: clientType === t ? "#fff" : "rgba(255,255,255,0.5)",
            transition: "all .15s",
          }}
        >
          {t === "fnb" ? "🍗 F&B" : "🛍️ Retail"}
        </button>
      ))}
    </div>
  );

  const isRetail = clientType === "retail";

  return (
    <>
      <DevSwitcher />
      {view === "overview" && (isRetail
        ? <RetailOverviewPage onNavigate={navigate} onLogout={handleLogout} />
        : <OverviewPage       onNavigate={navigate} onLogout={handleLogout} />
      )}
      {view === "tickets" && (isRetail
        ? <RetailTicketsPage  onNavigate={navigate} onLogout={handleLogout} />
        : <TicketsPage        onNavigate={navigate} onLogout={handleLogout} />
      )}
      {view === "users" && (isRetail
        ? <RetailUsersPage    onNavigate={navigate} onLogout={handleLogout} />
        : <UsersPage          onNavigate={navigate} onLogout={handleLogout} />
      )}
      {view === "settings" && <SettingsPage onNavigate={navigate} onLogout={handleLogout} />}
    </>
  );
}
=======
'use client';

import Image from "next/image";
import DashboardAdmin from "./pages/Dashboard_Admin/page";
import LearningCenter from "./pages/Learning_Module/page"
import { useEffect, useState } from "react"
import { getUsers } from "./Services/api";
import FileUpload from "./pages/Learning_Module/FileUpload";


export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div>
        <LearningCenter></LearningCenter>
        <DashboardAdmin></DashboardAdmin>
      </div>
    </div>
  );
}


/*
export default function Page() {
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data)
    })
  }, [])

  return (
    <div>
      <h1>Users</h1>

      {users.map(user => (
        <div key={user.id}>
          {user.name}
        </div>
      ))}

      <div>
        <h1>Users</h1>
        {users.map(user => (
          <div key={user.id}>{user.name}</div>
        ))}

          {/* Add this temporarily to test */ /*
          <FileUpload />
      </div>


    </div>

    
  )
}
*/
>>>>>>> 92185fca7a348d76cfef1676b794d498aa10fb55
