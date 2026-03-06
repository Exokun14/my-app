/* ==============================================================
   HEADER ADMIN/CLIENT PAGE  ·  header.tsx
   ============================================================== */

"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  user?: { initials: string; name: string; role: string };
  notificationCount?: number;
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  onUserClick?: () => void;
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

  /* Header slides its left edge with the sidebar */
  .gxh-header {
    left: var(--gxh-sw);
    transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Logo+CRM slot — hidden by default, slides in when sidebar collapses */
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
  .gxh-brand-slot.visible:hover .gxh-expand-hint {
    opacity: 1;
  }

  /* Divider between brand slot and right-side controls */
  .gxh-brand-divider {
    width: 1px;
    height: 20px;
    background: var(--gxh-border-md);
    flex-shrink: 0;
    transition: opacity 0.2s;
    opacity: 0;
  }
  .gxh-brand-divider.visible { opacity: 1; }
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
  user = { initials: "JD", name: "John Doe", role: "GenieX Admin" },
  notificationCount = 8,
  onSearch,
  onNotificationClick,
  onUserClick,
}: HeaderProps) {
  const [now,       setNow]       = useState(new Date());
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Clock tick */
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  /* Expand sidebar by resetting the CSS variables that Sidebar wrote */
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

    check(); // initial read

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{CSS}</style>

      <header
        className="gxh-root gxh-header fixed top-0 right-0 z-99 flex shrink-0 items-center h-14 bg-white/97 backdrop-blur-[14px] border-b box-border"
        style={{
          borderColor: "var(--gxh-border)",
          padding:     "0px 24px 0px 16px",
          gap:         12,
        }}
      >

        {/* ── Brand slot (logo + CRM) — slides in when sidebar hides ── */}
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
          <span style={{
            fontSize:      9.5,
            fontWeight:    700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "#8e7ec0",
            background:    "#f2f0fb",
            border:        "1px solid rgba(124,58,237,0.1)",
            padding:       "3px 6px",
            borderRadius:  4,
            flexShrink:    0,
            marginLeft:   14,
          }}>
            CRM
          </span>
          {/* Chevron hint — appears on hover to signal it's clickable */}
          <span className="gxh-expand-hint">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
              <polyline points="6,3 11,8 6,13" />
            </svg>
          </span>
        </div>

        {/* Divider between brand and right-side controls */}
        <div className={`gxh-brand-divider${collapsed ? " visible" : ""}`} />

        {/* Push right-side controls to the far right */}
        <div style={{ flex: 1  }} />

        {/* ── DateTime Widget ─────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 rounded-[9px] border"
          style={{
            background: "var(--gxh-surface2)",
            borderColor: "var(--gxh-border)",
            padding: "6px 12px",
          }}
        >
          <svg
            width="12" height="12" viewBox="0 0 14 14"
            fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ color: "var(--gxh-t3)", flexShrink: 0 }}
          >
            <rect x="1" y="2" width="12" height="11" rx="1.5" />
            <path d="M1 6h12M4 1v2M10 1v2" />
          </svg>

          <span className="text-[12px] font-medium" style={{ color: "var(--gxh-t2)" }}>
            {formatDate(now)}
          </span>

          <div className="w-px h-3.5" style={{ background: "var(--gxh-border-md)" }} />

          <span className="gxh-clock text-[13px] font-bold" style={{ color: "var(--gxh-purple)" }}>
            {formatTime(now)}
          </span>
        </div>

        {/* ── Notification Button ─────────────────────────────────── */}
        <button
          onClick={onNotificationClick}
          className="relative flex shrink-0 items-center justify-center w-8.5 h-8.5 rounded-[9px] border p-0 cursor-pointer transition-all duration-150 hover:bg-white"
          style={{
            background:  "var(--gxh-surface2)",
            borderColor: "var(--gxh-border)",
          }}
        >
          <svg
            width="15" height="15" viewBox="0 0 16 16"
            fill="none" stroke="rgba(100,80,160,0.75)" strokeWidth="1.5"
          >
            <path d="M8 2a5 5 0 0 1 5 5v2.5l1 1.5H2l1-1.5V7a5 5 0 0 1 5-5z" />
            <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
          </svg>
          {notificationCount > 0 && <div className="gxh-pip" />}
        </button>

        {/* ── User Pill ───────────────────────────────────────────── */}
        <div
          onClick={onUserClick}
          className="flex shrink-0 items-center gap-2 rounded-[10px] border cursor-pointer transition-all duration-150 hover:bg-white"
          style={{
            background:  "var(--gxh-surface2)",
            borderColor: "var(--gxh-border)",
            padding:     "5px 12px 5px 5px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gxh-border-md)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--gxh-border)")}
        >
          <div
            className="gxh-avatar flex shrink-0 items-center justify-center w-8 h-8 rounded-lg text-[10px] font-bold text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {user.initials}
          </div>

          <div className="flex flex-col">
            <span
              className="text-[12.5px] font-semibold leading-tight whitespace-nowrap"
              style={{ color: "var(--gxh-t1)" }}
            >
              {user.name}
            </span>
            <span
              className="text-[10px] font-medium whitespace-nowrap leading-[1.3]"
              style={{ color: "var(--gxh-sky)" }}
            >
              {user.role}
            </span>
          </div>
        </div>

      </header>
    </>
  );
}