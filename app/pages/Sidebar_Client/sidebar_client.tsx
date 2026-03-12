"use client";

import { useState, useEffect } from "react";

interface SidebarProps {
  activePage: string;
  onNavigate: (view: string) => void;
}

interface NavItem {
  label: string;
  view: string;
  icon: string;
  badge?: number;
}

const CLIENT_PORTAL_NAV: NavItem[] = [
  { label: "Overview",        view: "overview",  icon: "/icon-overview.png"          },
  { label: "Tickets",         view: "tickets",   icon: "/icon-tickets.png",  badge: 8 },
  { label: "Users",           view: "users",     icon: "/icon-users.png"             },
  { label: "Learning Center", view: "learning",  icon: "/icon-learning.png"          },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  // On mobile the sidebar starts hidden (acts as a drawer)
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close drawer when navigating on mobile
  const handleNavigate = (view: string) => {
    onNavigate(view);
    if (isMobile) setMobileOpen(false);
  };

  const cls = collapsed ? "collapsed" : "expanded";

  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger trigger — fixed top-left */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Open navigation"
          style={{
            position: "fixed", top: 14, left: 14, zIndex: 10001,
            width: 36, height: 36, borderRadius: 10,
            background: "#fff",
            border: "1px solid rgba(109,40,217,0.15)",
            boxShadow: "0 2px 10px rgba(109,40,217,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <img src="/icon-menu.png" alt="menu" style={{ width: 18, height: 18, objectFit: "contain", opacity: 0.65 }} />
        </button>

        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(15,10,35,0.45)",
              backdropFilter: "blur(2px)",
              animation: "fadeIn .18s ease",
            }}
          />
        )}

        {/* Drawer */}
        <aside
          className="gx-sidebar-cp"
          style={{
            position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 9999,
            width: 220,
            background: "#fff",
            borderRight: "1px solid rgba(124,58,237,0.1)",
            boxShadow: mobileOpen ? "4px 0 32px rgba(124,58,237,0.12)" : "none",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform .25s cubic-bezier(.4,0,.2,1)",
            display: "flex", flexDirection: "column",
            height: "100vh",
          }}
        >
          {/* Brand */}
          <div className="gx-sb-brand" style={{ justifyContent: "space-between" }}>
            <img src="/geniex-logo.png" alt="genieX" className="gx-sb-logo" style={{ height: 35 }} />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="rgba(74,56,112,0.5)" strokeWidth="1.8">
                <path d="M3 3l10 10M13 3L3 13"/>
              </svg>
            </button>
          </div>

          {/* Nav */}
          <div className="gx-sb-scroll">
            <div>
              <div className="gx-sb-sec-label">Client Portal</div>
              {CLIENT_PORTAL_NAV.map(item => (
                <button
                  key={item.view}
                  className={`gx-nav-link-cp${activePage === item.view ? " active" : ""}`}
                  onClick={() => handleNavigate(item.view)}
                  data-label={item.label}
                >
                  <img src={item.icon} alt={item.label} className="gx-nav-icon-img" />
                  <span className="gx-nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="gx-nav-badge-cp">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="gx-sb-footer-cp">
            <button
              className={`gx-nav-link-cp${activePage === "settings" ? " active" : ""}`}
              onClick={() => handleNavigate("settings")}
              data-label="Settings"
            >
              <img src="/icon-settings.png" alt="Settings" className="gx-nav-icon-img" />
              <span className="gx-nav-label">Settings</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop / iPad — original collapsible sidebar
  return (
    <>
      {/* Spacer that pushes page content right */}
      <div className={`gx-sb-wrap ${cls}`} />

      <aside className={`gx-sidebar-cp ${collapsed ? "collapsed" : ""}`}>

        {/* Brand */}
        <div className="gx-sb-brand">
          <img src="/geniex-logo.png" alt="genieX" className="gx-sb-logo" style={{ height: 35 }} />
          {/* Burger Menu Toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label="Toggle sidebar"
            style={{ background:"none", border:"none", padding:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
          >
            <img src="/icon-menu.png" alt="menu" style={{ width:18, height:18, objectFit:"contain", opacity:0.6 }} />
          </button>
        </div>

        {/* Nav */}
        <div className="gx-sb-scroll">
          <div>
            <div className="gx-sb-sec-label">Client Portal</div>
            {CLIENT_PORTAL_NAV.map(item => (
              <button
                key={item.view}
                className={`gx-nav-link-cp${activePage === item.view ? " active" : ""}`}
                onClick={() => onNavigate(item.view)}
                data-label={item.label}
              >
                <img src={item.icon} alt={item.label} className="gx-nav-icon-img" />
                <span className="gx-nav-label">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="gx-nav-badge-cp">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer: Settings */}
        <div className="gx-sb-footer-cp">
          <button
            className={`gx-nav-link-cp${activePage === "settings" ? " active" : ""}`}
            onClick={() => onNavigate("settings")}
            data-label="Settings"
          >
            <img src="/icon-settings.png" alt="Settings" className="gx-nav-icon-img" />
            <span className="gx-nav-label">Settings</span>
          </button>
        </div>

      </aside>
    </>
  );
}
