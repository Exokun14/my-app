"use client";

import { useState } from "react";

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
  { label: "Overview", view: "overview", icon: "/icon-overview.png"          },
  { label: "Tickets",  view: "tickets",  icon: "/icon-tickets.png",  badge: 8 },
  { label: "Users",    view: "users",    icon: "/icon-users.png"             },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const cls = collapsed ? "collapsed" : "expanded";

  return (
    <>
      {/* Spacer that pushes page content right */}
      <div className={`gx-sb-wrap ${cls}`} />

      <aside className={`gx-sidebar-cp ${collapsed ? "collapsed" : ""}`}>

        {/* Brand */}
        <div className="gx-sb-brand">
          <img src="/geniex-logo.png" alt="genieX" className="gx-sb-logo" style={{ height: 35 }} />
          {/* Burger Menu Toggle — no background, no shadow */}
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