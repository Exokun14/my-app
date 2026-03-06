/* ==============================================================
   LOGIN ROUTE  ·  app/pages/Login/page.tsx

   FIX: This app uses STATE-BASED navigation in the root page.tsx
   (not Next.js file routing for inner views). So this file just
   redirects any direct /pages/Login visit back to root "/",
   where the login form and post-login routing both live.
   ============================================================== */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}