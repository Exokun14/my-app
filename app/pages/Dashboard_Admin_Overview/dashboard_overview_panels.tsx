'use client';

/* ==============================================================
   dashboard_overview_panels.tsx
   Extracted panel components for DashboardAdmin:
     - OverviewPanel  (Panel 0)
     - TicketsPanel   (Panel 1)
     - UsersPanel     (Panel 2)
   Plus all sub-components used exclusively by these panels.
   ============================================================== */

import React, { useState, useRef } from 'react';
import {
  Client, POSDevice, GlobalUser, TicketStatus,
  getBranchLicense, getPriorityInfo, getInitials, getAvatarGradient,
  filterUsers,
  buildClientTrendChartPoints,
  getClientCategoryBarWidthPct,
  buildClientBacklogStatItems,
  computeAvgResolutionHrs,
  buildRealBacklog,
  buildRealCategories,
  getClientAnalytics,       // ← NEW: replaces direct CLIENT_TICKET_ANALYTICS lookup
} from './dashboard_overview_func';
import type { ClientTicketItem, ClientBacklogData, RealCategory } from './dashboard_overview_func';

/* ─── Design tokens ─── */
const C = {
  purple:   '#7c3aed', purpleD: '#5b21b6', purpleLt: '#ede9fe',
  teal:     '#0d9488', amber:   '#d97706', red:      '#dc2626',
  green:    '#16a34a', t1:      '#18103a', t2:       '#4a3870',
  t3:       '#8e7ec0', t4:      '#b8aed8', surface:  '#ffffff',
  surface2: '#f2f0fb', border:  'rgba(124,58,237,0.1)',
  borderMd: 'rgba(124,58,237,0.22)',
};

const summaryBlock: React.CSSProperties = {
  background: C.surface2, borderRadius: 10, padding: '10px 12px', marginTop: 12,
};
const summaryTitle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: C.t3, marginBottom: 5,
};
const summaryText: React.CSSProperties = { fontSize: 11, color: C.t2, lineHeight: 1.65 };
const badgePill: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20,
  background: C.surface2, border: `1px solid ${C.border}`, color: C.t3, whiteSpace: 'nowrap',
};

/* ════════════════════════════════════════════════════
   ICONS
════════════════════════════════════════════════════ */
export const UserIcon     = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.8"/></svg>;
export const MonitorIcon  = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="12" height="9" rx="1.5"/><path d="M2 7.5h12M8 12v1.5M5 13.5h6"/></svg>;
export const ClockIcon    = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>;
export const LocationIcon = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1.5C5.8 1.5 4 3.3 4 5.5c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z"/><circle cx="8" cy="5.5" r="1.5"/></svg>;
export const EditPenIcon  = () => <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>;
export const PlusIcon     = () => <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M6 1v10M1 6h10"/></svg>;

/* ════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
════════════════════════════════════════════════════ */
export function SectionLabel({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return (
    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b8aed8', marginBottom: 4, marginTop: mt ? 12 : 0 }}>
      {children}
    </div>
  );
}

export function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
      <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 100 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: '#18103a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all', ...valueStyle }}>{value}</span>
    </div>
  );
}

export function BranchFilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: active ? 700 : 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.14s', userSelect: 'none', background: active ? '#7c3aed' : '#fff', borderColor: active ? '#7c3aed' : 'rgba(124,58,237,0.16)', color: active ? '#fff' : '#4a3870', boxShadow: active ? '0 2px 10px rgba(124,58,237,0.35)' : 'none' }}>
      {children}
    </div>
  );
}

