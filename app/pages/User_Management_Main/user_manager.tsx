'use client';

// ─────────────────────────────────────────────
//  user_manager.tsx  –  User Management Page
//  Tailwind-first refactor: utility classes for
//  all layout/spacing/typography; inline styles
//  only for brand-specific hex/rgba/gradient
//  values that Tailwind CDN cannot generate.
// ─────────────────────────────────────────────

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  ChangeEvent,
} from 'react';
import Header from '../Header_Web/header';
import Sidebar from '../Sidebar_Web/sidebar';

import {
  User,
  UserRole,
  UserStatus,
  UserFilters,
  AddUserForm,
  EditUserForm,
  RoleCardInfo,
  COMPANY_OPTIONS,
  ROLE_CARDS,
  INITIAL_USERS,
  EMPTY_ADD_FORM,
  EMPTY_EDIT_FORM,
  getInitials,
  getRoleBadgeClass,
  getStatusBadgeClass,
  filterUsers,
  getUniqueCompanies,
  getRoleCount,
  countActiveFilters,
  toggleFilterValue,
  emptyFilters,
  validateUserForm,
  validateNewUserPassword,
  validatePasswordChange,
  formToUser,
  userToEditForm,
} from './user_functions';

// ─────────────────────────────────────────────────────────────────────────────
//  CSS Variables + residual CSS
// ─────────────────────────────────────────────────────────────────────────────
const RESIDUAL_CSS = `
  /* ── Brand tokens ── */
  :root {
    --purple:    #7c3aed;
    --purple-d:  #5b21b6;
    --purple-lt: #ede9fe;
    --teal:      #0d9488;
    --teal-lt:   #ccfbf1;
    --sky:       #0284c7;
    --sky-lt:    #e0f2fe;
    --red:       #dc2626;
    --green:     #16a34a;
    --green-lt:  #dcfce7;
    --bg:        #f8f7ff;
    --s2:        #f2f0fb;
    --border:    rgba(124,58,237,.10);
    --border-md: rgba(124,58,237,.22);
    --t1:        #18103a;
    --t2:        #4a3870;
    --t3:        #8e7ec0;
    --t4:        #b8aed8;
    --grad:      linear-gradient(135deg,#7c3aed,#0d9488);
    --gxh-sw:    220px;
  }

  /* ── Badges ── */
  .badge      { display:inline-flex; align-items:center; gap:3px; font-size:9.5px; font-weight:700; letter-spacing:.04em; padding:2px 8px; border-radius:20px; }
  .bg-p       { background:#ede9fe; color:#5b21b6; }
  .bg-t       { background:#ccfbf1; color:#065f46; }
  .bg-a       { background:#fef3c7; color:#78350f; }
  .bg-s       { background:#e0f2fe; color:#0c4a6e; }
  .bg-r       { background:#fee2e2; color:#7f1d1d; }
  .bg-g       { background:#dcfce7; color:#14532d; }
  .bg-y       { background:#fef9c3; color:#713f12; }
  .bg-gray    { background:#f4f4f8; color:#4a3870; }
  .bg-mgr     { background:#fce7f3; color:#9d174d; }

  /* ── Status dots ── */
  .dot        { display:inline-block; border-radius:50%; flex-shrink:0; width:6px; height:6px; }
  .dot-g      { background:#22c55e; box-shadow:0 0 5px rgba(34,197,94,.5); }
  .dot-r      { background:#ef4444; box-shadow:0 0 5px rgba(239,68,68,.5); }

  /* ── Keyframes ── */
  @keyframes rowFadeUp {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes modalIn {
    from { opacity:0; transform:scale(.96) translateY(8px); }
    to   { opacity:1; transform:scale(1)   translateY(0);   }
  }
  @keyframes dfDropIn {
    from { opacity:0; transform:translateY(-6px) scale(.98); }
    to   { opacity:1; transform:translateY(0)    scale(1);   }
  }

  /* ── Row stagger ── */
  .row-anim tbody tr { animation:rowFadeUp .32s cubic-bezier(.22,1,.36,1) both; }
  .row-anim tbody tr:nth-child(1)    { animation-delay:.04s; }
  .row-anim tbody tr:nth-child(2)    { animation-delay:.09s; }
  .row-anim tbody tr:nth-child(3)    { animation-delay:.14s; }
  .row-anim tbody tr:nth-child(4)    { animation-delay:.19s; }
  .row-anim tbody tr:nth-child(5)    { animation-delay:.24s; }
  .row-anim tbody tr:nth-child(6)    { animation-delay:.29s; }
  .row-anim tbody tr:nth-child(7)    { animation-delay:.34s; }
  .row-anim tbody tr:nth-child(8)    { animation-delay:.39s; }
  .row-anim tbody tr:nth-child(9)    { animation-delay:.44s; }
  .row-anim tbody tr:nth-child(10)   { animation-delay:.49s; }
  .row-anim tbody tr:nth-child(n+11) { animation-delay:.54s; }

  /* ── Modal / panel animations ── */
  .modal-anim    { animation:modalIn  .26s cubic-bezier(.16,1,.3,1); }
  .df-panel-anim { animation:dfDropIn .18s cubic-bezier(.16,1,.3,1); }

  /* ── Password eye button ── */
  .pw-eye-btn {
    position:absolute; right:10px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; padding:2px;
    color:var(--t3); display:flex; align-items:center;
  }

  /* ── Page shell: tracks sidebar via CSS variable ── */
  .um-page-shell {
    margin-left: var(--gxh-sw);
    width: calc(100vw - var(--gxh-sw));
    margin-top: 52px;
    height: calc(100vh - 52px);
    transition: margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                width       0.28s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    background: var(--bg);
  }

  /* ── Scrollbar ── */
  * { scrollbar-width:thin; scrollbar-color:rgba(124,58,237,.15) transparent; }
  ::-webkit-scrollbar       { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(124,58,237,.18); border-radius:4px; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface RoleCardProps { info: RoleCardInfo; count: number; }
function RoleCard({ info, count }: RoleCardProps) {
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
        gap: 8,
        padding: '8px 10px',
        border: `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center justify-center shrink-0 rounded-lg"
        style={{ width: 28, height: 28, background: info.iconBg, color: info.iconColor }}
      >
        {iconSvg}
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 }}>{info.role}</div>
        <div style={{ fontSize: 9.5, color: 'var(--t3)', lineHeight: 1.3, marginTop: 1 }}>{info.description}</div>
      </div>
      <div
        className="flex items-center justify-center font-bold rounded-full shrink-0"
        style={{
          fontSize: 9.5,
          minWidth: 18, height: 18,
          padding: '0 5px',
          background: 'var(--purple-lt)',
          color: 'var(--purple-d)',
        }}
      >
        {count}
      </div>
    </div>
  );
}

