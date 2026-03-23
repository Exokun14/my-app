/* ==============================================================
   LicenseBranchModal.tsx  ·  Branch License Detail Popup
   Shows all branches belonging to a single company,
   their license numbers, MSA start/end dates, and expiry status.
   Opened from the License Expiry panel when the user clicks
   "View Branches" on a company row.

   When a drag-and-drop filter is active in the parent panel,
   only the branches matching that status are passed in via
   `group.branches`, so this modal automatically shows the
   correct subset — no extra logic needed here.
   ============================================================== */

'use client';

import React, { useEffect, useRef } from 'react';
import { BranchLicenseItem, formatDate, getInitials } from './DshAdmFunc';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export interface CompanyBranchGroup {
  companyId:      number;
  companyName:    string;
  cat:            string;
  accountManager: string;
  logo:           string | null;
  branches:       BranchLicenseItem[];
}

interface LicenseBranchModalProps {
  group:    CompanyBranchGroup;
  onClose:  () => void;
}

/* ─── Status meta ────────────────────────────────────────────────────────────── */
const STATUS_META = {
  expired:  { hex: '#ef4444', label: 'Expired',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.28)'   },
  critical: { hex: '#f97316', label: 'Critical', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.28)'  },
  warning:  { hex: '#eab308', label: 'Warning',  bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.28)'   },
  upcoming: { hex: '#22c55e', label: 'Upcoming', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.28)'   },
} as const;

const CAT_LABEL: Record<string, string> = {
  'F&B': 'Aloha', Retail: 'Retail', Warehouse: 'Warehouse',
};

