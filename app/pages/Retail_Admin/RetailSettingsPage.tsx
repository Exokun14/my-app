/**
 * RetailSettingsPage.tsx
 * MERGED: UI/layout from CSS-variable version + live notificationsAPI from migrated version.
 * - Live data: notificationsAPI.getAll(), markRead, markAllRead
 * - UI: Sidebar/Header, section nav, all 6 setting panels, integrations, billing, toast
 */

'use client'

import React, { useState, useEffect, useCallback } from "react";
import {
  notificationsAPI,
  type AuthUser,
  type Notification,
} from "../../Services/api.service";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";

// ─── Props ────────────────────────────────────────────────────────────────────

type CPView = "overview" | "tickets" | "users" | "settings";

interface Props {
  user?:       AuthUser | null;
  onLogout?:   () => void;
  onNavigate?: (view: CPView) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "general" | "notifications" | "security" | "integrations" | "profile" | "billing";

function toUINotif(n: Notification) {
  return {
    id:    n.id ?? 0,
    type:  ({ warning: "warn", alert: "error", info: "info", success: "success" } as Record<string, string>)[n.type ?? "info"] ?? "info",
    title: n.title ?? "Notification",
    desc:  n.message,
    time:  n.created_at ? new Date(n.created_at).toLocaleDateString() : "",
    read:  n.read ?? false,
  };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid rgba(109,40,217,0.12)", borderRadius: 10,
  fontSize: 13, fontFamily: "inherit", color: "#1e1b4b",
  background: "#f4f3fb", outline: "none", fontWeight: 500,
};
const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block",
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative",
      background: value ? "#6d28d9" : "#d1d5db", transition: "background .2s", flexShrink: 0,
    }}
  >
    <div style={{
      position: "absolute", top: 3, left: value ? 23 : 3,
      width: 18, height: 18, borderRadius: "50%", background: "#fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left .2s",
    }} />
  </div>
);

// ─── Setting row ──────────────────────────────────────────────────────────────

