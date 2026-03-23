'use client';

import { JSX } from 'react/jsx-runtime';
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar_Client/sidebar_client';
import Header  from '../Header/header_main';
import '../../globals.css';

// ── Types ─────────────────────────────────────────────────────────────────────
type CPView     = 'overview' | 'tickets' | 'users' | 'settings';
type UserRole   = 'System Admin' | 'Manager' | 'User';
type UserStatus = 'Active' | 'Inactive';

interface User {
  id:           number;
  firstName:    string;
  lastName:     string;
  fullName:     string;
  email:        string;
  role:         UserRole;
  position:     string;
  status:       UserStatus;
  phone:        string;
  profilePhoto: string | null;
}

interface DBUserRow {
  id:             number;
  full_name:      string;
  email:          string;
  phone_number:   string | null;
  company_id:     number | null;
  position_title: string | null;
  access_level:   string;
  status:         string;
  profile_photo:  string | null;
}

interface Notification {
  id: number; type: 'warn' | 'error' | 'info' | 'success' | 'purple';
  title: string; desc: string; time: string; read: boolean;
}

interface UserProfile {
  id:           number;
  username:     string;
  role:         string;
  accessLevel:  string;
  fullName:     string;
  initials:     string;
  position:     string;
  company:      string;
  companyId:    number | null;
  profilePhoto: string | null;
}

interface UsersPageProps {
  onNavigate:   (view: CPView) => void;
  onLogout?:    () => void;
  userProfile?: UserProfile | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

const NOTIFS_INIT: Notification[] = [
  { id: 1, type: 'warn',    title: 'SA Expiry Notice',       desc: 'Your Software Assurance ends May 31, 2025.',        time: 'Just now',    read: false },
  { id: 2, type: 'error',   title: 'Open Ticket Alert',      desc: 'Ticket #89323930193 has been open for 2+ hours.',   time: '2 hours ago', read: false },
  { id: 3, type: 'info',    title: 'New Ticket Submitted',   desc: 'Ticket #89323930200 filed for Manila branch.',       time: '2 days ago',  read: false },
  { id: 4, type: 'success', title: 'Ticket Resolved',        desc: 'Ticket #89323930170 has been resolved.',            time: '1 week ago',  read: true  },
  { id: 5, type: 'purple',  title: 'Account Manager Update', desc: 'Maria Santos has updated your account details.',    time: '1 week ago',  read: true  },
];

const NOTIF_ICONS: Record<string, JSX.Element> = {
  warn:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8l1.5.9"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};

const AVATAR_COLORS = ['#6d28d9', '#0f766e', '#0369a1', '#be123c', '#b45309', '#065f46'];
const avatarColor   = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const getInitials   = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] ?? '?').toUpperCase();
};

// ── Map access_level → UserRole ───────────────────────────────────────────────
function toRole(accessLevel: string): UserRole {
  if (accessLevel === 'super_admin' || accessLevel === 'system_admin') return 'System Admin';
  if (accessLevel === 'manager') return 'Manager';
  return 'User';
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg]   = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => {
    setMsg(m); setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2600);
  };
  return { msg, show, toast };
}

function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [cb]);
  return ref;
}

