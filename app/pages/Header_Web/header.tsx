/* ==============================================================
   HEADER ADMIN/CLIENT PAGE  ·  header.tsx
   
   CHANGES:
   - Added onLogout prop to HeaderProps
   - Replaced onUserClick with a built-in dropdown panel that
     shows name, role, company + Sign Out button — matching the
     UserMenu in ClientLearningDashboard exactly.
   - User pill now toggles the dropdown instead of calling onUserClick.
   - FIX: header z-index set via inline style (z-99 is not a valid
     Tailwind class and compiled to nothing — dropdown was hidden
     behind page content).
   - FIX: dropdown z-index raised above LoadingPopup pill (99999).
   - FIX: Sign Out now awaits the async onLogout prop and shows a
     loading state so the UI always responds even if the server
     request is slow or fails.
   ============================================================== */

"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  user?: { initials: string; name: string; role: string; company?: string };
  notificationCount?: number;
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  onLogout?: () => Promise<void> | void;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  :root {
    --gxh-purple:      #7c3aed;
    --gxh-purple-d:    #5b21b6;
    --gxh-purple-lt:   #ede9fe;
    --gxh-teal:        #0d9488;
    --gxh-sky:         #0284c7;
    --gxh-red:         #dc2626;
    --gxh-surface2:    #f2f0fb;
    --gxh-border:      rgba(124,58,237,0.10);
    --gxh-border-md:   rgba(124,58,237,0.22);
    --gxh-t1:          #18103a;
    --gxh-t2:          #4a3870;
    --gxh-t3:          #8e7ec0;
    --gxh-t4:          #b8aed8;
    --gxh-sw:          220px;
    --gxh-collapsed:   0;
    --gxh-h:           52px;
    --gxh-av-grad:     linear-gradient(135deg,#7c3aed,#0d9488);
  }

  .gxh-root { font-family: 'DM Sans', sans-serif; }
  .gxh-avatar { background: var(--gxh-av-grad); }
  .gxh-clock { font-variant-numeric: tabular-nums; }

  .gxh-pip {
    position: absolute;
    top: 6px; right: 6px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gxh-red);
    border: 1.5px solid #fff;
  }

  .gxh-header {
    left: var(--gxh-sw);
    transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .gxh-brand-slot {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    max-width: 0;
    opacity: 0;
    margin-right: 0;
    transition:
      max-width    0.28s cubic-bezier(0.4, 0, 0.2, 1),
      opacity      0.20s cubic-bezier(0.4, 0, 0.2, 1),
      margin-right 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    white-space: nowrap;
    cursor: pointer;
    border-radius: 8px;
    padding: 4px 8px 4px 4px;
    border: 1px solid transparent;
  }
  .gxh-brand-slot.visible {
    max-width: 220px;
    opacity: 1;
    margin-right: 4px;
    pointer-events: auto;
  }
  .gxh-brand-slot.visible:hover {
    background: #f7f5ff;
    border-color: rgba(124,58,237,0.12);
  }
  .gxh-brand-slot .gxh-expand-hint {
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.15s;
    color: #8e7ec0;
    margin-left: 2px;
  }
  .gxh-brand-slot.visible:hover .gxh-expand-hint { opacity: 1; }

  .gxh-brand-divider {
    width: 1px;
    height: 20px;
    background: var(--gxh-border-md);
    flex-shrink: 0;
    transition: opacity 0.2s;
    opacity: 0;
  }
  .gxh-brand-divider.visible { opacity: 1; }

  /* User dropdown */
  @keyframes gxhFadeDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .gxh-user-dropdown {
    animation: gxhFadeDown 0.15s ease;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header({
  user = { initials: "JD", name: "John Doe", role: "System Admin", company: "" },
  notificationCount = 8,
  onSearch,
  onNotificationClick,
  onLogout,
}: HeaderProps) {
  const [now,          setNow]          = useState(new Date());
  const [collapsed,    setCollapsed]    = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const userMenuRef  = useRef<HTMLDivElement>(null);

  /* Clock tick */
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  /* Close user menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Expand sidebar */
  const expandSidebar = () => {
    document.documentElement.style.setProperty("--gxh-sw",        "220px");
    document.documentElement.style.setProperty("--gxh-collapsed", "0");
  };

  /* Watch --gxh-collapsed written by Sidebar */
  useEffect(() => {
    const check = () => {
      const val = getComputedStyle(document.documentElement)
        .getPropertyValue("--gxh-collapsed")
        .trim();
      setCollapsed(val === "1");
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  // FIX: properly await the async onLogout so the UI shows loading
  // state and clears correctly even if the server request is slow or fails.
  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setLoggingOut(true);
    try {
      await onLogout?.();
    } catch (err) {
      console.warn("Logout failed, clearing local state anyway:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>

      <header
        className="gxh-root gxh-header fixed top-0 right-0 flex shrink-0 items-center h-14 bg-white/97 backdrop-blur-[14px] border-b box-border"
        style={{
          borderColor: "var(--gxh-border)",
          padding: "0px 24px 0px 16px",
          gap: 12,
          zIndex: 200,
        }}
      >

        {/* ── Brand slot ── */}
        <div
          className={`gxh-brand-slot${collapsed ? " visible" : ""}`}
          onClick={expandSidebar}
          title="Expand sidebar"
          role="button"
          aria-label="Expand sidebar"
        >
          <img
            src="/img_assets/genieX_branding.png"
            alt="GenieX Logo"
            style={{ height: 38, width: "auto", objectFit: "contain" }}
          />
          <span className="gxh-expand-hint">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
              <polyline points="6,3 11,8 6,13" />
            </svg>
          </span>
        </div>

        <div className={`gxh-brand-divider${collapsed ? " visible" : ""}`} />

        <div style={{ flex: 1 }} />

        {/* ── DateTime Widget ── */}
        <div
          className="flex items-center gap-2 rounded-[9px] border"
          style={{ background: "var(--gxh-surface2)", borderColor: "var(--gxh-border)", padding: "6px 12px" }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ color: "var(--gxh-t3)", flexShrink: 0 }}>
            <rect x="1" y="2" width="12" height="11" rx="1.5" />
            <path d="M1 6h12M4 1v2M10 1v2" />
          </svg>
          <span className="text-[12px] font-medium" style={{ color: "var(--gxh-t2)" }}>{formatDate(now)}</span>
          <div className="w-px h-3.5" style={{ background: "var(--gxh-border-md)" }} />
          <span className="gxh-clock text-[13px] font-bold" style={{ color: "var(--gxh-purple)" }}>{formatTime(now)}</span>
        </div>

        {/* ── Notification Button ── */}
        <button
          onClick={onNotificationClick}
          className="relative flex shrink-0 items-center justify-center w-8.5 h-8.5 rounded-[9px] border p-0 cursor-pointer transition-all duration-150 hover:bg-white"
          style={{ background: "var(--gxh-surface2)", borderColor: "var(--gxh-border)" }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="rgba(100,80,160,0.75)" strokeWidth="1.5">
            <path d="M8 2a5 5 0 0 1 5 5v2.5l1 1.5H2l1-1.5V7a5 5 0 0 1 5-5z" />
            <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
          </svg>
          {notificationCount > 0 && <div className="gxh-pip" />}
        </button>

        {/* ── User Pill + Dropdown ── */}
        <div ref={userMenuRef} style={{ position: "relative", flexShrink: 0 }}>

          {/* Trigger pill */}
          <div
            onClick={() => { if (!loggingOut) setUserMenuOpen(o => !o); }}
            className="flex shrink-0 items-center gap-2 rounded-[10px] border cursor-pointer transition-all duration-150"
            style={{
              background:  "var(--gxh-surface2)",
              borderColor: userMenuOpen ? "var(--gxh-border-md)" : "var(--gxh-border)",
              padding:     "5px 10px 5px 5px",
              opacity:     loggingOut ? 0.6 : 1,
              cursor:      loggingOut ? "wait" : "pointer",
            }}
            onMouseEnter={(e) => { if (!loggingOut) e.currentTarget.style.borderColor = "var(--gxh-border-md)"; }}
            onMouseLeave={(e) => { if (!userMenuOpen) e.currentTarget.style.borderColor = "var(--gxh-border)"; }}
          >
            {/* Avatar */}
            <div
              className="gxh-avatar flex shrink-0 items-center justify-center w-8 h-8 rounded-lg text-[10px] font-bold text-white"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {user.initials}
            </div>

            {/* Name + role */}
            <div className="flex flex-col">
              <span className="text-[12.5px] font-semibold leading-tight whitespace-nowrap" style={{ color: "var(--gxh-t1)" }}>
                {loggingOut ? "Signing out…" : user.name}
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap leading-[1.3]" style={{ color: "var(--gxh-sky)" }}>
                {user.role}
              </span>
            </div>

            {/* Chevron */}
            <svg viewBox="0 0 10 10" fill="none" stroke="var(--gxh-t3)" strokeWidth="1.8" strokeLinecap="round"
              width="10" height="10"
              style={{ marginLeft: 2, flexShrink: 0, transition: "transform .18s", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M2 3.5l3 3 3-3" />
            </svg>
          </div>

          {/* ── Dropdown panel ── */}
          {userMenuOpen && !loggingOut && (
            <div
              className="gxh-user-dropdown"
              style={{
                position:      "absolute",
                top:           "calc(100% + 8px)",
                right:         0,
                zIndex:        100000,
                background:    "#fff",
                borderRadius:  14,
                border:        "1px solid rgba(124,58,237,0.13)",
                boxShadow:     "0 8px 32px rgba(124,58,237,0.18)",
                minWidth:      224,
                paddingBottom: 6,
                fontFamily:    "'DM Sans', sans-serif",
              }}
            >
              {/* Header row */}
              <div style={{
                padding: "12px 16px 14px",
                borderBottom: "1px solid rgba(124,58,237,0.08)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: "linear-gradient(135deg, #7c3aed, #0d9488)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{user.initials}</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#18103a", lineHeight: 1.3 }}>{user.name}</div>
                  <div style={{ fontSize: 10.5, color: "#9b7fd4", fontWeight: 500 }}>{user.role}</div>
                </div>
              </div>

              {/* Company + Role rows */}
              <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid rgba(124,58,237,0.07)" }}>
                {user.company && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Company</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#18103a" }}>{user.company}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Role</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#18103a" }}>{user.role}</span>
                </div>
              </div>

              {/* Sign Out */}
              <div style={{ padding: "6px 8px 0" }}>
                <button
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", borderRadius: 9,
                    border: "1px solid rgba(220,38,38,0.15)",
                    background: loggingOut ? "rgba(220,38,38,0.1)" : "rgba(254,242,242,0.7)",
                    color: "#dc2626", fontSize: 12, fontWeight: 600,
                    cursor: loggingOut ? "wait" : "pointer",
                    fontFamily: "inherit", transition: "background .15s",
                    opacity: loggingOut ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!loggingOut) e.currentTarget.style.background = "rgba(220,38,38,0.1)"; }}
                  onMouseLeave={e => { if (!loggingOut) e.currentTarget.style.background = "rgba(254,242,242,0.7)"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 8H3M6 5l-3 3 3 3" />
                    <path d="M6 3h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6" />
                  </svg>
                  {loggingOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            </div>
          )}
        </div>

      </header>
    </>
  );
}