const CAT_BADGE: Record<string, React.CSSProperties> = {
  'F&B':       { background: 'rgba(217,119,6,0.14)',  color: '#92400e', border: '1px solid rgba(217,119,6,0.28)'  },
  Retail:      { background: 'rgba(2,132,199,0.12)',  color: '#0369a1', border: '1px solid rgba(2,132,199,0.28)'  },
  Warehouse:   { background: 'rgba(109,40,217,0.12)', color: '#5b21b6', border: '1px solid rgba(109,40,217,0.25)' },
};

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function LicenseBranchModal({ group, onClose }: LicenseBranchModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef   = useRef<HTMLDivElement>(null);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* Animate in */
  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.style.opacity = '1';
      if (modalRef.current)   { modalRef.current.style.opacity = '1'; modalRef.current.style.transform = 'translateY(0) scale(1)'; }
    });
  }, []);

  /* Click outside to close */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  /* Branch counts per status — derived from the branches actually passed in */
  const counts = {
    expired:  group.branches.filter(b => b._status === 'expired').length,
    critical: group.branches.filter(b => b._status === 'critical').length,
    warning:  group.branches.filter(b => b._status === 'warning').length,
    upcoming: group.branches.filter(b => b._status === 'upcoming').length,
  };

  /*
   * Detect if a status filter is active by checking whether ALL branches share
   * the same _status. If so, we show a subtle filter indicator banner.
   */
  const uniqueStatuses = Array.from(new Set(group.branches.map(b => b._status)));
  const isFiltered = group.branches.length > 0 && uniqueStatuses.length === 1;
  const filteredStatus = isFiltered ? uniqueStatuses[0] : null;
  const filteredMeta   = filteredStatus ? STATUS_META[filteredStatus] : null;

  const total = group.branches.length;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(18,10,50,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        opacity: 0,
        transition: 'opacity 0.22s ease',
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%', maxWidth: 820,
          maxHeight: '88vh',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(18,10,50,0.28), 0 0 0 1px rgba(124,58,237,0.1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          opacity: 0,
          transform: 'translateY(16px) scale(0.97)',
          transition: 'opacity 0.26s cubic-bezier(0.16,1,0.3,1), transform 0.26s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(124,58,237,0.1)',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(13,148,136,0.03) 100%)',
          flexShrink: 0,
        }}>
          {/* Top row: logo + company info + close */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            {/* Logo / initials */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: '#f5f3ff', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(124,58,237,0.14), 0 0 0 1px rgba(124,58,237,0.1)',
            }}>
              {group.logo ? (
                <img src={group.logo} alt={group.companyName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', letterSpacing: '-0.03em' }}>
                  {getInitials(group.companyName)}
                </span>
              )}
            </div>

            {/* Company info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#18103a', letterSpacing: '-0.02em', fontFamily: "'DM Serif Display', serif" }}>
                  {group.companyName}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, ...CAT_BADGE[group.cat] }}>
                  {CAT_LABEL[group.cat] ?? group.cat}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#8e7ec0', marginTop: 3, fontWeight: 500 }}>
                Account Manager: <span style={{ color: '#4a3870', fontWeight: 600 }}>{group.accountManager || '—'}</span>
                <span style={{ margin: '0 8px', opacity: 0.3 }}>·</span>
                <span style={{ color: '#4a3870', fontWeight: 600 }}>{total}</span> branch{total !== 1 ? 'es' : ''}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(124,58,237,0.15)',
                background: '#f5f3ff', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#7c3aed', transition: 'all 0.14s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          </div>

          {/* Status summary pills — reflect only what's in group.branches */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(Object.entries(counts) as [keyof typeof counts, number][]).map(([status, n]) => {
              const m = STATUS_META[status];
              if (n === 0) return null;
              return (
                <div
                  key={status}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20,
                    background: m.bg, border: `1.5px solid ${m.border}`,
                    fontSize: 11, fontWeight: 700, color: m.hex,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.hex, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 5px ${m.hex}88` }} />
                  {n} {m.label}
                </div>
              );
            })}
            {counts.expired === 0 && counts.critical === 0 && counts.warning === 0 && counts.upcoming === 0 && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e7ec0', padding: '5px 0' }}>
                No expiry data available for these branches
              </div>
            )}
          </div>
        </div>

        {/*
         * ── Filter indicator banner ───────────────────────────────────────────
         * Shown when the caller has pre-filtered branches to a single status
         * (i.e. the user dragged a filter card onto the table).
         */}
        {filteredMeta && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 20px',
            background: `${filteredMeta.hex}0d`,
            borderBottom: `1px solid ${filteredMeta.hex}28`,
            flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={filteredMeta.hex} strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M1 3h12M4 7h6M6.5 11h1"/>
            </svg>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: filteredMeta.hex, letterSpacing: '0.04em' }}>
              Filtered — showing only <span style={{ textTransform: 'capitalize' }}>{filteredStatus}</span> branches
            </span>
            <span style={{
              marginLeft: 4,
              display: 'inline-flex', alignItems: 'center',
              padding: '1px 8px', borderRadius: 20,
              background: `${filteredMeta.hex}18`, border: `1px solid ${filteredMeta.hex}38`,
              fontSize: 10, fontWeight: 700, color: filteredMeta.hex,
            }}>
              {total} of {total + ''}
            </span>
          </div>
        )}

        {/* ── Branch table ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {group.branches.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 48, color: '#8e7ec0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, opacity: 0.5 }}>📋</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4a3870' }}>No branches found</div>
              <div style={{ fontSize: 11 }}>
                {filteredStatus
                  ? `No ${filteredStatus} branches for this company`
                  : 'This company has no branch records in the database'}
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans, sans-serif', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 36  }} />
                <col />
                <col style={{ width: 190 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8f7ff', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['#', 'Branch Name', 'License No.', 'MSA Start', 'MSA End', 'Status'].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: i === 0 ? '11px 8px 11px 20px' : '11px 16px',
                        fontSize: 9.5, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        color: '#8e7ec0', textAlign: 'left',
                        borderBottom: '1px solid rgba(124,58,237,0.1)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.branches.map((b, idx) => {
                  const m     = STATUS_META[b._status] ?? STATUS_META.upcoming;
                  const label =
                    b._status === 'expired'         ? 'Expired' :
                    b._daysLeft >= 999999           ? 'No end date' :
                    `${b._daysLeft}d left`;

                  return (
                    <tr
                      key={b.branchId}
                      style={{
                        borderBottom: '1px solid rgba(124,58,237,0.06)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Row # */}
                      <td style={{ padding: '0 8px 0 20px', height: 50, verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#c4b5e0' }}>{idx + 1}</span>
                      </td>

                      {/* Branch name */}
                      <td style={{ padding: '0 16px', height: 50, verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 3, height: 28, borderRadius: 2, flexShrink: 0, background: m.hex, opacity: 0.7 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {b.branchName}
                          </span>
                        </div>
                      </td>

                      {/* License no */}
                      <td style={{ padding: '0 16px', height: 50, verticalAlign: 'middle', overflow: 'hidden' }}>
                        {b.licenseNumber ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 700,
                            color: '#4a3870', letterSpacing: '0.04em',
                            background: 'rgba(124,58,237,0.07)',
                            border: '1px solid rgba(124,58,237,0.14)',
                            padding: '3px 10px', borderRadius: 8,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}>
                            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ flexShrink: 0 }}>
                              <rect x="2" y="4" width="10" height="8" rx="1.5"/>
                              <path d="M5 4V3a2 2 0 014 0v1"/>
                            </svg>
                            {b.licenseNumber}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#c4b5e0', fontWeight: 500 }}>—</span>
                        )}
                      </td>

                      {/* MSA Start */}
                      <td style={{ padding: '0 16px', height: 50, verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 400, color: '#8e7ec0', whiteSpace: 'nowrap' }}>
                          {formatDate(b.msaStart)}
                        </span>
                      </td>

                      {/* MSA End */}
                      <td style={{ padding: '0 16px', height: 50, verticalAlign: 'middle' }}>
                        <span style={{
                          fontSize: 11.5, fontWeight: b.msaEnd ? 600 : 400,
                          color: b.msaEnd ? '#4a3870' : '#c4b5e0',
                          whiteSpace: 'nowrap',
                        }}>
                          {formatDate(b.msaEnd)}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '0 16px', height: 50, verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 11px 4px 8px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                          color: m.hex, background: m.bg, border: `1px solid ${m.border}`,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.hex, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 4px ${m.hex}88` }} />
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(124,58,237,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#faf9ff', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>
            {total} branch{total !== 1 ? 'es' : ''}{filteredStatus ? ` · filtered by ${filteredStatus}` : ' total'}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 22px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#7c3aed,#0d9488)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(124,58,237,0.28)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(124,58,237,0.36)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 12px rgba(124,58,237,0.28)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}










