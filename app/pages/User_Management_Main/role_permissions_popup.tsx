'use client';

// ─────────────────────────────────────────────
//  role_permissions_popup.tsx  –  Role Permissions Modal
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { UserRole } from './user_functions';
import { PermissionKey, Permission, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './user_roles_func';

// ── Role visual config ────────────────────────────────────────────────────────

interface RoleConfig {
  gradient:    string;
  headerGrad:  string;
  accentColor: string;
  icon:        React.ReactNode;
}

function getRoleConfig(role: UserRole): RoleConfig {
  switch (role) {
    case 'System Admin': return {
      gradient:    'linear-gradient(135deg,#0c4a6e,#0284c7 55%,#7c3aed)',
      headerGrad:  'linear-gradient(135deg,#0c4a6e,#0284c7 50%,#7c3aed)',
      accentColor: '#0284c7',
      icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M9 1l1.2 3 3 .6-2.2 2.1.5 3.3L9 8.7l-2.5 1.3.5-3.3L4.8 4.6l3-.6z" />
        <path d="M4 14s1.5-2 5-2 5 2 5 2" />
      </svg>,
    };
    case 'Manager': return {
      gradient:    'linear-gradient(135deg,#831843,#be185d 50%,#e879a0)',
      headerGrad:  'linear-gradient(135deg,#831843,#be185d 50%,#db2777)',
      accentColor: '#be185d',
      icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M3 15s2-3 6-3 6 3 6 3" /><circle cx="9" cy="6.5" r="3" />
        <path d="M13 4s1 1 1 2.5-1 2.5-1 2.5" strokeOpacity=".5" />
      </svg>,
    };
    default: return {
      gradient:    'linear-gradient(135deg,#14532d,#16a34a 55%,#4ade80)',
      headerGrad:  'linear-gradient(135deg,#14532d,#16a34a 55%,#22c55e)',
      accentColor: '#16a34a',
      icon: <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
        <path d="M3 15s2-3 6-3 6 3 6 3" /><circle cx="9" cy="6.5" r="3" />
      </svg>,
    };
  }
}

// ── Permission Toggle Row ─────────────────────────────────────────────────────

interface PermToggleProps {
  perm:        Permission;
  enabled:     boolean;
  accentColor: string;
  onChange:    (key: PermissionKey, val: boolean) => void;
}

function PermToggle({ perm, enabled, accentColor, onChange }: PermToggleProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center transition-all duration-150 rounded-xl"
      style={{
        gap: 12, padding: '10px 14px', cursor: 'pointer',
        background: enabled ? `${accentColor}0d` : hovered ? 'var(--s2)' : '#fff',
        border: `1px solid ${enabled ? `${accentColor}33` : hovered ? 'var(--border-md)' : 'var(--border)'}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onChange(perm.key, !enabled)}
    >
      {/* Pill toggle */}
      <div
        className="shrink-0 relative transition-all duration-200"
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: enabled ? accentColor : '#d1d5db',
          boxShadow: enabled ? `0 2px 8px ${accentColor}55` : 'inset 0 1px 3px rgba(0,0,0,.10)',
        }}
      >
        <div
          className="absolute top-0.5 transition-all duration-200"
          style={{
            width: 16, height: 16, borderRadius: '50%',
            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.18)',
            left: enabled ? 18 : 2,
          }}
        />
      </div>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center" style={{ gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: enabled ? 'var(--t1)' : 'var(--t2)' }}>
            {perm.label}
          </span>
          {perm.dangerous && (
            <span style={{
              fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '1px 5px', borderRadius: 4,
              background: 'rgba(220,38,38,.10)', color: '#dc2626',
              border: '1px solid rgba(220,38,38,.18)',
            }}>Sensitive</span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 1, lineHeight: 1.3 }}>
          {perm.description}
        </div>
      </div>

      {/* On / Off chip */}
      <span className="shrink-0 font-bold" style={{
        fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase',
        padding: '2px 7px', borderRadius: 20,
        background: enabled ? `${accentColor}1a` : 'rgba(0,0,0,.05)',
        color: enabled ? accentColor : 'var(--t4)',
        border: `1px solid ${enabled ? `${accentColor}33` : 'transparent'}`,
      }}>
        {enabled ? 'On' : 'Off'}
      </span>
    </div>
  );
}

// ── Permission Group (collapsible) ────────────────────────────────────────────

interface PermGroupProps {
  groupName:   string;
  groupIcon:   string;
  perms:       Permission[];
  permissions: Record<PermissionKey, boolean>;
  accentColor: string;
  onChange:    (key: PermissionKey, val: boolean) => void;
}

function PermGroup({ groupName, groupIcon, perms, permissions, accentColor, onChange }: PermGroupProps) {
  const [collapsed, setCollapsed] = useState(true);
  const enabledCount = perms.filter(p => permissions[p.key]).length;

  return (
    /*
     * Key fix: NO overflow:hidden on this wrapper.
     * The original code had `overflow-hidden` which caused sibling groups
     * below an expanded one to be visually clipped/hidden.
     * Border-radius is applied only to the visible edges via borderRadius style.
     */
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
      {/* Header button */}
      <button
        className="flex items-center w-full transition-all duration-150"
        style={{
          gap: 10,
          padding: '11px 14px',
          background: 'var(--s2)',
          cursor: 'pointer',
          border: 'none',
          borderRadius: collapsed ? 11 : '11px 11px 0 0',
          fontFamily: "'DM Sans', sans-serif",
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ fontSize: 15 }}>{groupIcon}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t1)', flex: 1, textAlign: 'left' }}>
          {groupName}
        </span>
        <span className="font-bold" style={{
          fontSize: 9.5, padding: '2px 8px', borderRadius: 20,
          background: enabledCount > 0 ? `${accentColor}18` : 'rgba(0,0,0,.06)',
          color: enabledCount > 0 ? accentColor : 'var(--t4)',
          border: `1px solid ${enabledCount > 0 ? `${accentColor}30` : 'transparent'}`,
        }}>
          {enabledCount}/{perms.length}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 10 6" fill="none"
          stroke="var(--t3)" strokeWidth="1.8"
          className="transition-transform duration-200"
          style={{ marginLeft: 4, transform: collapsed ? 'rotate(-90deg)' : 'none' }}
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {/* Expanded content — in normal document flow so siblings stack correctly */}
      {!collapsed && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: '0 0 11px 11px' }}>
          {perms.map(p => (
            <PermToggle key={p.key} perm={p} enabled={permissions[p.key]} accentColor={accentColor} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Save Toast ────────────────────────────────────────────────────────────────

function SaveToast({ visible, role }: { visible: boolean; role: UserRole }) {
  return (
    <div
      className="fixed flex items-center gap-2 z-[2100] rounded-[10px] font-medium text-white pointer-events-none"
      style={{
        bottom: 22, left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 50}px)`,
        opacity: visible ? 1 : 0,
        transition: 'all .3s cubic-bezier(.16,1,.3,1)',
        background: 'var(--t1)', padding: '10px 18px', fontSize: 12.5,
        boxShadow: '0 8px 24px rgba(0,0,0,.2)', whiteSpace: 'nowrap',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#22c55e" strokeWidth="2.2">
        <path d="M2 7l4 4 6-6" />
      </svg>
      {role} permissions saved!
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export interface RolePermissionsPopupProps {
  role:          UserRole;
  onClose:       () => void;
  initialPerms?: Record<PermissionKey, boolean>;
  onSave?:       (role: UserRole, perms: Record<PermissionKey, boolean>) => void;
}

export default function RolePermissionsPopup({ role, onClose, initialPerms, onSave }: RolePermissionsPopupProps) {
  const cfg = getRoleConfig(role);

  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(
    () => ({ ...(initialPerms ?? DEFAULT_ROLE_PERMISSIONS[role]) }),
  );
  const [dirty,     setDirty]     = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups  = [...new Set(ALL_PERMISSIONS.map(p => p.group))];
  const total   = ALL_PERMISSIONS.length;
  const enabled = ALL_PERMISSIONS.filter(p => permissions[p.key]).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleToggle(key: PermissionKey, val: boolean) {
    setPermissions(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  }

  function setAllPerms(value: boolean) {
    const result = {} as Record<PermissionKey, boolean>;
    ALL_PERMISSIONS.forEach(p => { result[p.key] = value; });
    setPermissions(result);
    setDirty(true);
  }

  function handleReset() {
    setPermissions({ ...DEFAULT_ROLE_PERMISSIONS[role] });
    setDirty(false);
  }

  function handleSave() {
    onSave?.(role, permissions);
    setDirty(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveToast(true);
    saveTimerRef.current = setTimeout(() => setSaveToast(false), 2600);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1050] flex items-center justify-center"
        style={{ background: 'rgba(20,10,40,.52)', backdropFilter: 'blur(7px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Panel — no overflow:hidden here so expanded groups are never clipped */}
        <div
          className="flex flex-col bg-white"
          style={{
            width: 680, maxWidth: '95vw', maxHeight: '90vh',
            borderRadius: 20,
            boxShadow: '0 32px 96px rgba(20,10,40,.32)',
            animation: 'roleModalIn .28s cubic-bezier(.16,1,.3,1)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center relative shrink-0"
            style={{
              padding: '20px 24px',
              background: cfg.headerGrad,
              borderRadius: '20px 20px 0 0',
              overflow: 'hidden', /* scoped to header only for the decorative circles */
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 130% at 110% -10%,rgba(255,255,255,.15) 0%,transparent 55%)' }} />
            <div className="absolute" style={{ right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
            <div className="absolute" style={{ right: 40, bottom: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />

            <div className="flex items-center justify-center shrink-0 relative z-10" style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)', marginRight: 16 }}>
              {cfg.icon}
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <div className="text-white font-extrabold" style={{ fontSize: 20, lineHeight: 1.2 }}>{role} Permissions</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>Configure which features this role can access</div>
            </div>
            <div className="relative z-10 flex items-center shrink-0" style={{ gap: 8, marginRight: 12, padding: '6px 14px', borderRadius: 30, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)' }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'white', lineHeight: 1 }}>{enabled}</span>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,.35)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{total} total</span>
            </div>
            <button className="relative z-10 flex items-center justify-center cursor-pointer transition-all duration-150" style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', color: 'white' }} onClick={onClose}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10" /></svg>
            </button>
          </div>

          {/* ── Sub-toolbar ── */}
          <div className="flex items-center shrink-0" style={{ gap: 8, padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}>
            <div className="flex-1 flex items-center" style={{ gap: 10 }}>
              <div className="relative flex-1" style={{ height: 6, borderRadius: 6, background: 'rgba(0,0,0,.07)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 6, background: cfg.gradient, width: `${(enabled / total) * 100}%`, transition: 'width .3s cubic-bezier(.16,1,.3,1)', boxShadow: `0 1px 6px ${cfg.accentColor}55` }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{Math.round((enabled / total) * 100)}% access</span>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)', borderRadius: 1, flexShrink: 0 }} />
            {(['Enable All', 'Disable All'] as const).map(label => (
              <button key={label} className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
                style={{ gap: 5, padding: '5px 11px', borderRadius: 8, fontSize: 11, fontFamily: "'DM Sans',sans-serif", background: '#fff', border: '1px solid var(--border)', color: 'var(--t2)' }}
                onClick={() => setAllPerms(label === 'Enable All')}
              >
                {label === 'Enable All'
                  ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 5.5l3 3 5-5" /></svg>
                  : <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9" /></svg>
                }
                {label}
              </button>
            ))}
            {dirty && (
              <button className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
                style={{ gap: 5, padding: '5px 11px', borderRadius: 8, fontSize: 11, fontFamily: "'DM Sans',sans-serif", background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.18)', color: 'var(--red)' }}
                onClick={handleReset}
              >
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6A4 4 0 1 1 6 10M2 4V6h2" /></svg>
                Reset
              </button>
            )}
          </div>

          {/* ── Scrollable body — ONLY this div has overflow:auto ── */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {groups.map(groupName => {
              const perms = ALL_PERMISSIONS.filter(p => p.group === groupName);
              return (
                <PermGroup
                  key={groupName} groupName={groupName} groupIcon={perms[0]?.groupIcon ?? '📋'}
                  perms={perms} permissions={permissions} accentColor={cfg.accentColor} onChange={handleToggle}
                />
              );
            })}
            <div style={{ height: 4 }} />
          </div>

          {/* ── Footer ── */}
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--s2)',
              borderRadius: '0 0 20px 20px',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
              {dirty
                ? <span style={{ color: '#b45309', fontWeight: 600 }}>⚠ You have unsaved changes</span>
                : <span>All changes are saved automatically on Save</span>
              }
            </div>
            <div className="flex items-center" style={{ gap: 10 }}>
              <button className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
                style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
                onClick={onClose}
              >Cancel</button>
              <button
                className="inline-flex items-center font-semibold text-white transition-all duration-200"
                disabled={!dirty}
                onClick={dirty ? handleSave : undefined}
                style={{
                  gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', fontSize: 13, fontFamily: "'DM Sans',sans-serif",
                  background: dirty ? cfg.gradient : 'rgba(0,0,0,.12)',
                  boxShadow: dirty ? `0 3px 14px ${cfg.accentColor}44` : 'none',
                  cursor: dirty ? 'pointer' : 'not-allowed',
                  color: dirty ? 'white' : 'rgba(0,0,0,.3)',
                }}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <SaveToast visible={saveToast} role={role} />
    </>
  );
}