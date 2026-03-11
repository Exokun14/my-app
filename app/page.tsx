'use client';

import { useState } from "react";
import LoginAdmin, { UserRole } from "./pages/Login/logUser";
import DashboardAdmin from "./pages/Dashboard_Admin/page";
import LearningCenter from "./pages/Learning_Module/page";

export default function Home() {
  const [role, setRole] = useState<UserRole | null>(null);

  // Not logged in yet — show login page
  if (!role) {
    return <LoginAdmin onLoginSuccess={(r) => setRole(r)} />;
  }

  // Logged in — show the appropriate view based on role
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div>
        {role === "admin" && <DashboardAdmin />}
        {role === "client" && <LearningCenter />}
      </div>
    </div>
  );
}