interface UserRowProps { user: User; onEdit: (user: User) => void; }
function UserRow({ user, onEdit }: UserRowProps) {
  const td: React.CSSProperties = {
    borderBottom: '1px solid var(--border)',
    padding: '9px 12px',
    fontSize: 12,
    color: 'var(--t1)',
    verticalAlign: 'middle',
  };
  const tdFirst: React.CSSProperties = { ...td, padding: '9px 12px 9px 16px' };

  return (
    <tr
      className="transition-colors duration-150"
      onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(c => (c.style.background = 'var(--s2)'))}
      onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(c => (c.style.background = ''))}
    >
      {/* Name */}
      <td style={{ ...tdFirst, fontWeight: 600 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <div
            className="flex items-center justify-center shrink-0 rounded-lg overflow-hidden"
            style={{
              width: 27, height: 27,
              ...(user.imgSrc ? {} : { background: 'var(--grad)', fontSize: 9, fontWeight: 700, color: 'white' }),
            }}
          >
            {user.imgSrc
              ? <img src={user.imgSrc} alt={user.name} className="w-full h-full object-cover" />
              : getInitials(user.name)
            }
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' }}>{user.name}</span>
        </div>
      </td>
      {/* Email */}
      <td style={{ ...td, fontSize: 11.5, color: 'var(--t3)' }}>{user.email}</td>
      {/* Role */}
      <td style={td}><span className={getRoleBadgeClass(user.role)}>{user.role}</span></td>
      {/* Position */}
      <td style={{ ...td, fontSize: 11.5, color: 'var(--t3)' }}>{user.position || '—'}</td>
      {/* Company */}
      <td style={{ ...td, fontSize: 12 }}>{user.company}</td>
      {/* Status */}
      <td style={td}>
        <span className={getStatusBadgeClass(user.status)}>
          <span className={`dot ${user.status === 'Active' ? 'dot-g' : 'dot-r'}`} />{user.status}
        </span>
      </td>
      {/* Actions */}
      <td style={td}>
        <button
          className="inline-flex items-center cursor-pointer rounded transition-all duration-150"
          style={{
            gap: 5,
            padding: '3px 9px',
            border: '1px solid var(--border)',
            background: 'var(--s2)',
            color: 'var(--t2)',
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: "'DM Sans',sans-serif",
          }}
          onClick={() => onEdit(user)}
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10">
            <path d="M8.5 1.5l2 2L3 11H1v-2z" />
          </svg>
          Edit
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dropdown Filter
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const roles: UserRole[]      = ['System Admin', 'Manager', 'User'];
  const statuses: UserStatus[] = ['Active', 'Inactive'];
  const companies               = getUniqueCompanies(users);

  function OptionRow({ label, active, onClick, dot }: { label: string; active: boolean; onClick: () => void; dot?: string }) {
    const [hov, setHov] = useState(false);
    return (
      <button
        className="flex items-center gap-2.5 w-full rounded-lg cursor-pointer text-left transition-all duration-150 text-[12.5px]"
        style={{
          padding: '8px 10px',
          border: `1px solid ${active ? 'rgba(124,58,237,.20)' : 'transparent'}`,
          background: active ? 'var(--purple-lt)' : hov ? 'var(--s2)' : 'transparent',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--purple-d)' : 'var(--t2)',
        }}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <span
          className="flex items-center justify-center shrink-0 rounded w-3.75 h-3.75 transition-all duration-150"
          style={{
            border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border-md)'}`,
            background: active ? 'var(--purple)' : '#fff',
            boxShadow: active ? '0 1px 4px rgba(124,58,237,.35)' : 'none',
          }}
        >
          {active && <svg width="8" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.2"><path d="M1 4l3 3 5-6" /></svg>}
        </span>
        {dot && <span className={`dot ${dot}`} />}
        <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
      </button>
    );
  }

  const isActive = open || filterCount > 0;

  return (
    <div className="relative z-200" ref={ref}>
      {/* Trigger */}
      <button
        className="flex items-center cursor-pointer transition-all duration-150 whitespace-nowrap rounded-[9px] font-semibold shrink-0"
        style={{
          gap: 6,
          padding: '7px 13px',
          border: `1px solid ${isActive ? 'rgba(124,58,237,.30)' : 'var(--border)'}`,
          background: open ? '#fff' : filterCount > 0 ? 'var(--purple-lt)' : 'var(--s2)',
          color: isActive ? 'var(--purple)' : 'var(--t2)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          boxShadow: open ? '0 0 0 3px rgba(124,58,237,.08)' : 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" />
        </svg>
        <span>Filters</span>
        {filterCount > 0 && (
          <span
            className="flex items-center justify-center font-bold text-[9px] text-white rounded-full min-w-4.5 h-4.5 px-1"
            style={{ background: 'var(--purple)' }}
          >
            {filterCount}
          </span>
        )}
        <svg
          className="shrink-0 transition-transform duration-200"
          style={{ opacity: open ? 1 : 0.6, transform: open ? 'rotate(180deg)' : 'none' }}
          width="10" height="10" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.9"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute df-panel-anim overflow-hidden rounded-2xl bg-white z-300"
          style={{
            top: 'calc(100% + 8px)', left: 0,
            border: '1px solid var(--border-md)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,.06),0 12px 40px -4px rgba(124,58,237,.14)',
            minWidth: 640,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}
          >
            <div
              className="flex items-center gap-2 uppercase font-bold text-[11px] tracking-[.04em]"
              style={{ color: 'var(--t2)' }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--purple)" strokeWidth="1.8">
                <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" />
              </svg>
              Filter Users
            </div>
            {filterCount > 0 && (
              <button
                className="flex items-center gap-1.5 font-semibold cursor-pointer transition-all duration-150 rounded text-[10.5px] px-2.5 py-1"
                style={{ color: 'var(--red)', background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.15)' }}
                onClick={onClear}
              >
                Reset
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9" /></svg>
              </button>
            )}
          </div>

          {/* Body — 3 columns */}
          <div className="flex items-start gap-0" style={{ padding: '16px 20px 14px' }}>
            {/* Role */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div
                className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-[.16em]"
                style={{ color: 'var(--t4)', paddingBottom: 10, paddingLeft: 4 }}
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="var(--purple)" strokeWidth="1.7" style={{ opacity: .7 }}>
                  <path d="M7 1l1 2.5 2.5.5-1.8 1.8.4 2.7L7 7.3l-2.1 1.2.4-2.7L3.5 4l2.5-.5z" />
                </svg>
                Role
              </div>
              {roles.map(r => <OptionRow key={r} label={r} active={filters.role.has(r)} onClick={() => onToggle('role', r)} />)}
            </div>

            <div className="shrink-0 self-stretch w-px" style={{ background: 'var(--border)', margin: '0 16px' }} />

            {/* Status */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div
                className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-[.16em]"
                style={{ color: 'var(--t4)', paddingBottom: 10, paddingLeft: 4 }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--purple)" strokeWidth="1.7" style={{ opacity: .7 }}>
                  <circle cx="6" cy="6" r="4.5" />
                </svg>
                Status
              </div>
              {statuses.map(s => <OptionRow key={s} label={s} active={filters.status.has(s)} onClick={() => onToggle('status', s)} dot={s === 'Active' ? 'dot-g' : 'dot-r'} />)}
            </div>

            <div className="shrink-0 self-stretch w-px" style={{ background: 'var(--border)', margin: '0 16px' }} />

            {/* Company */}
            <div className="flex flex-col gap-1 min-w-0" style={{ flex: 2, minWidth: 260 }}>
              <div
                className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-[.16em]"
                style={{ color: 'var(--t4)', paddingBottom: 10, paddingLeft: 4 }}
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="var(--purple)" strokeWidth="1.7" style={{ opacity: .7 }}>
                  <rect x="1.5" y="4" width="11" height="8.5" rx="1" />
                  <path d="M4.5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4" />
                </svg>
                Company
              </div>
              <div className="grid grid-cols-2 gap-1">
                {companies.map(c => (
                  <button
                    key={c}
                    className="flex items-start gap-2 w-full rounded-lg cursor-pointer text-left transition-all duration-150 text-[12px]"
                    style={{
                      padding: '8px 10px 8px 8px',
                      border: `1px solid ${filters.company.has(c) ? 'rgba(124,58,237,.20)' : 'transparent'}`,
                      background: filters.company.has(c) ? 'var(--purple-lt)' : 'transparent',
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: filters.company.has(c) ? 600 : 400,
                      color: filters.company.has(c) ? 'var(--purple-d)' : 'var(--t2)',
                    }}
                    onClick={() => onToggle('company', c)}
                  >
                    <span
                      className="flex items-center justify-center shrink-0 rounded mt-0.5 w-3.75 h-3.75"
                      style={{
                        border: `1.5px solid ${filters.company.has(c) ? 'var(--purple)' : 'var(--border-md)'}`,
                        background: filters.company.has(c) ? 'var(--purple)' : '#fff',
                      }}
                    >
                      {filters.company.has(c) && <svg width="8" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.2"><path d="M1 4l3 3 5-6" /></svg>}
                    </span>
                    <span style={{ wordBreak: 'break-word' }}>{c}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between"
            style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--s2)' }}
          >
            <span className="text-[11px] italic" style={{ color: 'var(--t4)' }}>
              {filterCount === 0 ? 'No filters active' : `${filterCount} filter${filterCount > 1 ? 's' : ''} applied`}
            </span>
            <button
              className="flex items-center gap-2 cursor-pointer font-semibold transition-all duration-150 rounded-full text-[12px] text-white border-none"
              style={{
                background: 'var(--grad)',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 2px 8px rgba(124,58,237,.28)',
                padding: '8px 18px',
              }}
              onClick={() => setOpen(false)}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7l4 4 6-6" /></svg>
              Apply &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Avatar Uploader
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarUploaderProps {
  inputId: string; initials: string; imgSrc: string | null;
  accentColor: string; buttonLabel: string; buttonStyle: React.CSSProperties;
  onImageLoad: (src: string) => void;
}
function AvatarUploader({ inputId, initials, imgSrc, accentColor, buttonLabel, buttonStyle, onImageLoad }: AvatarUploaderProps) {
  const [hovered, setHovered] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) onImageLoad(ev.target.result as string); };
    reader.readAsDataURL(file);
  }
  return (
    <div
      className="flex items-center rounded-xl"
      style={{ gap: 16, padding: '14px 16px', background: 'var(--s2)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative"
        style={{ width: 80, height: 80, borderRadius: 16, background: accentColor }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {imgSrc
          ? <img src={imgSrc} alt="avatar" className="w-full h-full object-cover absolute inset-0" />
          : <span className="relative z-10 font-bold text-white" style={{ fontSize: 22 }}>{initials || '?'}</span>
        }
        <div
          className="absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-150"
          style={{ background: 'rgba(0,0,0,.35)', opacity: hovered ? 1 : 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </div>
      </div>

      <input ref={fileRef} id={inputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <div className="flex-1">
        <div className="font-bold" style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 3 }}>Profile Photo</div>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 8 }}>Upload a photo or let initials auto-generate</div>
        <button
          className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
          style={{
            fontSize: 12,
            padding: '5px 14px',
            borderRadius: 8,
            fontFamily: "'DM Sans',sans-serif",
            ...buttonStyle,
          }}
          onClick={() => fileRef.current?.click()}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Status Radio Group
// ─────────────────────────────────────────────────────────────────────────────

interface StatusRadioGroupProps { name: string; value: UserStatus; onChange: (v: UserStatus) => void; }
function StatusRadioGroup({ name, value, onChange }: StatusRadioGroupProps) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>Status</label>
      <div className="flex" style={{ gap: 12 }}>
        {(['Active', 'Inactive'] as UserStatus[]).map((s) => (
          <label
            key={s}
            className="flex items-center cursor-pointer font-medium flex-1 transition-all duration-150"
            style={{
              gap: 8,
              fontSize: 13,
              padding: '10px 16px',
              borderRadius: 10,
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderColor: value === s ? (s === 'Active' ? 'var(--green)' : 'var(--red)') : 'var(--border)',
              background: value === s ? (s === 'Active' ? 'rgba(22,163,74,.07)' : 'rgba(220,38,38,.07)') : '#fff',
            }}
          >
            <input
              type="radio" name={name} value={s}
              checked={value === s}
              onChange={() => onChange(s)}
              style={{ accentColor: s === 'Active' ? 'var(--green)' : 'var(--red)', width: 15, height: 15 }}
            />
            <span className={`dot ${s === 'Active' ? 'dot-g' : 'dot-r'}`} style={{ width: 8, height: 8 }} />
            {s}
          </label>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Password Field
// ─────────────────────────────────────────────────────────────────────────────

interface PasswordFieldProps {
  id: string; label: string; sublabel?: string; value: string;
  onChange: (v: string) => void; onInput?: () => void;
  matchMsg?: { ok: boolean; text: string } | null;
  placeholder?: string;
}
function PasswordField({ id, label, sublabel, value, onChange, onInput, matchMsg, placeholder }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 5, display: 'flex', alignItems: 'baseline', gap: 5 }}>
          {label}
          {sublabel && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>{sublabel}</span>}
        </label>
      )}
      <div className="relative">
        <input
          className="w-full transition-all duration-150 focus:outline-none"
          type={show ? 'text' : 'password'}
          id={id}
          value={value}
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 40px 10px 13px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: 'var(--t1)',
          }}
          onChange={(e) => onChange(e.target.value)}
          onInput={onInput}
          placeholder={placeholder ?? (label ? `Enter ${label.toLowerCase()}…` : 'Enter password…')}
        />
        <button type="button" className="pw-eye-btn" onClick={() => setShow(s => !s)}>
          {show
            ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l12 12M6.5 6.7A4.5 4.5 0 0 0 8 13.5c4.5 0 7-5 7-5s-.9-1.7-2.5-3" /><path d="M4.5 4.5C2.9 5.8 1 8 1 8s2.5 5 7 5c1.2 0 2.2-.3 3.1-.7" strokeOpacity=".4" /></svg>
            : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2.2" /></svg>
          }
        </button>
      </div>
      {matchMsg && (
        <div style={{ fontSize: 11, marginTop: 5, color: matchMsg.ok ? 'var(--green)' : 'var(--red)' }}>
          {matchMsg.text}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared form field wrappers
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 2, display: 'block' }}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>
  );
}

const baseInputStyle: React.CSSProperties = {
  background: 'var(--s2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 13px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: 'var(--t1)',
  outline: 'none',
  width: '100%',
  transition: 'all .16s',
};

function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...baseInputStyle,
        ...(focused ? { background: '#fff', borderColor: 'var(--border-md)', boxShadow: '0 0 0 3px rgba(124,58,237,.08)' } : {}),
        ...props.style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...baseInputStyle,
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 11px center',
        paddingRight: 26,
        cursor: 'pointer',
        ...(focused ? { background: '#fff', borderColor: 'var(--border-md)', boxShadow: '0 0 0 3px rgba(124,58,237,.08)' } : {}),
        ...props.style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Add User Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AddUserModalProps {
  open: boolean; companies: string[];
  onClose: () => void; onAdd: (form: AddUserForm) => string | null;
}
function AddUserModal({ open, companies, onClose, onAdd }: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>({ ...EMPTY_ADD_FORM });
  const [matchMsg, setMatchMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(pw === confirm
      ? { ok: true,  text: '✓ Passwords match' }
      : { ok: false, text: '✗ Passwords do not match' }
    );
  }

  function reset() { setForm({ ...EMPTY_ADD_FORM }); setMatchMsg(null); }
  function handleClose() { reset(); onClose(); }
  function handleSubmit() { const err = onAdd(form); if (!err) reset(); }

  const initials = (form.firstName ? form.firstName[0] : '') + (form.lastName ? form.lastName[0] : '');
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-1000"
      style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="flex flex-col modal-anim overflow-hidden bg-white"
        style={{
          width: 660,
          maxWidth: '94vw',
          borderRadius: 18,
          boxShadow: '0 24px 80px rgba(20,10,40,.28)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center relative overflow-hidden"
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg,#5b21b6 0%,#7c3aed 55%,#0d9488 100%)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
          <div
            className="flex items-center justify-center shrink-0 relative z-10"
            style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', marginRight: 14 }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M2 15s2.5-4 7-4 7 4 7 4" /><circle cx="9" cy="6" r="3.5" /><path d="M14 3v4M12 5h4" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-white font-extrabold" style={{ fontSize: 18 }}>Add New User</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Create a user account and assign access</div>
          </div>
          <button
            className="relative z-10 flex items-center justify-center cursor-pointer transition-all duration-150"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,.18)',
              border: '1px solid rgba(255,255,255,.22)',
              color: 'white',
              marginLeft: 12,
            }}
            onClick={handleClose}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M1 1l9 9M10 1L1 10" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col overflow-y-auto" style={{ padding: '20px 24px', gap: 16, maxHeight: '72vh' }}>
          <AvatarUploader
            inputId="au-file" initials={initials.toUpperCase()} imgSrc={form.imgSrc ?? null}
            accentColor="linear-gradient(135deg,#7c3aed,#0d9488)" buttonLabel="Choose Image"
            buttonStyle={{ color: 'var(--purple)', background: 'var(--purple-lt)', border: '1px solid rgba(124,58,237,.20)' }}
            onImageLoad={src => setForm(f => ({ ...f, imgSrc: src }))}
          />
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>First Name</FieldLabel>
              <FInput type="text" placeholder="Jane" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Last Name</FieldLabel>
              <FInput type="text" placeholder="Smith" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Email Address</FieldLabel>
            <FInput type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>User Role</FieldLabel>
              <FSelect value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="">Select role…</option><option>System Admin</option><option>Manager</option><option>User</option>
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Company</FieldLabel>
              <FSelect value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                <option value="">Select company…</option>{companies.map(c => <option key={c}>{c}</option>)}
              </FSelect>
            </div>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Position / Title</FieldLabel>
              <FInput type="text" placeholder="e.g. Store Manager" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <FInput type="tel" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <StatusRadioGroup name="au-status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />

          {/* ── Password divider ── */}
          <div className="text-center" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>
              Set Password
            </span>
          </div>

          {/* ── Password ── */}
          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Password</FieldLabel>
            <PasswordField
              id="au-password"
              label=""
              placeholder="Enter password…"
              value={form.password}
              onChange={v => {
                setForm(f => ({ ...f, password: v }));
                checkMatch(v, form.confirmPassword);
              }}
            />
          </div>

          {/* ── Confirm Password ── */}
          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Confirm Password</FieldLabel>
            <PasswordField
              id="au-confirm-password"
              label=""
              placeholder="Confirm password…"
              value={form.confirmPassword}
              onChange={v => {
                setForm(f => ({ ...f, confirmPassword: v }));
                checkMatch(form.password, v);
              }}
              matchMsg={matchMsg}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end" style={{ gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
            style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
            onClick={handleClose}
          >Cancel</button>
          <button
            className="inline-flex items-center cursor-pointer font-semibold text-white transition-all duration-150"
            style={{ gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', background: 'var(--grad)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 12px rgba(124,58,237,.30)' }}
            onClick={handleSubmit}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
            Add User
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Edit User Modal
// ─────────────────────────────────────────────────────────────────────────────

interface EditUserModalProps {
  open: boolean; form: EditUserForm; companies: string[];
  onClose: () => void; onChange: (form: EditUserForm) => void;
  onSave: (form: EditUserForm) => string | null;
}
function EditUserModal({ open, form, companies, onClose, onChange, onSave }: EditUserModalProps) {
  const [matchMsg, setMatchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(pw === confirm ? { ok: true, text: '✓ Passwords match' } : { ok: false, text: '✗ Passwords do not match' });
  }
  function handleClose() { setMatchMsg(null); onClose(); }
  function handleSave() { const err = onSave(form); if (!err) setMatchMsg(null); }
  if (!open) return null;
  const initials = (form.firstName ? form.firstName[0] : '') + (form.lastName ? form.lastName[0] : '');

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-1000"
      style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="flex flex-col modal-anim overflow-hidden bg-white"
        style={{ width: 660, maxWidth: '94vw', borderRadius: 18, boxShadow: '0 24px 80px rgba(20,10,40,.28)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center relative overflow-hidden"
          style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#065f46 0%,#0d9488 55%,#0284c7 100%)' }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
          <div
            className="flex items-center justify-center shrink-0 relative z-10"
            style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', marginRight: 14 }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.7">
              <path d="M12.5 2.5l3 3L5 16H2v-3z" /><path d="M10 5l3 3" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-white font-extrabold" style={{ fontSize: 18 }}>Edit User: {form.firstName} {form.lastName}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Update user information and access</div>
          </div>
          <button
            className="relative z-10 flex items-center justify-center cursor-pointer transition-all duration-150"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', color: 'white', marginLeft: 12 }}
            onClick={handleClose}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10" /></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col overflow-y-auto" style={{ padding: '20px 24px', gap: 16, maxHeight: '72vh' }}>
          <AvatarUploader
            inputId="eu-file" initials={initials.toUpperCase()} imgSrc={form.imgSrc ?? null}
            accentColor="linear-gradient(135deg,#0d9488,#0284c7)" buttonLabel="Change Photo"
            buttonStyle={{ color: 'var(--teal)', background: 'var(--teal-lt)', border: '1px solid rgba(13,148,136,.28)' }}
            onImageLoad={src => onChange({ ...form, imgSrc: src })}
          />
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>First Name</FieldLabel>
              <FInput type="text" value={form.firstName} onChange={e => onChange({ ...form, firstName: e.target.value })} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Last Name</FieldLabel>
              <FInput type="text" value={form.lastName} onChange={e => onChange({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Email Address</FieldLabel>
            <FInput type="email" value={form.email} onChange={e => onChange({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>User Role</FieldLabel>
              <FSelect value={form.role} onChange={e => onChange({ ...form, role: e.target.value })}>
                <option value="">Select role…</option><option>System Admin</option><option>Manager</option><option>User</option>
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Company</FieldLabel>
              <FSelect value={form.company} onChange={e => onChange({ ...form, company: e.target.value })}>
                <option value="">Select company…</option>{companies.map(c => <option key={c}>{c}</option>)}
              </FSelect>
            </div>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Position / Title</FieldLabel>
              <FInput type="text" placeholder="e.g. Store Manager" value={form.position} onChange={e => onChange({ ...form, position: e.target.value })} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <FInput type="tel" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => onChange({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <StatusRadioGroup name="eu-status" value={form.status} onChange={v => onChange({ ...form, status: v })} />
          <div className="text-center" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>
              Change Password
            </span>
          </div>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', display: 'flex', alignItems: 'baseline', gap: 5 }}>
              New Password
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>(leave blank to keep current)</span>
            </label>
            <PasswordField
              id="eu-new-pw" label="" value={form.newPassword}
              onChange={v => { onChange({ ...form, newPassword: v }); checkMatch(v, form.confirmPassword); }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel>Confirm Password</FieldLabel>
            <PasswordField
              id="eu-confirm-pw" label="" value={form.confirmPassword}
              onChange={v => { onChange({ ...form, confirmPassword: v }); checkMatch(form.newPassword, v); }}
              matchMsg={matchMsg}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end" style={{ gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
            style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
            onClick={handleClose}
          >Cancel</button>
          <button
            className="inline-flex items-center cursor-pointer font-semibold text-white transition-all duration-150"
            style={{ gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#065f46,#0d9488 50%,#0284c7)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 12px rgba(13,148,136,.35)' }}
            onClick={handleSave}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Toast
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps { message: string; visible: boolean; }
function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className="fixed flex items-center gap-2 z-2000 rounded-[10px] text-[12.5px] font-medium text-white pointer-events-none"
      style={{
        bottom: 18, right: 20,
        background: 'var(--t1)',
        padding: '10px 15px',
        boxShadow: '0 6px 22px rgba(0,0,0,.18)',
        transform: visible ? 'translateY(0)' : 'translateY(50px)',
        opacity: visible ? 1 : 0,
        transition: 'all .28s cubic-bezier(.16,1,.3,1)',
      }}
    >
      <div className="w-1.75 h-1.75 rounded-full shrink-0" style={{ background: 'var(--teal)' }} />
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const [users,         setUsers]         = useState<User[]>([...INITIAL_USERS]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filters,       setFilters]       = useState<UserFilters>(emptyFilters());
  const [addOpen,       setAddOpen]       = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const [editForm,      setEditForm]      = useState<EditUserForm>({ ...EMPTY_EDIT_FORM });
  const [toast,         setToast]         = useState({ visible: false, message: '' });
  const [animKey,       setAnimKey]       = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  }, []);

  const visibleUsers = filterUsers(users, searchQuery, filters);
  const filterCount  = countActiveFilters(filters);
  const companies    = getUniqueCompanies(users).length ? getUniqueCompanies(users) : COMPANY_OPTIONS;

  useEffect(() => { setAnimKey(k => k + 1); }, [searchQuery, filters]);

  function handleToggleFilter(type: keyof UserFilters, value: string) {
    setFilters(f => ({ ...f, [type]: toggleFilterValue(f[type], value) }));
  }
  function handleClearFilters() { setFilters(emptyFilters()); }

  function handleAddUser(form: AddUserForm): string | null {
    const err = validateUserForm(form); if (err) { showToast(err); return err; }
    const pwErr = validateNewUserPassword(form.password, form.confirmPassword); if (pwErr) { showToast(pwErr); return pwErr; }
    const newId = Math.max(0, ...users.map(u => u.id)) + 1;
    setUsers(prev => [{
      id: newId,
      name: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email, role: form.role as UserRole,
      company: form.company, position: form.position,
      status: form.status, phone: form.phone || undefined,
      imgSrc: form.imgSrc ?? null,
    }, ...prev]);
    setAddOpen(false);
    showToast(`User "${form.firstName} ${form.lastName}" added!`);
    return null;
  }

  function openEditModal(user: User) { setEditForm(userToEditForm(user)); setEditOpen(true); }

  function handleEditUser(form: EditUserForm): string | null {
    const baseErr = validateUserForm(form); if (baseErr) { showToast(baseErr); return baseErr; }
    const pwErr = validatePasswordChange(form.newPassword, form.confirmPassword); if (pwErr) { showToast(pwErr); return pwErr; }
    setUsers(prev => prev.map(u => u.id === form.userId
      ? { ...u, name: `${form.firstName} ${form.lastName}`.trim(), email: form.email, role: form.role as UserRole, company: form.company, position: form.position, status: form.status, phone: form.phone || undefined, imgSrc: form.imgSrc ?? null }
      : u
    ));
    setEditOpen(false);
    showToast(`User "${form.firstName} ${form.lastName}" updated${form.newPassword ? ' & password changed' : ''}!`);
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RESIDUAL_CSS }} />
      <Header />
      <Sidebar />

      {/* ── Page shell: margin-left and width driven by --gxh-sw CSS variable ── */}
      <div className="um-page-shell">
        <div
          className="flex flex-col w-full h-full overflow-hidden"
          style={{ padding: '18px 24px 16px', background: 'var(--bg)' }}
        >

          {/* ── Page Header ── */}
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <h1
              className="whitespace-nowrap font-normal"
              style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--t1)', fontSize: 22 }}
            >
              User <em className="italic" style={{ color: 'var(--purple)' }}>Management</em>
            </h1>
            <div
              className="flex-1 h-px"
              style={{ background: 'linear-gradient(to right,rgba(124,58,237,.15),transparent)' }}
            />
            <button
              className="inline-flex items-center gap-2 rounded-[10px] border-none cursor-pointer font-semibold text-white transition-all duration-150 whitespace-nowrap shrink-0"
              style={{
                background: 'var(--grad)',
                boxShadow: '0 3px 14px rgba(124,58,237,.32)',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12.5,
                padding: '8px 18px 8px 14px',
              }}
              onClick={() => setAddOpen(true)}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <path d="M7 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
                <path d="M1.5 12.5c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4" />
                <path d="M11 5V8M9.5 6.5h3" />
              </svg>
              Add New User
            </button>
          </div>

          {/* ── Layout grid ── */}
          <div className="grid flex-1 overflow-hidden min-h-0" style={{ gridTemplateColumns: '178px 1fr', gap: '0 16px' }}>

            {/* Role Sidebar */}
            <div className="flex flex-col overflow-y-auto" style={{ gap: 6, paddingTop: 2 }}>
              <div
                className="uppercase font-bold tracking-[.18em] text-[8.5px]"
                style={{ color: 'var(--t4)', padding: '4px 2px 6px', marginTop: 50 }}
              >
                Role Overview
              </div>
              {ROLE_CARDS.map(info => (
                <RoleCard key={info.role} info={info} count={getRoleCount(users, info.role)} />
              ))}
            </div>

            {/* Table surface */}
            <div
              className="flex flex-col overflow-hidden min-h-0 rounded-xl bg-white"
              style={{ border: '1px solid var(--border)', marginTop: 30 }}
            >
              {/* Toolbar */}
              <div
                className="flex items-center shrink-0"
                style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}
              >
                <div
                  className="flex items-center transition-all duration-150 rounded-[9px]"
                  style={{
                    gap: 8,
                    width: 300,
                    background: searchFocused ? '#fff' : 'var(--s2)',
                    border: `1px solid ${searchFocused ? 'var(--border-md)' : 'var(--border)'}`,
                    boxShadow: searchFocused ? '0 0 0 3px rgba(124,58,237,.07)' : 'none',
                    padding: '7px 12px',
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12" className="shrink-0" style={{ color: 'var(--t3)' }}>
                    <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
                  </svg>
                  <input
                    type="text" placeholder="Search users…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="bg-transparent border-none outline-none w-full"
                    style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: 'var(--t1)' }}
                  />
                </div>

                <DropdownFilter
                  filters={filters} users={users}
                  onToggle={handleToggleFilter}
                  onClear={handleClearFilters}
                  filterCount={filterCount}
                />
              </div>

              {/* Active filter pills */}
              {filterCount > 0 && (
                <div
                  className="flex items-center flex-wrap shrink-0"
                  style={{ gap: 6, padding: '7px 14px', background: 'rgba(124,58,237,.03)', borderBottom: '1px solid var(--border)' }}
                >
                  {Array.from(filters.role).length > 0 && (
                    <div className="flex items-center" style={{ gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--t4)', marginRight: 2 }}>Role</span>
                      {Array.from(filters.role).map(r => (
                        <span key={r} className="inline-flex items-center font-semibold" style={{ gap: 5, fontSize: 11, padding: '3px 5px 3px 9px', borderRadius: 20, background: 'var(--purple-lt)', color: 'var(--purple-d)', border: '1px solid rgba(124,58,237,.20)' }}>
                          {r}
                          <button className="flex items-center justify-center cursor-pointer transition-all duration-100" style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(124,58,237,.15)', border: 'none', padding: 0, color: 'var(--purple-d)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,.30)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,.15)')} onClick={() => handleToggleFilter('role', r)}>
                            <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M1 1l8 8M9 1L1 9" /></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.from(filters.role).length > 0 && Array.from(filters.status).length > 0 && (<div style={{ width: 1, height: 16, background: 'var(--border)', borderRadius: 1, flexShrink: 0 }} />)}
                  {Array.from(filters.status).length > 0 && (
                    <div className="flex items-center" style={{ gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--t4)', marginRight: 2 }}>Status</span>
                      {Array.from(filters.status).map(s => (
                        <span key={s} className="inline-flex items-center font-semibold" style={{ gap: 5, fontSize: 11, padding: '3px 5px 3px 8px', borderRadius: 20, background: s === 'Active' ? 'rgba(22,163,74,.10)' : 'rgba(220,38,38,.08)', color: s === 'Active' ? '#14532d' : '#7f1d1d', border: `1px solid ${s === 'Active' ? 'rgba(22,163,74,.25)' : 'rgba(220,38,38,.20)'}` }}>
                          <span className={`dot ${s === 'Active' ? 'dot-g' : 'dot-r'}`} style={{ width: 6, height: 6 }} />{s}
                          <button className="flex items-center justify-center cursor-pointer transition-all duration-100" style={{ width: 14, height: 14, borderRadius: '50%', background: s === 'Active' ? 'rgba(22,163,74,.15)' : 'rgba(220,38,38,.12)', border: 'none', padding: 0, color: 'inherit' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')} onClick={() => handleToggleFilter('status', s)}>
                            <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M1 1l8 8M9 1L1 9" /></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {Array.from(filters.status).length > 0 && Array.from(filters.company).length > 0 && (<div style={{ width: 1, height: 16, background: 'var(--border)', borderRadius: 1, flexShrink: 0 }} />)}
                  {Array.from(filters.role).length > 0 && Array.from(filters.status).length === 0 && Array.from(filters.company).length > 0 && (<div style={{ width: 1, height: 16, background: 'var(--border)', borderRadius: 1, flexShrink: 0 }} />)}
                  {Array.from(filters.company).length > 0 && (
                    <div className="flex items-center flex-wrap" style={{ gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--t4)', marginRight: 2 }}>Company</span>
                      {Array.from(filters.company).map(c => (
                        <span key={c} className="inline-flex items-center font-semibold" style={{ gap: 5, fontSize: 11, padding: '3px 5px 3px 9px', borderRadius: 20, background: 'var(--teal-lt)', color: '#065f46', border: '1px solid rgba(13,148,136,.22)' }}>
                          {c}
                          <button className="flex items-center justify-center cursor-pointer transition-all duration-100" style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(13,148,136,.15)', border: 'none', padding: 0, color: '#065f46' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,.28)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(13,148,136,.15)')} onClick={() => handleToggleFilter('company', c)}>
                            <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M1 1l8 8M9 1L1 9" /></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
                    style={{ gap: 5, marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(220,38,38,.20)', background: 'rgba(220,38,38,.05)', color: 'var(--red)', fontFamily: "'DM Sans',sans-serif" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,.05)'; }}
                    onClick={handleClearFilters}
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M9 1L1 9" /></svg>
                    Clear all
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Full Name','Email','Access','Position','Company','Status','Actions'].map((h, i) => (
                        <th
                          key={h}
                          className="sticky top-0 z-10 text-left bg-white uppercase font-bold text-[9.5px] tracking-[.09em]"
                          style={{ color: 'var(--t3)', borderBottom: '1.5px solid var(--border)', padding: i === 0 ? '8px 12px 8px 16px' : '8px 12px' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody key={animKey} className="row-anim">
                    {visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 px-5 text-[13px]" style={{ color: 'var(--t3)' }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="mx-auto mb-2 opacity-25">
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                          </svg>
                          No users match your filters
                        </td>
                      </tr>
                    ) : visibleUsers.map(u => (
                      <UserRow key={u.id} user={u} onEdit={openEditModal} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                className="flex items-center justify-between shrink-0"
                style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--t3)' }}
              >
                <span>Showing 1–{visibleUsers.length} of {users.length} entries</span>
                <div className="flex gap-1">
                  {['‹','1','2','3','›'].map((p, i) => (
                    <button
                      key={i}
                      className="flex items-center justify-center cursor-pointer transition-all duration-150 w-6.25 h-6.25 rounded-[5px] text-[11px] font-medium"
                      style={{ border: `1px solid ${p === '1' ? 'var(--purple)' : 'var(--border)'}`, background: p === '1' ? 'var(--purple)' : '#fff', color: p === '1' ? 'white' : 'var(--t2)' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AddUserModal open={addOpen} companies={COMPANY_OPTIONS} onClose={() => setAddOpen(false)} onAdd={handleAddUser} />
          <EditUserModal open={editOpen} form={editForm} companies={COMPANY_OPTIONS} onClose={() => setEditOpen(false)} onChange={setEditForm} onSave={handleEditUser} />
          <Toast message={toast.message} visible={toast.visible} />
        </div>
      </div>
    </>
  );
}