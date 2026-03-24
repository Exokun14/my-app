/* ==============================================================
   ROOT PAGE  ·  app/page.tsx

   Routing logic:
     role "admin"  (access_level: super_admin | system_admin) → DashboardAdmin
     role "client" (access_level: manager | user)             → OverviewPage

   FIX: Added `mounted` guard so the server and client both render
   null on the first pass, preventing the hydration mismatch caused
   by sessionStorage being unavailable on the server.
   ============================================================== */

'use client'

import { useState, useEffect } from "react";

import LoginAdmin, { UserRole, UserProfile } from "./pages/Login/logUser";
import DashboardAdmin from "./pages/Dashboard_Admin_Main/DashboardAdmin";

import OverviewPage  from "./pages/Client_Admin/OverviewPage";
import TicketsPage   from "./pages/Client_Admin/TicketsPage";
import UsersPage     from "./pages/Client_Admin/UsersPage";
import SettingsPage  from "./pages/Client_Admin/SettingsPage";
import LearningCenter from "./pages/Learning_Module/ClientLearningDashboard";
import AIChat from "./Components/AIChat";

import ClientOverview from "./pages/Dashboard_Admin_Overview/dashboard_overview_users";
import { Client } from "./pages/Dashboard_Admin_Main/DshAdmFunc";

// ← "learning" added to the union
type CPView    = "overview" | "tickets" | "users" | "settings" | "learning";
type AdminView = "database" | "client-overview";

const SESSION_KEY         = "gx_user_role";
const SESSION_PROFILE_KEY = "gx_user_profile";

export default function Home() {
  // Prevent SSR/client mismatch — render nothing until client has mounted
  const [mounted, setMounted] = useState(false);

  // Auth state — read from sessionStorage only after mount
  const [userRole, setUserRole]       = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [view, setView] = useState<CPView>("overview");

  // Admin sub-routing
  const [adminView, setAdminView]           = useState<AdminView>("database");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // On mount: read sessionStorage and mark as ready
  useEffect(() => {
    const role    = sessionStorage.getItem(SESSION_KEY) as UserRole | null;
    const rawProf = sessionStorage.getItem(SESSION_PROFILE_KEY);
    let profile: UserProfile | null = null;
    if (rawProf) {
      try { profile = JSON.parse(rawProf) as UserProfile; } catch { /* ignore */ }
    }
    setUserRole(role);
    setUserProfile(profile);
    setMounted(true);
  }, []);

  // Keep sessionStorage in sync
  useEffect(() => {
    if (!mounted) return;
    if (userRole) {
      sessionStorage.setItem(SESSION_KEY, userRole);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [userRole, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (userProfile) {
      sessionStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(userProfile));
    } else {
      sessionStorage.removeItem(SESSION_PROFILE_KEY);
    }
  }, [userProfile, mounted]);

  // Render nothing until client has hydrated — prevents SSR mismatch
  if (!mounted) return null;

  const navigate = (v: string) => setView(v as CPView);

  // Render global AI chat bubble for all logged-in users
  const aiChat = userProfile ? (
    <AIChat
      userId={userProfile.id}
      accessLevel={userProfile.accessLevel}
      userName={userProfile.fullName}
    />
  ) : null;

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_PROFILE_KEY);
    setUserRole(null);
    setUserProfile(null);
    setView("overview");
    setAdminView("database");
    setSelectedClient(null);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setAdminView("client-overview");
  };

  const handleBackToDatabase = () => {
    setAdminView("database");
    setSelectedClient(null);
  };

  /* ── 1. Not logged in → show Login ─────────────────────── */
  if (!userRole) {
    return (
      <LoginAdmin
        onLoginSuccess={(profile: UserProfile) => {
          setUserProfile(profile);
          setUserRole(profile.role);
          setView("overview");
        }}
      />
    );
  }

  /* ── 2a. Admin (super_admin | system_admin) → DashboardAdmin ── */
  if (userRole === "admin") {
    if (adminView === "client-overview" && selectedClient) {
      return (
        <ClientOverview
          initialClient={selectedClient}
          onBack={handleBackToDatabase}
        />
      );
    }
    return (
      <>
        <DashboardAdmin
          onClientSelect={handleClientSelect}
          userProfile={userProfile}
          onLogout={handleLogout}
        />
        {aiChat}
      </>
    );
  }

  /* ── 2b. Client portal (manager | user) ─────────────────── */
  return (
    <>
      {aiChat}
      {view === "overview"  && <OverviewPage   onNavigate={navigate} onLogout={handleLogout} userProfile={userProfile} />}
      {view === "tickets"   && <TicketsPage    onNavigate={navigate} onLogout={handleLogout} userProfile={userProfile} />}
      {view === "users"     && <UsersPage      onNavigate={navigate} onLogout={handleLogout} userProfile={userProfile} />}
      {view === "settings"  && <SettingsPage   onNavigate={navigate} onLogout={handleLogout} userProfile={userProfile} />}
      {view === "learning"  && (
        <LearningCenter
          role="user"
          onBack={() => setView("overview")}
          onLogout={handleLogout}
          initialUser={userProfile ? {
            id:           userProfile.id,
            name:         userProfile.fullName,
            email:        userProfile.username,
            role:         "user",
            industry:     null,
            company_id:   userProfile.companyId,
            company_name: userProfile.company,
          } : null}
        />
      )}
    </>
  );
}
