/* Admin sidebar component, used in DashboardAdmin and UserManagementMain. Contains navigation links and log out button. */

"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface NavItem {
  label: string;
  page: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeTeal?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const SIDEBAR_WIDTH           = 220;
const SIDEBAR_WIDTH_COLLAPSED = 0;

/* ─── Scoped styles ───────────────────────────────────────────────────────── */
const SCOPED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  .gx-sidebar {
    transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .gx-sidebar.collapsed {
    width: 0px !important;
    border-right-color: transparent !important;
    box-shadow: none !important;
  }

  .gx-sidebar-inner {
    width: 220px;
    min-width: 220px;
  }

  .gx-brand-bar {
    cursor: pointer;
    transition: background 0.16s;
  }
  .gx-brand-bar:hover { background: #f7f5ff; }

  .gx-nav-btn { font-family: 'DM Sans', sans-serif; }
  .gx-nav-btn.is-active {
    background: linear-gradient(90deg, rgba(124,58,237,0.09), rgba(13,148,136,0.04));
    border-color: rgba(124,58,237,0.13);
    color: #18103a;
    font-weight: 500;
  }
  .gx-nav-btn.is-active::before {
    content: '';
    position: absolute;
    left: -1px; top: 20%; bottom: 20%;
    width: 2.5px;
    border-radius: 2px;
    background: linear-gradient(to bottom, #7c3aed, #0d9488);
  }
  .gx-nav-btn:not(.is-active):hover {
    background: #f2f0fb;
    color: #18103a;
  }

  .gx-scroll::-webkit-scrollbar { width: 4px; }
  .gx-scroll::-webkit-scrollbar-thumb {
    background: rgba(124,58,237,0.18);
    border-radius: 4px;
  }

  .gx-collapse-hint {
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }
  .gx-brand-bar:hover .gx-collapse-hint { opacity: 1; }
`;

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const Icons = {
  CompanyDB: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
         style={{ width: 14, height: 14, flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.2" />
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.2" />
    </svg>
  ),
  Learning: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
         style={{ width: 14, height: 14, flexShrink: 0 }}>
      <path d="M2 4l6-2 6 2v5c0 2.5-2.5 4.5-6 5.5-3.5-1-6-3-6-5.5V4z" />
      <path d="M6 8l1.5 1.5L11 6" />
    </svg>
  ),
  Analytics: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
         style={{ width: 14, height: 14, flexShrink: 0 }}>
      <polyline points="1,11 5,6.5 9,8.5 15,2.5" />
      <polyline points="11,2.5 15,2.5 15,6.5" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
         style={{ width: 14, height: 14, flexShrink: 0 }}>
      <path d="M2 13s2.5-4 6-4 6 4 6 4" />
      <circle cx="8" cy="6" r="2.8" />
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
         style={{ width: 14, height: 14, flexShrink: 0 }}>
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <polyline points="10,4 14,8 10,12" />
      <line x1="14" y1="8" x2="5" y2="8" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
         style={{ width: 13, height: 13 }}>
      <polyline points="10,3 5,8 10,13" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
         style={{ width: 13, height: 13 }}>
      <polyline points="6,3 11,8 6,13" />
    </svg>
  ),
};

/* ─── Routes ──────────────────────────────────────────────────────────────── */
const ROUTES = {
  dashboard : "/pages/Dashboard_Admin_Main",
  users     : "/pages/User_Management_Main",
  learning  : "/pages/Dashboard_Admin_Main/learning",
  analytics : "/pages/Analytics_Admin",
  login     : "/pages/Login",
} as const;

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { label: "Company DB",      page: "customers", href: ROUTES.dashboard, icon: <Icons.CompanyDB /> },
      { label: "Learning Center", page: "learning",  href: ROUTES.learning,  icon: <Icons.Learning />, badge: 2, badgeTeal: true },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", page: "analytics", href: ROUTES.analytics, icon: <Icons.Analytics /> },
      { label: "Users",     page: "users",     href: ROUTES.users,     icon: <Icons.Users />, badge: 8 },
    ],
  },
];

function checkActive(item: NavItem, pathname: string): boolean {
  if (item.href === ROUTES.dashboard) return pathname === ROUTES.dashboard;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/* ─── NavButton ───────────────────────────────────────────────────────────── */
function NavButton({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-page={item.page}
      className={`gx-nav-btn${isActive ? " is-active" : ""}`}
      style={{
        position:     "relative",
        display:      "flex",
        alignItems:   "center",
        gap:          9,
        width:        "100%",
        padding:      "8px 10px",
        marginBottom: 2,
        borderRadius: 8,
        border:       "1px solid transparent",
        overflow:     "visible",
        fontSize:     12.5,
        fontWeight:   400,
        lineHeight:   1,
        textAlign:    "left",
        color:        isActive ? "#18103a" : "#4a3870",
        background:   "transparent",
        cursor:       "pointer",
        userSelect:   "none",
        transition:   "all 0.16s",
        whiteSpace:   "nowrap",
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.65, display: "flex", alignItems: "center" }}>
        {item.icon}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge !== undefined && (
        <span style={{
          marginLeft:     "auto",
          minWidth:       18,
          height:         18,
          padding:        "0 5px",
          borderRadius:   9,
          background:     item.badgeTeal ? "rgba(13,148,136,0.1)" : "#ede9fe",
          color:          item.badgeTeal ? "#0d9488"              : "#5b21b6",
          fontSize:       9,
          fontWeight:     700,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  /* Write CSS variables whenever local state changes */
  useEffect(() => {
    const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
    document.documentElement.style.setProperty("--gxh-sw",        `${width}px`);
    document.documentElement.style.setProperty("--gxh-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  /* Also watch for external changes to --gxh-collapsed (e.g. header expand button) */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const val = getComputedStyle(document.documentElement)
        .getPropertyValue("--gxh-collapsed")
        .trim();
      setCollapsed(val === "1");
    });
    observer.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, []);

  const handleLogout = () => router.push(ROUTES.login);

  return (
    <>
      <style>{SCOPED_STYLES}</style>

      <aside
        className={`gx-sidebar${collapsed ? " collapsed" : ""}`}
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         SIDEBAR_WIDTH,
          height:        "100vh",
          zIndex:        100,
          display:       "flex",
          flexDirection: "column",
          background:    "white",
          borderRight:   "1px solid rgba(124,58,237,0.1)",
          boxShadow:     "2px 0 20px rgba(124,58,237,0.04)",
          fontFamily:    "'DM Sans', sans-serif",
        }}
      >
        <div className="gx-sidebar-inner" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

          {/* ── Brand bar ── */}
          <div
            className="gx-brand-bar"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            style={{
              height:       56,
              flexShrink:   0,
              display:      "flex",
              alignItems:   "center",
              padding:      "0 16px",
              gap:          9,
              borderBottom: "1px solid rgba(124,58,237,0.1)",
              userSelect:   "none",
            }}
          >
            <img
              src="/img_assets/genieX_branding.png"
              alt="GenieX Logo"
              style={{ width: 100, height: "auto", objectFit: "contain" }}
            />
            <span style={{
              marginLeft:    45,
              fontSize:      9.5,
              fontWeight:    700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "#8e7ec0",
              background:    "#f2f0fb",
              border:        "1px solid rgba(124,58,237,0.1)",
              padding:       "2px 6px",
              borderRadius:  4,
            }}>
              CRM
            </span>
            <span className="gx-collapse-hint" style={{
              marginLeft: "auto",
              display:    "flex",
              alignItems: "center",
              color:      "#8e7ec0",
            }}>
              <Icons.ChevronLeft />
            </span>
          </div>

          {/* ── Scrollable nav ── */}
          <div
            className="gx-scroll"
            style={{
              flex:           1,
              overflowY:      "auto",
              padding:        "10px 8px 4px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(124,58,237,0.15) transparent",
            }}
          >
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} style={{ marginBottom: 4 }}>
                <div style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           7,
                  padding:       "10px 8px 4px",
                  fontSize:      7.5,
                  fontWeight:    700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color:         "#b8aed8",
                }}>
                  {section.label}
                  <span style={{ flex: 1, height: 1, background: "rgba(124,58,237,0.1)" }} />
                </div>
                {section.items.map((item) => (
                  <NavButton
                    key={item.page}
                    item={item}
                    isActive={checkActive(item, pathname)}
                    onClick={() => router.push(item.href)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* ── Footer / Log Out ── */}
          <div style={{
            flexShrink:     0,
            padding:        "8px 8px 12px",
            borderTop:      "1px solid rgba(124,58,237,0.1)",
            display:        "flex",
            justifyContent: "center",
          }}>
            <button
              onClick={handleLogout}
              className="group relative flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent text-[12.5px] font-normal leading-none text-red-400 bg-transparent cursor-pointer select-none whitespace-nowrap transition-all duration-150 hover:bg-red-50 hover:border-red-100 hover:text-red-600"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span className="flex items-center opacity-70 transition-all duration-150 group-hover:opacity-100">
                <Icons.LogOut />
              </span>
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}