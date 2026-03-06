// ============================================================
//  SettingsPage.tsx
//  FIX: Added onLogout prop → passed to <Header onLogout={onLogout} />
// ============================================================

'use client'

import React, { useState } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";

type CPView = "overview" | "tickets" | "users" | "settings";
interface SettingsPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void; // FIX
}

type SettingsSection = "general" | "notifications" | "security" | "integrations" | "profile" | "billing";

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{
    width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative",
    background: value ? "#6d28d9" : "#d1d5db", transition: "background .2s", flexShrink: 0,
  }}>
    <div style={{
      position: "absolute", top: 3, left: value ? 23 : 3,
      width: 18, height: 18, borderRadius: "50%", background: "#fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left .2s",
    }} />
  </div>
);

const SettingRow: React.FC<{ label: string; desc?: string; children: React.ReactNode }> = ({ label, desc, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(109,40,217,0.07)" }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "#1e1b4b" }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", marginTop: 2 }}>{desc}</div>}
    </div>
    {children}
  </div>
);

const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid rgba(109,40,217,0.12)", borderRadius: 10, fontSize: 13, fontFamily: "inherit", color: "#1e1b4b", background: "#f4f3fb", outline: "none", fontWeight: 500 };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block" };

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, onLogout }) => {
  const [section, setSection] = useState<SettingsSection>("general");
  const [saved, setSaved]     = useState(false);
  const [unread]              = useState(3);
  const [notifOpen, setNotifOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") return document.documentElement.classList.contains("dark");
    return false;
  });
  const handleDarkMode = (v: boolean) => {
    setDarkMode(v);
    if (v) document.documentElement.classList.add("dark");
    else   document.documentElement.classList.remove("dark");
  };
  const [compactView,   setCompactView]   = useState(true);
  const [showAcctMgr,   setShowAcctMgr]   = useState(true);
  const [defaultFilter, setDefaultFilter] = useState("All Companies");
  const [defaultTicket, setDefaultTicket] = useState("Open");

  const [emailNotif,  setEmailNotif]  = useState(true);
  const [smsNotif,    setSmsNotif]    = useState(false);
  const [ticketAlert, setTicketAlert] = useState(true);
  const [saExpiry,    setSaExpiry]    = useState(true);
  const [weeklyRpt,   setWeeklyRpt]   = useState(false);

  const [profile, setProfile] = useState({ firstName: "John", lastName: "Doe", email: "john@popeyes.com", phone: "+63 912 345 6789", position: "IT Lead" });
  const setP = (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) => setProfile(p => ({ ...p, [k]: e.target.value }));

  const [twoFA, setTwoFA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const NAV_ITEMS: { key: SettingsSection; label: string; icon: string; section: string }[] = [
    { key: "general",       label: "General",       icon: "⚙️", section: "PREFERENCES" },
    { key: "notifications", label: "Notifications", icon: "🔔", section: "PREFERENCES" },
    { key: "security",      label: "Security",      icon: "🔒", section: "PREFERENCES" },
    { key: "integrations",  label: "Integrations",  icon: "🔗", section: "PREFERENCES" },
    { key: "profile",       label: "Profile",       icon: "👤", section: "ACCOUNT"     },
    { key: "billing",       label: "Billing",       icon: "💳", section: "ACCOUNT"     },
  ];

  const selStyle = (k: SettingsSection): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
    borderRadius: 10, cursor: "pointer", marginBottom: 3,
    background: section === k ? "#f0eeff" : "transparent",
    border: `1px solid ${section === k ? "rgba(109,40,217,0.18)" : "transparent"}`,
    fontSize: 13, fontWeight: section === k ? 600 : 400,
    color: section === k ? "#5b21b6" : "#4a3870",
    fontFamily: "inherit", width: "100%", textAlign: "left",
    transition: "all .15s",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage="settings" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        {/* FIX: onLogout wired in */}
        <Header
          user={{ initials: "JD", name: "John Doe", role: "System Admin", company: "Popeyes" }}
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div className="gx-ph">
              <div className="gx-ph-title">System <em>Settings</em></div>
              <div className="gx-ph-rule" />
              <button className="btn btn-p btn-sm" onClick={handleSave}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M2.5 7.5l3 3 6-6"/></svg>
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>

            <div className="gx-scroll">
              <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                {/* Left Nav */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  {["PREFERENCES", "ACCOUNT"].map(sec => (
                    <div key={sec} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#c0c0d0", marginBottom: 6, paddingLeft: 4 }}>{sec}</div>
                      {NAV_ITEMS.filter(n => n.section === sec).map(item => (
                        <button key={item.key} style={selStyle(item.key)} onClick={() => setSection(item.key)}>
                          <span style={{ fontSize: 15 }}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Right Content */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  {section === "general" && <>
                    <div className="gx-card">
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>General Preferences</div>
                      <SettingRow label="Dark Mode" desc="Switch to dark theme"><Toggle value={darkMode} onChange={handleDarkMode} /></SettingRow>
                      <SettingRow label="Compact View" desc="Denser layout across all pages"><Toggle value={compactView} onChange={setCompactView} /></SettingRow>
                      <SettingRow label="Show Account Manager on Cards"><Toggle value={showAcctMgr} onChange={setShowAcctMgr} /></SettingRow>
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
                  </>}

                  {section === "notifications" && <div className="gx-card">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>Notification Preferences</div>
                    <SettingRow label="Email Notifications" desc="Receive updates via email"><Toggle value={emailNotif} onChange={setEmailNotif} /></SettingRow>
                    <SettingRow label="SMS Notifications" desc="Receive alerts via SMS"><Toggle value={smsNotif} onChange={setSmsNotif} /></SettingRow>
                    <SettingRow label="Ticket Alerts" desc="Notify on new or updated tickets"><Toggle value={ticketAlert} onChange={setTicketAlert} /></SettingRow>
                    <SettingRow label="SA Expiry Reminders" desc="Alert before software assurance expires"><Toggle value={saExpiry} onChange={setSaExpiry} /></SettingRow>
                    <SettingRow label="Weekly Summary Report" desc="Receive weekly digest every Monday"><Toggle value={weeklyRpt} onChange={setWeeklyRpt} /></SettingRow>
                  </div>}

                  {section === "security" && <div className="gx-card">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>Security Settings</div>
                    <SettingRow label="Two-Factor Authentication" desc="Add an extra layer of security"><Toggle value={twoFA} onChange={setTwoFA} /></SettingRow>
                    <SettingRow label="Session Timeout" desc="Auto logout after inactivity">
                      <select style={{ ...inp, width: 180, appearance: "none" }} value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)}>
                        <option value="15">15 minutes</option><option value="30">30 minutes</option>
                        <option value="60">1 hour</option><option value="0">Never</option>
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
                    </div>
                  </div>}

                  {section === "integrations" && <div className="gx-card">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Integrations</div>
                    {[
                      { name: "Slack",             desc: "Send ticket alerts to Slack channels",    connected: true,  color: "#4a154b", emoji: "💬" },
                      { name: "Google Workspace",  desc: "Sync users with Google directory",        connected: false, color: "#4285f4", emoji: "🔵" },
                      { name: "Microsoft Teams",   desc: "Post updates to Teams channels",          connected: false, color: "#6264a7", emoji: "🟣" },
                      { name: "Zapier",            desc: "Automate workflows with 5000+ apps",      connected: false, color: "#ff4a00", emoji: "⚡" },
                    ].map(item => (
                      <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(109,40,217,0.07)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f4f3fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{item.emoji}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(0,0,0,0.38)" }}>{item.desc}</div>
                          </div>
                        </div>
                        <button style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${item.connected ? "rgba(220,38,38,0.2)" : "rgba(109,40,217,0.2)"}`, background: item.connected ? "#fff5f5" : "#f5f3ff", color: item.connected ? "#dc2626" : "#6d28d9", fontFamily: "inherit" }}>
                          {item.connected ? "Disconnect" : "Connect"}
                        </button>
                      </div>
                    ))}
                  </div>}

                  {section === "profile" && <div className="gx-card">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Profile Information</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "#f4f3fb", borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6d28d9,#0f766e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>JD</div>
                      <div><div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Profile Photo</div><div style={{ fontSize: 10.5, color: "rgba(0,0,0,0.4)", marginBottom: 6 }}>Upload a new photo or keep existing</div><button style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#6d28d9", border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer" }}>Change Photo</button></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div><label style={lbl}>First Name</label><input style={inp} value={profile.firstName} onChange={setP("firstName")} /></div>
                      <div><label style={lbl}>Last Name</label><input style={inp} value={profile.lastName} onChange={setP("lastName")} /></div>
                    </div>
                    <div style={{ marginBottom: 10 }}><label style={lbl}>Email Address</label><input style={inp} type="email" value={profile.email} onChange={setP("email")} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div><label style={lbl}>Phone Number</label><input style={inp} value={profile.phone} onChange={setP("phone")} /></div>
                      <div><label style={lbl}>Position / Title</label><input style={inp} value={profile.position} onChange={setP("position")} /></div>
                    </div>
                  </div>}

                  {section === "billing" && <div className="gx-card">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Billing &amp; Subscription</div>
                    <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,rgba(109,40,217,0.08),rgba(15,118,110,0.08))", borderRadius: 12, border: "1px solid rgba(109,40,217,0.12)", marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#6d28d9", marginBottom: 4 }}>Current Plan</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b" }}>Enterprise</div>
                      <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>Renews Jun 1, 2026 · 12 seats included</div>
                    </div>
                    {[
                      { label: "Plan Type",    value: "Enterprise Annual" },
                      { label: "Seats Used",   value: "9 / 12" },
                      { label: "Next Invoice", value: "Jun 1, 2026" },
                      { label: "Amount",       value: "₱48,000 / year" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(109,40,217,0.07)" }}>
                        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 12, color: "#3b1f7a", fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      <button className="btn btn-s btn-sm">Download Invoice</button>
                      <button className="btn btn-p btn-sm">Upgrade Plan</button>
                    </div>
                  </div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;