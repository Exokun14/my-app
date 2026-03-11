// ============================================================
//  UsersPage.tsx
// ============================================================


'use client'

import { JSX } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header from "../Header_Client/header_client";
import "../../globals.css";


type UserRole   = "System Admin" | "Manager" | "User";
type UserStatus = "Active" | "Inactive";

interface User {
  id: number; firstName: string; lastName: string; email: string;
  role: UserRole; position: string; company: string; status: UserStatus; phone: string;
}
interface Notification {
  id: number; type: "warn" | "error" | "info" | "success" | "purple";
  title: string; desc: string; time: string; read: boolean;
}

const USERS_INIT: User[] = [
  { id:1, firstName:"John",     lastName:"Doe",    email:"john@popeyes.com",     role:"System Admin", position:"IT Lead",            company:"Popeyes", status:"Active",   phone:"+63 9XX XXX XXXX" },
  { id:2, firstName:"Ana",      lastName:"Reyes",  email:"ana@popeyes.com",       role:"User",         position:"Store Supervisor",   company:"Popeyes", status:"Active",   phone:"+63 9XX XXX XXXX" },
  { id:3, firstName:"Mark",     lastName:"Santos", email:"mark@popeyes.com",      role:"User",         position:"Cashier",            company:"Popeyes", status:"Inactive", phone:"+63 9XX XXX XXXX" },
  { id:4, firstName:"Kristina", lastName:"White",  email:"kristina@popeyes.com",  role:"Manager",      position:"Operations Manager", company:"Popeyes", status:"Active",   phone:"+63 9XX XXX XXXX" },
  { id:5, firstName:"Michelle", lastName:"Morrow", email:"michelle@popeyes.com",  role:"User",         position:"Crew Member",        company:"Popeyes", status:"Active",   phone:"+63 9XX XXX XXXX" },
];

const NOTIFS_INIT: Notification[] = [
  { id:1, type:"warn",    title:"SA Expiry Notice",       desc:"Your Software Assurance ends May 31, 2025.", time:"Just now",    read:false },
  { id:2, type:"error",   title:"Open Ticket Alert",      desc:"Ticket #89323930193 has been open for 2+ hours.", time:"2 hours ago", read:false },
  { id:3, type:"info",    title:"New Ticket Submitted",   desc:"Ticket #89323930200 filed for Manila branch.", time:"2 days ago",  read:false },
  { id:4, type:"success", title:"Ticket Resolved",        desc:"Ticket #89323930170 has been resolved.", time:"1 week ago",  read:true  },
  { id:5, type:"purple",  title:"Account Manager Update", desc:"Maria Santos has updated your account details.", time:"1 week ago",  read:true  },
];

const NOTIF_ICONS: Record<string, JSX.Element> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8l1.5.9"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

const AVATAR_COLORS = ["#6d28d9","#0f766e","#0369a1","#be123c","#b45309","#065f46"];
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const initials = (u: User) => (u.firstName[0] + u.lastName[0]).toUpperCase();

function useToast() {
  const [msg, setMsg] = useState(""); const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => { setMsg(m); setShow(true); clearTimeout(timer.current); timer.current = setTimeout(() => setShow(false), 2600); };
  return { msg, show, toast };
}
function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

