'use client'
/**
 * UsersPage.tsx  —  F&B / Popeyes
 *
 * UI:     From v2 (role overview cards, full-column table, status pill, page-number pagination)
 * Logic:  From v1 (API fetch, edit/save, notifications API, loading skeleton, toast)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from "../Header_Client/header_client";
import "../../globals.css";
import {
  portalUsersAPI, notificationsAPI, formatRole,
  type AuthUser, type PortalUser, type Notification,
} from "../../Services/api.service";

type CPView = "overview" | "tickets" | "users" | "settings" | "learning";

interface UINotif {
  id: number; type: "warn" | "error" | "info" | "success" | "purple";
  title: string; desc: string; time: string; read: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const initials = (name: string) => {
  const p = (name ?? "").trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = ["#6d28d9", "#0f766e", "#0369a1", "#be123c", "#b45309", "#065f46"];
const avatarColor = (id: number) => AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length];

const toUINotif = (n: Notification): UINotif => ({
  id: n.id ?? 0,
  type: ({ warning: "warn", alert: "error", info: "info", success: "success" } as Record<string, UINotif["type"]>)[n.type ?? "info"] ?? "info",
  title: n.title ?? "Notification", desc: n.message,
  time: n.created_at ? new Date(n.created_at).toLocaleDateString() : "", read: n.read ?? false,
});

const Sk = ({ w = "100%", h = 14, r = 6 }: { w?: string | number; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f0eeff 25%,#e8e4fc 50%,#f0eeff 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
);

function useOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

const PAGE_SIZE = 8;

// ── Notification Panel ────────────────────────────────────────────────────────
const NICONS: Record<string, React.ReactNode> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M6 6l4 4M10 6l-4 4"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

const NotifPanel: React.FC<{ notifs: UINotif[]; onRead: (id: number) => void; onMarkAll: () => void; onClose: () => void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useOutside<HTMLDivElement>(onClose);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div className="gx-notif-panel" ref={ref}>
      <div className="gx-np-hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="gx-np-title">Notifications</span>
          <span className={`gx-np-unread${unread === 0 ? " all-read" : ""}`}>{unread > 0 ? `${unread} unread` : "All read"}</span>
        </div>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all as read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.map(n => (
          <div key={n.id} className={`gx-ni${n.read ? "" : " unread"}`} onClick={() => onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NICONS[n.type]}</div>
            <div className="gx-ni-body">
              <div className="gx-ni-title">{n.title}</div>
              <div className="gx-ni-desc">{n.desc}</div>
              <div className="gx-ni-time">{n.time}</div>
            </div>
            {!n.read && <div className="gx-ni-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Edit User Modal ───────────────────────────────────────────────────────────
const EditUserModal: React.FC<{ user: PortalUser; saving: boolean; onSave: (u: PortalUser) => void; onClose: () => void }> = ({ user, saving, onSave, onClose }) => {
  const [form, setForm] = useState<PortalUser>({ ...user });
  const set = (k: keyof PortalUser) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--bdr)", borderRadius: 10, fontSize: 12.5, color: "#3b1f7a", background: "var(--surf2)", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block" };
  return (
    <div className="gx-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.18)", width: 440, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Edit User</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ marginBottom: 10 }}><label style={lbl}>Full Name</label><input style={inp} value={form.name ?? ""} onChange={set("name")} /></div>
          <div style={{ marginBottom: 10 }}><label style={lbl}>Email</label><input style={inp} type="email" value={form.email ?? ""} onChange={set("email")} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone ?? ""} onChange={set("phone")} /></div>
            <div><label style={lbl}>Position</label><input style={inp} value={form.position ?? ""} onChange={set("position")} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Role</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.role ?? ""} onChange={set("role")}>
                <option value="user">User</option><option value="admin">Admin</option>
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.status ?? ""} onChange={set("status")}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 22px 18px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" disabled={saving} onClick={() => { onSave(form); onClose(); }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Add User Modal (local only — no POST /users endpoint) ─────────────────────
const AddUserModal: React.FC<{ onAdd: (u: PortalUser) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ name: "", email: "", role: "user", phone: "", position: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--bdr)", borderRadius: 10, fontSize: 12.5, color: "#3b1f7a", background: "var(--surf2)", outline: "none", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.4)", marginBottom: 5, display: "block" };
  const handleAdd = () => {
    if (!form.name || !form.email) return;
    onAdd({ id: Date.now(), name: form.name, email: form.email, role: form.role as "user" | "admin", phone: form.phone, position: form.position, status: "active" });
    onClose();
  };
  return (
    <div className="gx-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(109,40,217,0.18)", width: 440, maxWidth: "94vw", overflow: "hidden", animation: "slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg,#0f766e,#0d9488)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Add New User</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ marginBottom: 10 }}><label style={lbl}>Full Name</label><input style={inp} value={form.name} onChange={set("name")} placeholder="John Doe" /></div>
          <div style={{ marginBottom: 10 }}><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={set("email")} placeholder="john@example.com" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={set("phone")} /></div>
            <div><label style={lbl}>Position</label><input style={inp} value={form.position} onChange={set("position")} /></div>
          </div>
          <div><label style={lbl}>Role</label>
            <select style={{ ...inp, cursor: "pointer" }} value={form.role} onChange={set("role")}>
              <option value="user">User</option><option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ padding: "0 22px 18px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleAdd}>Add User</button>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props { onNavigate: (v: CPView) => void; onLogout?: () => void; user?: AuthUser | null; }

const UsersPage: React.FC<Props> = ({ onNavigate, onLogout, user: propUser }) => {
  const companyId = propUser?.company_id ?? null;

  const [users,   setUsers]   = useState<PortalUser[]>([]);
  const [notifs,  setNotifs]  = useState<UINotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All Roles");
  const [page,       setPage]       = useState(1);
  const [editUser,   setEditUser]   = useState<PortalUser | null>(null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [toast,      setToast]      = useState({ msg: "", show: false });

  const showToast = (m: string) => { setToast({ msg: m, show: true }); setTimeout(() => setToast(t => ({ ...t, show: false })), 2600); };

  const headerUser = {
    initials: propUser ? initials(propUser.name) : "??",
    name: propUser?.name ?? "User",
    role: formatRole(propUser?.role) ?? "User",
  };

  // ── FETCH ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [uR, nR] = await Promise.all([
        portalUsersAPI.getAll({ company_id: companyId }),
        notificationsAPI.getAll(),
      ]);
      if (uR.success && uR.data) setUsers(uR.data.filter(u => u.role !== "admin" || u.id === propUser?.id));
      if (nR.success && nR.data) setNotifs(nR.data.map(toUINotif));
    } finally { setLoading(false); }
  }, [companyId, propUser?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const markRead    = async (id: number) => { await notificationsAPI.markRead(id); setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n)); };
  const markAllRead = async () => { await notificationsAPI.markAllRead(); setNotifs(ns => ns.map(n => ({ ...n, read: true }))); };

  // ── EDIT USER ──────────────────────────────────────────────────────────────
  const handleSaveUser = async (updated: PortalUser) => {
    if (!updated.id) return;
    setSaving(true);
    try {
      const res = await portalUsersAPI.update(updated.id, {
        name: updated.name, email: updated.email,
        role: updated.role, phone: updated.phone,
        position: updated.position, status: updated.status,
      });
      if (res.success) { setUsers(us => us.map(u => u.id === updated.id ? updated : u)); showToast("User updated successfully!"); }
      else showToast("Failed to update user.");
    } finally { setSaving(false); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const unread       = notifs.filter(n => !n.read).length;
  const visibleUsers = users.filter(u => (u.role ?? "") !== "admin" || u.id === propUser?.id);

  const filtered = visibleUsers.filter(u => {
    const matchSearch = !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase()) || (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "All Roles" || (formatRole(u.role) ?? "") === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const roleCounts = visibleUsers.reduce<Record<string, number>>((a, u) => {
    const r = formatRole(u.role) ?? "User"; a[r] = (a[r] ?? 0) + 1; return a;
  }, {});

  // role cards config (v2 style — clickable filter cards)
  const roleCardCfg: Record<string, { desc: string; color: string; bg: string }> = {
    Admin:   { desc: "Full System Access",    color: "#6d28d9", bg: "#ede9fe" },
    Manager: { desc: "Team & Client Oversight", color: "#be185d", bg: "#fce7f3" },
    User:    { desc: "Standard Access",       color: "#16a34a", bg: "#f0fdf4" },
  };

  const roleBadgeStyle = (role: string | undefined): React.CSSProperties => {
    const r = formatRole(role) ?? "User";
    return {
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
      background: r === "Admin" ? "#ede9fe" : r === "Manager" ? "#fce7f3" : "#f3f4f6",
      color:      r === "Admin" ? "#6d28d9" : r === "Manager" ? "#be185d" : "#374151",
    };
  };

  const statusStyle = (s: string | undefined): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
    color:      (s ?? "active") === "active" ? "#16a34a" : "#dc2626",
    background: (s ?? "active") === "active" ? "#f0fdf4" : "#fff1f2",
    padding: "3px 10px", borderRadius: 20,
    border: `1px solid ${(s ?? "active") === "active" ? "#bbf7d0" : "#fecaca"}`,
    textTransform: "capitalize",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar activePage="users" onNavigate={onNavigate as (v: string) => void} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        <Header user={headerUser} notificationCount={unread} onNotificationClick={() => setNotifOpen(o => !o)} onLogout={onLogout} />

        <div className="gx-main">
          <div className="gx-view">
            {/* PAGE HEADER */}
            <div className="gx-ph">
              <div className="gx-ph-title">User <em>Management</em></div>
              <div className="gx-ph-rule" />
            </div>

            <div className="gx-scroll">
              <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>

                {/* ── ROLE OVERVIEW SIDEBAR (v2 style) ── */}
                <div style={{ width: 195, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase", color: "#c0c0d0", marginBottom: 6 }}>Role Overview</div>

                  {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Array.from({ length: 3 }).map((_, i) => <Sk key={i} h={68} r={10} />)}
                    </div>
                  ) : (
                    Object.entries(roleCounts).map(([role, count]) => {
                      const cfg = roleCardCfg[role] ?? { desc: "Portal Access", color: "#6d28d9", bg: "#ede9fe" };
                      const active = roleFilter === role;
                      return (
                        <div key={role}
                          onClick={() => { setRoleFilter(active ? "All Roles" : role); setPage(1); }}
                          style={{ background: "#fff", border: `1px solid ${active ? cfg.color : "#ebebeb"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all .15s", boxShadow: active ? `0 0 0 3px ${cfg.color}22` : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={cfg.color} strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4" /><circle cx="8" cy="6" r="2.5" /></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{role}</div>
                              <div style={{ fontSize: 9.5, color: "#aaa", marginTop: 1 }}>{cfg.desc}</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{count}</span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Total */}
                  <div style={{ marginTop: 4, padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #ebebeb" }}>
                    <div style={{ fontSize: 10, color: "#8e7ec0", marginBottom: 4 }}>Total Users</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#18103a" }}>
                      {loading ? <Sk w={32} h={22} /> : visibleUsers.length}
                    </div>
                  </div>
                </div>

                {/* ── TABLE AREA ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  {/* search + add */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5l3 3" /></svg>
                      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users…"
                        style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e8e8f0", borderRadius: 9, fontSize: 12, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", outline: "none" }} />
                    </div>
                    <button className="btn btn-p btn-sm" onClick={() => setAddOpen(true)}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M7 2v10M2 7h10" /></svg>
                      Add User
                    </button>
                  </div>

                  {/* table card */}
                  <div className="gx-card" style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ overflowX: "auto", flex: 1 }}>
                      {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
                          {Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={44} r={8} />)}
                        </div>
                      ) : paged.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 48, color: "#8e7ec0", fontSize: 12 }}>No users found.</div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1.5px solid rgba(109,40,217,0.08)" }}>
                              {["Full Name", "Email", "Role", "Position", "Phone", "Status", ""].map(h => (
                                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#b0b0c0", whiteSpace: "nowrap", background: "#fafafa" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paged.map((u, i) => (
                              <tr key={u.id ?? i} style={{ borderBottom: "1px solid #f0f0f5", transition: "background .12s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <td style={{ padding: "10px 16px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: avatarColor(u.id ?? i), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                      {initials(u.name ?? "")}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap" }}>{u.name}</span>
                                  </div>
                                </td>
                                <td style={{ padding: "10px 16px", fontSize: 11.5, color: "#9090a0", whiteSpace: "nowrap" }}>{u.email}</td>
                                <td style={{ padding: "10px 16px" }}><span style={roleBadgeStyle(u.role)}>{formatRole(u.role)}</span></td>
                                <td style={{ padding: "10px 16px", fontSize: 12, color: "#3a3a5c", whiteSpace: "nowrap" }}>{u.position ?? "—"}</td>
                                <td style={{ padding: "10px 16px", fontSize: 12, color: "#3a3a5c", whiteSpace: "nowrap" }}>{u.phone ?? "—"}</td>
                                <td style={{ padding: "10px 16px" }}>
                                  <span style={statusStyle(u.status)}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: (u.status ?? "active") === "active" ? "#16a34a" : "#dc2626" }} />
                                    {u.status ?? "active"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 16px" }}>
                                  <button onClick={() => setEditUser(u)} style={{ fontSize: 10.5, fontWeight: 600, color: "#6d28d9", background: "#ede9fe", border: "1px solid rgba(109,40,217,0.2)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>Edit</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* pagination (v2 style — numbered) */}
                    {!loading && (
                      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(109,40,217,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)" }}>
                          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(109,40,217,0.15)", background: "#fff", color: "#6d28d9", cursor: page === 1 ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)}
                              style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(109,40,217,0.15)", background: p === page ? "#6d28d9" : "#fff", color: p === page ? "#fff" : "#6d28d9", cursor: "pointer", fontSize: 11, fontWeight: p === page ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center" }}>{p}</button>
                          ))}
                          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(109,40,217,0.15)", background: "#fff", color: "#6d28d9", cursor: page === totalPages ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className={`gx-toast${toast.show ? " show" : ""}`}><div className="gx-toast-dot" /><span>{toast.msg}</span></div>
        {notifOpen  && <NotifPanel notifs={notifs} onRead={markRead} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
        {editUser   && <EditUserModal user={editUser} saving={saving} onSave={handleSaveUser} onClose={() => setEditUser(null)} />}
        {addOpen    && <AddUserModal onAdd={u => { setUsers(us => [...us, u]); showToast("User added!"); }} onClose={() => setAddOpen(false)} />}
      </div>
    </div>
  );
};

export default UsersPage;