export function FilterCheckRow({ label, checked, onChange, dot }: { label: string; checked: boolean; onChange: () => void; dot?: string }) {
  return (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${checked ? '#7c3aed' : 'rgba(124,58,237,0.25)'}`, background: checked ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.14s' }}>
        {checked && <svg viewBox="0 0 10 8" fill="none" stroke="#fff" strokeWidth="2" width="9" height="9"><path d="M1 4l3 3 5-5"/></svg>}
      </div>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      <span style={{ fontSize: 12, color: checked ? '#18103a' : '#4a3870', fontWeight: checked ? 600 : 400 }}>{label}</span>
    </div>
  );
}

export function POSBranchCard({ pos, onClick }: { pos: POSDevice; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? '#fff' : '#faf9ff', border: `1.5px solid ${hovered ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.1)'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.14s', boxShadow: hovered ? '0 3px 12px rgba(124,58,237,0.1)' : 'none', minWidth: 160, flex: '1 1 160px', maxWidth: 220, position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: hovered ? '#ede9fe' : '#f2f0fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.14s' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#18103a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pos.model}</div>
        <div style={{ fontSize: 9.5, color: '#8e7ec0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{pos.ip || '—'}</div>
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={hovered ? '#7c3aed' : '#b8aed8'} strokeWidth="1.6" style={{ flexShrink: 0, transition: 'stroke 0.14s' }}><path d="M4 2l4 4-4 4"/></svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STAT CARDS
════════════════════════════════════════════════════ */
export function StatCard({ icon, iconBg, iconColor, value, label, accent, onClick, clickable }: {
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

export function MSAStatCard({ onClick, client, posDevices }: { onClick: () => void; client: Client; posDevices: POSDevice[] }) {
  const [hov, setHov] = useState(false);
  const isAloha = client.cat === 'F&B';
  let soonestDays: number | null = null;
  if (isAloha) {
    for (const pos of posDevices) {
      if (!pos.msaEnd) continue;
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const d = Math.ceil((new Date(pos.msaEnd).getTime() - now.getTime()) / 86400000);
      if (soonestDays === null || d < soonestDays) soonestDays = d;
    }
  } else {
    if (client.saEnd) { const now = new Date(); now.setHours(0, 0, 0, 0); soonestDays = Math.ceil((new Date(client.saEnd).getTime() - now.getTime()) / 86400000); }
  }
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
          {showBadge && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: accent, background: accent + '15', border: `1px solid ${accent}35`, borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' }}>{badgeText}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>Click to view details</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#8e7ec0" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
        </div>
      </div>
    </div>
  );
}

export function SitesSeatsCard({ sites, seats }: { sites: number; seats: number }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px 12px', borderRadius: 14, background: '#fff', border: `1px solid ${hov ? 'rgba(2,132,199,0.3)' : 'rgba(124,58,237,0.1)'}`, boxShadow: hov ? '0 6px 24px rgba(2,132,199,0.1)' : '0 1px 4px rgba(15,10,35,0.04)', transition: 'all 0.18s', cursor: 'default', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#0284c7,#0d9488)', borderRadius: '14px 14px 0 0', opacity: hov ? 1 : 0.5, transition: 'opacity 0.18s' }} />
      <div style={{ width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', color: '#0284c7', marginBottom: 10 }}><LocationIcon /></div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div><div style={{ fontSize: 28, fontWeight: 900, color: '#18103a', lineHeight: 1, letterSpacing: '-0.5px' }}>{sites}</div><div style={{ fontSize: 11, fontWeight: 600, color: '#8e7ec0', marginTop: 4 }}>Sites</div></div>
        <div style={{ width: 1, background: 'rgba(2,132,199,0.15)', height: 36, marginBottom: 2 }} />
        <div><div style={{ fontSize: 28, fontWeight: 900, color: '#18103a', lineHeight: 1, letterSpacing: '-0.5px' }}>{seats}</div><div style={{ fontSize: 11, fontWeight: 600, color: '#8e7ec0', marginTop: 4 }}>Seats</div></div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   KPI CARD (Tickets panel)
════════════════════════════════════════════════════ */
export function ClientKpiCard({ label, num, unit, delta, dir, sub, bar, accent }: {
  label: string; num: number | string; unit: string; delta: string;
  dir: 'up' | 'dn' | 'flat'; sub: string; bar: number; accent: string;
}) {
  const deltaBg    = dir === 'up' ? 'rgba(22,163,74,0.1)' : dir === 'dn' ? 'rgba(220,38,38,0.1)' : 'rgba(100,116,139,0.1)';
  const deltaColor = dir === 'up' ? '#16a34a' : dir === 'dn' ? '#dc2626' : '#64748b';
  const deltaIcon  = dir === 'up' ? '▲' : dir === 'dn' ? '▼' : '—';
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 16px 14px', cursor: 'default' }}>
      <div style={{ position: 'absolute', top: -36, right: -36, width: 96, height: 96, borderRadius: '50%', background: accent, opacity: 0.06, pointerEvents: 'none' }} />
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: C.t3, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, marginBottom: 8 }}>
        <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px', color: accent }}>{num}</div>
        {unit && <div style={{ fontSize: 12, fontWeight: 600, paddingBottom: 3, color: C.t3 }}>{unit}</div>}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: deltaBg, color: deltaColor, marginBottom: 6 }}>
        {deltaIcon} {delta}
      </div>
      <div style={{ fontSize: 10, color: C.t3, marginBottom: 10 }}>{sub}</div>
      <div style={{ height: 3, borderRadius: 2, background: C.surface2, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${Math.min(100, Math.max(0, bar))}%`, transition: 'width 0.7s ease-in-out' }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TICKET VOLUME TREND CHART
════════════════════════════════════════════════════ */
type TicketPeriod = '7D' | '30D' | '90D' | 'custom';

export function ClientTrendChart({ clientId, period }: { clientId: number; period: TicketPeriod }) {
  // ── CHANGED: use getClientAnalytics so DB-only clients always get data ──
  const analytics = getClientAnalytics(clientId);
  const { trend } = analytics;

  const days = period === '7D' ? 7 : period === '90D' ? 90 : 30;
  const sliceTrend = (arr: number[]) => {
    if (days <= arr.length) return arr.slice(-days);
    const out: number[] = [];
    while (out.length < days) out.push(...arr);
    return out.slice(-days);
  };
  const sliced = {
    newTickets: sliceTrend(trend.newTickets),
    resolved:   sliceTrend(trend.resolved),
    critical:   sliceTrend(trend.critical),
  };
  const { mkPts, mkArea, gridYs, W, H } = buildClientTrendChartPoints(sliced);
  const periodLabel = period === 'custom' ? 'Custom' : period;

  const tickets      = analytics.tickets;
  const openCount    = tickets.open.length;
  const pendingCount = tickets.pending.length;
  const closedCount  = tickets.closed.length;
  const totalTracked = openCount + pendingCount + closedCount;
  const highPriorityOpen = tickets.open.filter(t => t.priority === 'critical' || t.priority === 'high').length;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px 12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 2 }}>Ticket Volume Trend</div>
          <div style={{ fontSize: 10, color: C.t3 }}>Daily new &amp; closed — last {periodLabel}</div>
        </div>
        <span style={badgePill}>{periodLabel}</span>
      </div>
      <div style={{ position: 'relative', height: 90 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {gridYs.map((y, i) => <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="rgba(124,58,237,0.07)" strokeWidth="1"/>)}
          <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(124,58,237,0.1)" strokeWidth="1"/>
          <path d={mkArea(sliced.resolved)}   fill="#16a34a" fillOpacity="0.07"/>
          <path d={mkArea(sliced.newTickets)} fill="#7c3aed" fillOpacity="0.07"/>
          <polyline points={mkPts(sliced.resolved)}   fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={mkPts(sliced.newTickets)} fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={mkPts(sliced.critical)}   fill="none" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
        {[['#7c3aed', 'New'], ['#16a34a', 'Resolved'], ['#dc2626', 'Critical']].map(([col, lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.t2 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }}/>{lbl}
          </div>
        ))}
      </div>
      <div style={summaryBlock}>
        <div style={summaryTitle}>📊 Ticket Summary</div>
        <div style={summaryText}>
          {totalTracked > 0 ? (
            <>
              {totalTracked} total ticket{totalTracked !== 1 ? 's' : ''} on record —{' '}
              <strong style={{ color: C.red }}>{openCount} open</strong>,{' '}
              <strong style={{ color: C.amber }}>{pendingCount} pending</strong>,{' '}
              <strong style={{ color: C.green }}>{closedCount} resolved</strong>.
              {highPriorityOpen > 0
                ? ` ${highPriorityOpen} open ticket${highPriorityOpen !== 1 ? 's' : ''} are high/critical priority — immediate attention needed.`
                : ' No high-priority open tickets at this time.'}
            </>
          ) : (
            'No tickets recorded yet for this client. The trend chart shows projected volume based on client profile.'
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CATEGORY CHART
════════════════════════════════════════════════════ */
export function ClientCategoryChart({ clientId }: { clientId: number }) {
  // ── CHANGED: use getClientAnalytics fallback ──
  const analytics   = getClientAnalytics(clientId);
  const categories  = buildRealCategories(clientId);

  // For DB-only clients buildRealCategories returns [] because they have no tickets yet.
  // Fall back to the synthesised categories from getClientAnalytics in that case.
  const displayCats = categories.length > 0
    ? categories
    : analytics.categories.map(c => ({
        label: c.label, color: c.color, n: c.n,
        thisWeek: c.n, lastWeek: 0, change: c.change, dir: c.dir,
      }));

  if (displayCats.length === 0) return null;

  const catTotal     = displayCats.reduce((a, b) => a + b.n, 0);
  const top          = displayCats[0];
  const decliningCat = displayCats.find(c => c.dir === 'dn');

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px 12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 2 }}>Tickets by Category</div>
        <div style={{ fontSize: 10, color: C.t3 }}>Volume &amp; week-over-week change</div>
      </div>
      <div>
        {displayCats.map((c, idx) => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: idx < displayCats.length - 1 ? `1px solid ${C.border}` : 'none', gap: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0, marginRight: 10 }}/>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.t1, flex: '1 1 0', minWidth: 0, paddingRight: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>
            <div style={{ width: 80, height: 5, borderRadius: 3, background: C.surface2, flexShrink: 0, marginRight: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: c.color, opacity: 0.75, width: `${getClientCategoryBarWidthPct(c.n, catTotal)}%`, transition: 'width 0.7s ease-in-out' }}/>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, width: 22, flexShrink: 0, textAlign: 'right', marginRight: 10 }}>{c.n}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textAlign: 'right', flexShrink: 0, width: 50, color: c.dir === 'up' ? C.red : c.dir === 'dn' ? C.green : C.t3 }}>
              {c.dir === 'flat' ? '—' : c.change > 0 ? `▲ +${c.change}%` : `▼ ${c.change}%`}
            </div>
          </div>
        ))}
      </div>
      <div style={summaryBlock}>
        <div style={summaryTitle}>🔍 Category Findings</div>
        <div style={summaryText}>
          {top.label} leads with {top.n} ticket{top.n !== 1 ? 's' : ''} ({Math.round((top.n / catTotal) * 100)}% of total{top.dir !== 'flat' ? `, ${top.change > 0 ? '+' : ''}${top.change}% WoW` : ''}).{' '}
          {decliningCat
            ? `${decliningCat.label} tickets are down ${Math.abs(decliningCat.change)}% this week — recent fixes appear effective.`
            : 'All categories are trending up or flat — monitor for further volume increases.'}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   BACKLOG HEALTH
════════════════════════════════════════════════════ */
export function ClientBacklogHealth({ clientId }: { clientId: number }) {
  // ── CHANGED: use getClientAnalytics fallback ──
  const analytics  = getClientAnalytics(clientId);
  const realBacklog = buildRealBacklog(clientId);
  const items       = buildClientBacklogStatItems(realBacklog);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px 12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 2 }}>Backlog Health</div>
          <div style={{ fontSize: 10, color: C.t3 }}>Open ticket age &amp; risk breakdown</div>
        </div>
        <span style={{ ...badgePill, background: 'rgba(22,163,74,0.1)', color: C.green, border: '1px solid rgba(22,163,74,0.2)' }}>Live</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {items.map(({ n, label, sub, bg, bdr, col }) => (
          <div key={label} style={{ flex: 1, borderRadius: 9, textAlign: 'center', padding: '10px 6px', background: bg, border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1, letterSpacing: '-0.5px' }}>{n}</div>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.t3, marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: 5 }}>
        {[{ pct: realBacklog.freshPct, col: C.green }, { pct: realBacklog.agingPct, col: C.amber }, { pct: realBacklog.overduePct, col: C.red }].map(({ pct, col }, i) => (
          <div key={i} style={{ height: '100%', borderRadius: 3, background: col, width: `${pct}%`, transition: 'width 0.7s ease-in-out' }}/>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.t3, marginBottom: 4 }}>
        <span>🟢 {realBacklog.freshPct}% fresh</span>
        <span>🟡 {realBacklog.agingPct}% aging</span>
        <span>🔴 {realBacklog.overduePct}% overdue</span>
      </div>
      <div style={summaryBlock}>
        <div style={summaryTitle}>🩺 Backlog Findings</div>
        <div style={summaryText}>{realBacklog.summary}</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CLIENT TICKET LIST
════════════════════════════════════════════════════ */
export function ClientTicketList({ clientId, statusFilter }: { clientId: number; statusFilter: TicketStatus }) {
  // ── CHANGED: use getClientAnalytics fallback ──
  const analytics = getClientAnalytics(clientId);
  const list: ClientTicketItem[] = analytics.tickets[statusFilter] ?? [];
  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
      {list.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '28px 0', color: C.t3 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>No {statusFilter} tickets</span>
        </div>
      ) : list.map(ticket => <ClientTicketRow key={ticket.id} ticket={ticket} />)}
    </div>
  );
}

function ClientTicketRow({ ticket }: { ticket: ClientTicketItem }) {
  const { bg, color } = getPriorityInfo(ticket.priority);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: bg, color }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5.9"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</div>
        <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{ticket.id} · {ticket.time}{ticket.branch && ` · ${ticket.branch}`}</div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 20, background: bg, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {ticket.priority}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PANEL 0 — OVERVIEW
════════════════════════════════════════════════════ */
interface OverviewPanelProps {
  currentClient: Client;
  clientUsers_filtered: GlobalUser[];
  posDevices: POSDevice[];
  clientTicketCounts: { open: number; pending: number; closed: number };
  isAloha: boolean;
  posSearch: string;
  setPosSearch: (v: string) => void;
  showPOSFilterPanel: boolean;
  setShowPOSFilterPanel: (v: boolean | ((p: boolean) => boolean)) => void;
  activePOSBranchFilter: Set<string>;
  setActivePOSBranchFilter: (v: Set<string> | ((p: Set<string>) => Set<string>)) => void;
  branchesLoading: boolean;
  setOvPanel: (v: number) => void;
  setShowAddBranchModal: (v: boolean) => void;
  setMsaModalOpen: (v: boolean) => void;
  setBranchDetailModal: (v: { branch: string; client: Client } | null) => void;
  setPosDetailModal: (v: { pos: POSDevice; client: Client } | null) => void;
  openEditInfoModal: (client: Client) => void;
}

export function OverviewPanel({
  currentClient, clientUsers_filtered, posDevices, clientTicketCounts, isAloha,
  posSearch, setPosSearch, showPOSFilterPanel, setShowPOSFilterPanel,
  activePOSBranchFilter, setActivePOSBranchFilter, branchesLoading,
  setOvPanel, setShowAddBranchModal, setMsaModalOpen,
  setBranchDetailModal, setPosDetailModal, openEditInfoModal,
}: OverviewPanelProps) {
  const posByBranch = (() => {
    const q = posSearch.toLowerCase().trim();
    const filtered = posDevices.filter(d => {
      const branchOk = activePOSBranchFilter.size === 0 || activePOSBranchFilter.has(d.branch);
      const searchOk = !q || [d.model, d.licenseNumber, d.ip, d.os, d.branch, d.id].some(s => s.toLowerCase().includes(q));
      return branchOk && searchOk;
    });
    const groups: Record<string, POSDevice[]> = {};
    filtered.forEach(d => { if (!groups[d.branch]) groups[d.branch] = []; groups[d.branch].push(d); });
    return groups;
  })();

  return (
    <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
      {/* Top stat cards */}
      <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <StatCard icon={<UserIcon />}    iconBg="linear-gradient(135deg,#ede9fe,#ddd6fe)" iconColor="#7c3aed" value={clientUsers_filtered.length} label="Users"        accent="#7c3aed" onClick={() => setOvPanel(2)} clickable />
        <StatCard icon={<MonitorIcon />} iconBg="linear-gradient(135deg,#ccfbf1,#99f6e4)" iconColor="#0d9488" value={posDevices.length}           label="Total POS"    accent="#0d9488" />
        <StatCard icon={<ClockIcon />}   iconBg="linear-gradient(135deg,#fee2e2,#fecaca)" iconColor="#dc2626" value={clientTicketCounts.open}       label="Open Tickets" accent="#dc2626" onClick={() => setOvPanel(1)} clickable />
        {isAloha ? (
          <MSAStatCard onClick={() => setMsaModalOpen(true)} posDevices={posDevices} client={currentClient} />
        ) : (
          <>
            <SitesSeatsCard sites={(currentClient.branches || []).length} seats={posDevices.length} />
            <MSAStatCard onClick={() => setMsaModalOpen(true)} posDevices={posDevices} client={currentClient} />
          </>
        )}
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '5fr 5fr', gap: 12, overflow: 'hidden', minHeight: 0 }}>
        {/* LEFT — General Info */}
        <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>General Information</span>
            <button onClick={() => openEditInfoModal(currentClient)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fff'; el.style.borderColor = 'rgba(124,58,237,0.22)'; el.style.color = '#18103a'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.1)'; el.style.color = '#4a3870'; }}>
              <EditPenIcon /> Edit Info
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
            <SectionLabel>PRIMARY CONTACT</SectionLabel>
            {[
              { key: 'Store Name',     val: currentClient.name         },
              { key: 'Contact Person', val: currentClient.contact      },
              { key: 'Email',          val: currentClient.email        },
              { key: 'Phone',          val: currentClient.phone || '—' },
            ].map(item => <InfoRow key={item.key} label={item.key} value={item.val} />)}

            <SectionLabel mt>ALTERNATE CONTACT 1</SectionLabel>
            {currentClient.altContact ? (
              [{ key: 'Contact Person', val: currentClient.altContact }, { key: 'Email', val: currentClient.altEmail || '—' }, { key: 'Phone', val: currentClient.altPhone || '—' }]
                .map(item => <InfoRow key={`alt1-${item.key}`} label={item.key} value={item.val} />)
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
                <span style={{ fontSize: 10.5, color: '#8e7ec0', fontStyle: 'italic' }}>No alternate contact 1</span>
                <button onClick={() => openEditInfoModal(currentClient)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Add</button>
              </div>
            )}

            <SectionLabel mt>ALTERNATE CONTACT 2</SectionLabel>
            {currentClient.altContact2 ? (
              [{ key: 'Contact Person', val: currentClient.altContact2 }, { key: 'Email', val: currentClient.altEmail2 || '—' }, { key: 'Phone', val: currentClient.altPhone2 || '—' }]
                .map(item => <InfoRow key={`alt2-${item.key}`} label={item.key} value={item.val} />)
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
                <span style={{ fontSize: 10.5, color: '#8e7ec0', fontStyle: 'italic' }}>No alternate contact 2</span>
                <button onClick={() => openEditInfoModal(currentClient)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Add</button>
              </div>
            )}

            <SectionLabel mt>ACCOUNT DETAILS</SectionLabel>
            <InfoRow label="Acct Manager" value={currentClient.accountManager} valueStyle={{ color: '#7c3aed', fontWeight: 600 }} />
            <InfoRow label="User Role" value="System Admin" />

            {/* Branch Locations */}
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(124,58,237,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4a3870', letterSpacing: '0.04em' }}>Branch Locations</span>
                  <span style={{ fontSize: 9, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.12)' }}>
                    {(currentClient.branches || []).length}
                  </span>
                </div>
                <button onClick={() => setShowAddBranchModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: '#fff', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 2px 10px rgba(124,58,237,0.28)', fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
                  <PlusIcon /> Add Branch
                </button>
              </div>

              {branchesLoading ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[80, 100, 70].map((w, i) => (
                    <div key={i} style={{ width: w, height: 26, borderRadius: 7, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                  ))}
                </div>
              ) : (currentClient.branches || []).length === 0 ? (
                <div style={{ padding: '12px 10px', background: '#f8f7ff', borderRadius: 8, border: '1.5px dashed rgba(124,58,237,0.18)', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#b8aed8', fontStyle: 'italic' }}>No branches added yet — click <strong style={{ color: '#7c3aed' }}>+ Add Branch</strong> to get started.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(currentClient.branches || []).map((branch: string) => (
                    <div key={branch} onClick={() => setBranchDetailModal({ branch, client: currentClient })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#e0f2fe', color: '#0c4a6e', fontSize: 10.5, fontWeight: 600, borderRadius: 7, border: '1px solid rgba(2,132,199,0.2)', cursor: 'pointer', transition: 'all 0.14s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#bae6fd'; el.style.borderColor = 'rgba(2,132,199,0.35)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#e0f2fe'; el.style.borderColor = 'rgba(2,132,199,0.2)'; }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                      {branch}
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — POS Machines */}
        <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>POS Machines</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 10 }}>{posDevices.length} devices</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: '4px 10px', width: 160 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.6" width="12" height="12"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
                <input style={{ background: 'none', border: 'none', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#18103a', width: '100%' }} placeholder="Search POS…" value={posSearch} onChange={e => setPosSearch(e.target.value)} />
                {posSearch && <button onClick={() => setPosSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#b8aed8' }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg></button>}
              </div>
              <button onClick={() => setShowPOSFilterPanel(p => !p)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 10.5, fontWeight: 600, transition: 'all 0.16s', whiteSpace: 'nowrap', background: showPOSFilterPanel ? '#7c3aed' : '#f2f0fb', color: showPOSFilterPanel ? '#fff' : '#4a3870', outline: showPOSFilterPanel ? 'none' : '1px solid rgba(124,58,237,0.1)' }}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3"/></svg>
                Filter
                {activePOSBranchFilter.size > 0 && <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 9, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>{activePOSBranchFilter.size}</span>}
              </button>
            </div>
          </div>

          {showPOSFilterPanel && (currentClient.branches || []).length > 0 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(124,58,237,0.1)', background: '#f2f0fb', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2 }}>Branch:</span>
              <BranchFilterChip active={activePOSBranchFilter.size === 0} onClick={() => setActivePOSBranchFilter(new Set())}>All</BranchFilterChip>
              {(currentClient.branches || []).map((branch: string) => {
                const count    = posDevices.filter(d => d.branch === branch).length;
                const isActive = activePOSBranchFilter.has(branch);
                return (
                  <BranchFilterChip key={branch} active={isActive} onClick={() => setActivePOSBranchFilter(prev => { const next = new Set(prev); next.has(branch) ? next.delete(branch) : next.add(branch); return next; })}>
                    {branch}
                    <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.1)', color: isActive ? '#fff' : '#5b21b6', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 20, textAlign: 'center' }}>{count}</span>
                  </BranchFilterChip>
                );
              })}
              {activePOSBranchFilter.size > 0 && <button onClick={() => setActivePOSBranchFilter(new Set())} style={{ marginLeft: 'auto', fontSize: 9.5, padding: '2px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>}
            </div>
          )}

          {Object.keys(posByBranch).length > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 14, scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
              {Object.entries(posByBranch).map(([branch, devices]) => {
                const branchLic = getBranchLicense(currentClient, branch);
                return (
                  <div key={branch}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))', border: '1px solid rgba(2,132,199,0.18)', borderRadius: 6, padding: '3px 10px' }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0c4a6e', letterSpacing: '0.03em' }}>{branch}</span>
                      </div>
                      {branchLic && <span style={{ fontSize: 11, fontWeight: 700, background: isAloha ? 'rgba(217,119,6,0.1)' : 'rgba(124,58,237,0.08)', color: isAloha ? '#92400e' : '#5b21b6', padding: '2px 8px', borderRadius: 5, border: `1px solid ${isAloha ? 'rgba(217,119,6,0.2)' : 'rgba(124,58,237,0.14)'}` }}>{branchLic}</span>}
                      <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 600 }}>{devices.length} device{devices.length !== 1 ? 's' : ''}</span>
                      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(2,132,199,0.12),transparent)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {devices.map(pos => <POSBranchCard key={pos.id} pos={pos} onClick={() => setPosDetailModal({ pos, client: currentClient })} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '24px 0' }}>
              <span style={{ fontSize: 22 }}>🔍</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4a3870' }}>No POS devices found</span>
              <span style={{ fontSize: 11, color: '#b8aed8' }}>{posSearch ? `No results for "${posSearch}"` : 'No devices in selected branch'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PANEL 1 — TICKETS
════════════════════════════════════════════════════ */
interface TicketsPanelProps {
  currentClient: Client;
  clientTicketCounts: { open: number; pending: number; closed: number };
  ticketStatusFilter: TicketStatus;
  setTicketStatusFilter: (s: TicketStatus) => void;
  ticketPeriod: TicketPeriod;
  setTicketPeriod: (p: TicketPeriod) => void;
  showToast: (msg: string) => void;
}

export function TicketsPanel({
  currentClient, clientTicketCounts, ticketStatusFilter, setTicketStatusFilter,
  ticketPeriod, setTicketPeriod, showToast,
}: TicketsPanelProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const customPickerRef = useRef<HTMLDivElement>(null);

  // ── CHANGED: always get analytics (with fallback for DB-only clients) ──
  const clientAnalytics = getClientAnalytics(currentClient.id);

  // Prefer live clientTicketCounts from parent (comes from CLIENT_TICKET_ANALYTICS directly
  // in dashboard_overview_users.tsx), but fall back to the analytics object for DB clients.
  const openCount    = clientTicketCounts.open    || clientAnalytics.tickets.open.length;
  const pendingCount = clientTicketCounts.pending  || clientAnalytics.tickets.pending.length;
  const closedCount  = clientTicketCounts.closed   || clientAnalytics.tickets.closed.length;

  const totalTickets = openCount + pendingCount + closedCount;
  const avgResHrs    = computeAvgResolutionHrs(clientAnalytics);
  const closurePct   = Math.round((closedCount / Math.max(totalTickets, 1)) * 100);
  const resBarPct    = Math.max(5, Math.round((1 - avgResHrs / 168) * 100));
  const resDir: 'up' | 'dn' | 'flat' = avgResHrs <= 24 ? 'up' : avgResHrs <= 72 ? 'flat' : 'dn';
  const totalDir: 'up' | 'dn' | 'flat' = openCount >= 5 ? 'dn' : openCount > 0 ? 'flat' : 'up';

  return (
    <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 3, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {(['open', 'pending', 'closed'] as TicketStatus[]).map(s => {
            const count = s === 'open' ? openCount : s === 'pending' ? pendingCount : closedCount;
            return (
              <div key={s} onClick={() => setTicketStatusFilter(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s', userSelect: 'none', background: ticketStatusFilter === s ? '#fff' : 'transparent', color: ticketStatusFilter === s ? '#18103a' : '#8e7ec0', boxShadow: ticketStatusFilter === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, display: 'inline-block', background: s === 'open' ? '#ef4444' : s === 'pending' ? '#eab308' : '#22c55e' }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span style={{ background: '#e9e6f8', color: '#8e7ec0', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8 }}>{count}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 3, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {(['7D', '30D', '90D'] as TicketPeriod[]).map(p => (
            <div key={p} onClick={() => { setTicketPeriod(p); setShowCustomPicker(false); }}
              style={{ padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s', userSelect: 'none', background: ticketPeriod === p ? '#fff' : 'transparent', color: ticketPeriod === p ? '#7c3aed' : '#8e7ec0', boxShadow: ticketPeriod === p ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>{p}</div>
          ))}
          <div style={{ position: 'relative' }} ref={customPickerRef}>
            <div onClick={() => setShowCustomPicker(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s', userSelect: 'none', background: ticketPeriod === 'custom' ? '#fff' : 'transparent', color: ticketPeriod === 'custom' ? '#7c3aed' : '#8e7ec0', boxShadow: ticketPeriod === 'custom' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              Custom
              <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" width="8" height="8" style={{ transform: showCustomPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M1 1l4 4 4-4"/></svg>
            </div>
            {showCustomPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300, background: '#fff', borderRadius: 12, border: '1px solid rgba(124,58,237,0.15)', boxShadow: '0 8px 28px rgba(124,58,237,0.14)', padding: '14px 16px', minWidth: 240 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Custom Date Range</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['From', customFrom, setCustomFrom], ['To', customTo, setCustomTo]].map(([label, val, setter]) => (
                    <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.t2, fontWeight: 600, width: 28 }}>{label as string}</span>
                      <input type="date" value={val as string} onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                        style={{ flex: 1, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(124,58,237,0.18)', fontSize: 11, fontFamily: "'DM Sans',sans-serif", color: C.t1, outline: 'none', background: '#faf9ff' }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => { if (customFrom && customTo) { setTicketPeriod('custom'); setShowCustomPicker(false); } }}
                  style={{ marginTop: 12, width: '100%', padding: '7px 0', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', fontSize: 11.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", opacity: customFrom && customTo ? 1 : 0.45 }}>
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => showToast('Exporting tickets…')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 10.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb' }}>Export</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
        <ClientKpiCard label="Total Tickets" num={totalTickets} unit="" delta={`${openCount} open now`} dir={totalDir} sub={`${closedCount} resolved · ${pendingCount} pending`} bar={closurePct} accent={C.purple} />
        <ClientKpiCard label="Avg Resolution" num={avgResHrs} unit="hrs" delta={avgResHrs <= 24 ? 'Within SLA' : 'Above SLA target'} dir={resDir} sub="avg time to close — from closed tickets" bar={resBarPct} accent={C.green} />
      </div>

      {/* 2-col charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 10, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minHeight: 0 }}>
          <ClientTrendChart clientId={currentClient.id} period={ticketPeriod} />
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <ClientCategoryChart clientId={currentClient.id} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minHeight: 0 }}>
          <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '1px solid rgba(124,58,237,0.08)', flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>Ticket List</span>
              <button onClick={() => showToast('Viewing all tickets')} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>View All</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
              <ClientTicketList clientId={currentClient.id} statusFilter={ticketStatusFilter} />
            </div>
          </div>
          <ClientBacklogHealth clientId={currentClient.id} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PANEL 2 — USERS
════════════════════════════════════════════════════ */
interface UsersPanelProps {
  currentClient: Client;
  clients: Client[];
  users: GlobalUser[];
  userSearch: string;
  setUserSearch: (v: string) => void;
  userRoleFilters: Set<string>;
  userStatusFilters: Set<string>;
  userPositionFilters: Set<string>;
  setUserRoleFilters: (v: Set<string>) => void;
  setUserStatusFilters: (v: Set<string>) => void;
  setUserPositionFilters: (v: Set<string>) => void;
  setAddUserModalOpen: (v: boolean) => void;
  showToast: (msg: string) => void;
}

export function UsersPanel({
  currentClient, users, userSearch, setUserSearch,
  userRoleFilters, userStatusFilters, userPositionFilters,
  setUserRoleFilters, setUserStatusFilters, setUserPositionFilters,
  setAddUserModalOpen, showToast,
}: UsersPanelProps) {
  const [showUserFilterPanel, setShowUserFilterPanel] = useState(false);
  const [pendingRoles,     setPendingRoles]     = useState<Set<string>>(new Set());
  const [pendingStatuses,  setPendingStatuses]  = useState<Set<string>>(new Set());
  const [pendingPositions, setPendingPositions] = useState<Set<string>>(new Set());
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const clientUsers_filtered = users.filter(u => u.company === currentClient.name);
  const filteredUsers   = filterUsers(clientUsers_filtered, userRoleFilters, userStatusFilters, userPositionFilters, userSearch);
  const uniquePositions = Array.from(new Set(clientUsers_filtered.map(u => u.position))).sort();
  const totalActiveFilters = userRoleFilters.size + userStatusFilters.size + userPositionFilters.size;
  const pendingTotal = pendingRoles.size + pendingStatuses.size + pendingPositions.size;

  const openFilterPanel = () => {
    setPendingRoles(new Set(userRoleFilters));
    setPendingStatuses(new Set(userStatusFilters));
    setPendingPositions(new Set(userPositionFilters));
    setShowUserFilterPanel(true);
  };
  const applyFilters = () => {
    setUserRoleFilters(new Set(pendingRoles));
    setUserStatusFilters(new Set(pendingStatuses));
    setUserPositionFilters(new Set(pendingPositions));
    setShowUserFilterPanel(false);
  };

  return (
    <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#18103a' }}>{currentClient.name} Users</div>
          <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 2 }}>Users assigned to this company</div>
        </div>
        <button onClick={() => setAddUserModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#fff', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 2px 10px rgba(124,58,237,0.28)', fontFamily: "'DM Sans',sans-serif" }}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/></svg>
          Add User
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: '6px 12px', flex: 1, maxWidth: 280 }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.6" width="12" height="12"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: '#18103a', width: '100%', fontFamily: "'DM Sans',sans-serif" }} placeholder="Search users…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          {userSearch && <button onClick={() => setUserSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#b8aed8' }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg></button>}
        </div>

        <div ref={filterPanelRef} style={{ position: 'relative' }}>
          <button onClick={() => showUserFilterPanel ? setShowUserFilterPanel(false) : openFilterPanel()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all 0.16s', background: showUserFilterPanel ? '#7c3aed' : '#f2f0fb', color: showUserFilterPanel ? '#fff' : '#4a3870', border: showUserFilterPanel ? 'none' : '1px solid rgba(124,58,237,0.16)', boxShadow: showUserFilterPanel ? '0 2px 10px rgba(124,58,237,0.3)' : 'none' }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3"/></svg>
            Filters
            {totalActiveFilters > 0 && <span style={{ background: showUserFilterPanel ? 'rgba(255,255,255,0.3)' : '#7c3aed', color: '#fff', borderRadius: 9, fontSize: 9, fontWeight: 700, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>{totalActiveFilters}</span>}
            <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9" style={{ transform: showUserFilterPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M1 1l4 4 4-4"/></svg>
          </button>

          {showUserFilterPanel && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200, minWidth: 520, background: '#fff', borderRadius: 14, border: '1px solid rgba(124,58,237,0.13)', boxShadow: '0 8px 32px rgba(124,58,237,0.14)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid rgba(124,58,237,0.09)', background: '#faf9ff' }}>
                <svg viewBox="0 0 14 14" fill="none" stroke="#7c3aed" strokeWidth="1.7" width="13" height="13"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3"/></svg>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#18103a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filter Users</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.8fr', gap: 0 }}>
                <div style={{ padding: '14px 18px 10px', borderRight: '1px solid rgba(124,58,237,0.08)' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#8e7ec0', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Role</span>
                  {['Manager', 'User'].map(r => <FilterCheckRow key={r} label={r} checked={pendingRoles.has(r)} onChange={() => setPendingRoles(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; })} />)}
                </div>
                <div style={{ padding: '14px 18px 10px', borderRight: '1px solid rgba(124,58,237,0.08)' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#8e7ec0', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Status</span>
                  {[{ label: 'Active', dot: '#22c55e' }, { label: 'Inactive', dot: '#ef4444' }].map(({ label, dot }) =>
                    <FilterCheckRow key={label} label={label} dot={dot} checked={pendingStatuses.has(label)} onChange={() => setPendingStatuses(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; })} />)}
                </div>
                <div style={{ padding: '14px 18px 10px' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#8e7ec0', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Position</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 160, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
                    {uniquePositions.length === 0 ? (
                      <span style={{ fontSize: 11, color: '#b8aed8', fontStyle: 'italic' }}>No positions available</span>
                    ) : uniquePositions.map(position => (
                      <FilterCheckRow key={position} label={position} checked={pendingPositions.has(position)} onChange={() => setPendingPositions(prev => { const n = new Set(prev); n.has(position) ? n.delete(position) : n.add(position); return n; })} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 12px', borderTop: '1px solid rgba(124,58,237,0.09)', background: '#faf9ff' }}>
                <span style={{ fontSize: 11, color: pendingTotal > 0 ? '#8e7ec0' : '#b8aed8', fontStyle: pendingTotal === 0 ? 'italic' : 'normal', fontWeight: pendingTotal > 0 ? 600 : 400 } as React.CSSProperties}>
                  {pendingTotal === 0 ? 'No filters active' : `${pendingTotal} filter${pendingTotal !== 1 ? 's' : ''} selected`}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {pendingTotal > 0 && <button onClick={() => { setPendingRoles(new Set()); setPendingStatuses(new Set()); setPendingPositions(new Set()); }} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Clear all</button>}
                  <button onClick={applyFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}>
                    <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M1 5l3.5 3.5L11 1"/></svg>
                    Apply &amp; Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#8e7ec0' }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {filteredUsers.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: '#b8aed8' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="16" cy="12" r="6"/><path d="M4 28c0-6.6 5.4-12 12-12s12 5.4 12 12"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8e7ec0' }}>No users found</span>
            <span style={{ fontSize: 11, color: '#b8aed8' }}>
              {userSearch || totalActiveFilters > 0
                ? 'Try adjusting your search or filters'
                : `No users assigned to ${currentClient.name} yet — click Add User to get started.`}
            </span>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Position', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ position: 'sticky', top: 0, background: '#f2f0fb', padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8e7ec0', textAlign: 'left', borderBottom: '1px solid rgba(124,58,237,0.1)', whiteSpace: 'nowrap', zIndex: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: GlobalUser, i: number) => {
                  const [g1, g2] = getAvatarGradient(u.name);
                  return (
                    <tr key={i}
                      onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(td => (td as HTMLElement).style.background = '#faf9ff')}
                      onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(td => (td as HTMLElement).style.background = '')}>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.03em', boxShadow: `0 2px 6px ${g1}55`, userSelect: 'none' }}>{getInitials(u.name)}</div>
                          <span style={{ fontWeight: 600, color: '#18103a' }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)', color: '#4a3870', fontSize: 11 }}>{u.email}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 20, background: u.role === 'System Admin' ? '#e0f2fe' : u.role === 'Manager' ? '#fce7f3' : '#f4f4f8', color: u.role === 'System Admin' ? '#0c4a6e' : u.role === 'Manager' ? '#9d174d' : '#4a3870' }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)', fontSize: 11, color: '#8e7ec0' }}>{u.position}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 20, background: u.status === 'Active' ? '#dcfce7' : '#fee2e2', color: u.status === 'Active' ? '#14532d' : '#7f1d1d' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: u.status === 'Active' ? '#22c55e' : '#ef4444' }} />
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)' }}>
                        <button onClick={() => showToast(`Editing ${u.name}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                          <EditPenIcon /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}