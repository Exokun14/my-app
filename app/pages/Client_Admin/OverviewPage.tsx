'use client';

// ─────────────────────────────────────────────────────────────────────────────
// OverviewPage.tsx  — PURELY PRESENTATIONAL
// All data, types, hooks, and helper functions live in ./overview_func.ts
// Each modal is in its own file with an embedded database.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../Sidebar_Client/sidebar_client';
import Header  from '../Header/header_main';
import '../../globals.css';

// ── Logic / data layer ────────────────────────────────────────────────────────
import {
  CPView, POSDevice, BranchLocation, DBBranch, PeripheralItem, InfoData, Notification,
  POS_DATA, BRANCHES, PERIPHERALS_DB, DEFAULT_INFO, NOTIFS_INIT, NOTIF_ICONS,
  getDaysUntil, msaEndStatusFromDBDate, msaEndStatus, getSoonestMSADays,
  getBranchMSAStatusFromDate,
  fetchBranches,
  useToast, useClickOutside,
  C,
} from './overview_func';

// ── Modals (each has its own embedded DB) ─────────────────────────────────────
import PeripheralsModal    from './PeripheralsModal';
import POSModal            from './POSModal';
import BranchModal         from './BranchModal';
import EditInfoModal       from './EditInfoModal';
import MSAExpirationModal  from './MSAExpirationModal';
import BannerEditModal     from './BannerEditModal';

// ── UserProfile shape (same as logUser.tsx) ────────────────────────────────
interface UserProfile {
  id:              number;
  username:        string;
  role:            string;
  accessLevel:     string;
  fullName:        string;
  initials:        string;
  position:        string;
  company:         string;
  companyId:       number | null;
  companyLogo:     string | null;
  profilePhoto:    string | null;
  backgroundColor?: string | null;
  panelColor?:      string | null;
}

// ── API base ──────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED UI
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return (
    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#b8aed8', marginBottom: 4, marginTop: mt ? 12 : 0 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
      <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 500, whiteSpace: 'nowrap' as const, flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: '#18103a', fontWeight: 600, textAlign: 'right' as const, wordBreak: 'break-all' as const, ...valueStyle }}>{value || '—'}</span>
    </div>
  );
}

