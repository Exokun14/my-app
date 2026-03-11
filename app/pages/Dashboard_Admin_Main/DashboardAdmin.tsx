/* ==============================================================
   DashboardAdmin.tsx  ·  Company Database — Front End

   FIXES:
   1. Accepts onLogout prop from root page.tsx and wires it to
      both <Sidebar onLogout> and <Header onLogout> so Sign Out
      actually works from either location.
   2. Wires <Sidebar onNavigate> so "Learning Center" click opens
      AdminLearningDashboard inside the same shell via local state.
   3. Uses useAuthUser() hook to fetch the real logged-in user and
      passes the result to <Header user={headerUser}> — fixes the
      "John Doe / System Admin" placeholder showing instead of the
      actual user's name, role, and company.
   ============================================================== */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

import {
  Client, StatsBarData, LicenseItem, LicPeriod,
  CLIENTS,
  getInitials, getHealthLabel,
  formatDate,
  computeStatsBarData, filterClients, computeLicenseExpiry,
} from './DshAdmFunc';

import AddCompanyPopup from './add_company_popup';

import Sidebar from '../Sidebar_Web/sidebar';
import Header  from '../Header_Web/header';

import AdminLearningDashboard from '../Learning_Module/AdminLearningDashboard';

import { useAuthUser } from '../../Hooks/useAuthUser';

/* ─── Keyframe animations + font + scrollbar injected once ─────────────────── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  @keyframes _fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes _mIn    { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  ._fadeUp { animation: _fadeUp 0.3s ease both; }
  ._mIn    { animation: _mIn   0.26s cubic-bezier(0.16,1,0.3,1); }
  * { scrollbar-width:thin; scrollbar-color:rgba(124,58,237,0.15) transparent; }
  ::-webkit-scrollbar       { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.18); border-radius:4px; }
`;

const CAT_LABEL: Record<string, string> = {
  'F&B': 'Aloha', 'Retail': 'Retail', 'Warehouse': 'Warehouse',
};

/* ── Props ── */
interface DashboardAdminProps {
  onClientSelect?: (client: Client) => void;
  onLogout?: () => void;   // ← wired from root page.tsx
}

/* ── View type ── */
type AdminView = 'overview' | 'learning';

/* ─── AppShell ──────────────────────────────────────────────────────────────
   Extracted from DashboardAdmin.renderShell to be a stable component reference.
   Previously defined as an inline `const` inside the component body, which
   caused React to unmount/remount children (including AdminLearningDashboard)
   on every parent re-render — triggering duplicate API fetches.
   ─────────────────────────────────────────────────────────────────────────── */
interface AppShellProps {
  activePage:   string;
  children:     React.ReactNode;
  onNavigate:   (view: string) => void;
  onLogout?:    () => void;
  headerUser:   ReturnType<typeof useAuthUser>['headerUser'];
}

