/* ==============================================================
   HEADER ADMIN/CLIENT PAGE  ·  header.tsx
   ============================================================== */

"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeaderUser {
  initials:     string;
  fullName:     string;
  position:     string;
  company:      string | null;
  profilePhoto?: string | null;
}

interface HeaderProps {
  user:                  HeaderUser;        // required — no defaults
  logoSrc?:              string;            // logo shown when sidebar is collapsed; defaults to admin branding
  /**
   * "admin"  — logo is shown + clickable to expand the sidebar (default)
   * "client" — logo is shown when collapsed but NOT clickable (burger in sidebar handles expand)
   * "none"   — brand slot is never rendered
   */
  brandSlotMode?:        "admin" | "client" | "none";
  notificationCount?:    number;
  onSearch?:             (query: string) => void;
  onNotificationClick?:  () => void;
  onLogout?:             () => void;
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
  .gxh-brand-slot.visible:hover .gxh-expand-hint {
    opacity: 1;
  }

  .gxh-brand-divider {
    width: 1px;
    height: 20px;
    background: var(--gxh-border-md);
    flex-shrink: 0;
    transition: opacity 0.2s;
    opacity: 0;
  }
  .gxh-brand-divider.visible { opacity: 1; }

  /* ── User pill sub-label separator dot ── */
  .gxh-role-sep {
    display: inline-block;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(2,132,199,0.55);
    margin: 0 4px;
    vertical-align: middle;
    position: relative;
    top: -1px;
  }