function EditPenIcon() {
  return <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARDS
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, iconColor, value, label, accent, onClick, clickable }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  value: string | number; label: string; accent: string;
  onClick?: () => void; clickable?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}
      style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px 12px', borderRadius: 14, background: clickable && hov ? '#faf9ff' : '#fff', border: `1px solid ${hov ? accent + '44' : 'rgba(124,58,237,0.1)'}`, boxShadow: hov ? `0 6px 24px ${accent}18` : '0 1px 4px rgba(15,10,35,0.04)', transition: 'all 0.18s', cursor: clickable ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: '14px 14px 0 0', opacity: hov ? 1 : 0.5, transition: 'opacity 0.18s' }} />
      {clickable && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 6, background: hov ? accent + '18' : 'rgba(124,58,237,0.07)', border: `1px solid ${hov ? accent + '40' : 'rgba(124,58,237,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={hov ? accent : '#8e7ec0'} strokeWidth="1.8" style={{ transition: 'all 0.18s', transform: hov ? 'translateX(1px)' : 'translateX(0)' }}><path d="M2 1.5l3 2.5-3 2.5"/></svg>
        </div>
      )}
      <div style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, marginBottom: 12 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#18103a', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8e7ec0', marginTop: 4, letterSpacing: '0.01em' }}>{label}</div>
      </div>
    </div>
  );
}

function MSAStatCard({ branches, onClick }: { branches: DBBranch[]; onClick: () => void }) {
  const [hov, setHov] = useState(false);

  // Derive soonest MSA days from live branches
  const soonestDays: number | null = branches.length === 0 ? null : branches.reduce<number | null>((min, b) => {
    if (!b.msa_end_date) return min;
    const d = getDaysUntil(b.msa_end_date);
    return min === null || d < min ? d : min;
  }, null);

  const expired = soonestDays !== null && soonestDays <= 0;
  const urgent  = soonestDays !== null && soonestDays > 0 && soonestDays <= 30;
  const ok      = soonestDays !== null && soonestDays > 30;
  const accent    = expired ? '#dc2626' : urgent ? '#d97706' : '#16a34a';
  const iconBg    = expired ? 'linear-gradient(135deg,#fef2f2,#fecaca)' : urgent ? 'linear-gradient(135deg,#fffbeb,#fde68a)' : 'linear-gradient(135deg,#f0fdf4,#bbf7d0)';
  const badgeText = expired ? 'EXPIRED' : urgent ? 'EXPIRING SOON' : ok ? `${soonestDays}d left` : '—';
  const showBadge = expired || urgent || ok;
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px 12px', borderRadius: 14, background: hov ? '#faf9ff' : '#fff', border: `1px solid ${hov ? 'rgba(124,58,237,0.3)' : expired ? '#fecaca' : urgent ? '#fde68a' : 'rgba(124,58,237,0.1)'}`, boxShadow: hov ? '0 6px 24px rgba(124,58,237,0.12)' : '0 1px 4px rgba(15,10,35,0.04)', cursor: 'pointer', transition: 'all 0.18s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: '14px 14px 0 0', opacity: hov ? 1 : 0.6, transition: 'opacity 0.18s' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 6, background: hov ? accent + '18' : 'rgba(124,58,237,0.07)', border: `1px solid ${hov ? accent + '40' : 'rgba(124,58,237,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={hov ? accent : '#8e7ec0'} strokeWidth="1.8" style={{ transition: 'all 0.18s', transform: hov ? 'translateX(1px)' : 'translateX(0)' }}><path d="M2 1.5l3 2.5-3 2.5"/></svg>
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: accent, marginBottom: 10 }}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></svg>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#18103a' }}>MSA Expiry</span>
          {showBadge && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: accent, background: accent + '15', border: `1px solid ${accent}35`, borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' as const }}>{badgeText}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>Click to view details</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#8e7ec0" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LICENSE & ACTIVATION ROW
// ─────────────────────────────────────────────────────────────────────────────
function LicenseActivationRow({ info, onEdit }: { info: InfoData; onEdit: () => void }) {
  const krunch     = info.krunchNum?.trim() || null;
  const activation = info.activationCode?.trim() || null;
  if (!krunch && !activation) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
        <span style={{ fontSize: 10.5, color: '#b8aed8', fontStyle: 'italic' }}>No license or activation codes set</span>
        <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {krunch && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
          <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 500, whiteSpace: 'nowrap' as const, flexShrink: 0, minWidth: 110 }}>Krunch No.</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(13,148,136,0.08)', color: '#0d7873', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.03em' }}>{krunch}</span>
        </div>
      )}
      {activation && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
          <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 500, whiteSpace: 'nowrap' as const, flexShrink: 0, minWidth: 110 }}>Activation Code</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(124,58,237,0.08)', color: '#5b21b6', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 5, padding: '2px 8px', letterSpacing: '0.03em' }}>{activation}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCHES TABLE  — now driven by live DBBranch[] from the API
