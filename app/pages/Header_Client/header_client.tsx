// ============================================================
//  header_client.tsx
//  Self-contained: fetches the authenticated user from /api/user
//  on mount, displays real name/role/company in the pill, and
//  calls POST /logout (via authAPI) on sign-out.
// ============================================================

"use client";

import { useState, useEffect, useRef } from "react";
import { authAPI, type AuthUser, formatRole } from "../../Services/api.service";

interface HeaderProps {
  /** Static label shown on the left (e.g. "Popeyes Philippines") */
  clientLabel?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  /** Called after logout succeeds so the parent can unmount the portal */
  onLogout?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header({
  clientLabel,
  notificationCount = 0,
  onNotificationClick,
  onLogout,
}: HeaderProps) {
  const [now,        setNow]        = useState(new Date());
  const [userOpen,   setUserOpen]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [authUser,   setAuthUser]   = useState<AuthUser | null>(null);
  const [userError,  setUserError]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popRef   = useRef<HTMLDivElement>(null);

  // ── Clock ────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Responsive ──────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Click-outside to close user dropdown ────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node))
        setUserOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch authenticated user from API ───────────────────
  useEffect(() => {
    let cancelled = false;
    authAPI.getUser().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setAuthUser(res.data);
      } else {
        setUserError(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // ── Derived display values ───────────────────────────────
  const displayName    = authUser ? authUser.name         : "—";
  const displayInitials= authUser ? getInitials(authUser.name) : "··";
  const displayRole    = authUser ? formatRole(authUser.role)  : "—";
  const displayCompany = authUser?.company_name ?? clientLabel ?? "—";

  // ── Sign Out ─────────────────────────────────────────────
  const handleSignOut = async () => {
    setUserOpen(false);
    setLoggingOut(true);
    try {
      // Refresh CSRF cookie first (required for Sanctum SPA)
      await fetch("/sanctum/csrf-cookie", {
        method: "GET",
        credentials: "include",
      });
      await authAPI.logout();
    } catch (err) {
      console.warn("Logout request failed, clearing local state anyway:", err);
    } finally {
      setLoggingOut(false);
      onLogout?.();
    }
  };

  return (
    <div
      className="gx-topbar"
      style={isMobile ? { paddingLeft: 56 } : undefined}
    >
      {/* Client label */}
      <span
        className="gx-client-label"
        style={isMobile ? { display: "none" } : undefined}
      >
        {clientLabel ?? displayCompany}
      </span>

      <div className="gx-space" />

      {/* Date / time — desktop */}
      {!isMobile && (
        <div className="gx-dt">
          <div className="gx-dt-date">
            {now.toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </div>
          <div className="gx-dt-sep" />
          <div className="gx-dt-time">
            {now.toLocaleTimeString("en-US", {
              hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
            })}
          </div>
        </div>
      )}

      {/* Date / time — mobile */}
      {isMobile && (
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c2, #8e7ec0)", marginRight: 4 }}>
          {now.toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit", hour12: true,
          })}
        </div>
      )}

      {/* Notification bell */}
      <div className="gx-notif-btn" onClick={onNotificationClick}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2a5 5 0 0 1 5 5v2l1.5 2.5H1.5L3 9V7a5 5 0 0 1 5-5z"/>
          <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/>
        </svg>
        {notificationCount > 0 && <div className="gx-notif-pip" />}
      </div>

      {/* User pill */}
      <div style={{ position: "relative" }} ref={popRef}>
        <div
          className="gx-user-pill"
          onClick={() => setUserOpen(o => !o)}
          style={isMobile ? { gap: 6, padding: "4px 8px" } : undefined}
        >
          {/* Avatar */}
          <div className="gx-user-av">
            {authUser ? displayInitials : (
              <svg
                width="12" height="12" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.5"
                style={{ opacity: 0.5 }}
              >
                <circle cx="8" cy="6" r="3"/><path d="M2 14s1.5-4 6-4 6 4 6 4"/>
              </svg>
            )}
          </div>

          {/* Name + role — hidden on mobile */}
          {!isMobile && (
            <div>
              <div className="gx-user-name">
                {authUser ? displayName : (
                  <span style={{
                    display: "inline-block", width: 72, height: 10,
                    borderRadius: 5, background: "rgba(124,58,237,0.12)",
                    verticalAlign: "middle",
                  }} />
                )}
              </div>
              <div className="gx-user-role">
                {authUser ? displayRole : (
                  <span style={{
                    display: "inline-block", width: 48, height: 8,
                    borderRadius: 4, background: "rgba(124,58,237,0.08)",
                    verticalAlign: "middle",
                  }} />
                )}
              </div>
            </div>
          )}

          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth="1.5"
            style={{
              marginLeft: 4, opacity: 0.5, transition: "transform .2s",
              transform: userOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M2 3.5l3 3 3-3"/>
          </svg>
        </div>

        {/* Dropdown */}
        {userOpen && (
          <div style={{
            ...(isMobile
              ? { position: "fixed" as const, top: 60, right: 10 }
              : { position: "absolute" as const, top: "calc(100% + 8px)", right: 0 }
            ),
            width: 220, background: "#fff", borderRadius: 14,
            boxShadow: "0 12px 40px rgba(109,40,217,0.18)",
            border: "1px solid rgba(109,40,217,0.12)",
            zIndex: 9000, overflow: "hidden",
            animation: "fadeDown .18s ease",
          }}>

            {/* Avatar + name */}
            <div style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid rgba(109,40,217,0.08)",
            }}>
              {authUser ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11,
                    background: "linear-gradient(135deg,#6d28d9,#0f766e)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>
                    {displayInitials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 10, color: "#8e7ec0", marginTop: 1 }}>
                      {authUser.email}
                    </div>
                  </div>
                </div>
              ) : (
                // Loading skeleton
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11,
                    background: "rgba(124,58,237,0.08)", flexShrink: 0,
                  }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ width: 100, height: 11, borderRadius: 5, background: "rgba(124,58,237,0.1)" }} />
                    <div style={{ width: 70,  height:  9, borderRadius: 4, background: "rgba(124,58,237,0.07)" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{
              padding: "10px 16px",
              borderBottom: "1px solid rgba(109,40,217,0.08)",
            }}>
              {authUser ? (
                <>
                  {[
                    { label: "Company", value: displayCompany },
                    { label: "Role",    value: displayRole    },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "5px 0",
                    }}>
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 11, color: "#3b1f7a", fontWeight: 600 }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                  <div style={{ width: "100%", height: 9, borderRadius: 4, background: "rgba(124,58,237,0.08)" }} />
                  <div style={{ width: "70%",  height: 9, borderRadius: 4, background: "rgba(124,58,237,0.06)" }} />
                </div>
              )}
            </div>

            {/* Sign Out */}
            <div style={{ padding: "8px" }}>
              <button
                onClick={handleSignOut}
                disabled={loggingOut || !authUser}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 9,
                  border: "1px solid rgba(220,38,38,0.15)",
                  background: loggingOut ? "#fee2e2" : "#fff5f5",
                  cursor: (loggingOut || !authUser) ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 12, fontWeight: 600, color: "#dc2626",
                  fontFamily: "inherit", transition: "background .15s",
                  opacity: (loggingOut || !authUser) ? 0.6 : 1,
                }}
                onMouseEnter={e => {
                  if (!loggingOut && authUser)
                    e.currentTarget.style.background = "#fee2e2";
                }}
                onMouseLeave={e => {
                  if (!loggingOut)
                    e.currentTarget.style.background = "#fff5f5";
                }}
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
