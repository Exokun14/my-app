'use client';

import React, { useState } from 'react';
import { DBBranch, getDaysUntil, useClickOutside } from './overview_func';

// ── Fixed modal dimensions ─────────────────────────────────────────────────────
const MODAL_W  = 720;
const MODAL_H  = 500;
const HEADER_H = 74;
const FOOTER_H = 58;
const BODY_H   = MODAL_H - HEADER_H - FOOTER_H; // 368

interface Props {
  branches: DBBranch[];
  isAloha:  boolean;
  onClose:  () => void;
}

// ── Status helper ─────────────────────────────────────────────────────────────
function msaStatusFor(daysLeft: number) {
  if (daysLeft < 0)   return { badge: 'EXPIRED',       col: '#e11d48', bg: '#fff1f2', border: '#fecaca' };
  if (daysLeft <= 30) return { badge: 'EXPIRING SOON', col: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  return               { badge: 'ACTIVE',              col: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Sticky table header cell ──────────────────────────────────────────────────
const TH: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 1,
  background: '#f5f4fb',
  padding: '9px 14px',
  fontSize: 9.5, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  color: '#8e7ec0', textAlign: 'left',
  borderBottom: '1px solid rgba(124,58,237,0.1)',
  whiteSpace: 'nowrap',
};

export default function MSAExpirationModal({ branches, isAloha, onClose }: Props) {
  const ref = useClickOutside<HTMLDivElement>(onClose);
  const [search, setSearch] = useState('');

  // ── Theme tokens matching branch_detail_popup.tsx ─────────────────────────
  const headerGrad   = isAloha
    ? 'linear-gradient(135deg,#d97706,#f59e0b)'
    : 'linear-gradient(135deg,#0284c7,#0ea5e9)';
  const accentColor  = isAloha ? '#d97706' : '#0284c7';
  const accentBg     = isAloha ? 'rgba(217,119,6,0.08)'  : 'rgba(2,132,199,0.08)';
  const accentBorder = isAloha ? 'rgba(217,119,6,0.22)'  : 'rgba(2,132,199,0.22)';

  const q = search.trim().toLowerCase();

  // ── ALOHA rows ────────────────────────────────────────────────────────────
  const alohaRows = branches
    .filter(b => b.msa_end_date)
    .map(b => {
      const daysLeft = getDaysUntil(b.msa_end_date!);
      return {
        branch:     b.branch_name       ?? '—',
        license:    b.license_number?.trim() || null,
        msaEnd:     fmtDate(b.msa_end_date),
        implDate:   fmtDate(b.implementation_date),
        isActive:   !!b.implementation_date,
        daysLeft,
        ...msaStatusFor(daysLeft),
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .filter(r => !q || r.branch.toLowerCase().includes(q) || (r.license ?? '').toLowerCase().includes(q));

  // ── RETAIL/WAREHOUSE shared MSA ───────────────────────────────────────────
  const sharedMsaStart  = branches.find(b => b.msa_start_date)?.msa_start_date ?? null;
  const sharedMsaEnd    = branches.find(b => b.msa_end_date)?.msa_end_date     ?? null;
  const sharedDaysLeft  = sharedMsaEnd ? getDaysUntil(sharedMsaEnd) : null;
  const sharedStatus    = sharedDaysLeft !== null ? msaStatusFor(sharedDaysLeft) : null;

  const filteredBranches = branches.filter(b =>
    !q || (b.branch_name ?? '').toLowerCase().includes(q) || (b.license_number ?? '').toLowerCase().includes(q)
  );

  const attentionCount  = isAloha
    ? alohaRows.filter(r => r.badge !== 'ACTIVE').length
    : (sharedStatus && sharedStatus.badge !== 'ACTIVE' ? 1 : 0);

  const isEmpty = isAloha ? alohaRows.length === 0 : !sharedMsaEnd;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`.msa-search::placeholder { color: rgba(255,255,255,0.7); }`}</style>
      <div
        ref={ref}
        style={{
          width: MODAL_W, height: MODAL_H,
          maxWidth: '96vw', maxHeight: '94vh',
          background: '#fff', borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >

        {/* ── Header ── */}
        <div style={{
          height: HEADER_H, flexShrink: 0,
          padding: '0 20px', background: headerGrad,
          display: 'flex', alignItems: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -28, right: -28, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -36, right: 70, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />

          <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/>
            </svg>
          </div>

          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>MSA Expiration Details</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {isAloha ? 'Aloha' : 'Retail / Warehouse'} · {branches.length} branch{branches.length !== 1 ? 'es' : ''} tracked
            </div>
          </div>

          {/* Attention badge — Retail/Warehouse only */}
          {!isAloha && attentionCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 20, padding: '4px 10px', position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fef08a', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff' }}>{attentionCount} need{attentionCount === 1 ? 's' : ''} attention</span>
            </div>
          )}

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.32)', borderRadius: 9, padding: '5px 10px', position: 'relative', zIndex: 1, flexShrink: 0, width: 180 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.7" style={{ flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search branches…"
              className="msa-search"
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11.5, color: '#fff', width: '100%', fontFamily: "'DM Sans', sans-serif" }}
              onFocus={e => { (e.target as HTMLInputElement).style.caretColor = '#fff'; }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </button>
            )}
          </div>

          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', position: 'relative', zIndex: 1, flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.32)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Body (fixed height, scrollable) ── */}
        <div style={{
          height: BODY_H, flexShrink: 0,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: `${accentColor}28 transparent`,
        } as React.CSSProperties}>

          {/* Empty state */}
          {isEmpty && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: '100%', textAlign: 'center' as const, padding: '0 40px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: accentBg, border: `1.5px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke={accentColor} strokeWidth="1.3">
                  <rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/>
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4a3870' }}>No MSA dates recorded</div>
              <div style={{ fontSize: 12, color: '#b8aed8' }}>None of the branches have an MSA end date set yet.</div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              ALOHA — table: Branch | License | MSA End |
                             Days Remaining | Implementation | Status
          ══════════════════════════════════════════════════ */}
          {isAloha && !isEmpty && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Branch</th>
                  <th style={TH}>License No.</th>
                  <th style={TH}>MSA End</th>
                  <th style={TH}>Implementation</th>
                  <th style={TH}>Days Remaining</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {alohaRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid rgba(124,58,237,0.07)', transition: 'background 0.1s' }}
                    onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td: any) => { td.style.background = '#faf9ff'; })}
                    onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td: any) => { td.style.background = ''; })}
                  >
                    {/* Branch */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: accentBg, border: `1px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke={accentColor} strokeWidth="1.6">
                            <path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/>
                            <circle cx="9" cy="7" r="1.8"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a' }}>{row.branch}</span>
                      </div>
                    </td>

                    {/* License */}
                    <td style={{ padding: '12px 14px' }}>
                      {row.license ? (
                        <span style={{ fontSize: 10.5, fontWeight: 700, background: accentBg, color: accentColor, border: `1px solid ${accentBorder}`, borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>
                          {row.license}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#b8aed8', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* MSA End */}
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#18103a', whiteSpace: 'nowrap' as const }}>
                      {row.msaEnd}
                    </td>

                    {/* Implementation */}
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#6b5fa0', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                      {row.isActive ? row.implDate : <span style={{ color: '#b8aed8', fontStyle: 'italic' }}>Not set</span>}
                    </td>

                    {/* Days Remaining */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.col, whiteSpace: 'nowrap' as const }}>
                        {row.daysLeft < 0 ? `Expired ${Math.abs(row.daysLeft)}d ago` : `${row.daysLeft} days left`}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 9.5, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                        background: row.bg, color: row.col,
                        border: `1px solid ${row.border}`,
                        letterSpacing: '0.05em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: row.col, flexShrink: 0 }} />
                        {row.badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ══════════════════════════════════════════════════
              RETAIL / WAREHOUSE — shared MSA banner + branches table
          ══════════════════════════════════════════════════ */}
          {!isAloha && !isEmpty && sharedStatus && sharedDaysLeft !== null && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>

              {/* Shared MSA banner */}
              <div style={{ margin: '16px 20px 0', padding: '14px 18px', borderRadius: 14, background: sharedStatus.bg, border: `1.5px solid ${sharedStatus.border}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: accentBg, border: `1px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 14 14" fill="none" stroke={accentColor} strokeWidth="1.5">
                    <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
                  </svg>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 24, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: accentColor, opacity: 0.85, marginBottom: 3 }}>MSA Start</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#18103a' }}>{fmtDate(sharedMsaStart)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: accentColor, opacity: 0.85, marginBottom: 3 }}>MSA End</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#18103a' }}>{fmtDate(sharedMsaEnd)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#8e7ec0', marginBottom: 3 }}>Days Remaining</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: sharedStatus.col }}>
                      {sharedDaysLeft < 0 ? `Expired ${Math.abs(sharedDaysLeft)}d ago` : `${sharedDaysLeft} days left`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '5px 12px', borderRadius: 20, background: sharedStatus.col + '18', color: sharedStatus.col, border: `1px solid ${sharedStatus.col}30`, letterSpacing: '0.06em', textTransform: 'uppercase' as const, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sharedStatus.col }} />
                  {sharedStatus.badge}
                </span>
              </div>

              {/* Note */}
              <div style={{ margin: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={accentColor} strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5.5"/><path d="M7 5.5V7l1 .6"/>
                </svg>
                <span style={{ fontSize: 10.5, color: '#8e7ec0', fontStyle: 'italic' }}>This MSA applies to all branches under this company.</span>
              </div>

              {/* Branches table */}
              <div style={{ marginTop: 14 }}>
                <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8e7ec0' }}>Covered Branches</span>
                  <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{filteredBranches.length}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>#</th>
                      <th style={TH}>Branch</th>
                      <th style={TH}>License No.</th>
                      <th style={TH}>Implementation</th>
                      <th style={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.map((b, idx) => {
                      const isActive = !!b.implementation_date;
                      return (
                        <tr
                          key={b.id}
                          style={{ borderBottom: '1px solid rgba(124,58,237,0.07)', transition: 'background 0.1s' }}
                          onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td: any) => { td.style.background = '#f8f7ff'; })}
                          onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td: any) => { td.style.background = ''; })}
                        >
                          <td style={{ padding: '12px 14px', width: 44 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'rgba(124,58,237,0.07)', fontSize: 11, fontWeight: 700, color: '#8e7ec0' }}>{idx + 1}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isActive ? '#16a34a' : '#94a3b8' }} />
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a' }}>{b.branch_name ?? '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {b.license_number?.trim() ? (
                              <span style={{ fontSize: 10.5, fontWeight: 600, background: accentBg, color: accentColor, border: `1px solid ${accentBorder}`, borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{b.license_number.trim()}</span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#b8aed8', fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 11.5, color: '#6b5fa0', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                            {b.implementation_date ? fmtDate(b.implementation_date) : <span style={{ color: '#b8aed8', fontStyle: 'italic' }}>Not set</span>}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: isActive ? 'rgba(22,163,74,0.1)' : 'rgba(148,163,184,0.12)', color: isActive ? '#15803d' : '#64748b', border: `1px solid ${isActive ? 'rgba(22,163,74,0.25)' : 'rgba(148,163,184,0.25)'}` }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#16a34a' : '#94a3b8' }} />
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (fixed height) ── */}
        <div style={{ height: FOOTER_H, flexShrink: 0, padding: '0 20px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f9f8ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#8e7ec0' }}>
            {isAloha
              ? `${alohaRows.length} branch${alohaRows.length !== 1 ? 'es' : ''}${q ? ' found' : ' with MSA dates'}`
              : `${filteredBranches.length} branch${filteredBranches.length !== 1 ? 'es' : ''}${q ? ' found' : ' · shared MSA'}`
            }
            {!q && attentionCount > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 6 }}>· {attentionCount} need{attentionCount === 1 ? 's' : ''} attention</span>
            )}
          </span>
          <button
            onClick={onClose}
            style={{ padding: '7px 22px', borderRadius: 9, border: `1.5px solid ${accentBorder}`, background: '#fff', fontSize: 12, fontWeight: 600, color: '#4a3870', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.14s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = accentBg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}