// ── Notification panel ────────────────────────────────────────────────────────
const NotifPanel: React.FC<{
  notifs: Notification[];
  onRead: (id: number) => void;
  onMarkAll: () => void;
  onClose: () => void;
}> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref    = useClickOutside<HTMLDivElement>(onClose);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div className="gx-notif-panel" ref={ref}>
      <div className="gx-np-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="gx-np-title">Notifications</span>
          <span className={`gx-np-unread ${unread === 0 ? 'all-read' : ''}`}>
            {unread > 0 ? `${unread} unread` : 'All read'}
          </span>
        </div>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all as read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.map(n => (
          <div key={n.id} className={`gx-ni ${n.read ? '' : 'unread'}`} onClick={() => onRead(n.id)}>
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

// ── Page component ────────────────────────────────────────────────────────────
const UsersPage: React.FC<UsersPageProps> = ({ onNavigate, onLogout, userProfile }) => {
  const { msg, show }               = useToast();
  const [notifs, setNotifs]         = useState<Notification[]>(NOTIFS_INIT);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [page, setPage]             = useState(1);
  const PER_PAGE = 8;

  // ── Fetch users from API ───────────────────────────────────────────────────
  useEffect(() => {
    const companyId = userProfile?.companyId;
    if (!companyId) { setLoading(false); return; }

    setLoading(true);
    fetch(`${API_BASE}/api/users`, { headers: { Accept: 'application/json' } })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;
        const mapped: User[] = (data.data ?? [])
          .filter((r: DBUserRow) => r.company_id === companyId)
          .map((r: DBUserRow): User => {
            const nameParts = (r.full_name ?? '').trim().split(' ').filter(Boolean);
            return {
              id:           r.id,
              fullName:     r.full_name ?? '',
              firstName:    nameParts[0]                     ?? '',
              lastName:     nameParts.slice(1).join(' ')     ?? '',
              email:        r.email,
              role:         toRole(r.access_level),
              position:     r.position_title ?? '',
              status:       r.status === 'active' ? 'Active' : 'Inactive',
              phone:        r.phone_number ?? '',
              profilePhoto: r.profile_photo ?? null,
            };
          });
        setUsers(mapped);
      })
      .catch(err => console.error('[UsersPage] fetch failed:', err))
      .finally(() => setLoading(false));
  }, [userProfile?.companyId]);

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  // ── Filter & paginate ──────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (u.role === 'System Admin') return false;
    const q      = search.toLowerCase();
    const matchQ = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = roleFilter === 'All' || u.role === roleFilter;
    return matchQ && matchR;
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const managerCount = users.filter(u => u.role === 'Manager').length;
  const userCount    = users.filter(u => u.role === 'User').length;

  // ── Style helpers ──────────────────────────────────────────────────────────
  const roleBadge = (role: UserRole): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
    background: role === 'System Admin' ? '#ede9fe' : role === 'Manager' ? '#fce7f3' : '#f3f4f6',
    color:      role === 'System Admin' ? '#6d28d9' : role === 'Manager' ? '#be185d' : '#374151',
  });

  const statusStyle = (s: UserStatus): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600,
    color:      s === 'Active' ? '#16a34a' : '#dc2626',
    background: s === 'Active' ? '#f0fdf4' : '#fff1f2',
    padding: '3px 10px', borderRadius: 20,
    border: `1px solid ${s === 'Active' ? '#bbf7d0' : '#fecaca'}`,
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activePage="users" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <Header
          user={{
            initials:     userProfile?.initials     ?? '',
            fullName:     userProfile?.fullName     ?? '',
            position:     userProfile?.position     ?? '',
            company:      userProfile?.company      ?? '',
            profilePhoto: userProfile?.profilePhoto ?? null,
          }}
          logoSrc="/geniex-logo.png"
          brandSlotMode="client"
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />
        <div className="gx-main" style={{ paddingTop: 56 }}>
          <div className="gx-view">
            <div className="gx-ph">
              <div className="gx-ph-title">User <em>Management</em></div>
              <div className="gx-ph-rule" />
            </div>

            <div className="gx-scroll">
              <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>

                {/* Role Overview Sidebar */}
                <div style={{ width: 195, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase' as const, color: '#c0c0d0', marginBottom: 6 }}>Role Overview</div>
                  {([
                    { role: 'Manager' as UserRole, count: managerCount, desc: 'Team & Client Oversight', color: '#be185d', bg: '#fce7f3' },
                    { role: 'User'    as UserRole, count: userCount,    desc: 'Standard Access',         color: '#16a34a', bg: '#f0fdf4' },
                  ]).map(({ role, count, desc, color, bg }) => (
                    <div key={role}
                      onClick={() => { setRoleFilter(roleFilter === role ? 'All' : role); setPage(1); }}
                      style={{ background: '#fff', border: `1px solid ${roleFilter === role ? color : '#ebebeb'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s', boxShadow: roleFilter === role ? `0 0 0 3px ${color}22` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{role}</div>
                          <div style={{ fontSize: 9.5, color: '#aaa', marginTop: 1 }}>{desc}</div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}>
                        <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>
                      </svg>
                      <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search users..."
                        style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #e8e8f0', borderRadius: 9, fontSize: 12, fontFamily: 'inherit', color: '#1a1a2e', background: '#fff', outline: 'none' }}
                      />
                    </div>
                    <button className="btn btn-s btn-sm" style={{ flexShrink: 0, background: '#fff', border: '1px solid #e8e8f0', color: '#555' }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 11, height: 11 }}><path d="M2 4h10M4 7h6M6 10h2"/></svg>
                      Filter
                    </button>
                  </div>

                  <div className="gx-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ overflowX: 'auto', flex: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid rgba(109,40,217,0.08)' }}>
                            {['Full Name', 'Email', 'Access', 'Position', 'Status'].map(h => (
                              <th key={h} style={{ padding: '9px 16px', textAlign: 'left' as const, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#b0b0c0', whiteSpace: 'nowrap' as const, background: '#fafafa' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Loading skeleton */}
                          {loading && Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f0f0f5' }}>
                              {Array.from({ length: 5 }).map((_, j) => (
                                <td key={j} style={{ padding: '12px 16px' }}>
                                  <div style={{ height: 12, borderRadius: 5, background: 'linear-gradient(90deg,#f0f0f5 25%,#fafafa 50%,#f0f0f5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: j === 0 ? '60%' : j === 1 ? '80%' : '40%' }} />
                                </td>
                              ))}
                            </tr>
                          ))}

                          {/* Empty state */}
                          {!loading && paginated.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center' as const }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#b0b0c0', marginBottom: 4 }}>
                                  {search || roleFilter !== 'All' ? 'No users match your search.' : 'No users found for this company.'}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* User rows */}
                          {!loading && paginated.map(u => (
                            <tr key={u.id}
                              style={{ borderBottom: '1px solid #f0f0f5', transition: 'background .12s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                              {/* Full Name */}
                              <td style={{ padding: '10px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: 10, background: avatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                                    {u.profilePhoto
                                      ? <img src={u.profilePhoto} alt={u.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      : getInitials(u.fullName)
                                    }
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap' as const }}>{u.fullName}</span>
                                </div>
                              </td>

                              {/* Email */}
                              <td style={{ padding: '10px 16px', fontSize: 11.5, color: '#9090a0', whiteSpace: 'nowrap' as const }}>{u.email}</td>

                              {/* Access */}
                              <td style={{ padding: '10px 16px' }}><span style={roleBadge(u.role)}>{u.role}</span></td>

                              {/* Position */}
                              <td style={{ padding: '10px 16px', fontSize: 12, color: '#3a3a5c', whiteSpace: 'nowrap' as const }}>{u.position || '—'}</td>

                              {/* Status */}
                              <td style={{ padding: '10px 16px' }}>
                                <span style={statusStyle(u.status)}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: u.status === 'Active' ? '#16a34a' : '#dc2626' }} />
                                  {u.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination footer */}
                    <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(109,40,217,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>
                        {loading ? 'Loading…' : filtered.length === 0 ? '0 entries' : `Showing ${Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length} entries`}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(109,40,217,0.15)', background: '#fff', color: '#6d28d9', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setPage(p)}
                            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(109,40,217,0.15)', background: p === page ? '#6d28d9' : '#fff', color: p === page ? '#fff' : '#6d28d9', cursor: 'pointer', fontSize: 11, fontWeight: p === page ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(109,40,217,0.15)', background: '#fff', color: '#6d28d9', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}>›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`gx-toast ${show ? 'show' : ''}`}><div className="gx-toast-dot" /><span>{msg}</span></div>
      {notifOpen && <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />}

      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
};

export default UsersPage;