// ─────────────────────────────────────────────────────────────────────────────
function BranchesTable({
  branches,
  loading,
  onBranchClick,
}: {
  branches: DBBranch[];
  loading: boolean;
  onBranchClick: (branch: DBBranch) => void;
}) {
  const [hoveredRow,   setHoveredRow]   = useState<number | null>(null);
  const [branchSearch, setBranchSearch] = useState('');

  const filteredBranches = branchSearch.trim()
    ? branches.filter(b =>
        (b.branch_name ?? '').toLowerCase().includes(branchSearch.toLowerCase()) ||
        (b.license_number ?? '').toLowerCase().includes(branchSearch.toLowerCase())
      )
    : branches;

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>Branches</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 10 }}>
            {loading ? '…' : `${branches.length} ${branches.length === 1 ? 'branch' : 'branches'}`}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ width: 155, display: 'flex', alignItems: 'center', gap: 6, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 8, padding: '5px 10px' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.6" width="11" height="11" style={{ flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11.5, color: '#18103a', width: '100%', minWidth: 0, fontFamily: 'inherit' }}
            placeholder="Search branches…"
            value={branchSearch}
            onChange={e => setBranchSearch(e.target.value)}
          />
          {branchSearch && (
            <button onClick={() => setBranchSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#b8aed8', flexShrink: 0 }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,0.06)', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ede9fe', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 11, borderRadius: 5, background: '#f2f0fb' }} />
                <div style={{ width: 80, height: 11, borderRadius: 5, background: '#f2f0fb' }} />
                <div style={{ width: 30, height: 11, borderRadius: 5, background: '#f2f0fb' }} />
                <div style={{ width: 60, height: 11, borderRadius: 5, background: '#f2f0fb' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {!loading && branches.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 20px', textAlign: 'center' as const }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8aed8" strokeWidth="1.3"><path d="M12 2C8.7 2 6 4.7 6 8c0 6 6 12 6 12s6-6 6-12c0-3.3-2.7-6-6-6z"/><circle cx="12" cy="8" r="2.2"/></svg>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4a3870' }}>No branches yet</span>
            <span style={{ fontSize: 11, color: '#8e7ec0' }}>Branches added to this company will appear here.</span>
          </div>
        )}

        {!loading && branches.length > 0 && filteredBranches.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '28px 20px', textAlign: 'center' as const }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#b8aed8" strokeWidth="1.4"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8e7ec0' }}>No branches match "{branchSearch}"</span>
          </div>
        )}

        {/* Table */}
        {!loading && filteredBranches.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Branch', 'License', 'MSA Start', 'MSA End', ''].map((h, i) => (
                  <th key={i} style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f2f0fb', padding: '7px 14px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.09em', color: '#8e7ec0', textAlign: i === 4 ? 'right' : 'left', borderBottom: '1px solid rgba(124,58,237,0.1)', whiteSpace: 'nowrap' as const }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map(b => {
                const { label: msaLabel, color: msaColor } = msaEndStatusFromDBDate(b.msa_end_date);
                const msaStart = b.msa_start_date
                  ? new Date(b.msa_start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—';
                const isHovered = hoveredRow === b.id;
                const license   = b.license_number?.trim() || null;

                return (
                  <tr key={b.id}
                    style={{ borderTop: '1px solid rgba(124,58,237,0.07)', transition: 'background 0.12s' }}
                    onMouseEnter={() => setHoveredRow(b.id)}
                    onMouseLeave={() => setHoveredRow(null)}>

                    {/* Branch name */}
                    <td style={{ padding: '10px 14px', background: isHovered ? '#faf9ff' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: '#16a34a' }} />
                        <span style={{ fontWeight: 600, color: '#18103a', lineHeight: 1.45 }}>{b.branch_name || '—'}</span>
                      </div>
                    </td>

                    {/* License */}
                    <td style={{ padding: '10px 14px', background: isHovered ? '#faf9ff' : 'transparent' }}>
                      {license ? (
                        <span style={{ fontSize: 10.5, fontWeight: 600, background: 'rgba(217,119,6,0.08)', color: '#92400e', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' as const, display: 'inline-block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {license}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#b8aed8', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* MSA Start */}
                    <td style={{ padding: '10px 14px', background: isHovered ? '#faf9ff' : 'transparent' }}>
                      <span style={{ fontSize: 11, color: '#6b5fa0', fontWeight: 500 }}>{msaStart}</span>
                    </td>

                    {/* MSA End */}
                    <td style={{ padding: '10px 14px', background: isHovered ? '#faf9ff' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {b.msa_end_date && <span style={{ width: 6, height: 6, borderRadius: '50%', background: msaColor, flexShrink: 0 }} />}
                        <span style={{ fontSize: 11, fontWeight: b.msa_end_date ? 600 : 400, color: msaColor, whiteSpace: 'nowrap' as const }}>{msaLabel}</span>
                      </div>
                    </td>

                    {/* View button */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' as const, background: isHovered ? '#faf9ff' : 'transparent', whiteSpace: 'nowrap' as const }}>
                      <button
                        onClick={() => onBranchClick(b)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 7, fontSize: 10.5, fontWeight: 600, color: isHovered ? '#7c3aed' : '#4a3870', background: isHovered ? '#ede9fe' : '#f2f0fb', border: `1px solid ${isHovered ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.12)'}`, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s', whiteSpace: 'nowrap' as const }}>
                        View
                        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M3 2l4 3-4 3"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PANEL
// ─────────────────────────────────────────────────────────────────────────────
const NotifPanel: React.FC<{ notifs: Notification[]; onRead: (id: number) => void; onMarkAll: () => void; onClose: () => void }> = ({ notifs, onRead, onMarkAll, onClose }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  return (
    <div ref={ref} style={{ position: 'fixed', top: 70, right: 20, width: 380, maxHeight: 'calc(100vh - 100px)', background: '#fff', borderRadius: 12, border: '1px solid rgba(124,58,237,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#18103a' }}>Notifications</span>
        <button onClick={onMarkAll} style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifs.map(n => (
          <div key={n.id} onClick={() => onRead(n.id)}
            style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: n.read ? '#fff' : '#f9fafb', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : '#f9fafb')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: n.type === 'warn' ? '#d97706' : n.type === 'error' ? '#dc2626' : n.type === 'success' ? '#16a34a' : n.type === 'purple' ? '#7c3aed' : '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                {NOTIF_ICONS[n.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#18103a', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: '#4a3870', lineHeight: 1.5 }}>{n.desc}</div>
                <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 6 }}>{n.time}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 8 }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface OverviewPageProps {
  onNavigate:   (view: CPView) => void;
  onLogout:     () => void;
  userProfile?: UserProfile | null;
}

const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, onLogout, userProfile }) => {

  // ── Company banner data ──────────────────────────────────────────────────
  const companyName  = userProfile?.company     || 'Your Company';
  const companyLogo  = userProfile?.companyLogo ?? null;

  const COMPANY_GRADIENTS: Record<string, string> = {
    popeyes:   'linear-gradient(135deg, #f97316, #ea580c)',
    ferrari:   'linear-gradient(135deg, #dc2626, #991b1b)',
    huawei:    'linear-gradient(135deg, #dc2626, #b91c1c)',
    jollibee:  'linear-gradient(135deg, #e11d48, #9f1239)',
    mcdonalds: 'linear-gradient(135deg, #d97706, #b45309)',
  };
  const companyKey     = companyName.toLowerCase().split(' ')[0];
  const bannerGradient = COMPANY_GRADIENTS[companyKey] ?? 'linear-gradient(135deg, #7c3aed, #5b21b6)';

  // ── State ──────────────────────────────────────────────────────────────────
  const [info, setInfo]                         = useState<InfoData>(DEFAULT_INFO);
  const [notifs, setNotifs]                     = useState<Notification[]>(NOTIFS_INIT);
  const [selectedPOS, setSelectedPOS]           = useState<POSDevice | null>(null);
  const [selectedBranch, setSelectedBranch]     = useState<DBBranch | null>(null);
  const [editOpen, setEditOpen]                 = useState(false);
  const [notifOpen, setNotifOpen]               = useState(false);
  const [msaModalOpen, setMsaModalOpen]         = useState(false);
  const [peripheralsModal, setPeripheralsModal] = useState<{ posId: string; posModel: string; branch: string } | null>(null);
  const [bgHov, setBgHov]                       = useState(false);
  const [bgSrc, setBgSrc]                       = useState('');
  const [bgColor, setBgColor]                   = useState(userProfile?.backgroundColor ?? '');
  const [accentColor, setAccentColor]           = useState(userProfile?.panelColor ?? '');
  const [bannerEditOpen, setBannerEditOpen]     = useState(false);

  // ── Industry type ──────────────────────────────────────────────────────────
  const [isAloha, setIsAloha] = useState(false);

  // ── Live stat counts ───────────────────────────────────────────────────────
  const [totalPosCount,   setTotalPosCount]   = useState<number | null>(null);
  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);

  // ── Live branches from DB ──────────────────────────────────────────────────
  const [branches, setBranches]         = useState<DBBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  const { msg, show, toast } = useToast();

  // ── Fetch company info ─────────────────────────────────────────────────────
  const fetchCompanyInfo = (companyId: number) => {
    fetch(`${API_BASE}/api/companies`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => r.json())
      .then((json: { success: boolean; data: Array<{
        id: number; company_name: string; contact_person: string; email: string;
        phone: string | null; account_manager: string | null; activation_code: string | null;
        krunch_num: string | null; cover_photo: string | null;
        alt1_name: string | null; alt1_email: string | null; alt1_phone: string | null;
        alt2_name: string | null; alt2_email: string | null; alt2_phone: string | null;
        industry_title: string | null;
      }> }) => {
        if (!json.success || !json.data?.length) return;
        const c = json.data.find(row => row.id === companyId) ?? json.data[0];
        if (!c) return;
        setIsAloha(/aloha/i.test(c.industry_title ?? ''));
        setInfo({
          storeName:         c.company_name   ?? '',
          contactPerson:     c.contact_person  ?? '',
          email:             c.email           ?? '',
          phone:             c.phone           ?? '',
          altContactPerson:  c.alt1_name       ?? '',
          altEmail:          c.alt1_email      ?? '',
          altPhone:          c.alt1_phone      ?? '',
          altContactPerson2: c.alt2_name       ?? '',
          altEmail2:         c.alt2_email      ?? '',
          altPhone2:         c.alt2_phone      ?? '',
          krunchNum:         c.krunch_num      ?? '',
          activationCode:    c.activation_code ?? '',
          accountManager:    c.account_manager ?? '',
        });
        if (c.cover_photo) setBgSrc(c.cover_photo);
      })
      .catch(err => console.error('[OverviewPage] Failed to load company info:', err));
  };

  // ── Fetch live branches ────────────────────────────────────────────────────
  const loadBranches = async (companyId: number) => {
    setBranchesLoading(true);
    try {
      const data = await fetchBranches(companyId);
      setBranches(data);
    } finally {
      setBranchesLoading(false);
    }
  };

  // ── Fetch total POS count for this company ─────────────────────────────────
  const loadTotalPos = async (companyId: number) => {
    try {
      const brRes  = await fetch(`${API_BASE}/api/branches?company_id=${companyId}`, { headers: { Accept: 'application/json' } });
      const brData = await brRes.json();
      if (!brRes.ok || !brData.success) return;
      let total = 0;
      await Promise.all(
        (brData.branches ?? []).map(async (b: { id: number }) => {
          try {
            const pRes  = await fetch(`${API_BASE}/api/pos?branch_id=${b.id}`, { headers: { Accept: 'application/json' } });
            const pData = await pRes.json();
            if (pRes.ok && pData.success) total += (pData.pos_machines ?? []).length;
          } catch { /* skip */ }
        }),
      );
      setTotalPosCount(total);
    } catch (err) {
      console.error('[OverviewPage] loadTotalPos failed:', err);
    }
  };

  // ── Fetch total users count for this company ───────────────────────────────
  const loadTotalUsers = async (companyId: number) => {
    try {
      const res  = await fetch(`${API_BASE}/api/users`, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (!res.ok || !data.success) return;
      const count = (data.data ?? []).filter((u: { company_id: number | null }) => u.company_id === companyId).length;
      setTotalUsersCount(count);
    } catch (err) {
      console.error('[OverviewPage] loadTotalUsers failed:', err);
    }
  };

  useEffect(() => {
    const companyId = userProfile?.companyId;
    if (!companyId) return;
    fetchCompanyInfo(companyId);
    loadBranches(companyId);
    loadTotalPos(companyId);
    loadTotalUsers(companyId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.companyId]);

  const unread      = notifs.filter(n => !n.read).length;
  const readNotif   = (id: number) => setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(notifs.map(n => ({ ...n, read: true })));

  const headerUser = {
    initials:     userProfile?.initials     ?? '',
    fullName:     userProfile?.fullName     ?? '',
    position:     userProfile?.position     ?? '',
    company:      userProfile?.company      ?? '',
    profilePhoto: userProfile?.profilePhoto ?? null,
  };

  const resolvedAccent   = accentColor || (bannerGradient.match(/#[0-9a-fA-F]{6}/g)?.[0] ?? '#7c3aed');
  const resolvedBgColor  = bgColor     || (bannerGradient.match(/#[0-9a-fA-F]{6}/g)?.[1] ?? '#5b21b6');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <Sidebar activePage="overview" onNavigate={onNavigate as (view: string) => void} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          user={headerUser}
          logoSrc="/geniex-logo.png"
          brandSlotMode="client"
          notificationCount={unread}
          onNotificationClick={() => setNotifOpen(o => !o)}
          onLogout={onLogout}
        />
        <div className="gx-main" style={{ paddingTop: 56 }}>
          <div className="gx-view">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 20px 14px', overflow: 'hidden', minHeight: 0 }}>

              {/* ── Hero / Company Banner ── */}
              <div className="gx-hero" style={{ padding: 0, flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'stretch', background: 'transparent', gap: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px 18px 20px', flexShrink: 0, background: resolvedAccent, position: 'relative', zIndex: 2 }}>
                  <div style={{ width: 72, height: 72, background: '#ffffff', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {companyLogo ? (
                      <img src={companyLogo} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 26, fontWeight: 900, color: resolvedAccent, letterSpacing: '-1px', userSelect: 'none' as const }}>
                        {companyName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="gx-hero-title">{companyName}</div>
                    <div className="gx-hero-badges">
                      <div className="gx-status-pill"><div className="sdot" />Active Account</div>
                    </div>
                  </div>
                  {!bgSrc && (
                    <div style={{ position: 'absolute', top: 0, right: -24, width: 24, height: '100%', background: `linear-gradient(to right, ${resolvedAccent}, ${resolvedBgColor})`, zIndex: 3, pointerEvents: 'none' }} />
                  )}
                </div>

                <div
                  style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'pointer', zIndex: 1, background: resolvedBgColor }}
                  onMouseEnter={() => setBgHov(true)}
                  onMouseLeave={() => setBgHov(false)}
                  onClick={() => setBannerEditOpen(true)}
                >
                  {bgSrc && (
                    <img src={bgSrc} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center', zIndex: 0 }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)', opacity: bgHov ? 1 : 0, transition: 'opacity 0.18s ease', zIndex: 1 }} />
                  <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: bgHov ? 1 : 0, transition: 'opacity 0.18s ease', pointerEvents: 'none' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.38)', borderRadius: 10, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 2l3 3-8 8H3v-3L11 2z"/></svg>
                      Edit Company Account Banner
                    </div>
                  </div>
                </div>
              </div>

              {bannerEditOpen && (
                <BannerEditModal
                  companyId={userProfile?.companyId ?? null}
                  currentSrc={bgSrc}
                  currentColor={bgColor}
                  currentAccentColor={resolvedAccent}
                  onSave={(src, color, accent) => {
                    setBgSrc(src);
                    setBgColor(color);
                    setAccentColor(accent);
                    try {
                      const raw = sessionStorage.getItem('gx_user_profile');
                      if (raw) {
                        const stored = JSON.parse(raw);
                        stored.backgroundColor = color || stored.backgroundColor;
                        stored.panelColor      = accent;
                        sessionStorage.setItem('gx_user_profile', JSON.stringify(stored));
                      }
                    } catch { /* non-critical */ }
                    toast('Banner updated!');
                  }}
                  onClose={() => setBannerEditOpen(false)}
                />
              )}

              {/* ── Stat Cards ── */}
              <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.8"/></svg>}
                  iconBg="linear-gradient(135deg,#ede9fe,#ddd6fe)" iconColor="#7c3aed"
                  value={totalUsersCount ?? '…'} label="Users" accent="#7c3aed"
                  onClick={() => onNavigate('users')} clickable
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="12" height="9" rx="1.5"/><path d="M2 7.5h12M8 12v1.5M5 13.5h6"/></svg>}
                  iconBg="linear-gradient(135deg,#ccfbf1,#99f6e4)" iconColor="#0d9488"
                  value={totalPosCount ?? '…'} label="Total POS" accent="#0d9488"
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>}
                  iconBg="linear-gradient(135deg,#fee2e2,#fecaca)" iconColor="#dc2626"
                  value={8} label="Open Tickets" accent="#dc2626"
                  onClick={() => onNavigate('tickets')} clickable
                />
                <MSAStatCard branches={branches} onClick={() => setMsaModalOpen(true)} />
              </div>

              {/* ── Two-column body ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '5fr 5fr', gap: 10, flex: 1, minHeight: 0, alignItems: 'stretch' }}>

                {/* LEFT — General Information */}
                <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>General Information</span>
                    <button
                      onClick={() => setEditOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fff'; el.style.borderColor = 'rgba(124,58,237,0.22)'; el.style.color = '#18103a'; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.1)'; el.style.color = '#4a3870'; }}>
                      <EditPenIcon /> Edit Info
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
                    <SectionLabel>PRIMARY CONTACT</SectionLabel>
                    <InfoRow label="Store Name"     value={info.storeName} />
                    <InfoRow label="Contact Person" value={info.contactPerson} />
                    <InfoRow label="Email"          value={info.email} />
                    <InfoRow label="Phone"          value={info.phone} />

                    <SectionLabel mt>ALTERNATE CONTACT 1</SectionLabel>
                    {info.altContactPerson ? (
                      <>
                        <InfoRow label="Contact Person" value={info.altContactPerson} />
                        <InfoRow label="Email"          value={info.altEmail} />
                        <InfoRow label="Phone"          value={info.altPhone} />
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: '#8e7ec0', fontStyle: 'italic' }}>No alternate contact 1</span>
                        <button onClick={() => setEditOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                      </div>
                    )}

                    <SectionLabel mt>ALTERNATE CONTACT 2</SectionLabel>
                    {info.altContactPerson2 ? (
                      <>
                        <InfoRow label="Contact Person" value={info.altContactPerson2} />
                        <InfoRow label="Email"          value={info.altEmail2} />
                        <InfoRow label="Phone"          value={info.altPhone2} />
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
                        <span style={{ fontSize: 10.5, color: '#8e7ec0', fontStyle: 'italic' }}>No alternate contact 2</span>
                        <button onClick={() => setEditOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                      </div>
                    )}

                    <SectionLabel mt>LICENSE &amp; ACTIVATION</SectionLabel>
                    <LicenseActivationRow info={info} onEdit={() => setEditOpen(true)} />

                    <SectionLabel mt>ACCOUNT DETAILS</SectionLabel>
                    <InfoRow label="Acct Manager" value={info.accountManager ?? '—'} valueStyle={{ color: '#7c3aed' }} />
                    <InfoRow label="User Role"    value={userProfile?.position ?? '—'} />
                  </div>
                </div>

                {/* RIGHT — Branches Table (live from DB) */}
                <BranchesTable
                  branches={branches}
                  loading={branchesLoading}
                  onBranchClick={b => setSelectedBranch(b)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        <div className={`gx-toast ${show ? 'show' : ''}`}><div className="gx-toast-dot" /><span>{msg}</span></div>
      </div>

      {/* ── Modals ── */}
      {selectedPOS && (
        <POSModal pos={selectedPOS} onClose={() => setSelectedPOS(null)} />
      )}
      {selectedBranch && (
        <BranchModal
          branch={selectedBranch}
          companyId={userProfile?.companyId ?? 0}
          companyName={companyName}
          isAloha={isAloha}
          onClose={() => setSelectedBranch(null)}
          onViewPeripherals={(posId, posModel, peripherals) =>
            setPeripheralsModal({ posId, posModel, branch: selectedBranch.branch_name ?? '' })
          }
        />
      )}
      {editOpen && (
        <EditInfoModal
          data={info}
          companyId={userProfile?.companyId ?? null}
          onSave={d => {
            setInfo(d);
            const cid = userProfile?.companyId;
            if (cid) setTimeout(() => fetchCompanyInfo(cid), 400);
            toast('Information updated successfully!');
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
      {notifOpen && (
        <NotifPanel notifs={notifs} onRead={readNotif} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />
      )}
      {msaModalOpen && (
        <MSAExpirationModal branches={branches} isAloha={isAloha} onClose={() => setMsaModalOpen(false)} />
      )}
      {peripheralsModal && (
        <PeripheralsModal
          posId={peripheralsModal.posId}
          posModel={peripheralsModal.posModel}
          branch={peripheralsModal.branch}
          onClose={() => setPeripheralsModal(null)}
        />
      )}
    </div>
  );
};

export default OverviewPage;