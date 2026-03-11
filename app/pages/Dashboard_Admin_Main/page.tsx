/* ==============================================================
   app/pages/Dashboard_Admin_Main/page.tsx

   FIX: This app uses state-based navigation in the root page.tsx.
   Rendering DashboardAdmin directly here bypasses the root auth
   state machine, breaking client-card → overview navigation and
   causing the sidebar "Company DB" link to lose session context.

   Solution: always redirect to "/" and let the root page.tsx
   render the correct admin view based on sessionStorage auth.
   ============================================================== */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}