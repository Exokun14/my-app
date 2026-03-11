// ============================================================
//  header_client.tsx
//  Sign Out:
//   1. POST /logout to Laravel Fortify (invalidates server session)
//   2. Then calls onLogout() → page.tsx clears sessionStorage
//      → LoginAdmin re-renders automatically.
// ============================================================

"use client";

import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  user?: { initials: string; name: string; role: string; company?: string; };
  clientLabel?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onLogout?: () => void;
}

export default function Header({
  user = { initials: "JD", name: "John Doe", role: "System Admin", company: "Popeyes" },
  clientLabel = "Popeyes Philippines",
  notificationCount = 0,
  onNotificationClick,
  onLogout,
}: HeaderProps) {
  const [now, setNow]             = useState(new Date());
  const [userOpen, setUserOpen]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const timer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    timer.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Sign Out ──────────────────────────────────────────────
  // 1. GET /sanctum/csrf-cookie so Laravel accepts the POST
  // 2. POST /logout  (Fortify's logout route)
  // 3. Call onLogout() to clear React / sessionStorage state
  const handleSignOut = async () => {
    setUserOpen(false);
    setLoggingOut(true);

    try {
      // Refresh the CSRF cookie first (required for Sanctum SPA auth)
      await fetch("/sanctum/csrf-cookie", {
        method: "GET",
        credentials: "include",
      });

      // Hit Fortify's logout endpoint
      await fetch("/logout", {
        method: "POST",
        credentials: "include",                          // send session cookie
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getXsrfToken(),               // Laravel CSRF token
        },
      });
    } catch (err) {
      // Network error — still clear local state so the user isn't stuck
      console.warn("Logout request failed, clearing local state anyway:", err);
    } finally {
      setLoggingOut(false);
      onLogout?.();   // clears sessionStorage + re-renders LoginAdmin
    }
  };

  return (
    <div className="gx-topbar">

      <span className="gx-client-label">{clientLabel}</span>
      <div className="gx-space" />

      <div className="gx-dt">
        <div className="gx-dt-date">
          {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
        <div className="gx-dt-sep" />
        <div className="gx-dt-time">
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
        </div>
      </div>

      <div className="gx-notif-btn" onClick={onNotificationClick}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2a5 5 0 0 1 5 5v2l1.5 2.5H1.5L3 9V7a5 5 0 0 1 5-5z"/>
          <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/>
        </svg>
        {notificationCount > 0 && <div className="gx-notif-pip" />}
      </div>

      <div style={{ position: "relative" }} ref={popRef}>
        <div className="gx-user-pill" onClick={() => setUserOpen(o => !o)}>
          <div className="gx-user-av">{user.initials}</div>
          <div>
            <div className="gx-user-name">{user.name}</div>
            <div className="gx-user-role">{user.role}</div>
          </div>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ marginLeft: 4, transition: "transform .2s", transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.5 }}>
            <path d="M2 3.5l3 3 3-3"/>
          </svg>
        </div>

        {userOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 220, background: "#fff", borderRadius: 14,
            boxShadow: "0 12px 40px rgba(109,40,217,0.18)",
            border: "1px solid rgba(109,40,217,0.12)",
            zIndex: 9000, overflow: "hidden",
            animation: "fadeDown .18s ease",
          }}>
            {/* Avatar + name */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(109,40,217,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: "linear-gradient(135deg,#6d28d9,#0f766e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>{user.initials}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: "#8e7ec0", marginTop: 1 }}>{user.role}</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(109,40,217,0.08)" }}>
              {[
                { label: "Company", value: user.company || "Popeyes" },
                { label: "Role",    value: user.role },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                  <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 11, color: "#3b1f7a", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Sign Out */}
            <div style={{ padding: "8px" }}>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 9,
                  border: "1px solid rgba(220,38,38,0.15)",
                  background: loggingOut ? "#fee2e2" : "#fff5f5",
                  cursor: loggingOut ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 12, fontWeight: 600, color: "#dc2626",
                  fontFamily: "inherit", transition: "background .15s",
                  opacity: loggingOut ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loggingOut) e.currentTarget.style.background = "#fee2e2"; }}
                onMouseLeave={e => { if (!loggingOut) e.currentTarget.style.background = "#fff5f5"; }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6"/>
                </svg>
                {loggingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads the XSRF-TOKEN cookie that Laravel sets and returns it decoded.
// Laravel expects this value in the X-XSRF-TOKEN request header.
// ─────────────────────────────────────────────────────────────────────────────
function getXsrfToken(): string {
  const match = document.cookie
    .split("; ")
    .find(row => row.startsWith("XSRF-TOKEN="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}