  /* ── User dropdown card ── */
  @keyframes gxDropIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  .gxh-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    background: #fff;
    border: 1px solid rgba(124,58,237,0.14);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(124,58,237,0.13), 0 2px 8px rgba(0,0,0,0.06);
    z-index: 9999;
    overflow: hidden;
    animation: gxDropIn 0.18s cubic-bezier(0.16,1,0.3,1) both;
  }
  .gxh-dd-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px 12px;
    border-bottom: 1px solid rgba(124,58,237,0.08);
  }
  .gxh-dd-avatar {
    width: 42px; height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg,#7c3aed,#0d9488);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 14px;
    flex-shrink: 0;
    letter-spacing: 0.04em;
    overflow: hidden;
  }
  .gxh-dd-avatar img {
    width: 100%; height: 100%; object-fit: cover; border-radius: 12px;
  }
  .gxh-dd-name {
    font-size: 13.5px; font-weight: 700;
    color: #18103a; letter-spacing: -0.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .gxh-dd-role {
    font-size: 11px; font-weight: 500;
    color: #8e7ec0; margin-top: 1px;
  }
  .gxh-dd-body {
    padding: 10px 16px 4px;
  }
  .gxh-dd-row {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid rgba(124,58,237,0.05);
  }
  .gxh-dd-row:last-child { border-bottom: none; }
  .gxh-dd-row-label {
    font-size: 11px; color: #8e7ec0; font-weight: 500;
  }
  .gxh-dd-row-value {
    font-size: 11.5px; font-weight: 700;
    color: #5b21b6;
  }
  .gxh-dd-footer {
    padding: 8px 10px 10px;
  }
  .gxh-signout-btn {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 9px 12px;
    border-radius: 9px;
    border: 1px solid rgba(220,38,38,0.18);
    background: rgba(220,38,38,0.04);
    color: #dc2626;
    font-size: 12.5px; font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .gxh-signout-btn:hover {
    background: rgba(220,38,38,0.09);
    border-color: rgba(220,38,38,0.35);
  }

  /* ── Chevron on pill ── */
  .gxh-pill-chevron {
    color: #b8aed8;
    transition: transform 0.18s;
    flex-shrink: 0;
  }
  .gxh-pill-chevron.open {
    transform: rotate(180deg);
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_COMPANY = "GenieX";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header({
  user,
  logoSrc = "/img_assets/genieX_branding.png",
  brandSlotMode = "admin",
  notificationCount = 0,
  onSearch,
  onNotificationClick,
  onLogout,
}: HeaderProps) {
  const [now,         setNow]         = useState(new Date());
  const [collapsed,   setCollapsed]   = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropRef       = useRef<HTMLDivElement>(null);

  const company = user.company || DEFAULT_COMPANY;

  /* Clock tick */
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    if (dropOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

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

  return (
    <>
      <style>{CSS}</style>

      <header
        className="gxh-root gxh-header fixed top-0 right-0 z-99 flex shrink-0 items-center h-14 bg-white/97 backdrop-blur-[14px] border-b box-border"
        style={{ borderColor: "var(--gxh-border)", padding: "0px 24px 0px 16px", gap: 12 }}
      >
        {/* ── Brand slot ── */}
        {brandSlotMode !== "none" && (
          <>
            {brandSlotMode === "admin" ? (
              /* Admin: clickable — expands the sidebar */
              <div
                className={`gxh-brand-slot${collapsed ? " visible" : ""}`}
                onClick={expandSidebar}
                title="Expand sidebar"
                role="button"
                aria-label="Expand sidebar"
              >
                <img
                  src={logoSrc}
                  alt="GenieX Logo"
                  style={{ height: 38, width: "auto", objectFit: "contain" }}
                />
                <span className="gxh-expand-hint">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
                    <polyline points="6,3 11,8 6,13" />
                  </svg>
                </span>
              </div>
            ) : (
              /* Client: display-only — burger in sidebar handles expand */
              <div
                className={`gxh-brand-slot${collapsed ? " visible" : ""}`}
                style={{ cursor: "default", pointerEvents: "none" }}
                aria-hidden="true"
              >
                <img
                  src={logoSrc}
                  alt="GenieX Logo"
                  style={{ height: 38, width: "auto", objectFit: "contain" }}
                />
              </div>
            )}

            <div className={`gxh-brand-divider${collapsed ? " visible" : ""}`} />
          </>
        )}

        {/* Spacer */}
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
          <span className="text-[12px] font-medium" style={{ color: "var(--gxh-t2)" }}>
            {formatDate(now)}
          </span>
          <div className="w-px h-3.5" style={{ background: "var(--gxh-border-md)" }} />
          <span className="gxh-clock text-[13px] font-bold" style={{ color: "var(--gxh-purple)" }}>
            {formatTime(now)}
          </span>
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
        <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
          {/* Pill trigger */}
          <div
            onClick={() => setDropOpen(o => !o)}
            className="flex shrink-0 items-center gap-2.5 rounded-[10px] border cursor-pointer transition-all duration-150 hover:bg-white"
            style={{
              background:  dropOpen ? "#fff" : "var(--gxh-surface2)",
              borderColor: dropOpen ? "var(--gxh-border-md)" : "var(--gxh-border)",
              padding:     "5px 10px 5px 5px",
            }}
          >
            {/* Avatar */}
            <div
              className="gxh-avatar flex shrink-0 items-center justify-center w-8 h-8 rounded-lg text-[10px] font-bold text-white overflow-hidden"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em" }}
            >
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user.initials
              )}
            </div>

            {/* Text block */}
            <div className="flex flex-col" style={{ gap: 1 }}>
              <span
                className="text-[12.5px] font-semibold leading-tight whitespace-nowrap"
                style={{ color: "var(--gxh-t1)", letterSpacing: "-0.01em" }}
              >
                {user.fullName}
              </span>
              <span
                className="whitespace-nowrap leading-none"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, color: "var(--gxh-sky)", letterSpacing: "0.01em" }}
              >
                {user.position}
                <span className="gxh-role-sep" />
                {company}
              </span>
            </div>

            {/* Chevron */}
            <svg
              className={`gxh-pill-chevron${dropOpen ? " open" : ""}`}
              width="12" height="12" viewBox="0 0 12 12"
              fill="none" stroke="currentColor" strokeWidth="1.8"
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </div>

          {/* Dropdown card */}
          {dropOpen && (
            <div className="gxh-dropdown">
              {/* Header — avatar + name */}
              <div className="gxh-dd-header">
                <div className="gxh-dd-avatar">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.initials} />
                  ) : (
                    user.initials
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="gxh-dd-name">{user.fullName}</div>
                  <div className="gxh-dd-role">{user.position}</div>
                </div>
              </div>

              {/* Info rows */}
              <div className="gxh-dd-body">
                <div className="gxh-dd-row">
                  <span className="gxh-dd-row-label">Company</span>
                  <span className="gxh-dd-row-value">{company}</span>
                </div>
                <div className="gxh-dd-row">
                  <span className="gxh-dd-row-label">Position</span>
                  <span className="gxh-dd-row-value">{user.position}</span>
                </div>
              </div>

              {/* Sign Out */}
              <div className="gxh-dd-footer">
                <button
                  className="gxh-signout-btn"
                  onClick={() => { setDropOpen(false); onLogout?.(); }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M10 8H3M6 5l-3 3 3 3" />
                    <path d="M7 3h5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </header>
    </>
  );
}