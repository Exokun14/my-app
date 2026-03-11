'use client'

// ============================================================
//  LearningCenter/page.tsx
//  Thin router — checks role, renders the correct dashboard.
//  Same pattern as ClientPortal.tsx.
//
//  role === "admin"  → AdminLearningDashboard  (full admin tools)
//  role === "user"   → ClientLearningDashboard (courses + progress only)
// ============================================================

import AdminLearningDashboard  from "./AdminLearningDashboard";
import ClientLearningDashboard from "./ClientLearningDashboard";

interface LearningCenterProps {
  role?: "admin" | "user";
  onBack?: () => void;
}

export default function LearningCenter({ role = "user", onBack }: LearningCenterProps) {
  if (role === "admin") {
    return <AdminLearningDashboard onBack={onBack} />;
  }
  return <ClientLearningDashboard onBack={onBack} />;
}