const NotifPanel: React.FC<{ notifs: Notification[]; onRead: (id: number) => void; onMarkAll: () => void; onClose: () => void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div className="gx-notif-panel" ref={ref}>
      <div className="gx-np-hdr">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span className="gx-np-title">Notifications</span>
          <span className={`gx-np-unread ${unread===0?"all-read":""}`}>{unread>0?`${unread} unread`:"All read"}</span>
        </div>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all as read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.map(n => (
          <div key={n.id} className={`gx-ni ${n.read?"":"unread"}`} onClick={() => onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NOTIF_ICONS[n.type]}</div>
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

const inp: React.CSSProperties = { width:"100%", padding:"9px 12px", border:"1.5px solid rgba(109,40,217,0.12)", borderRadius:10, fontSize:12.5, fontFamily:"inherit", color:"#1e1b4b", background:"#f4f3fb", outline:"none", fontWeight:500 };
const lbl: React.CSSProperties = { fontSize:12, fontWeight:600, color:"rgba(0,0,0,0.4)", marginBottom:5, display:"block" };
const req = <span style={{ color:"#dc2626" }}> *</span>;

const EditUserModal: React.FC<{ user: User; onSave: (u: User) => void; onClose: () => void }> = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState<User>({ ...user });
  const set = (k: keyof User) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="gx-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, boxShadow:"0 24px 64px rgba(109,40,217,0.2)", width:460, maxWidth:"94vw", overflow:"hidden", animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background:"linear-gradient(135deg,#3b0764,#6d28d9 60%,#0f766e)", padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Edit: {form.firstName} {form.lastName}</div>
              <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.7)", marginTop:1 }}>Update user information and access</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"12px 22px 16px", overflowY:"auto", maxHeight:"72vh" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 14px", background:"#f4f3fb", borderRadius:12, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:avatarColor(form.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(form)}</div>
            <div>
              <div style={{ fontSize:11.5, fontWeight:700, color:"#1e1b4b" }}>Profile Photo</div>
              <div style={{ fontSize:10, color:"rgba(0,0,0,0.4)", marginBottom:6 }}>Upload a new photo or keep existing</div>
              <button style={{ fontSize:10.5, fontWeight:600, color:"#fff", background:"#6d28d9", border:"none", borderRadius:7, padding:"4px 12px", cursor:"pointer" }}>Change Photo</button>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={lbl}>First Name{req}</label><input style={inp} value={form.firstName} onChange={set("firstName")} /></div>
            <div><label style={lbl}>Last Name{req}</label><input style={inp} value={form.lastName} onChange={set("lastName")} /></div>
          </div>
          <div style={{ marginBottom:10 }}><label style={lbl}>Email Address{req}</label><input style={inp} type="email" value={form.email} onChange={set("email")} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={lbl}>User Role{req}</label><select style={{ ...inp, appearance:"none" }} value={form.role} onChange={set("role")}><option>System Admin</option><option>Manager</option><option>User</option></select></div>
            <div><label style={lbl}>Company{req}</label><select style={{ ...inp, appearance:"none" }} value={form.company} onChange={set("company")}><option>Popeyes</option><option>GenieX</option></select></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={lbl}>Position / Title</label><input style={inp} value={form.position} onChange={set("position")} /></div>
            <div><label style={lbl}>Phone Number</label><input style={inp} placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={set("phone")} /></div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Status</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {(["Active","Inactive"] as UserStatus[]).map(s => (
                <div key={s} onClick={() => setForm(f => ({ ...f, status:s }))} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderRadius:10, cursor:"pointer", border: form.status===s ? `2px solid ${s==="Active"?"#16a34a":"#dc2626"}` : "1.5px solid rgba(0,0,0,0.1)", background: form.status===s ? (s==="Active"?"#f0fdf4":"#fff1f2") : "#f9f9f9", transition:"all .15s" }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", border: form.status===s ? `2px solid ${s==="Active"?"#16a34a":"#dc2626"}` : "2px solid #ccc", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {form.status===s && <div style={{ width:6, height:6, borderRadius:"50%", background:s==="Active"?"#16a34a":"#dc2626" }} />}
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:form.status===s?(s==="Active"?"#16a34a":"#dc2626"):"rgba(0,0,0,0.4)" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(109,40,217,0.1)", paddingTop:12 }}>
            <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:"#6d28d9", textAlign:"center" as const, marginBottom:12 }}>Change Password</div>
            <div style={{ marginBottom:10 }}><label style={lbl}>New Password <span style={{ fontSize:10, color:"rgba(0,0,0,0.3)" }}>(leave blank to keep current)</span></label><input style={inp} type="password" placeholder="Enter new password..." /></div>
            <div><label style={lbl}>Confirm Password</label><input style={inp} type="password" placeholder="Re-enter new password..." /></div>
          </div>
        </div>
        <div style={{ padding:"12px 22px 18px", borderTop:"1px solid rgba(109,40,217,0.1)", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={() => { onSave(form); onClose(); }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:11, height:11 }}><path d="M2.5 7.5l3 3 6-6"/></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const AddUserModal: React.FC<{ onAdd: (u: User) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", role:"User" as UserRole, position:"", company:"Popeyes", status:"Active" as UserStatus, phone:"" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="gx-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, boxShadow:"0 24px 64px rgba(109,40,217,0.2)", width:460, maxWidth:"94vw", overflow:"hidden", animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ background:"linear-gradient(135deg,#3b0764,#6d28d9 60%,#0f766e)", padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Add New User</div>
              <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.7)", marginTop:1 }}>Register a new user account</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"12px 22px 16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={lbl}>First Name{req}</label><input style={inp} value={form.firstName} onChange={set("firstName")} /></div>
            <div><label style={lbl}>Last Name{req}</label><input style={inp} value={form.lastName} onChange={set("lastName")} /></div>
          </div>
          <div style={{ marginBottom:10 }}><label style={lbl}>Email Address{req}</label><input style={inp} type="email" value={form.email} onChange={set("email")} /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={lbl}>User Role{req}</label><select style={{ ...inp, appearance:"none" }} value={form.role} onChange={set("role")}><option>System Admin</option><option>Manager</option><option>User</option></select></div>
            <div><label style={lbl}>Company{req}</label><select style={{ ...inp, appearance:"none" }} value={form.company} onChange={set("company")}><option>Popeyes</option><option>GenieX</option></select></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={lbl}>Position / Title</label><input style={inp} value={form.position} onChange={set("position")} /></div>
            <div><label style={lbl}>Phone Number</label><input style={inp} placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={set("phone")} /></div>
          </div>
        </div>
        <div style={{ padding:"12px 22px 18px", borderTop:"1px solid rgba(109,40,217,0.1)", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={() => { onAdd({ ...form, id:Date.now() }); onClose(); }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:11, height:11 }}><path d="M7 3v8M3 7h8"/></svg>
            Add User
          </button>
        </div>
      </div>
    </div>
  );
};



type CPView = "overview" | "tickets" | "users" | "settings";
interface UsersPageProps {
  onNavigate: (view: CPView) => void;
  onLogout?: () => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ onNavigate, onLogout}) => {
  const { msg, show, toast }        = useToast();
  const [notifs, setNotifs]         = useState<Notification[]>(NOTIFS_INIT);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [users, setUsers]           = useState<User[]>(USERS_INIT);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "All">("All");
  const [page, setPage]             = useState(1);
  const PER_PAGE = 8;

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(ns => ns.map(n => n.id===id ? { ...n, read:true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read:true })));

  const filtered = users.filter(u => {
    if (u.role === "System Admin") return false;
    const q = search.toLowerCase();
    const matchQ = !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = roleFilter==="All" || u.role===roleFilter;
    return matchQ && matchR;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const managerCount = users.filter(u => u.role==="Manager").length;
  const userCount    = users.filter(u => u.role==="User").length;

  const saveUser = (u: User) => { setUsers(us => us.map(x => x.id===u.id ? u : x)); toast("User updated successfully!"); };
  const addUser  = (u: User) => { setUsers(us => [...us, u]); toast("User added successfully!"); };

  const roleBadge = (role: UserRole): React.CSSProperties => ({
    fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6,
    background: role==="System Admin"?"#ede9fe": role==="Manager"?"#fce7f3":"#f3f4f6",
    color:      role==="System Admin"?"#6d28d9": role==="Manager"?"#be185d":"#374151",
  });
  const statusStyle = (s: UserStatus): React.CSSProperties => ({
    display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600,
    color: s==="Active"?"#16a34a":"#dc2626",
    background: s==="Active"?"#f0fdf4":"#fff1f2",
    padding:"3px 10px", borderRadius:20, border:`1px solid ${s==="Active"?"#bbf7d0":"#fecaca"}`,
  });

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar activePage="users" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:0, overflow:"hidden" }}>
        <Header
          user={{ initials:"JD", name:"John Doe", role:"System Admin", company:"Popeyes" }}
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
           onLogout={onLogout}
        />
        <div className="gx-main">
          <div className="gx-view">
            <div className="gx-ph">
              <div className="gx-ph-title">User <em>Management</em></div>
              <div className="gx-ph-rule" />
              <button className="btn btn-p btn-sm" onClick={() => setAddOpen(true)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width:12, height:12 }}><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
                Add New User
              </button>
            </div>

            <div className="gx-scroll">
              <div style={{ display:"flex", gap:14, flex:1, minHeight:0 }}>

                {/* Role Overview Sidebar */}
                <div style={{ width:195, flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:".13em", textTransform:"uppercase" as const, color:"#c0c0d0", marginBottom:6 }}>Role Overview</div>
                  {([
                    { role:"Manager" as UserRole, count:managerCount, desc:"Team & Client Oversight",  color:"#be185d", bg:"#fce7f3" },
                    { role:"User"    as UserRole, count:userCount,    desc:"Standard Access",          color:"#16a34a", bg:"#f0fdf4" },
                  ]).map(({ role, count, desc, color, bg }) => (
                    <div key={role} onClick={() => { setRoleFilter(roleFilter===role?"All":role); setPage(1); }} style={{ background:"#fff", border:`1px solid ${roleFilter===role?color:"#ebebeb"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all .15s", boxShadow:roleFilter===role?`0 0 0 3px ${color}22`:"none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{role}</div>
                          <div style={{ fontSize:9.5, color:"#aaa", marginTop:1 }}>{desc}</div>
                        </div>
                        <span style={{ fontSize:15, fontWeight:800, color }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Area */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10, minWidth:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ flex:1, position:"relative" }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
                      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." style={{ width:"100%", padding:"8px 12px 8px 32px", border:"1px solid #e8e8f0", borderRadius:9, fontSize:12, fontFamily:"inherit", color:"#1a1a2e", background:"#fff", outline:"none" }} />
                    </div>
                    <button className="btn btn-s btn-sm" style={{ flexShrink:0, background:"#fff", border:"1px solid #e8e8f0", color:"#555" }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:11, height:11 }}><path d="M2 4h10M4 7h6M6 10h2"/></svg>
                      Filter
                    </button>
                  </div>

                  <div className="gx-card" style={{ flex:1, padding:0, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                    <div style={{ overflowX:"auto", flex:1 }}>
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ borderBottom:"1.5px solid rgba(109,40,217,0.08)" }}>
                            {["Full Name","Email","Access","Position","Company","Status","Actions"].map(h => (
                              <th key={h} style={{ padding:"9px 16px", textAlign:"left" as const, fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, color:"#b0b0c0", whiteSpace:"nowrap" as const, background:"#fafafa" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map(u => (
                            <tr key={u.id} style={{ borderBottom:"1px solid #f0f0f5", transition:"background .12s" }}
                              onMouseEnter={e => (e.currentTarget.style.background="#fafafa")}
                              onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                              <td style={{ padding:"10px 16px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div style={{ width:34, height:34, borderRadius:10, background:avatarColor(u.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(u)}</div>
                                  <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", whiteSpace:"nowrap" as const }}>{u.firstName} {u.lastName}</span>
                                </div>
                              </td>
                              <td style={{ padding:"10px 16px", fontSize:11.5, color:"#9090a0", whiteSpace:"nowrap" as const }}>{u.email}</td>
                              <td style={{ padding:"10px 16px" }}><span style={roleBadge(u.role)}>{u.role}</span></td>
                              <td style={{ padding:"10px 16px", fontSize:12, color:"#3a3a5c", whiteSpace:"nowrap" as const }}>{u.position}</td>
                              <td style={{ padding:"10px 16px", fontSize:12, color:"#3a3a5c" }}>{u.company}</td>
                              <td style={{ padding:"10px 16px" }}>
                                <span style={statusStyle(u.status)}>
                                  <div style={{ width:6, height:6, borderRadius:"50%", background:u.status==="Active"?"#16a34a":"#dc2626" }} />
                                  {u.status}
                                </span>
                              </td>
                              <td style={{ padding:"10px 16px" }}>
                                <button onClick={() => setEditUser(u)} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#6d28d9", background:"#f5f3ff", border:"1px solid rgba(109,40,217,0.2)", borderRadius:8, padding:"4px 11px", cursor:"pointer" }}>
                                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 2L12 3.5l-8 8H2.5V10l8-8zM9 3.5l1.5 1.5"/></svg>
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(109,40,217,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, color:"rgba(0,0,0,0.4)" }}>Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} entries</span>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(109,40,217,0.15)", background:"#fff", color:"#6d28d9", cursor:page===1?"default":"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", opacity:page===1?0.4:1 }}>‹</button>
                        {Array.from({length:totalPages},(_,i)=>i+1).map(p => (
                          <button key={p} onClick={() => setPage(p)} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(109,40,217,0.15)", background:p===page?"#6d28d9":"#fff", color:p===page?"#fff":"#6d28d9", cursor:"pointer", fontSize:11, fontWeight:p===page?700:400, display:"flex", alignItems:"center", justifyContent:"center" }}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(109,40,217,0.15)", background:"#fff", color:"#6d28d9", cursor:page===totalPages?"default":"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", opacity:page===totalPages?0.4:1 }}>›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`gx-toast ${show?"show":""}`}><div className="gx-toast-dot" /><span>{msg}</span></div>
      {editUser  && <EditUserModal user={editUser} onSave={saveUser} onClose={() => setEditUser(null)} />}
      {addOpen   && <AddUserModal  onAdd={addUser}  onClose={() => setAddOpen(false)} />}
      {notifOpen && <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}
    </div>
  );
};

export default UsersPage;