'use client';

// ─────────────────────────────────────────────
//  user_manager.tsx  –  User Management Page
//  Updated: fetches users from /api/users
// ─────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import Header from '../Header_Web/header';
import Sidebar from '../Sidebar_Web/sidebar';

import {
  User, UserRole, UserFilters, RoleCardInfo,
  COMPANY_OPTIONS, ROLE_CARDS, EMPTY_EDIT_FORM, RESIDUAL_CSS,
  getInitials, getRoleBadgeClass, getStatusBadgeClass, getUniqueCompanies, getRoleCount,
  useUserManagement, USERS_PER_PAGE,
} from './user_functions';

import { useRolePermissions } from './user_roles_func';
import AddUserPopup          from './add_user_popup';
import EditUserPopup         from './edit_user_popup';
import RolePermissionsPopup  from './role_permissions_popup';

// ─────────────────────────────────────────────────────────────────────────────
//  RoleCard
// ─────────────────────────────────────────────────────────────────────────────

interface RoleCardProps { info: RoleCardInfo; count: number; onClick: () => void; }

function RoleCard({ info, count, onClick }: RoleCardProps) {
  const [hovered, setHovered] = useState(false);

  const iconSvg = info.role === 'System Admin' ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 1l1 2.5 2.5.5-1.8 1.8.4 2.7L7 7.3l-2.1 1.2.4-2.7L3.5 4l2.5-.5z" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12s2-3 5-3 5 3 5 3" /><circle cx="7" cy="5" r="2.5" />
    </svg>
  );

  return (
    <div
      className="flex items-center cursor-pointer rounded-lg bg-white transition-all duration-150"
      style={{
        gap: 8, padding: '8px 10px',
        border: `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        boxShadow: hovered ? '0 2px 10px rgba(124,58,237,.10)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="flex items-center justify-center shrink-0 rounded-lg"
        style={{ width: 28, height: 28, background: info.iconBg, color: info.iconColor }}>
        {iconSvg}
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 }}>{info.role}</div>
        <div style={{ fontSize: 9.5, color: 'var(--t3)', lineHeight: 1.3, marginTop: 1 }}>{info.description}</div>
      </div>
      <div className="flex items-center" style={{ gap: 4 }}>
        <div className="flex items-center justify-center font-bold rounded-full shrink-0"
          style={{ fontSize: 9.5, minWidth: 18, height: 18, padding: '0 5px', background: 'var(--purple-lt)', color: 'var(--purple-d)' }}>
          {count}
        </div>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--t4)" strokeWidth="1.8"
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity .15s' }}>
          <path d="M1.5 4h5M4 1.5L6.5 4 4 6.5" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  UserRow
// ─────────────────────────────────────────────────────────────────────────────

const TD_BASE: React.CSSProperties  = { borderBottom: '1px solid var(--border)', padding: '9px 12px', fontSize: 12, color: 'var(--t1)', verticalAlign: 'middle' };
const TD_FIRST: React.CSSProperties = { ...TD_BASE, padding: '9px 12px 9px 16px' };

interface UserRowProps { user: User; onEdit: (user: User) => void; }

function UserRow({ user, onEdit }: UserRowProps) {
  function setRowBg(e: React.MouseEvent<HTMLTableRowElement>, bg: string) {
    Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(c => (c.style.background = bg));
  }

  return (
    <tr className="transition-colors duration-150"
      onMouseEnter={e => setRowBg(e, 'var(--s2)')}
      onMouseLeave={e => setRowBg(e, '')}
    >
      <td style={{ ...TD_FIRST, fontWeight: 600 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <div className="flex items-center justify-center shrink-0 rounded-lg overflow-hidden"
            style={{ width: 27, height: 27, ...(user.imgSrc ? {} : { background: 'var(--grad)', fontSize: 9, fontWeight: 700, color: 'white' }) }}
          >
            {user.imgSrc
              ? <img src={user.imgSrc} alt={user.name} className="w-full h-full object-cover" />
              : getInitials(user.name)
            }
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' }}>{user.name}</span>
        </div>
      </td>
      <td style={{ ...TD_BASE, fontSize: 11.5, color: 'var(--t3)' }}>{user.email}</td>
      <td style={TD_BASE}><span className={getRoleBadgeClass(user.role)}>{user.role}</span></td>
      <td style={{ ...TD_BASE, fontSize: 11.5, color: 'var(--t3)' }}>{user.position || '—'}</td>
      <td style={{ ...TD_BASE, fontSize: 12 }}>{user.company}</td>
      <td style={TD_BASE}>
        <span className={getStatusBadgeClass(user.status)}>
          <span className={`dot ${user.status === 'Active' ? 'dot-g' : 'dot-r'}`} />{user.status}
        </span>
      </td>
      <td style={TD_BASE}>
        <button
          className="inline-flex items-center cursor-pointer rounded transition-all duration-150"
          style={{ gap: 5, padding: '3px 9px', border: '1px solid var(--border)', background: 'var(--s2)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}
          onClick={() => onEdit(user)}
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M8.5 1.5l2 2L3 11H1v-2z" /></svg>
          Edit
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pagination
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage:  number;
  totalPages:   number;
  totalItems:   number;
  startIndex:   number;
  endIndex:     number;
  pageNumbers:  (number | '…')[];
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, startIndex, endIndex, pageNumbers, onPageChange }: PaginationProps) {
  if (totalPages <= 1 && totalItems <= USERS_PER_PAGE) return (
    <div className="flex items-center justify-between shrink-0"
      style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--t3)' }}>
      <span>Showing {totalItems === 0 ? 0 : 1}–{totalItems} of {totalItems} entries</span>
    </div>
  );

  return (
    <div className="flex items-center justify-between shrink-0"
      style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--t3)' }}>
      <span>
        Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} entries
      </span>
      <div className="flex items-center gap-1">
        <button className="pg-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} title="Previous page">
          <svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5.5 1L1 5.5 5.5 10" /></svg>
        </button>
        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="pg-ellipsis">···</span>
          ) : (
            <button key={p} className={`pg-btn${p === currentPage ? ' active' : ''}`} onClick={() => onPageChange(p as number)}>
              {p}
            </button>
          )
        )}
        <button className="pg-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} title="Next page">
          <svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1.5 1L6 5.5 1.5 10" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DropdownFilter
// ─────────────────────────────────────────────────────────────────────────────

interface DropdownFilterProps {
  filters:     UserFilters;
  users:       User[];
  onToggle:    (type: keyof UserFilters, value: string) => void;
  onClear:     () => void;
  filterCount: number;
}

function DropdownFilter({ filters, users, onToggle, onClear, filterCount }: DropdownFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<UserFilters>({
    role:    new Set(filters.role),
    status:  new Set(filters.status),
    company: new Set(filters.company),
  });

  const prevOpen = useRef(false);
  React.useEffect(() => {
    if (open && !prevOpen.current) {
      setDraft({ role: new Set(filters.role), status: new Set(filters.status), company: new Set(filters.company) });
    }
    prevOpen.current = open;
  }, [open]);

  const draftCount = draft.role.size + draft.status.size + draft.company.size;

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleDraft(type: keyof UserFilters, value: string) {
    setDraft(prev => {
      const next = new Set(prev[type]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [type]: next };
    });
  }

  function clearDraft() { setDraft({ role: new Set(), status: new Set(), company: new Set() }); }

  function applyAndClose() {
    const types: (keyof UserFilters)[] = ['role', 'status', 'company'];
    types.forEach(type => {
      const applied  = filters[type] as Set<string>;
      const draftSet = draft[type]   as Set<string>;
      applied.forEach(v  => { if (!draftSet.has(v)) onToggle(type, v); });
      draftSet.forEach(v => { if (!applied.has(v))  onToggle(type, v); });
    });
    setOpen(false);
  }

  function handleClearAll() { clearDraft(); onClear(); setOpen(false); }

  const roles:    UserRole[]   = ['Super Admin', 'System Admin', 'Manager', 'User'];
  const statuses                = ['Active', 'Inactive'];
  const companies               = getUniqueCompanies(users);

  function OptionRow({ label, active, onClick, dot }: { label: string; active: boolean; onClick: () => void; dot?: string }) {
    const [hov, setHov] = useState(false);
    return (
      <button
        className="flex items-center gap-2.5 w-full rounded-lg cursor-pointer text-left transition-all duration-150 text-[12.5px]"
        style={{
          padding: '8px 10px', fontFamily: "'DM Sans', sans-serif",
          border: `1px solid ${active ? 'rgba(124,58,237,.20)' : 'transparent'}`,
          background: active ? 'var(--purple-lt)' : hov ? 'var(--s2)' : 'transparent',
          fontWeight: active ? 600 : 400, color: active ? 'var(--purple-d)' : 'var(--t2)',
        }}
        onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      >
        <span className="flex items-center justify-center shrink-0 rounded transition-all duration-150"
          style={{ width: 15, height: 15, border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border-md)'}`, background: active ? 'var(--purple)' : '#fff', boxShadow: active ? '0 1px 4px rgba(124,58,237,.35)' : 'none' }}>
          {active && <svg width="8" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.2"><path d="M1 4l3 3 5-6" /></svg>}
        </span>
        {dot && <span className={`dot ${dot}`} />}
        <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
      </button>
    );
  }

  return (
    <div className="relative z-200" ref={ref}>
      <button
        className="flex items-center cursor-pointer transition-all duration-150 whitespace-nowrap rounded-[10px] font-semibold shrink-0"
        style={{
          gap: 7, padding: '7px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 12.5,
          border: 'none',
          background: open ? 'var(--grad)' : filterCount > 0 ? 'var(--grad)' : 'var(--s2)',
          color: open || filterCount > 0 ? '#fff' : 'var(--t2)',
          boxShadow: open || filterCount > 0 ? '0 3px 12px rgba(124,58,237,.35)' : 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" /></svg>
        <span>Filters</span>
        {filterCount > 0 && (
          <span className="flex items-center justify-center font-bold rounded-full shrink-0"
            style={{ fontSize: 9.5, minWidth: 18, height: 18, padding: '0 5px', background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
            {filterCount}
          </span>
        )}
        <svg className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none', opacity: 0.9 }}
          width="10" height="10" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute df-panel-anim overflow-hidden rounded-2xl bg-white z-300"
          style={{ top: 'calc(100% + 8px)', left: 0, border: '1px solid var(--border-md)', boxShadow: '0 4px 6px -1px rgba(0,0,0,.06),0 12px 40px -4px rgba(124,58,237,.14)', minWidth: 640 }}>

          <div className="flex items-center justify-between"
            style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}>
            <div className="flex items-center gap-2 uppercase font-bold text-[11px] tracking-[.04em]" style={{ color: 'var(--t2)' }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--purple)" strokeWidth="1.8"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" /></svg>
              Filter Users
            </div>
            {draftCount > 0 && (
              <button className="flex items-center gap-1.5 font-semibold cursor-pointer transition-all duration-150 rounded text-[10.5px] px-2.5 py-1"
                style={{ color: 'var(--red)', background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.15)' }}
                onClick={clearDraft}>
                Reset
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9" /></svg>
              </button>
            )}
          </div>

          <div className="flex items-start" style={{ padding: '16px 20px 14px', gap: 0 }}>
            {/* Role */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-[.16em]"
                style={{ color: 'var(--t4)', paddingBottom: 10, paddingLeft: 4 }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="var(--purple)" strokeWidth="1.7" style={{ opacity: .7 }}><path d="M7 1l1 2.5 2.5.5-1.8 1.8.4 2.7L7 7.3l-2.1 1.2.4-2.7L3.5 4l2.5-.5z" /></svg>
                Role
              </div>
              {roles.map(r => <OptionRow key={r} label={r} active={draft.role.has(r)} onClick={() => toggleDraft('role', r)} />)}
            </div>

            <div className="shrink-0 self-stretch w-px" style={{ background: 'var(--border)', margin: '0 16px' }} />

            {/* Status */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-[.16em]"
                style={{ color: 'var(--t4)', paddingBottom: 10, paddingLeft: 4 }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--purple)" strokeWidth="1.7" style={{ opacity: .7 }}><circle cx="6" cy="6" r="4.5" /></svg>
                Status
              </div>
              {statuses.map(s => <OptionRow key={s} label={s} active={draft.status.has(s)} onClick={() => toggleDraft('status', s)} dot={s === 'Active' ? 'dot-g' : 'dot-r'} />)}
            </div>

            <div className="shrink-0 self-stretch w-px" style={{ background: 'var(--border)', margin: '0 16px' }} />

            {/* Company */}
            <div className="flex flex-col gap-1 min-w-0" style={{ flex: 2, minWidth: 260 }}>
              <div className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-[.16em]"
                style={{ color: 'var(--t4)', paddingBottom: 10, paddingLeft: 4 }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="var(--purple)" strokeWidth="1.7" style={{ opacity: .7 }}>
                  <rect x="1.5" y="4" width="11" height="8.5" rx="1" /><path d="M4.5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4" />
                </svg>
                Company
              </div>
              <div className="grid grid-cols-2 gap-1">
                {companies.map(c => {
                  const active = draft.company.has(c);
                  return (
                    <button key={c}
                      className="flex items-start gap-2 w-full rounded-lg cursor-pointer text-left transition-all duration-150 text-[12px]"
                      style={{ padding: '8px 10px 8px 8px', fontFamily: "'DM Sans', sans-serif", border: `1px solid ${active ? 'rgba(124,58,237,.20)' : 'transparent'}`, background: active ? 'var(--purple-lt)' : 'transparent', fontWeight: active ? 600 : 400, color: active ? 'var(--purple-d)' : 'var(--t2)' }}
                      onClick={() => toggleDraft('company', c)}>
                      <span className="flex items-center justify-center shrink-0 rounded mt-0.5"
                        style={{ width: 15, height: 15, border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border-md)'}`, background: active ? 'var(--purple)' : '#fff' }}>
                        {active && <svg width="8" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.2"><path d="M1 4l3 3 5-6" /></svg>}
                      </span>
                      <span style={{ wordBreak: 'break-word' }}>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between"
            style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--s2)' }}>
            <span className="text-[11px] italic" style={{ color: 'var(--t4)' }}>
              {draftCount === 0 ? 'No filters selected' : `${draftCount} filter${draftCount > 1 ? 's' : ''} selected`}
            </span>
            <div className="flex items-center gap-2">
              {filterCount > 0 && (
                <button className="flex items-center gap-1.5 font-semibold cursor-pointer transition-all duration-150 rounded-full text-[11.5px]"
                  style={{ padding: '7px 14px', color: 'var(--red)', background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.15)', fontFamily: "'DM Sans', sans-serif" }}
                  onClick={handleClearAll}>
                  Clear all
                </button>
              )}
              <button className="flex items-center gap-2 cursor-pointer font-semibold transition-all duration-150 rounded-full text-white border-none"
                style={{ fontSize: 13, letterSpacing: '.01em', background: 'var(--grad)', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 14px rgba(124,58,237,.40)', padding: '9px 22px' }}
                onClick={applyAndClose}>
                <svg width="12" height="12" viewBox="0 0 14 11" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M1 5.5l4 4L13 1" /></svg>
                Apply &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Toast
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className="fixed flex items-center gap-2 z-2000 rounded-[10px] text-[12.5px] font-medium text-white pointer-events-none"
      style={{ bottom: 18, right: 20, background: 'var(--t1)', padding: '10px 15px', boxShadow: '0 6px 22px rgba(0,0,0,.18)', transform: visible ? 'translateY(0)' : 'translateY(50px)', opacity: visible ? 1 : 0, transition: 'all .28s cubic-bezier(.16,1,.3,1)' }}>
      <div className="w-1.75 h-1.75 rounded-full shrink-0" style={{ background: 'var(--teal)' }} />
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────

// Fixed skeleton widths — deterministic, no Math.random(), no SSR mismatch.
// Columns 1-5 (j=1..5) get these widths cycling per row.
const SKELETON_WIDTHS = [55, 72, 64, 68, 60, 75, 58, 70];

function TableSkeleton() {
  // Only render on the client. The server renders null, the client renders
  // the skeleton after mount — eliminating any SSR/client width mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} style={{ borderBottom: '1px solid var(--border)', padding: '10px 12px' }}>
              <div
                style={{
                  height: j === 0 ? 27 : 14,
                  width: j === 0 ? '70%' : j === 6 ? 52 : `${SKELETON_WIDTHS[(i + j) % SKELETON_WIDTHS.length]}%`,
                  borderRadius: 6,
                  background: 'linear-gradient(90deg,var(--s2) 25%,rgba(124,58,237,.06) 50%,var(--s2) 75%)',
                  backgroundSize: '200% 100%',
                  animation: `shimmer 1.4s ease infinite ${i * 0.06}s`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const {
    users, usersLoading, usersError,
    searchQuery, setSearchQuery, filters,
    addOpen, setAddOpen, editOpen, setEditOpen,
    editForm, setEditForm, toast, animKey,
    searchFocused, setSearchFocused,
    visibleUsers, filteredUsers, filterCount, pagination, setCurrentPage,
    handleToggleFilter, handleClearFilters, handleAddUser, openEditModal, handleEditUser,
    refreshUsers,
  } = useUserManagement();

  const { openRole, rolePerms, openModal: openRoleModal, closeModal: closeRoleModal, savePerms } = useRolePermissions();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RESIDUAL_CSS }} />
      <Header />
      <Sidebar />

      <div className="um-page-shell">
        <div className="flex flex-col w-full h-full overflow-hidden" style={{ padding: '18px 24px 16px', background: 'var(--bg)' }}>

          {/* ── Page Header ── */}
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <h1 className="whitespace-nowrap font-normal" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--t1)', fontSize: 22 }}>
              User <em className="italic" style={{ color: 'var(--purple)' }}>Management</em>
            </h1>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right,rgba(124,58,237,.15),transparent)' }} />
            <button
              className="inline-flex items-center gap-2 rounded-[10px] border-none cursor-pointer font-semibold text-white transition-all duration-150 whitespace-nowrap shrink-0"
              style={{ background: 'var(--grad)', boxShadow: '0 3px 14px rgba(124,58,237,.32)', fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, padding: '8px 18px 8px 14px' }}
              onClick={() => setAddOpen(true)}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <path d="M7 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" /><path d="M1.5 12.5c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4" /><path d="M11 5V8M9.5 6.5h3" />
              </svg>
              Add New User
            </button>
          </div>

          {/* ── Layout grid ── */}
          <div className="grid flex-1 overflow-hidden min-h-0" style={{ gridTemplateColumns: '178px 1fr', gap: '0 16px' }}>

            {/* ── Role Sidebar ── */}
            <div className="flex flex-col overflow-y-auto" style={{ gap: 6, paddingTop: 2 }}>
              <div className="uppercase font-bold tracking-[.18em] text-[8.5px]" style={{ color: 'var(--t4)', padding: '4px 2px 6px', marginTop: 50 }}>Role Overview</div>
              <div className="flex items-center" style={{ gap: 4, padding: '0 2px 4px', fontSize: 9, color: 'var(--t4)', fontStyle: 'italic' }}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5" cy="5" r="4" /><path d="M5 4.5v3M5 3.2v.3" /></svg>
                Click a role to manage permissions
              </div>
              {ROLE_CARDS.map(info => (
                <RoleCard key={info.role} info={info} count={getRoleCount(users, info.role)} onClick={() => openRoleModal(info.role)} />
              ))}
            </div>

            {/* ── Table surface ── */}
            <div className="flex flex-col overflow-hidden min-h-0 rounded-xl bg-white" style={{ border: '1px solid var(--border)', marginTop: 30 }}>

              {/* Toolbar */}
              <div className="flex items-center shrink-0" style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center transition-all duration-150 rounded-[9px]"
                  style={{ gap: 8, width: 300, padding: '7px 12px', background: searchFocused ? '#fff' : 'var(--s2)', border: `1px solid ${searchFocused ? 'var(--border-md)' : 'var(--border)'}`, boxShadow: searchFocused ? '0 0 0 3px rgba(124,58,237,.07)' : 'none' }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12" className="shrink-0" style={{ color: 'var(--t3)' }}>
                    <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
                  </svg>
                  <input type="text" placeholder="Search users…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                    className="bg-transparent border-none outline-none w-full"
                    style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: 'var(--t1)' }}
                  />
                </div>
                <DropdownFilter filters={filters} users={users} onToggle={handleToggleFilter} onClear={handleClearFilters} filterCount={filterCount} />

                {(searchQuery || filterCount > 0) && (
                  <span className="inline-flex items-center rounded-full text-[11px] font-semibold"
                    style={{ padding: '3px 10px', background: 'var(--purple-lt)', color: 'var(--purple-d)', border: '1px solid rgba(124,58,237,.15)' }}>
                    {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
                  </span>
                )}

                {/* Refresh button */}
                <button
                  onClick={refreshUsers}
                  disabled={usersLoading}
                  className="flex items-center justify-center cursor-pointer rounded-lg transition-all duration-150 ml-auto"
                  style={{ width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--s2)', color: 'var(--t3)', flexShrink: 0, opacity: usersLoading ? .5 : 1 }}
                  title="Refresh users"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                    style={{ animation: usersLoading ? 'spin 1s linear infinite' : 'none' }}>
                    <path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3" /><path d="M13.5 2v3.5H10" />
                  </svg>
                </button>
              </div>

              {/* API error banner */}
              {usersError && (
                <div className="flex items-center gap-2 mx-3 mt-3 rounded-lg px-3 py-2.5 text-[12px] font-semibold shrink-0"
                  style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.20)', color: '#dc2626' }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="7" cy="7" r="6" /><path d="M7 4v3.5M7 9.5v.5" />
                  </svg>
                  {usersError} — <button className="underline cursor-pointer" style={{ background: 'none', border: 'none', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }} onClick={refreshUsers}>Retry</button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Full Name', 'Email', 'Access', 'Position', 'Company', 'Status', 'Actions'].map((h, i) => (
                        <th key={h} className="sticky top-0 z-10 text-left bg-white uppercase font-bold text-[9.5px] tracking-[.09em]"
                          style={{ color: 'var(--t3)', borderBottom: '1.5px solid var(--border)', padding: i === 0 ? '8px 12px 8px 16px' : '8px 12px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody key={animKey} className="row-anim">
                    {usersLoading ? (
                      <TableSkeleton />
                    ) : visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 px-5 text-[13px]" style={{ color: 'var(--t3)' }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="mx-auto mb-2 opacity-25">
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                          </svg>
                          {usersError ? 'Failed to load users.' : 'No users match your filters'}
                        </td>
                      </tr>
                    ) : visibleUsers.map((u, idx) => (
                      <UserRow key={u.id ?? `row-${idx}`} user={u} onEdit={openEditModal} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination footer ── */}
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                pageNumbers={pagination.pageNumbers}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>

          {/* ── Popups ── */}
          <AddUserPopup
            open={addOpen}
            companies={COMPANY_OPTIONS}
            onClose={() => { setAddOpen(false); refreshUsers(); }}
            onAdd={handleAddUser}
          />

          <EditUserPopup
            open={editOpen} form={editForm} companies={COMPANY_OPTIONS}
            onClose={() => { setEditOpen(false); setEditForm({ ...EMPTY_EDIT_FORM }); }}
            onChange={setEditForm} onSave={handleEditUser}
          />

          {openRole && (
            <RolePermissionsPopup role={openRole} initialPerms={rolePerms[openRole]} onClose={closeRoleModal} onSave={savePerms} />
          )}

          <Toast message={toast.message} visible={toast.visible} />
        </div>
      </div>
    </>
  );
}









