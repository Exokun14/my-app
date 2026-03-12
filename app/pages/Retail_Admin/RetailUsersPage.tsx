/**
 * RetailUsersPage.tsx
 * MERGED: UI/layout from CSS-variable version + live DB logic from migrated version.
 * - Live data: portalUsersAPI.getAll(), .update(), notificationsAPI
 * - UI: Sidebar/Header, role overview sidebar, full table with pagination,
 *       EditUserModal, AddUserModal, NotifPanel, Toast
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  portalUsersAPI,
  notificationsAPI,
  formatRole,
  type AuthUser,
  type PortalUser,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const AVATAR_COLORS = ["#6d28d9", "#0f766e", "#0369a1", "#be123c", "#b45309", "#065f46"];
const avatarColor  = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Notification helpers ─────────────────────────────────────────────────────

type UINotif = { id: number; type: string; title: string; desc?: string; time: string; read: boolean };

function toUINotif(n: Notification): UINotif {
  return {
    id:    n.id ?? 0,
    type:  ({ warning: "warn", alert: "error", info: "info", success: "success" } as Record<string, string>)[n.type ?? "info"] ?? "info",
    title: n.title ?? "Notification",
    desc:  n.message,
    time:  n.created_at ? new Date(n.created_at).toLocaleDateString() : "",
    read:  n.read ?? false,
  };
}

const NOTIF_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  warn:    { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  purple:  { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid rgba(109,40,217,0.12)", borderRadius: 10,
  fontSize: 12.5, fontFamily: "inherit", color: "#1e1b4b",
  background: "#f4f3fb", outline: "none", fontWeight: 500,
};
const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block",
};
const req = <span style={{ color: "#dc2626" }}> *</span>;

// ─── Edit User Modal ──────────────────────────────────────────────────────────

const EditUserModal: React.FC<{
  user: PortalUser;
  onSave: (patch: Partial<PortalUser>) => void;
  onClose: () => void;
  saving: boolean;
}> = ({ user, onSave, onClose, saving }) => {
  const [form, setForm] = useState<Partial<PortalUser>>({
    name:     user.name,
    email:    user.email,
    role:     user.role,
    phone:    user.phone ?? "",
    position: user.position ?? "",
    status:   user.status ?? "active",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="gx-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.2)", width: 460, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9 60%,#0f766e)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Edit: {user.name}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Update user information and access</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 22px", overflowY: "auto", maxHeight: "68vh" }}>
          {/* Avatar preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "#f4f3fb", borderRadius: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: avatarColor(user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{getInitials(user.name)}</div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1e1b4b" }}>Profile Photo</div>
              <div style={{ fontSize: 10, color: "rgba(0,0,0,0.4)", marginBottom: 6 }}>Upload a new photo or keep existing</div>
              <button style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: "#6d28d9", border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer" }}>Change Photo</button>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Full Name{req}</label>
            <input style={inp} value={(form.name as string) ?? ""} onChange={set("name")} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Email Address{req}</label>
            <input style={inp} type="email" value={(form.email as string) ?? ""} onChange={set("email")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={lbl}>Phone</label><input style={inp} value={(form.phone as string) ?? ""} onChange={set("phone")} /></div>
            <div><label style={lbl}>Position</label><input style={inp} value={(form.position as string) ?? ""} onChange={set("position")} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Role{req}</label>
            <select style={{ ...inp, appearance: "none" }} value={form.role} onChange={set("role")}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status picker */}
          <div>
            <label style={lbl}>Status</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["active", "inactive"] as const).map(s => (
                <div key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, cursor: "pointer", border: form.status === s ? `2px solid ${s === "active" ? "#16a34a" : "#dc2626"}` : "1.5px solid rgba(0,0,0,0.1)", background: form.status === s ? (s === "active" ? "#f0fdf4" : "#fff1f2") : "#f9f9f9", transition: "all .15s" }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: form.status === s ? `2px solid ${s === "active" ? "#16a34a" : "#dc2626"}` : "2px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {form.status === s && <div style={{ width: 6, height: 6, borderRadius: "50%", background: s === "active" ? "#16a34a" : "#dc2626" }} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: form.status === s ? (s === "active" ? "#16a34a" : "#dc2626") : "rgba(0,0,0,0.4)" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px 18px", borderTop: "1px solid rgba(109,40,217,0.1)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" disabled={saving} onClick={() => onSave(form)}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M2.5 7.5l3 3 6-6"/></svg>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add User Modal ───────────────────────────────────────────────────────────

const AddUserModal: React.FC<{ onAdd: (u: PortalUser) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState<Partial<PortalUser>>({ name: "", email: "", role: "user", phone: "", position: "", status: "active" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = () => {
    if (!form.name || !form.email) return;
    onAdd({ id: Date.now(), name: form.name!, email: form.email!, role: (form.role as "admin" | "user") ?? "user", phone: form.phone, position: form.position, status: form.status ?? "active" });
    onClose();
  };

  return (
    <div className="gx-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.2)", width: 460, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9 60%,#0f766e)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Add New User</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Register a new user account (local preview)</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Full Name{req}</label>
            <input style={inp} value={(form.name as string) ?? ""} onChange={set("name")} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Email Address{req}</label>
            <input style={inp} type="email" value={(form.email as string) ?? ""} onChange={set("email")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={lbl}>Phone</label><input style={inp} value={(form.phone as string) ?? ""} onChange={set("phone")} /></div>
            <div><label style={lbl}>Position</label><input style={inp} value={(form.position as string) ?? ""} onChange={set("position")} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Role{req}</label>
            <select style={{ ...inp, appearance: "none" }} value={form.role} onChange={set("role")}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ padding: "12px 22px 18px", borderTop: "1px solid rgba(109,40,217,0.1)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleAdd}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M7 3v8M3 7h8"/></svg>
            Add User
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function RetailUsersPage({ user, onLogout, onNavigate }: Props) {
  const companyId = user?.company_id ?? null;

  // ── Server state ──────────────────────────────────────────────
  const [users,   setUsers]   = useState<PortalUser[]>([]);
  const [notifs,  setNotifs]  = useState<UINotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // ── UI state ──────────────────────────────────────────────────
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page,       setPage]       = useState(1);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [editUser,   setEditUser]   = useState<PortalUser | null>(null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [toastMsg,   setToastMsg]   = useState("");
  const [toastShow,  setToastShow]  = useState(false);

  const toast = (m: string) => { setToastMsg(m); setToastShow(true); setTimeout(() => setToastShow(false), 2500); };

  // ── Fetch ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uR, nR] = await Promise.all([
        companyId ? portalUsersAPI.getAll({ company_id: companyId }) : portalUsersAPI.getAll(),
        notificationsAPI.getAll(),
      ]);
      if (uR.success && uR.data) setUsers(uR.data);
      if (nR.success && nR.data) setNotifs(nR.data.map(toUINotif));
    } catch (err) {
      console.error("[RetailUsersPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ───────────────────────────────────────────────────
  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount  = users.filter(u => u.role === "user").length;
  const unread     = notifs.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    let list = roleFilter === "all" ? users : users.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [users, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ──────────────────────────────────────────────────
  const saveEdit = async (patch: Partial<PortalUser>) => {
    if (!editUser) return;
    setSaving(true);
    const res = await portalUsersAPI.update(editUser.id, patch);
    setSaving(false);
    if (res.success) {
      setUsers(us => us.map(u => u.id === editUser.id ? { ...u, ...patch } : u));
      toast("User updated successfully.");
      setEditUser(null);
    } else {
      toast("Update failed: " + (res.error ?? "Unknown error"));
    }
  };

  const addUser = (u: PortalUser) => {
    setUsers(us => [u, ...us]);
    toast("User added (local preview only).");
  };

  const markRead = async (id: number) => {
    await notificationsAPI.markRead(id);
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  };

  // ── Badge styles ──────────────────────────────────────────────
  const roleBadge = (role: string): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
    background: role === "admin" ? "#ede9fe" : "#f3f4f6",
    color:      role === "admin" ? "#6d28d9" : "#374151",
  });
  const statusStyle = (s?: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
    color:      (s ?? "active").toLowerCase() === "active" ? "#16a34a" : "#dc2626",
    background: (s ?? "active").toLowerCase() === "active" ? "#f0fdf4" : "#fff1f2",
    padding: "3px 10px", borderRadius: 20,
    border: `1px solid ${(s ?? "active").toLowerCase() === "active" ? "#bbf7d0" : "#fecaca"}`,
  });

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar activePage="users" onNavigate={onNavigate as (view: string) => void} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, border: "4px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage="users" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        <Header
          user={{ initials: user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "??", name: user?.name ?? "User", role: user?.position ?? "Manager", company: "Retail" }}
          clientLabel="Nike"
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />

        <div className="gx-main">
          <div className="gx-view">
            <div className="gx-ph">
              <div className="gx-ph-title">Nike Retail <em>Users</em></div>
              <div className="gx-ph-rule" />
              <button className="btn btn-p btn-sm" onClick={() => setAddOpen(true)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 12, height: 12 }}><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
                Add New User
              </button>
            </div>

            <div className="gx-scroll">
              <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>

                {/* Sidebar: role overview */}
                <div style={{ width: 195, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase", color: "#c0c0d0", marginBottom: 6 }}>Role Overview</div>
                  {([
                    { role: "admin", label: "Admin", count: adminCount, desc: "Full portal access",     color: "#6d28d9", bg: "#ede9fe" },
                    { role: "user",  label: "User",  count: userCount,  desc: "Standard access",        color: "#16a34a", bg: "#f0fdf4" },
                  ]).map(({ role, label, count, desc, color, bg }) => (
                    <div
                      key={role}
                      onClick={() => { setRoleFilter(r => r === role ? "all" : role); setPage(1); }}
                      style={{ background: "#fff", border: `1px solid ${roleFilter === role ? color : "#ebebeb"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all .15s", boxShadow: roleFilter === role ? `0 0 0 3px ${color}22` : "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{label}</div>
                          <div style={{ fontSize: 9.5, color: "#aaa", marginTop: 1 }}>{desc}</div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color }}>{count}</span>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 4, padding: "12px 14px", background: "#fff", borderRadius: 10, border: "1px solid #ebebeb" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "#b0b0c0", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Total</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#18103a" }}>{users.length}</div>
                    <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>registered users</div>
                  </div>
                </div>

                {/* Main: user table */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  {/* Search + filter bar */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
                      <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search users..."
                        style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e8e8f0", borderRadius: 9, fontSize: 12, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", outline: "none" }}
                      />
                    </div>
                    {roleFilter !== "all" && (
                      <button className="btn btn-s btn-sm" onClick={() => { setRoleFilter("all"); setPage(1); }}>Clear filter</button>
                    )}
                  </div>

                  {/* Table */}
                  <div className="gx-card" style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ overflowX: "auto", flex: 1 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1.5px solid rgba(109,40,217,0.08)" }}>
                            {["Full Name", "Email", "Role", "Position", "Status", "Actions"].map(h => (
                              <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#b0b0c0", whiteSpace: "nowrap", background: "#fafafa" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No users found.</td></tr>
                          ) : paginated.map(u => (
                            <tr
                              key={u.id}
                              style={{ borderBottom: "1px solid #f0f0f5", transition: "background .12s" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <td style={{ padding: "10px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: 10, background: avatarColor(u.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{getInitials(u.name)}</div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap" }}>{u.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: "10px 16px", fontSize: 11.5, color: "#9090a0", whiteSpace: "nowrap" }}>{u.email}</td>
                              <td style={{ padding: "10px 16px" }}><span style={roleBadge(u.role)}>{formatRole(u.role)}</span></td>
                              <td style={{ padding: "10px 16px", fontSize: 12, color: "#3a3a5c", whiteSpace: "nowrap" }}>{u.position ?? "—"}</td>
                              <td style={{ padding: "10px 16px" }}>
                                <span style={statusStyle(u.status)}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: (u.status ?? "active").toLowerCase() === "active" ? "#16a34a" : "#dc2626" }} />
                                  {u.status ?? "Active"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 16px" }}>
                                <button
                                  onClick={() => setEditUser(u)}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#6d28d9", background: "#f5f3ff", border: "1px solid rgba(109,40,217,0.2)", borderRadius: 8, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(109,40,217,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)" }}>
                          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(109,40,217,0.15)", background: "#fff", color: "#6d28d9", cursor: page === 1 ? "default" : "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(109,40,217,0.15)", background: p === page ? "#6d28d9" : "#fff", color: p === page ? "#fff" : "#6d28d9", cursor: "pointer", fontSize: 11, fontWeight: p === page ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center" }}>{p}</button>
                          ))}
                          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(109,40,217,0.15)", background: "#fff", color: "#6d28d9", cursor: page === totalPages ? "default" : "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editUser && <EditUserModal user={editUser} onSave={saveEdit} onClose={() => setEditUser(null)} saving={saving} />}
      {addOpen  && <AddUserModal  onAdd={addUser} onClose={() => setAddOpen(false)} />}

      {/* Notification panel */}
      {notifOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => setNotifOpen(false)} />
          <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: 360, background: "#fff", height: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f4" }}>
              <h3 style={{ fontWeight: 600, color: "#18103a", margin: 0, fontSize: 15 }}>
                Notifications {unread > 0 && <span style={{ fontSize: 11, background: "#fef2f2", color: "#dc2626", borderRadius: 99, padding: "2px 8px", marginLeft: 6 }}>{unread}</span>}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Mark all read</button>}
                <button onClick={() => setNotifOpen(false)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}>
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
