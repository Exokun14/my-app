'use client'

// ============================================================
//  LearningCenter/page.tsx
//  Thin router — checks role, renders the correct dashboard.
//
//  role === "admin"  → AdminLearningDashboard  (full admin tools)
//  role === "user"   → ClientLearningDashboard (courses + progress only)
// ============================================================

import AdminLearningDashboard  from "./AdminLearningDashboard";
import ClientLearningDashboard from "./ClientLearningDashboard";
import type { AuthUser } from "../../Services/api.service";

interface LearningCenterProps {
  role?:        "admin" | "user";
  onBack?:      () => void;
  onLogout?:    () => void;
  initialUser?: AuthUser | null;
}

export default function LearningCenter({ role = "user", onBack, onLogout, initialUser }: LearningCenterProps) {
  if (role === "admin") {
    return <AdminLearningDashboard onBack={onBack} />;
  }
  return (
    <ClientLearningDashboard
      onBack={onBack}
      onLogout={onLogout}
      initialUser={initialUser}
    />
  );
}