function AppShell({ activePage, children, onNavigate, onLogout, headerUser }: AppShellProps) {
  // FIX: inject styles via useEffect so SSR and client render the same initial
  // HTML, avoiding the hydration mismatch caused by dangerouslySetInnerHTML
  // differing between server (login page styles) and client (dashboard styles).
  useEffect(() => {
    const id = 'dashboard-global-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = GLOBAL_STYLES;
    document.head.appendChild(el);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <>
      {/* Sidebar: onNavigate drives view switching; onLogout from root page.tsx */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <div
        style={{ marginLeft: 'var(--gxh-sw, 220px)', marginTop: 54 }}
        className="flex flex-col min-h-screen transition-[margin-left] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        {/* Header: real user from API; onLogout from root page.tsx */}
        <Header
          user={headerUser}
          onLogout={onLogout}
        />

        {children}
      </div>
    </>
  );
}

export default function DashboardAdmin({ onClientSelect, onLogout }: DashboardAdminProps) {

  /* ── Real user data from the API ── */
  const { headerUser } = useAuthUser();

  /* ── Local navigation state (Company DB ↔ Learning Center) ── */
  const [currentView, setCurrentView] = useState<AdminView>('overview');

  /* ── Navigation handler passed to <Sidebar onNavigate> ── */
  const handleNavigate = useCallback((view: string) => {
    if (view === 'learning') {
      setCurrentView('learning');
    } else {
      setCurrentView('overview');
    }
  }, []);

  const [cdbPanel, setCdbPanel]     = useState(0);
  const [clients, setClients]       = useState<Client[]>(CLIENTS);
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [activeHealth, setActiveHealth] = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState('');
  const [licPeriod, setLicPeriod]   = useState<LicPeriod>('all');
  const [licSearch, setLicSearch]   = useState('');
  const [licFilters, setLicFilters] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen]   = useState(false);
  const [toastMsg, setToastMsg]     = useState('');
  const [toastOn, setToastOn]       = useState(false);
  const timerRef   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartX = React.useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg); setToastOn(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToastOn(false), 2800);
  }, []);

  const SWIPE_THRESHOLD = 60;
  const onDragStart = (x: number) => { dragStartX.current = x; };
  const onDragMove  = (x: number) => {
    if (dragStartX.current === null) return;
    const diff = x - dragStartX.current;
    if ((cdbPanel === 0 && diff > 0) || (cdbPanel === 1 && diff < 0)) return;
    setDragOffset(diff);
  };
  const onDragEnd = () => {
    if (dragStartX.current === null) return;
    if (Math.abs(dragOffset) >= SWIPE_THRESHOLD) setCdbPanel(dragOffset < 0 ? 1 : 0);
    dragStartX.current = null;
    setDragOffset(0);
  };
  const cancelSwipe = () => { dragStartX.current = null; setDragOffset(0); };

  const filtered = filterClients(clients, activeCats, activeHealth, search);
  const stats    = computeStatsBarData(clients);
  const toggleCat    = (c: string) => setActiveCats(p   => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleHealth = (l: string) => setActiveHealth(p => { const n = new Set(p); n.has(l) ? n.delete(l) : n.add(l); return n; });

  const licItems    = computeLicenseExpiry(clients, licPeriod);
  const licFiltered = licItems
    .filter(c => licFilters.size === 0 || licFilters.has(c._status))
    .filter(c => !licSearch.trim() || c.name.toLowerCase().includes(licSearch.toLowerCase()));
  const licStats = {
    expired:  licItems.filter(c => c._status === 'expired').length,
    critical: licItems.filter(c => c._status === 'critical').length,
    warning:  licItems.filter(c => c._status === 'warning').length,
    upcoming: licItems.filter(c => c._status === 'upcoming').length,
  };

  /* ────────────────────────────────────────────────────────
     Shared chrome: Sidebar + Header always rendered the same
     way regardless of which content view is active.
  ──────────────────────────────────────────────────────── */

  /* ── Learning Center view ── */
  if (currentView === 'learning') {
    return (
    <AppShell
      activePage="learning"
      onNavigate={handleNavigate}
      onLogout={onLogout}
      headerUser={headerUser}
    >
      <AdminLearningDashboard onBack={() => setCurrentView('overview')} />
    </AppShell>
  );
  }

  /* ── Company Database view (default) ── */
  return (
    <AppShell
      activePage="customers"
      onNavigate={handleNavigate}
      onLogout={onLogout}
      headerUser={headerUser}
    >
    <>
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 0% 0%,   rgba(124,58,237,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 100% 100%, rgba(13,148,136,0.05) 0%, transparent 60%),
            #f8f7ff
          `,
        }}
      />
      <canvas id="rc" className="fixed inset-0 z-0 pointer-events-none" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-[1] h-screen">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 flex flex-col overflow-hidden z-[2]" style={{ padding: '20px 28px 50px' }}>

            {/* ── Page header ── */}
            <div className="flex items-center gap-[10px] mb-4 flex-shrink-0">
              <h1
                className="text-[21px] font-normal text-[#18103a] whitespace-nowrap"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Company <em className="italic text-[#7c3aed]">Database</em>
              </h1>

              <div className="flex items-center gap-[5px] ml-2">
                <span className="text-[9.5px] font-semibold text-[#8e7ec0] uppercase tracking-[0.08em]">
                  {cdbPanel === 0 ? 'Company Database' : 'License Expiry'}
                </span>
                {[0, 1].map(i => (
                  <div
                    key={i}
                    onClick={() => setCdbPanel(i)}
                    className="cursor-pointer transition-all duration-[220ms]"
                    style={{
                      width:        i === cdbPanel ? 18 : 6,
                      height:       6,
                      borderRadius: i === cdbPanel ? 3 : '50%',
                      background:   i === cdbPanel ? '#7c3aed' : 'rgba(124,58,237,0.2)',
                    }}
                  />
                ))}
              </div>

              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />

              <div className="flex gap-2 flex-shrink-0">
                {cdbPanel === 0 && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-[7px] text-white font-semibold border-none cursor-pointer whitespace-nowrap transition-all duration-[160ms] hover:-translate-y-px"
                    style={{ padding: '8px 18px', fontSize: 12, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 3px 14px rgba(124,58,237,0.32)', marginBottom: 20 }}
                  >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M7 1v12M1 7h12" /></svg>
                    Add Company
                  </button>
                )}
              </div>
            </div>

            {/* ── Swipe container ── */}
            <div
              className="flex-1 overflow-hidden relative"
              onTouchStart={e => onDragStart(e.touches[0].clientX)}
              onTouchMove={e  => onDragMove(e.touches[0].clientX)}
              onTouchEnd={onDragEnd}
              onMouseDown={e  => onDragStart(e.clientX)}
              onMouseMove={e  => { if (dragStartX.current !== null) onDragMove(e.clientX); }}
              onMouseUp={onDragEnd}
              onMouseLeave={onDragEnd}
              style={{ cursor: 'default' }}
            >
              <div
                className="flex h-full"
                style={{
                  transform:  `translateX(calc(-${cdbPanel * 100}% + ${dragOffset}px))`,
                  transition: dragOffset !== 0 ? 'none' : 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {/* Panel 0 — Company Database */}
                <div className="w-full flex-shrink-0 flex flex-col overflow-hidden" style={{ gap: 0 }}>
                  <StatsBar data={stats} onCategoryClick={toggleCat} />
                  <FilterBar
                    activeCats={activeCats} activeHealth={activeHealth}
                    onToggleCat={toggleCat} onToggleHealth={toggleHealth}
                    stats={stats} search={search} onSearch={setSearch}
                    totalVisible={filtered.length}
                  />
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-3 gap-[10px] content-start pb-3">
                      {filtered.map((c, i) => (
                        <ClientCard
                          key={c.id}
                          client={c}
                          index={i}
                          onClick={() => onClientSelect?.(c)}
                        />
                      ))}
                    </div>
                    {filtered.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                        <div className="text-[28px] opacity-50">🔍</div>
                        <div className="text-[13px] font-semibold text-[#4a3870]">No companies found</div>
                        <div className="text-[11px] text-[#8e7ec0]">Try adjusting your filters or search query</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel 1 — License Expiry */}
                <div className="w-full flex-shrink-0 flex flex-col overflow-hidden" style={{ gap: 12 }}>
                  <LicensePanel
                    items={licFiltered} stats={licStats} period={licPeriod}
                    onPeriodChange={(p: LicPeriod) => { setLicPeriod(p); setLicFilters(new Set()); }}
                    search={licSearch} onSearch={setLicSearch}
                    filters={licFilters}
                    onToggleFilter={(s: string) => setLicFilters(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                    onRemoveFilter={(s: string) => setLicFilters(p => { const n = new Set(p); n.delete(s); return n; })}
                    onDndStart={cancelSwipe}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Add Company Modal ── */}
      {modalOpen && (
        <AddCompanyPopup
          onAdd={newClient => setClients(p => [newClient, ...p])}
          onClose={() => setModalOpen(false)}
          showToast={toast}
        />
      )}

      {/* ── Toast ── */}
      <div
        className={`fixed bottom-6 left-1/2 z-[9999] flex items-center gap-2 rounded-[10px] text-[12.5px] font-semibold text-white whitespace-nowrap pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${toastOn ? 'opacity-100 -translate-x-1/2 translate-y-0' : 'opacity-0 -translate-x-1/2 translate-y-5'}`}
        style={{ padding: '10px 18px', background: '#18103a', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
      >
        <div className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[#0d9488]" />
        <span>{toastMsg}</span>
      </div>
    </>,
    </AppShell>
  );
}

/* ─── CAT style map ─────────────────────────────────────────────────────────── */
const CAT = {
  'F&B': {
    card:   'flex-1 flex flex-col justify-between rounded-2xl bg-white border-[1.5px] border-amber-200 cursor-pointer overflow-hidden relative transition-all duration-[180ms] shadow-[0_2px_8px_rgba(124,58,237,0.05)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:border-transparent',
    icon:   'w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600',
    badge:  'text-[13px] font-bold tracking-[0.04em] uppercase rounded-full bg-amber-100 text-amber-900',
    num:    'font-black leading-none tracking-[-0.03em] relative z-[1] text-amber-600',
    sub:    'font-medium relative z-[1] text-amber-900/60',
    footer: 'flex items-center gap-1 font-semibold border-t border-amber-900/10 relative z-[1] opacity-75 text-amber-600',
    emoji:  '🍔',
  },
  'Retail': {
    card:   'flex-1 flex flex-col justify-between rounded-2xl bg-white border-[1.5px] border-sky-200 cursor-pointer overflow-hidden relative transition-all duration-[180ms] shadow-[0_2px_8px_rgba(124,58,237,0.05)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:border-transparent',
    icon:   'w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-100 text-sky-600',
    badge:  'text-[13px] font-bold tracking-[0.04em] uppercase rounded-full bg-sky-100 text-sky-900',
    num:    'font-black leading-none tracking-[-0.03em] relative z-[1] text-sky-600',
    sub:    'font-medium relative z-[1] text-sky-900/60',
    footer: 'flex items-center gap-1 font-semibold border-t border-sky-900/10 relative z-[1] opacity-75 text-sky-600',
    emoji:  '🛍️',
  },
  'Warehouse': {
    card:   'flex-1 flex flex-col justify-between rounded-2xl bg-white border-[1.5px] border-teal-200 cursor-pointer overflow-hidden relative transition-all duration-[180ms] shadow-[0_2px_8px_rgba(124,58,237,0.05)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:border-transparent',
    icon:   'w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-100 text-teal-600',
    badge:  'text-[13px] font-bold tracking-[0.04em] uppercase rounded-full bg-teal-100 text-teal-900',
    num:    'font-black leading-none tracking-[-0.03em] relative z-[1] text-teal-600',
    sub:    'font-medium relative z-[1] text-teal-900/60',
    footer: 'flex items-center gap-1 font-semibold border-t border-teal-900/10 relative z-[1] opacity-75 text-teal-600',
    emoji:  '📦',
  },
} as const;

/* ─── StatsBar ──────────────────────────────────────────────────────────────── */
function StatsBar({ data, onCategoryClick }: { data: StatsBarData; onCategoryClick: (c: string) => void }) {
  const cats = [
    { key: 'F&B'       as const, num: data.fb.count,       sub: 'Aloha',              tickets: data.fb.tickets },
    { key: 'Retail'    as const, num: data.retail.count,    sub: 'Stores & Boutiques', tickets: data.retail.tickets },
    { key: 'Warehouse' as const, num: data.warehouse.count, sub: 'Logistics & Supply', tickets: data.warehouse.tickets },
  ];
  return (
    <div className="flex items-stretch gap-2 flex-shrink-0 flex-wrap mb-3">
      <div
        className="flex items-center gap-[14px] rounded-2xl flex-shrink-0 min-w-[170px] relative overflow-hidden"
        style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#5b21b6,#7c3aed,#0d9488)', boxShadow: '0 4px 18px rgba(124,58,237,0.28)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 100% at 110% -10%,rgba(255,255,255,0.12) 0%,transparent 60%)' }} />
        <div className="w-[46px] h-[46px] rounded-xl flex-shrink-0 bg-white/[0.18] border border-white/[0.22] flex items-center justify-center relative z-[1]">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="1.5" y="1.5" width="8" height="8" rx="1.5"/><rect x="12.5" y="1.5" width="8" height="8" rx="1.5"/>
            <rect x="1.5" y="12.5" width="8" height="8" rx="1.5"/><rect x="12.5" y="12.5" width="8" height="8" rx="1.5"/>
          </svg>
        </div>
        <div className="relative z-[1]">
          <div className="text-[32px] font-black text-white leading-none tracking-[-0.03em]">{data.total}</div>
          <div className="text-[11px] text-white/75 mt-[2px] font-medium whitespace-nowrap">Total Companies</div>
        </div>
      </div>

      <div className="flex gap-[10px] flex-1 flex-wrap">
        {cats.map(item => {
          const s = CAT[item.key];
          return (
            <div key={item.key} onClick={() => onCategoryClick(item.key)} className={s.card} style={{ padding: '13px 16px', minWidth: 130 }}>
              <div className="flex items-center justify-between relative z-[1]" style={{ marginBottom: 14 }}>
                <div className={s.icon}><span style={{ fontSize: 22, lineHeight: 1 }}>{s.emoji}</span></div>
                <span className={s.badge} style={{ padding: '5px 13px' }}>{CAT_LABEL[item.key]}</span>
              </div>
              <div className={s.num} style={{ fontSize: 42, marginBottom: 4 }}>{item.num}</div>
              <div className={s.sub} style={{ fontSize: 11, marginTop: 3 }}>{item.sub}</div>
              <div className={s.footer} style={{ fontSize: 10.5, marginTop: 8, paddingTop: 8 }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5.9"/>
                </svg>
                {item.tickets} ticket{item.tickets !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FilterBar ─────────────────────────────────────────────────────────────── */
function FilterBar({ activeCats, activeHealth, onToggleCat, onToggleHealth, stats, search, onSearch, totalVisible }: {
  activeCats: Set<string>; activeHealth: Set<string>;
  onToggleCat: (c: string) => void; onToggleHealth: (l: string) => void;
  stats: StatsBarData; search: string; onSearch: (q: string) => void; totalVisible: number;
}) {
  return (
    <div className="flex items-center flex-wrap flex-shrink-0" style={{ gap: 8, marginBottom: 14, marginTop: 10 }}>
      <span className="text-[12px] font-semibold text-[#4a3870]">Filter:</span>

      {[
        { cat: 'F&B',       n: stats.fb.count        },
        { cat: 'Retail',    n: stats.retail.count    },
        { cat: 'Warehouse', n: stats.warehouse.count },
      ].map(f => {
        const on = activeCats.has(f.cat);
        return (
          <div
            key={f.cat}
            onClick={() => onToggleCat(f.cat)}
            className={`flex items-center cursor-pointer transition-all duration-[140ms] select-none ${on ? 'text-white font-bold' : 'bg-white text-[#4a3870] hover:bg-[#f2f0fb]'}`}
            style={{
              gap: 5, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: on ? 700 : 600,
              border: `1.5px solid ${on ? '#7c3aed' : 'rgba(124,58,237,0.16)'}`,
              background: on ? '#7c3aed' : undefined,
              boxShadow: on ? '0 2px 10px rgba(124,58,237,0.35)' : undefined,
            }}
          >
            {CAT_LABEL[f.cat]}
            <span style={{
              background: on ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.1)',
              color: on ? '#fff' : '#5b21b6',
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 20, textAlign: 'center' as const,
            }}>
              {f.n}
            </span>
          </div>
        );
      })}

      <div style={{ width: 1, height: 18, background: 'rgba(124,58,237,0.1)', margin: '0 2px' }} />
      <span className="text-[12px] font-semibold text-[#4a3870]">Status:</span>

      {[
        { level: 'green',  label: 'Healthy',   dot: '#22c55e', shadow: 'rgba(34,197,94,0.5)',  onBg: '#16a34a', onShadow: 'rgba(22,163,74,0.35)'  },
        { level: 'yellow', label: 'Attention', dot: '#eab308', shadow: 'rgba(234,179,8,0.4)',  onBg: '#d97706', onShadow: 'rgba(217,119,6,0.35)'  },
        { level: 'red',    label: 'Critical',  dot: '#ef4444', shadow: 'rgba(239,68,68,0.5)',  onBg: '#dc2626', onShadow: 'rgba(220,38,38,0.35)'  },
      ].map(h => {
        const on = activeHealth.has(h.level);
        return (
          <div
            key={h.level}
            onClick={() => onToggleHealth(h.level)}
            className={`flex items-center cursor-pointer transition-all duration-[140ms] select-none ${on ? 'text-white font-bold' : 'bg-white text-[#4a3870] hover:bg-[#f2f0fb]'}`}
            style={{
              gap: 5, padding: '7px 14px', borderRadius: 20, fontSize: 12,
              border: `1.5px solid ${on ? h.onBg : 'rgba(124,58,237,0.16)'}`,
              background: on ? h.onBg : undefined,
              boxShadow: on ? `0 2px 10px ${h.onShadow}` : undefined,
            }}
          >
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: h.dot, boxShadow: `0 0 5px ${h.shadow}` }} />
            {h.label}
          </div>
        );
      })}

      <div className="flex-1" />

      <div
        className="flex items-center bg-[#f2f0fb] border border-[rgba(124,58,237,0.1)] transition-all duration-[180ms] focus-within:bg-white focus-within:border-[rgba(124,58,237,0.22)] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.07)]"
        style={{ gap: 8, padding: '7px 12px', borderRadius: 9, width: 260 }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="flex-shrink-0" style={{ width: 12, height: 12, color: '#8e7ec0' }}>
          <circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/>
        </svg>
        <input
          type="text" placeholder="Search companies…" value={search} onChange={e => onSearch(e.target.value)}
          className="bg-transparent border-none outline-none w-full placeholder:text-[#b8aed8]"
          style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12.5, color: '#18103a' }}
        />
        {search && (
          <button onClick={() => onSearch('')} className="bg-transparent border-none cursor-pointer p-0 flex leading-none text-[#b8aed8]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
          </button>
        )}
      </div>

      <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>{totalVisible} compan{totalVisible !== 1 ? 'ies' : 'y'}</span>
    </div>
  );
}

/* ─── ClientCard ────────────────────────────────────────────────────────────── */
const logoBg: Record<string, string> = {
  'F&B':       'linear-gradient(160deg,#fffbeb,#fef3c7)',
  'Retail':    'linear-gradient(160deg,#f0f9ff,#e0f2fe)',
  'Warehouse': 'linear-gradient(160deg,#f5f3ff,#ede9fe)',
};
const catBadgeCard: Record<string, React.CSSProperties> = {
  'F&B':       { background: 'rgba(217,119,6,0.18)',  color: '#92400e', border: '1px solid rgba(217,119,6,0.28)'  },
  'Retail':    { background: 'rgba(2,132,199,0.15)',  color: '#075985', border: '1px solid rgba(2,132,199,0.25)'  },
  'Warehouse': { background: 'rgba(124,58,237,0.14)', color: '#4c1d95', border: '1px solid rgba(124,58,237,0.24)' },
};
const dotStyle: Record<string, React.CSSProperties> = {
  green:  { background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.5)'  },
  yellow: { background: '#eab308', boxShadow: '0 0 4px rgba(234,179,8,0.4)'  },
  red:    { background: '#ef4444', boxShadow: '0 0 5px rgba(239,68,68,0.5)'  },
};

function ClientCard({ client, index, onClick }: { client: Client; index: number; onClick?: () => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className="_fadeUp"
      onClick={onClick}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.09)'}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'row',
        cursor: 'pointer',
        transition: 'all 0.22s',
        boxShadow: hovered ? '0 8px 28px rgba(124,58,237,0.13)' : '0 2px 8px rgba(124,58,237,0.06)',
        overflow: 'hidden',
        minHeight: 152,
        animationDelay: `${index * 0.028}s`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(124,58,237,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'scale(1)' : 'scale(0.7)',
        transition: 'opacity 0.18s, transform 0.18s',
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 12 12" fill="none" stroke="#7c3aed" strokeWidth="2" width="10" height="10"><path d="M4 2l4 4-4 4"/></svg>
      </div>

      <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 14px', position: 'relative', borderRight: '1px solid rgba(124,58,237,0.08)', background: logoBg[client.cat] || logoBg['Warehouse'] }}>
        <div style={{ width: 108, height: 108, borderRadius: 20, flexShrink: 0, background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.06)' }}>
          {client.logo ? (
            <img src={client.logo} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 11 }}
              onError={e => { (e.target as HTMLImageElement).parentElement!.innerHTML = `<div style="font-size:36px;font-weight:800;letter-spacing:-0.03em;color:#9c82d4;width:100%;height:100%;display:flex;align-items:center;justify-content:center">${getInitials(client.name)}</div>`; }}
            />
          ) : (
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#9c82d4', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getInitials(client.name)}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '13px 14px 12px', minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#18103a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{client.name}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#4a3870', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>{client.contact}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#8e7ec0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{client.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, marginTop: 8, borderTop: '1px solid rgba(124,58,237,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: '#4a3870' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0, ...dotStyle[client.level] }} />
            {getHealthLabel(client.level)}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, display: 'inline-flex', whiteSpace: 'nowrap', ...catBadgeCard[client.cat] }}>
            {CAT_LABEL[client.cat] ?? client.cat}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── LicensePanel ─────────────────────────────────────────────────────────── */
const STATUS_META: Record<string, {
  hex: string; border: string; bg: string; text: string; dot: string; bar: string; chipBg: string;
}> = {
  expired:  { hex:'#ef4444', border:'border-red-400/50',    bg:'bg-red-50',    text:'text-red-500',    dot:'bg-red-500',    bar:'bg-red-400',    chipBg:'bg-red-100'    },
  critical: { hex:'#f97316', border:'border-orange-400/50', bg:'bg-orange-50', text:'text-orange-500', dot:'bg-orange-500', bar:'bg-orange-400', chipBg:'bg-orange-100' },
  warning:  { hex:'#eab308', border:'border-yellow-400/50', bg:'bg-yellow-50', text:'text-yellow-500', dot:'bg-yellow-500', bar:'bg-yellow-400', chipBg:'bg-yellow-100' },
  upcoming: { hex:'#22c55e', border:'border-green-400/50',  bg:'bg-green-50',  text:'text-green-500',  dot:'bg-green-500',  bar:'bg-green-400',  chipBg:'bg-green-100'  },
};
const CAT_BADGE_STYLE: Record<string, React.CSSProperties> = {
  'F&B':       { background: 'rgba(217,119,6,0.14)',  color: '#92400e', border: '1px solid rgba(217,119,6,0.28)'  },
  'Retail':    { background: 'rgba(2,132,199,0.12)',  color: '#0369a1', border: '1px solid rgba(2,132,199,0.28)'  },
  'Warehouse': { background: 'rgba(109,40,217,0.12)', color: '#5b21b6', border: '1px solid rgba(109,40,217,0.25)' },
};

function IndustryBadge({ cat }: { cat: string }) {
  const s = CAT_BADGE_STYLE[cat] ?? CAT_BADGE_STYLE['Warehouse'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, ...s }}>
      {CAT_LABEL[cat] ?? cat}
    </span>
  );
}

function LicensePanel({ items, stats, period, onPeriodChange, search, onSearch, filters, onToggleFilter, onRemoveFilter, onDndStart }: {
  items: LicenseItem[];
  stats: { expired: number; critical: number; warning: number; upcoming: number };
  period: LicPeriod; onPeriodChange: (p: LicPeriod) => void;
  search: string; onSearch: (q: string) => void;
  filters: Set<string>; onToggleFilter: (s: string) => void; onRemoveFilter: (s: string) => void;
  onDndStart: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const total = stats.expired + stats.critical + stats.warning + stats.upcoming;

  const pills = [
    { id: 'expired',  label: 'Expired',  sublabel: 'Past due',       n: stats.expired,  ...STATUS_META.expired  },
    { id: 'critical', label: 'Critical', sublabel: '≤ 30 days left', n: stats.critical, ...STATUS_META.critical },
    { id: 'warning',  label: 'Warning',  sublabel: '≤ 90 days left', n: stats.warning,  ...STATUS_META.warning  },
    { id: 'upcoming', label: 'Upcoming', sublabel: 'Within 1 year',  n: stats.upcoming, ...STATUS_META.upcoming },
  ];
  const activeFilters = pills.filter(p => filters.has(p.id));

  const handlePillDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData('filterId', id); e.dataTransfer.effectAllowed = 'copy'; setDraggingId(id); onDndStart(); };
  const handlePillDragEnd   = () => setDraggingId(null);
  const handleDragOver      = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); };
  const handleDragLeave     = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); };
  const handleDrop          = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); setDraggingId(null); const id = e.dataTransfer.getData('filterId'); if (id && !filters.has(id)) onToggleFilter(id); };

  const Donut = ({ n, color, isActive }: { n: number; color: string; isActive: boolean }) => {
    const r = 18, cx = 22, cy = 22, circ = 2 * Math.PI * r, pct = total > 0 ? n / total : 0, dash = pct * circ;
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isActive ? color : color + '99'} strokeWidth={isActive ? 4.5 : 3.5} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.4s ease, stroke-width 0.2s' }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 9, fontWeight: 700, fill: isActive ? color : '#8e7ec0' }}>
          {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </text>
      </svg>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 25 }}>
        <div style={{ display: 'flex', gap: 2, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {(['all','3m','6m','1y'] as const).map(id => {
            const labels: Record<string,string> = { all:'All', '3m':'3 mo', '6m':'6 mo', '1y':'1 yr' };
            const on = period === id;
            return (
              <button key={id} onClick={() => onPeriodChange(id)} style={{ padding: '4px 12px', borderRadius: 6, fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: on ? 700 : 600, border: 'none', cursor: 'pointer', background: on ? '#fff' : 'transparent', color: on ? '#7c3aed' : '#8e7ec0', boxShadow: on ? '0 1px 4px rgba(0,0,0,0.09)' : undefined, transition: 'all 0.14s', whiteSpace: 'nowrap' as const }}>
                {labels[id]}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: '6px 11px', width: 210 }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.6" style={{ width: 12, height: 12, flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search client…" value={search} onChange={e => onSearch(e.target.value)} className="placeholder:text-[#b8aed8]" style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 11.5, color: '#18103a', width: '100%' }} />
        </div>
      </div>

      <div className="flex flex-shrink-0" style={{ gap: 8, marginBottom: 10 }}>
        {pills.map(p => {
          const isActive   = filters.has(p.id);
          const isDragging = draggingId === p.id;
          return (
            <div
              key={p.id}
              draggable={!isActive}
              onDragStart={e => !isActive && handlePillDragStart(e, p.id)}
              onDragEnd={handlePillDragEnd}
              title={isActive ? 'Filter active — click × in the table header to remove' : 'Drag onto the table below to filter'}
              style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', background: isActive ? undefined : '#fff', border: `1.5px solid ${isActive ? p.hex + '88' : 'rgba(124,58,237,0.1)'}`, cursor: isActive ? 'default' : isDragging ? 'grabbing' : 'grab', transition: 'all 0.18s', userSelect: 'none' as const, opacity: isDragging ? 0.38 : 1, transform: isDragging ? 'scale(0.95) rotate(-1deg)' : undefined, boxShadow: isActive ? `0 2px 14px ${p.hex}30` : isDragging ? 'none' : '0 1px 6px rgba(0,0,0,0.06)' }}
              className={isActive ? `${p.bg}` : ''}
              onMouseEnter={e => { if (isActive || isDragging) return; const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 24px ${p.hex}28`; el.style.borderColor = p.hex + '55'; }}
              onMouseLeave={e => { if (isActive || isDragging) return; const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)'; el.style.borderColor = 'rgba(124,58,237,0.1)'; }}
            >
              <div style={{ height: 3, width: '100%', background: isActive ? p.hex : `linear-gradient(90deg,${p.hex}88,${p.hex}22)`, transition: 'background 0.18s' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 14px 14px', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: p.hex, boxShadow: isActive ? `0 0 7px ${p.hex}` : `0 0 4px ${p.hex}88` }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? p.hex : '#4a3870', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{p.label}</span>
                    {isActive && (
                      <div style={{ marginLeft: 'auto', width: 17, height: 17, borderRadius: '50%', background: `${p.hex}1a`, border: `1px solid ${p.hex}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={p.hex} strokeWidth="2.2"><path d="M1.5 4l2 2 3-3"/></svg>
                      </div>
                    )}
                    {!isActive && (
                      <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, opacity: 0.25, flexShrink: 0 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ display: 'flex', gap: 2.5 }}>
                            <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: '#4a3870' }} />
                            <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: '#4a3870' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: isActive ? p.hex : '#18103a', transition: 'color 0.18s', marginBottom: 4 }}>{p.n}</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: isActive ? p.hex + 'bb' : '#8e7ec0', marginBottom: 12, lineHeight: 1.3 }}>{p.sublabel}</div>
                  <div style={{ paddingTop: 8, borderTop: isActive ? `1px solid ${p.hex}22` : '1px dashed rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isActive ? (
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: p.hex, opacity: 0.75, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Filter active</span>
                    ) : (
                      <>
                        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke={p.hex} strokeWidth="2" style={{ opacity: 0.55, flexShrink: 0 }}><path d="M7 1v10M3 8l4 4 4-4"/></svg>
                        <span style={{ fontSize: 9, fontWeight: 600, color: p.hex, opacity: 0.6 }}>drag to filter</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, paddingTop: 2 }}><Donut n={p.n} color={p.hex} isActive={isActive} /></div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 12, border: isDragOver ? '2px dashed #7c3aed' : '1px solid rgba(124,58,237,0.1)', boxShadow: isDragOver ? '0 0 0 4px rgba(124,58,237,0.08)' : undefined, background: isDragOver ? 'rgba(124,58,237,0.02)' : '#fff', transition: 'border 0.15s, box-shadow 0.15s, background 0.15s', position: 'relative', overflow: 'hidden' }}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        {isDragOver && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
            <div style={{ width: 54, height: 54, borderRadius: 15, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#7c3aed' }}>Drop to apply filter</span>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '8px 14px 7px', borderBottom: '1px solid rgba(124,58,237,0.08)', background: 'rgba(124,58,237,0.025)', flexShrink: 0 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 2 }}>Active filters:</span>
            {activeFilters.map(p => (
              <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 6px 3px 8px', borderRadius: 20, background: `color-mix(in srgb,${p.hex} 10%,white)`, border: `1.5px solid ${p.hex}55`, fontSize: 10.5, fontWeight: 700, color: p.hex, userSelect: 'none' as const }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.hex, display: 'inline-block', flexShrink: 0 }} />
                {p.label}
                <button onClick={() => onRemoveFilter(p.id)} title="Remove this filter" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', border: 'none', background: `color-mix(in srgb,${p.hex} 18%,white)`, color: p.hex, cursor: 'pointer', padding: 0, marginLeft: 2, flexShrink: 0, transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb,${p.hex} 38%,white)`)} onMouseLeave={e => (e.currentTarget.style.background = `color-mix(in srgb,${p.hex} 18%,white)`)}>
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l6 6M7 1L1 7"/></svg>
                </button>
              </div>
            ))}
            {activeFilters.length > 1 && (
              <button onClick={() => activeFilters.forEach(p => onRemoveFilter(p.id))} style={{ fontSize: 9.5, fontWeight: 600, color: '#8e7ec0', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                Clear all
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 56  }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f5f4fc', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['', 'Company', 'Industry', 'License ID', 'Acct Manager', 'Expiry Date', 'Status'].map((h, i) => (
                    <th key={i} style={{ padding: i === 0 ? '10px 0 10px 16px' : '10px 16px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#8e7ec0', textAlign: 'left' as const, borderBottom: '1px solid rgba(124,58,237,0.1)', whiteSpace: 'nowrap' as const, overflow: 'hidden' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(c => {
                  const m     = STATUS_META[c._status] ?? STATUS_META.upcoming;
                  const label = c._status === 'expired' ? 'Expired' : `${c._daysLeft}d left`;
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer', transition: 'background 0.12s', borderBottom: '1px solid rgba(124,58,237,0.05)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.025)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0 8px 0 16px', height: 46, verticalAlign: 'middle' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: `${m.hex}1a`, color: m.hex, letterSpacing: '-0.02em', flexShrink: 0 }}>
                          {getInitials(c.name)}
                        </div>
                      </td>
                      <td style={{ padding: '0 16px', height: 46, verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.name}</span>
                      </td>
                      <td style={{ padding: '0 16px', height: 46, verticalAlign: 'middle' }}><IndustryBadge cat={c.cat} /></td>
                      <td style={{ padding: '0 16px', height: 46, verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4a3870', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.licenseId || '—'}</span>
                      </td>
                      <td style={{ padding: '0 16px', height: 46, verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#4a3870', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{c.accountManager}</span>
                      </td>
                      <td style={{ padding: '0 16px', height: 46, verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 400, color: '#8e7ec0', whiteSpace: 'nowrap' }}>{formatDate(c.saEnd)}</span>
                      </td>
                      <td style={{ padding: '0 16px', height: 46, verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: m.hex, background: `${m.hex}18`, border: `1px solid ${m.hex}38` }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.hex, display: 'inline-block', flexShrink: 0 }} />
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, color: '#8e7ec0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, opacity: 0.5 }}>📋</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4a3870' }}>No expiring licenses</div>
              <div style={{ fontSize: 11 }}>{filters.size > 0 ? 'No results match the active filters' : 'No clients match the selected period'}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