const SettingRow: React.FC<{ label: string; desc?: string; children: React.ReactNode }> = ({ label, desc, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(109,40,217,0.07)" }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "#1e1b4b" }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", marginTop: 2 }}>{desc}</div>}
    </div>
    {children}
  </div>
);

// ─── Notification colors ──────────────────────────────────────────────────────

const NOTIF_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  warn:    { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  purple:  { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function RetailSettingsPage({ user, onLogout, onNavigate }: Props) {
  // ── Nav ─────────────────────────────────────────────────────
  const [section, setSection] = useState<Section>("general");

  // ── Live notifications ───────────────────────────────────────
  const [notifs,       setNotifs]       = useState<ReturnType<typeof toUINotif>[]>([]);
  const [notifPanel,   setNotifPanel]   = useState(false);
  const [notifLoading, setNotifLoading] = useState(true);

  const loadNotifs = useCallback(async () => {
    setNotifLoading(true);
    const res = await notificationsAPI.getAll();
    if (res.success && res.data) setNotifs(res.data.map(toUINotif));
    setNotifLoading(false);
  }, []);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  const markRead = async (id: number) => {
    await notificationsAPI.markRead(id);
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  };

  const unread = notifs.filter(n => !n.read).length;

  // ── Toggle state ─────────────────────────────────────────────
  const [darkMode,      setDarkMode]      = useState(false);
  const [compactView,   setCompactView]   = useState(true);
  const [showAcctMgr,   setShowAcctMgr]   = useState(true);
  const [defaultFilter, setDefaultFilter] = useState("All Companies");
  const [defaultTicket, setDefaultTicket] = useState("Open");
  const [emailNotif,    setEmailNotif]    = useState(true);
  const [smsNotif,      setSmsNotif]      = useState(false);
  const [ticketAlert,   setTicketAlert]   = useState(true);
  const [saExpiry,      setSaExpiry]      = useState(true);
  const [weeklyRpt,     setWeeklyRpt]     = useState(false);
  const [twoFA,         setTwoFA]         = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  // ── Integrations ─────────────────────────────────────────────
  const [slackConn,  setSlackConn]  = useState(false);
  const [googleConn, setGoogleConn] = useState(true);
  const [teamsConn,  setTeamsConn]  = useState(false);
  const [zapierConn, setZapierConn] = useState(false);

  // ── Profile form (seeded from user prop) ─────────────────────
  const [profileForm, setProfileForm] = useState({
    firstName: user?.name?.split(" ")[0] ?? "",
    lastName:  user?.name?.split(" ").slice(1).join(" ") ?? "",
    email:     user?.email    ?? "",
    phone:     user?.phone    ?? "",
    position:  user?.position ?? "",
  });
  useEffect(() => {
    setProfileForm({
      firstName: user?.name?.split(" ")[0] ?? "",
      lastName:  user?.name?.split(" ").slice(1).join(" ") ?? "",
      email:     user?.email    ?? "",
      phone:     user?.phone    ?? "",
      position:  user?.position ?? "",
    });
  }, [user]);

  // ── Toast ─────────────────────────────────────────────────────
  const [toastMsg,  setToastMsg]  = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toast = (m: string) => { setToastMsg(m); setToastShow(true); setTimeout(() => setToastShow(false), 2500); };

  const handleDarkMode = (v: boolean) => {
    setDarkMode(v);
    if (v) document.documentElement.classList.add("dark");
    else   document.documentElement.classList.remove("dark");
  };

  // ── Nav items ─────────────────────────────────────────────────
  const NAV_ITEMS: { key: Section; label: string; icon: string; group: string }[] = [
    { key: "general",       label: "General",       icon: "⚙️", group: "PREFERENCES" },
    { key: "notifications", label: "Notifications", icon: "🔔", group: "PREFERENCES" },
    { key: "security",      label: "Security",      icon: "🔒", group: "PREFERENCES" },
    { key: "integrations",  label: "Integrations",  icon: "🔗", group: "PREFERENCES" },
    { key: "profile",       label: "Profile",       icon: "👤", group: "ACCOUNT" },
    { key: "billing",       label: "Billing",       icon: "💳", group: "ACCOUNT" },
  ];

  const selStyle = (k: Section): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
    borderRadius: 10, cursor: "pointer", marginBottom: 3,
    background: section === k ? "#f0eeff" : "transparent",
    border: `1px solid ${section === k ? "rgba(109,40,217,0.18)" : "transparent"}`,
    fontSize: 13, fontWeight: section === k ? 600 : 400,
    color: section === k ? "#5b21b6" : "#4a3870",
    fontFamily: "inherit", width: "100%", textAlign: "left",
    transition: "all .15s",
  });

  // ─── Section renderers ────────────────────────────────────────

  function renderGeneral() {
    return (
      <>
        <div className="gx-card">
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>General Preferences</div>
          <SettingRow label="Dark Mode" desc="Switch to dark theme"><Toggle value={darkMode} onChange={handleDarkMode} /></SettingRow>
          <SettingRow label="Compact View" desc="Denser layout across all pages"><Toggle value={compactView} onChange={setCompactView} /></SettingRow>
          <SettingRow label="Show Account Manager on Cards"><Toggle value={showAcctMgr} onChange={setShowAcctMgr} /></SettingRow>
          <SettingRow label="Language"><span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>English (US)</span></SettingRow>
          <SettingRow label="Timezone"><span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Asia/Manila (GMT+8)</span></SettingRow>
          <SettingRow label="Company"><span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{user?.company_name ?? "—"}</span></SettingRow>
        </div>
        <div className="gx-card">
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Display Settings</div>
          <SettingRow label="Default Filter on Dashboard">
            <select style={{ ...inp, width: 180, appearance: "none" }} value={defaultFilter} onChange={e => setDefaultFilter(e.target.value)}>
              <option>All Companies</option><option>My Companies</option><option>Active Only</option>
            </select>
          </SettingRow>
          <SettingRow label="Default Ticket View">
            <select style={{ ...inp, width: 180, appearance: "none" }} value={defaultTicket} onChange={e => setDefaultTicket(e.target.value)}>
              <option>Open</option><option>All</option><option>Pending</option><option>Closed</option>
            </select>
          </SettingRow>
        </div>
        <button className="btn btn-p btn-sm" onClick={() => toast("Settings saved.")}>Save Changes</button>
      </>
    );
  }

  function renderNotifications() {
    return (
      <div className="gx-card">
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>Notification Preferences</div>
        <SettingRow label="Email Notifications" desc="Receive updates via email"><Toggle value={emailNotif} onChange={setEmailNotif} /></SettingRow>
        <SettingRow label="SMS Notifications" desc="Receive alerts via SMS"><Toggle value={smsNotif} onChange={setSmsNotif} /></SettingRow>
        <SettingRow label="Ticket Alerts" desc="Notify on new or updated tickets"><Toggle value={ticketAlert} onChange={setTicketAlert} /></SettingRow>
        <SettingRow label="SA Expiry Reminders" desc="Alert before software assurance expires"><Toggle value={saExpiry} onChange={setSaExpiry} /></SettingRow>
        <SettingRow label="Weekly Summary Report" desc="Receive weekly digest every Monday"><Toggle value={weeklyRpt} onChange={setWeeklyRpt} /></SettingRow>

        {/* Live notifications */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(109,40,217,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", marginBottom: 12 }}>Recent Notifications</div>
          {notifLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9ca3af", padding: "12px 0" }}>
              <div style={{ width: 16, height: 16, border: "2px solid #d1d5db", borderTopColor: "#6d28d9", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Loading…
            </div>
          ) : notifs.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No notifications.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notifs.slice(0, 5).map(n => {
                const c = NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info;
                return (
                  <div key={n.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, fontSize: 12, opacity: n.read ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, color: c.text, margin: 0 }}>{n.title}</p>
                        <p style={{ fontSize: 11, opacity: 0.8, margin: "3px 0 0" }}>{n.desc}</p>
                      </div>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} style={{ fontSize: 10, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: c.text, whiteSpace: "nowrap" }}>Mark read</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {unread > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", marginTop: 4 }}>Mark all as read</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSecurity() {
    return (
      <div className="gx-card">
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>Security Settings</div>
        <SettingRow label="Two-Factor Authentication" desc="Add an extra layer of security"><Toggle value={twoFA} onChange={setTwoFA} /></SettingRow>
        <SettingRow label="Session Timeout" desc="Auto logout after inactivity">
          <select style={{ ...inp, width: 180, appearance: "none" }} value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="0">Never</option>
          </select>
        </SettingRow>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(109,40,217,0.07)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", marginBottom: 12 }}>Change Password</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div><label style={lbl}>Current Password</label><input type="password" style={inp} placeholder="Enter current password" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>New Password</label><input type="password" style={inp} placeholder="New password" /></div>
              <div><label style={lbl}>Confirm Password</label><input type="password" style={inp} placeholder="Confirm password" /></div>
            </div>
          </div>
          <button onClick={() => toast("Password change is not implemented yet.")} className="btn btn-p btn-sm" style={{ marginTop: 12 }}>Update Password</button>
        </div>
      </div>
    );
  }

  function renderIntegrations() {
    const integrations = [
      { key: "slack",   name: "Slack",            desc: "Send ticket alerts to Slack channels",     icon: "💬", conn: slackConn,  setConn: setSlackConn },
      { key: "google",  name: "Google Workspace", desc: "Sync users with Google directory",          icon: "🔵", conn: googleConn, setConn: setGoogleConn },
      { key: "teams",   name: "Microsoft Teams",  desc: "Post updates to Teams channels",             icon: "🟣", conn: teamsConn,  setConn: setTeamsConn },
      { key: "zapier",  name: "Zapier",           desc: "Automate workflows with 5000+ apps",         icon: "⚡", conn: zapierConn, setConn: setZapierConn },
    ];
    return (
      <div className="gx-card">
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Integrations</div>
        {integrations.map(({ key, name, desc, icon, conn, setConn }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(109,40,217,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f4f3fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{name}</div>
                <div style={{ fontSize: 11, color: "rgba(0,0,0,0.38)" }}>{desc}</div>
              </div>
            </div>
            <button
              onClick={() => { setConn(!conn); toast(`${name} ${!conn ? "connected" : "disconnected"}.`); }}
              style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${conn ? "rgba(220,38,38,0.2)" : "rgba(109,40,217,0.2)"}`, background: conn ? "#fff5f5" : "#f5f3ff", color: conn ? "#dc2626" : "#6d28d9" }}
            >
              {conn ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderProfile() {
    const initials = [profileForm.firstName[0], profileForm.lastName[0]].filter(Boolean).join("").toUpperCase() || "??";
    return (
      <div className="gx-card">
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Profile Information</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "#f4f3fb", borderRadius: 12, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6d28d9,#0f766e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>{profileForm.firstName} {profileForm.lastName}</div>
            <div style={{ fontSize: 10.5, color: "rgba(0,0,0,0.4)", marginBottom: 6 }}>{user?.company_name ?? "—"}</div>
            <button style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#6d28d9", border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer" }}>Change Photo</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>First Name</label><input style={inp} value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} /></div>
          <div><label style={lbl}>Last Name</label><input style={inp} value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={lbl}>Email Address</label><input style={inp} type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div><label style={lbl}>Phone Number</label><input style={inp} value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><label style={lbl}>Position / Title</label><input style={inp} value={profileForm.position} onChange={e => setProfileForm(f => ({ ...f, position: e.target.value }))} /></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => toast("Profile saved (no API endpoint yet).")} className="btn btn-p btn-sm">Save Profile</button>
          {onLogout && (
            <button onClick={onLogout} style={{ padding: "7px 16px", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626", background: "#fff5f5", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Log out</button>
          )}
        </div>
      </div>
    );
  }

  function renderBilling() {
    return (
      <>
        <div className="gx-card">
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Billing &amp; Subscription</div>
          <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,rgba(109,40,217,0.08),rgba(15,118,110,0.08))", borderRadius: 12, border: "1px solid rgba(109,40,217,0.12)", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#6d28d9", marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b" }}>Enterprise</div>
            <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>Unlimited users · Priority support · Custom integrations</div>
          </div>
          {[
            { label: "Plan Type",    value: "Enterprise Annual" },
            { label: "Sites",        value: "All branches" },
            { label: "Support",      value: "Priority 24/7" },
            { label: "Next Renewal", value: "Jan 1, 2027" },
            { label: "Invoice Email",value: user?.email ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(109,40,217,0.07)" }}>
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 12, color: "#3b1f7a", fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => toast("Invoice download not yet implemented.")}>Download Invoice</button>
            <button className="btn btn-p btn-sm" onClick={() => toast("Contact your account manager to upgrade.")}>Upgrade Plan</button>
          </div>
        </div>
      </>
    );
  }

  const SECTION_CONTENT: Record<Section, () => React.ReactNode> = {
    general:       renderGeneral,
    notifications: renderNotifications,
    security:      renderSecurity,
    integrations:  renderIntegrations,
    profile:       renderProfile,
    billing:       renderBilling,
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage="settings" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        <Header
          user={{ initials: user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "??", name: user?.name ?? "User", role: user?.position ?? "Manager", company: "Retail" }}
          clientLabel="Nike"
          notificationCount={unread}
          onNotificationClick={() => setNotifPanel(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div className="gx-ph">
              <div className="gx-ph-title">System <em>Settings</em></div>
              <div className="gx-ph-rule" />
              <button className="btn btn-p btn-sm" onClick={() => toast("Settings saved.")}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M2.5 7.5l3 3 6-6"/></svg>
                Save Changes
              </button>
            </div>

            <div className="gx-scroll">
              <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                {/* Left nav */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  {["PREFERENCES", "ACCOUNT"].map(grp => (
                    <div key={grp} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#c0c0d0", marginBottom: 6, paddingLeft: 4 }}>{grp}</div>
                      {NAV_ITEMS.filter(n => n.group === grp).map(item => (
                        <button key={item.key} style={selStyle(item.key)} onClick={() => setSection(item.key)}>
                          <span style={{ fontSize: 15 }}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  {SECTION_CONTENT[section]()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification panel */}
      {notifPanel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => setNotifPanel(false)} />
          <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: 360, background: "#fff", height: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f4" }}>
              <h3 style={{ fontWeight: 600, color: "#18103a", margin: 0, fontSize: 15 }}>
                Notifications {unread > 0 && <span style={{ fontSize: 11, background: "#fef2f2", color: "#dc2626", borderRadius: 99, padding: "2px 8px", marginLeft: 6 }}>{unread}</span>}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Mark all read</button>}
                <button onClick={() => setNotifPanel(false)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {notifs.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 32 }}>No notifications.</p>}
              {notifs.map(n => {
                const c = NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info;
                return (
                  <div key={n.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, fontSize: 12, opacity: n.read ? 0.6 : 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, color: c.text, margin: 0 }}>{n.title}</p>
                        <p style={{ fontSize: 11, opacity: 0.8, margin: "3px 0 0" }}>{n.desc}</p>
                        <p style={{ fontSize: 10, opacity: 0.6, margin: "4px 0 0" }}>{n.time}</p>
                      </div>
                      {!n.read && <button onClick={() => markRead(n.id)} style={{ fontSize: 10, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: c.text, whiteSpace: "nowrap" }}>Mark read</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`gx-toast ${toastShow ? "show" : ""}`}><div className="gx-toast-dot" /><span>{toastMsg}</span></div>
    </div>
  );
}
