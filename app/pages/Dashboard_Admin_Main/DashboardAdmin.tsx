/* ==============================================================
   DashboardAdmin.tsx  ·  Company Database — Front End
   UPDATED: Learning Center nav item wired via adminSubView state.
            Clicking "Learning Center" in sidebar renders
            AdminLearningDashboard inside the same shell.
            onBack returns to the Company Database view.
   ============================================================== */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

import {
  Client, StatsBarData, LicPeriod,
  BranchRow, BranchLicenseItem, CompanyLicenseGroup,
  IndustryCard,
  apiFetchCompanies,
  apiFetchBranches,
  getInitials, getHealthLabel,
  computeStatsBarData, filterClients,
  computeLicenseExpiryFromBranches,
  groupBranchesByCompany,
} from './DshAdmFunc';

/* ─── Inline fetch for industry cards ──────────────────────────────────────── */
const _API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';
async function fetchIndustryCards(): Promise<IndustryCard[]> {
  const res = await fetch(`${_API_BASE}/api/industry-cards`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.data ?? json?.industry_cards ?? [];
  if (!Array.isArray(rows)) throw new Error(`Bad response: ${JSON.stringify(json).slice(0, 120)}`);
  return (rows as IndustryCard[]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

import AddCompanyPopup    from './add_company_popup';
import AddIndustryPopup   from './add_industry_popup';
import LicenseBranchModal from './LicenseBranchModal';

import Sidebar from '../Sidebar_Web/sidebar';
import Header  from '../Header/header_main';

import AdminLearningDashboard from '../Learning_Module/AdminLearningDashboard';

import { UserProfile } from '../Login/logUser';

/* ─── Keyframe animations + font + scrollbar ────────────────────────────────── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  @keyframes _fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes _mIn    { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes _pulse  { 0%,100%{opacity:0.45} 50%{opacity:1} }
  ._fadeUp  { animation: _fadeUp 0.3s ease both; }
  ._mIn     { animation: _mIn   0.26s cubic-bezier(0.16,1,0.3,1); }
  ._shimmer { animation: _pulse 1.4s ease-in-out infinite; }
  * { scrollbar-width:thin; scrollbar-color:rgba(124,58,237,0.15) transparent; }
  ::-webkit-scrollbar       { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.18); border-radius:4px; }
`;

/* ─── Title-case helper ─────────────────────────────────────────────────────── */
function toTitleCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/* ── Sub-view ── */
type AdminSubView = 'database' | 'learning';

/* ── Props ── */
interface DashboardAdminProps {
  onClientSelect?: (client: Client) => void;
  userProfile?:    UserProfile | null;
  onLogout?:       () => void;
}

export default function DashboardAdmin({ onClientSelect, userProfile, onLogout }: DashboardAdminProps) {

  /* ── Sub-view state ── */
  const [adminSubView, setAdminSubView] = useState<AdminSubView>('database');

  const [cdbPanel, setCdbPanel] = useState(0);

  const [clients, setClients]               = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [fetchError, setFetchError]         = useState<string | null>(null);

  const [branches, setBranches]               = useState<BranchRow[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchError, setBranchError]         = useState<string | null>(null);

  const [industryCards, setIndustryCards]               = useState<IndustryCard[]>([]);
  const [loadingIndustryCards, setLoadingIndustryCards] = useState(true);
  const [industryCardsError, setIndustryCardsError]     = useState<string | null>(null);

  const [activeCats, setActiveCats]     = useState<Set<string>>(new Set());
  const [activeHealth, setActiveHealth] = useState<Set<string>>(new Set());
  const [search, setSearch]             = useState('');

  const [licSearch, setLicSearch]   = useState('');
  const [licFilters, setLicFilters] = useState<Set<string>>(new Set());

  const [modalGroup, setModalGroup] = useState<CompanyLicenseGroup | null>(null);
  const [modalOpen, setModalOpen]                 = useState(false);
  const [industryModalOpen, setIndustryModalOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastOn, setToastOn]   = useState(false);
  const timerRef   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartX = React.useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingClients(true); setFetchError(null);
        const data = await apiFetchCompanies();
        if (!cancelled) setClients(data);
      } catch (err: any) {
        if (!cancelled) setFetchError(err?.message ?? 'Failed to load companies.');
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingBranches(true); setBranchError(null);
        const data = await apiFetchBranches();
        if (!cancelled) setBranches(data);
      } catch (err: any) {
        if (!cancelled) setBranchError(err?.message ?? 'Failed to load branches.');
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingIndustryCards(true); setIndustryCardsError(null);
        const data = await fetchIndustryCards();
        if (!cancelled) setIndustryCards(data);
      } catch (err: any) {
        console.error('[IndustryCards] fetch failed:', err?.message ?? err);
        if (!cancelled) setIndustryCardsError(err?.message ?? 'Failed to load industry cards.');
      } finally {
        if (!cancelled) setLoadingIndustryCards(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    dragStartX.current = null; setDragOffset(0);
  };
  const cancelSwipe = () => { dragStartX.current = null; setDragOffset(0); };

  const filtered = filterClients(clients, activeCats, activeHealth, search);
  const stats    = computeStatsBarData(clients);
  const toggleCat    = (c: string) => setActiveCats(p   => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleHealth = (l: string) => setActiveHealth(p => { const n = new Set(p); n.has(l) ? n.delete(l) : n.add(l); return n; });

  const allLicItems = computeLicenseExpiryFromBranches(branches, clients, 'all');
  const allGroups   = groupBranchesByCompany(allLicItems, allLicItems);

  const licGroups = allGroups
    .filter(g => licFilters.size === 0 || (
      (licFilters.has('expired')  && g.counts.expired  > 0) ||
      (licFilters.has('critical') && g.counts.critical > 0) ||
      (licFilters.has('warning')  && g.counts.warning  > 0) ||
      (licFilters.has('upcoming') && g.counts.upcoming > 0)
    ))
    .filter(g => !licSearch.trim() ||
      g.companyName.toLowerCase().includes(licSearch.toLowerCase()) ||
      g.accountManager.toLowerCase().includes(licSearch.toLowerCase()),
    );

  const licStats = {
    expired:  allLicItems.filter(b => b._status === 'expired').length,
    critical: allLicItems.filter(b => b._status === 'critical').length,
    warning:  allLicItems.filter(b => b._status === 'warning').length,
    upcoming: allLicItems.filter(b => b._status === 'upcoming').length,
  };

  const industryColorMap = React.useMemo(
    () => new Map(industryCards.map(c => [c.title, c.color ?? null])),
    [industryCards]
  );

  const headerUser = {
    initials:     userProfile?.initials     ?? '',
    fullName:     userProfile?.fullName     ?? '',
    position:     userProfile?.position     ?? '',
    company:      userProfile?.company      ?? '',
    profilePhoto: userProfile?.profilePhoto ?? null,
  };

  const handleViewBranches = useCallback((g: CompanyLicenseGroup) => {
    if (licFilters.size === 0) { setModalGroup(g); return; }
    const filteredBranches = g.branches.filter(b => licFilters.has(b._status));
    setModalGroup({ ...g, branches: filteredBranches });
  }, [licFilters]);

  /* ── Sidebar nav handler ── */
  const handleSidebarNavigate = useCallback((page: string) => {
    setAdminSubView(page === 'learning' ? 'learning' : 'database');
  }, []);

  /* ── Shared chrome ── */
  const chrome = (content: React.ReactNode) => (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <Sidebar onNavigate={handleSidebarNavigate} activePage={adminSubView === 'learning' ? 'learning' : 'customers'} />
      <div
        style={{ marginLeft: 'var(--gxh-sw, 220px)', marginTop: 54, height: 'calc(100vh - 54px)', overflow: 'hidden' }}
        className="flex flex-col transition-[margin-left] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        <Header user={headerUser} notificationCount={8} onLogout={onLogout} />
        {content}
      </div>
    </>
  );

  /* ── Learning Center ── */
  if (adminSubView === 'learning') {
    return chrome(
      <AdminLearningDashboard onBack={() => setAdminSubView('database')} currentUser={userProfile ?? undefined} />
    );
  }

  /* ── Company Database ── */
  return chrome(
    <>
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 0% 0%, rgba(124,58,237,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 100% 100%, rgba(13,148,136,0.05) 0%, transparent 60%), #f8f7ff` }} />
      <canvas id="rc" className="fixed inset-0 z-0 pointer-events-none" />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-[1] h-screen">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 flex flex-col overflow-hidden z-[2]" style={{ padding: '20px 28px 50px' }}>

            {/* ── Page header ── */}
            <div className="flex items-center gap-[10px] mb-4 flex-shrink-0">
              <h1 className="text-[21px] font-normal text-[#18103a] whitespace-nowrap" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Company <em className="italic text-[#7c3aed]">Lists</em>
              </h1>
              <div className="flex items-center gap-[5px] ml-2">
                <span className="text-[9.5px] font-semibold text-[#8e7ec0] uppercase tracking-[0.08em]">
                  {cdbPanel === 0 ? 'Clients' : 'License Expiry'}
                </span>
                {[0, 1].map(i => (
                  <div key={i} onClick={() => setCdbPanel(i)} className="cursor-pointer transition-all duration-[220ms]"
                    style={{ width: i === cdbPanel ? 18 : 6, height: 6, borderRadius: i === cdbPanel ? 3 : '50%', background: i === cdbPanel ? '#7c3aed' : 'rgba(124,58,237,0.2)' }} />
                ))}
              </div>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />
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
              <div className="flex h-full" style={{ transform: `translateX(calc(-${cdbPanel * 100}% + ${dragOffset}px))`, transition: dragOffset !== 0 ? 'none' : 'transform 0.38s cubic-bezier(0.4,0,0.2,1)' }}>

                {/* ── Panel 0 — Company Database ── */}
                <div className="w-full flex-shrink-0 flex flex-col overflow-hidden" style={{ gap: 0 }}>
                  <StatsBar
                    clients={clients}
                    industryCards={industryCards}
                    loadingCards={loadingIndustryCards}
                    cardsError={industryCardsError}
                    onRetryCards={() => {
                      setIndustryCardsError(null); setLoadingIndustryCards(true);
                      fetchIndustryCards()
                        .then(d => setIndustryCards(d))
                        .catch(e => setIndustryCardsError(e?.message ?? 'Failed to load industry cards.'))
                        .finally(() => setLoadingIndustryCards(false));
                    }}
                    onCategoryClick={toggleCat}
                    onAddIndustry={() => setIndustryModalOpen(true)}
                    totalCompanies={clients.length}
                  />
                  <FilterBar
                    activeCats={activeCats} activeHealth={activeHealth}
                    onToggleCat={toggleCat} onToggleHealth={toggleHealth}
                    search={search} onSearch={setSearch}
                    totalVisible={filtered.length}
                    industryCards={industryCards}
                    clients={clients}
                  />

                  {fetchError && (
                    <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
                      {fetchError}
                      <button onClick={() => { setFetchError(null); setLoadingClients(true); apiFetchCompanies().then(d => setClients(d)).catch(e => setFetchError(e?.message ?? 'Failed.')).finally(() => setLoadingClients(false)); }}
                        style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                        Retry
                      </button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto min-h-0">
                    {loadingClients ? (
                      <div className="grid grid-cols-3 gap-[10px] content-start pb-3">
                        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-[10px] content-start pb-3">
                        {filtered.map((c, i) => (
                          <ClientCard
                            key={c.id}
                            client={c}
                            index={i}
                            onClick={() => onClientSelect?.(c)}
                            industryColor={industryColorMap.get(c.cat) ?? null}
                          />
                        ))}
                      </div>
                    )}
                    {!loadingClients && filtered.length === 0 && !fetchError && (
                      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                        <div className="text-[28px] opacity-50">🔍</div>
                        <div className="text-[13px] font-semibold text-[#4a3870]">No companies found</div>
                        <div className="text-[11px] text-[#8e7ec0]">Try adjusting your filters or search query</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Panel 1 — License Expiry ── */}
                <div className="w-full flex-shrink-0 flex flex-col overflow-hidden" style={{ gap: 12 }}>
                  <LicensePanel
                    groups={licGroups}
                    stats={licStats}
                    search={licSearch}
                    onSearch={setLicSearch}
                    filters={licFilters}
                    onToggleFilter={(s: string) => setLicFilters(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                    onRemoveFilter={(s: string) => setLicFilters(p => { const n = new Set(p); n.delete(s); return n; })}
                    onDndStart={cancelSwipe}
                    loading={loadingBranches}
                    error={branchError}
                    onRetry={() => { setBranchError(null); setLoadingBranches(true); apiFetchBranches().then(d => setBranches(d)).catch(e => setBranchError(e?.message ?? 'Failed.')).finally(() => setLoadingBranches(false)); }}
                    onViewBranches={handleViewBranches}
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modalOpen && (
        <AddCompanyPopup
          onAdd={newClient => setClients(p => [newClient, ...p])}
          onClose={() => setModalOpen(false)}
          showToast={toast}
        />
      )}
      {industryModalOpen && (
        <AddIndustryPopup
          onAdd={card => setIndustryCards(p =>
            [...p, card].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          )}
          onClose={() => setIndustryModalOpen(false)}
          showToast={toast}
        />
      )}
      {modalGroup && (
        <LicenseBranchModal group={modalGroup} onClose={() => setModalGroup(null)} />
      )}

      {/* ── Toast ── */}
      <div
        className={`fixed bottom-6 left-1/2 z-[9999] flex items-center gap-2 rounded-[10px] text-[12.5px] font-semibold text-white whitespace-nowrap pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${toastOn ? 'opacity-100 -translate-x-1/2 translate-y-0' : 'opacity-0 -translate-x-1/2 translate-y-5'}`}
        style={{ padding: '10px 18px', background: '#18103a', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
      >
        <div className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[#0d9488]" />
        <span>{toastMsg}</span>
      </div>
    </>
  );
}

/* ─── CardSkeleton ──────────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="_shimmer" style={{ background: '#f2f0fb', borderRadius: 16, minHeight: 152, display: 'flex', flexDirection: 'row', overflow: 'hidden', border: '1px solid rgba(124,58,237,0.09)' }}>
      <div style={{ width: 160, flexShrink: 0, background: 'rgba(124,58,237,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(124,58,237,0.06)' }}>
        <div style={{ width: 80, height: 80, borderRadius: 16, background: 'rgba(124,58,237,0.1)' }} />
      </div>
      <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
        <div style={{ height: 14, width: '70%', borderRadius: 6, background: 'rgba(124,58,237,0.1)' }} />
        <div style={{ height: 11, width: '55%', borderRadius: 6, background: 'rgba(124,58,237,0.07)' }} />
        <div style={{ height: 10, width: '65%', borderRadius: 6, background: 'rgba(124,58,237,0.06)' }} />
        <div style={{ height: 1, background: 'rgba(124,58,237,0.08)', marginTop: 4 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ height: 10, width: '30%', borderRadius: 6, background: 'rgba(124,58,237,0.07)' }} />
          <div style={{ height: 10, width: '24%', borderRadius: 6, background: 'rgba(124,58,237,0.07)' }} />
        </div>
      </div>
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

function ClientCard({ client, index, onClick, industryColor }: {
  client: Client; index: number; onClick?: () => void; industryColor?: string | null;
}) {
  const [hovered, setHovered] = React.useState(false);
  const bg = industryColor
    ? `linear-gradient(160deg,${industryColor}18,${industryColor}30)`
    : logoBg[client.cat] ?? logoBg['Warehouse'];

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
      {/* Hover arrow */}
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

      {/* Logo panel */}
      <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 14px', position: 'relative', borderRight: '1px solid rgba(124,58,237,0.08)', background: bg }}>
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

      {/* Info panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '13px 14px 12px', minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#18103a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{client.name}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#4a3870', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>{client.contact}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#8e7ec0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{client.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, marginTop: 8, borderTop: '1px solid rgba(124,58,237,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: '#4a3870' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0, ...(dotStyle[client.level] ?? dotStyle['green']) }} />
            {getHealthLabel(client.level)}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: 20, display: 'inline-flex', whiteSpace: 'nowrap', ...(catBadgeCard[client.cat] ?? catBadgeCard['Warehouse']) }}>
            {client.cat}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Status meta ────────────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { hex: string; border: string; bg: string; text: string; dot: string; bar: string; chipBg: string }> = {
  expired:  { hex:'#ef4444', border:'border-red-400/50',    bg:'bg-red-50',    text:'text-red-500',    dot:'bg-red-500',    bar:'bg-red-400',    chipBg:'bg-red-100'    },
  critical: { hex:'#f97316', border:'border-orange-400/50', bg:'bg-orange-50', text:'text-orange-500', dot:'bg-orange-500', bar:'bg-orange-400', chipBg:'bg-orange-100' },
  warning:  { hex:'#eab308', border:'border-yellow-400/50', bg:'bg-yellow-50', text:'text-yellow-500', dot:'bg-yellow-500', bar:'bg-yellow-400', chipBg:'bg-yellow-100' },
  upcoming: { hex:'#22c55e', border:'border-green-400/50',  bg:'bg-green-50',  text:'text-green-500',  dot:'bg-green-500',  bar:'bg-green-400',  chipBg:'bg-green-100'  },
};

/* ─── StatsBar ──────────────────────────────────────────────────────────────── */
function deriveCardColors(hex: string | null) {
  const h = hex ?? '#7c3aed';
  return { hex: h, bg: h + '18', border: h + 'aa', iconBg: h + '1a' };
}
function countForCard(card: IndustryCard, clients: Client[]): number {
  return clients.filter(c => c.cat === card.title).length;
}
function ticketsForCard(card: IndustryCard, clients: Client[]): number {
  return clients.filter(c => c.cat === card.title).reduce((sum, c) => sum + c.tickets, 0);
}

function StatsBar({ clients, industryCards, loadingCards, cardsError, onRetryCards, onCategoryClick, onAddIndustry, totalCompanies }: {
  clients: Client[]; industryCards: IndustryCard[]; loadingCards: boolean; cardsError: string | null;
  onRetryCards: () => void; onCategoryClick: (c: string) => void; onAddIndustry: () => void; totalCompanies: number;
}) {
  const pressTimer   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = React.useRef(false);
  const startPress   = () => { didLongPress.current = false; pressTimer.current = setTimeout(() => { didLongPress.current = true; onAddIndustry(); }, 500); };
  const cancelPress  = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexShrink: 0, marginBottom: 12 }}>
      {/* Total Companies tile */}
      <div
        className="flex items-center gap-[14px] rounded-2xl relative overflow-hidden select-none flex-shrink-0"
        style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#5b21b6,#7c3aed,#0d9488)', boxShadow: '0 4px 18px rgba(124,58,237,0.28)', cursor: 'pointer', userSelect: 'none', width: 210, minWidth: 210 }}
        onMouseDown={startPress} onMouseUp={cancelPress} onMouseLeave={cancelPress}
        onTouchStart={startPress} onTouchEnd={cancelPress} onTouchCancel={cancelPress}
        onContextMenu={e => e.preventDefault()} title="Hold to add a new industry"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 100% at 110% -10%,rgba(255,255,255,0.12) 0%,transparent 60%)' }} />
        <div className="w-[46px] h-[46px] rounded-xl flex-shrink-0 bg-white/[0.18] border border-white/[0.22] flex items-center justify-center relative z-[1]">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="1.5" y="1.5" width="8" height="8" rx="1.5"/><rect x="12.5" y="1.5" width="8" height="8" rx="1.5"/>
            <rect x="1.5" y="12.5" width="8" height="8" rx="1.5"/><rect x="12.5" y="12.5" width="8" height="8" rx="1.5"/>
          </svg>
        </div>
        <div className="relative z-[1]">
          <div className="text-[32px] font-black text-white leading-none tracking-[-0.03em]">{totalCompanies}</div>
          <div className="text-[11px] text-white/75 mt-[2px] font-medium whitespace-nowrap">Total Companies</div>
        </div>
      </div>

      {/* Scrollable industry cards */}
      <div style={{ flex: 1, display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden', alignItems: 'stretch', flexWrap: 'nowrap', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.2) transparent', paddingBottom: 2 }}>
        {loadingCards && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="_shimmer" style={{ width: 'calc((100% - 20px) / 3)', minWidth: 'calc((100% - 20px) / 3)', flexShrink: 0, borderRadius: 16, background: '#f2f0fb', border: '1.5px solid rgba(124,58,237,0.09)', minHeight: 152 }} />
        ))}
        {!loadingCards && industryCards.map(card => {
          const c = deriveCardColors(card.color);
          const count = countForCard(card, clients);
          const tickets = ticketsForCard(card, clients);
          return (
            <div key={card.id} onClick={() => onCategoryClick(card.title)}
              style={{ width: 'calc((100% - 20px) / 3)', minWidth: 'calc((100% - 20px) / 3)', flexShrink: 0, borderRadius: 16, background: '#fff', border: `1.5px solid ${c.border}`, cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '13px 16px', transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease', boxShadow: `0 2px 8px ${c.hex}22`, position: 'relative' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 24px ${c.hex}44`; el.style.borderColor = c.hex; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = `0 2px 8px ${c.hex}22`; el.style.borderColor = c.border; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{card.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const, background: c.bg, color: c.hex, padding: '5px 13px', borderRadius: 20, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{card.title}</span>
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: c.hex, marginBottom: 4, position: 'relative', zIndex: 1 }}>{count}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: c.hex + '99', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3, position: 'relative', zIndex: 1 }}>{card.sub_title ?? card.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: `1px solid ${c.border}`, marginTop: 8, paddingTop: 8, fontSize: 10.5, fontWeight: 600, color: c.hex, opacity: 0.75, position: 'relative', zIndex: 1 }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5.9"/></svg>
                {tickets} ticket{tickets !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
        {!loadingCards && cardsError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 200, minHeight: 152, borderRadius: 16, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontSize: 11, fontWeight: 600, gap: 8, flexShrink: 0, padding: '0 16px', textAlign: 'center' as const }}>
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
            <span>{cardsError}</span>
            <button onClick={onRetryCards} style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Retry</button>
          </div>
        )}
        {!loadingCards && !cardsError && industryCards.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 200, minHeight: 152, borderRadius: 16, background: '#f2f0fb', border: '1.5px dashed rgba(124,58,237,0.2)', color: '#8e7ec0', fontSize: 12, fontWeight: 600, gap: 8, flexShrink: 0 }}>
            <span style={{ opacity: 0.5 }}>📋</span> No industry cards yet
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FilterBar ─────────────────────────────────────────────────────────────── */
function FilterBar({ activeCats, activeHealth, onToggleCat, onToggleHealth, search, onSearch, totalVisible, industryCards, clients }: {
  activeCats: Set<string>; activeHealth: Set<string>; onToggleCat: (c: string) => void; onToggleHealth: (l: string) => void;
  search: string; onSearch: (q: string) => void; totalVisible: number; industryCards: IndustryCard[]; clients: Client[];
}) {
  const seenTitles = new Set<string>();
  const filterPills = industryCards.reduce<{ key: string; label: string; hex: string; n: number }[]>((acc, card) => {
    if (seenTitles.has(card.title)) return acc;
    seenTitles.add(card.title);
    acc.push({ key: card.title, label: toTitleCase(card.title), hex: card.color ?? '#7c3aed', n: clients.filter(c => c.cat === card.title).length });
    return acc;
  }, []);

  return (
    <div className="flex items-center flex-wrap flex-shrink-0" style={{ gap: 8, marginBottom: 14, marginTop: 10 }}>
      <span className="text-[12px] font-semibold text-[#4a3870]">Filter:</span>
      {filterPills.map(f => {
        const on = activeCats.has(f.key);
        return (
          <div key={f.key} onClick={() => onToggleCat(f.key)}
            className="flex items-center cursor-pointer transition-all duration-[140ms] select-none"
            style={{ gap: 5, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: on ? 700 : 600, border: `1.5px solid ${on ? f.hex : 'rgba(124,58,237,0.16)'}`, background: on ? f.hex : '#fff', color: on ? '#fff' : '#4a3870', boxShadow: on ? `0 2px 10px ${f.hex}55` : undefined, transition: 'all 0.14s' }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#f2f0fb'; }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff'; }}
          >
            {f.label}
            <span style={{ background: on ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.1)', color: on ? '#fff' : '#5b21b6', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 20, textAlign: 'center' as const }}>{f.n}</span>
          </div>
        );
      })}
      <div style={{ width: 1, height: 18, background: 'rgba(124,58,237,0.1)', margin: '0 2px' }} />
      <span className="text-[12px] font-semibold text-[#4a3870]">Status:</span>
      {[
        { level: 'green',  label: 'Healthy',   dot: '#22c55e', onShadow: 'rgba(22,163,74,0.35)'  },
        { level: 'yellow', label: 'Attention', dot: '#eab308', onShadow: 'rgba(217,119,6,0.35)'  },
        { level: 'red',    label: 'Critical',  dot: '#ef4444', onShadow: 'rgba(220,38,38,0.35)'  },
      ].map(h => {
        const on = activeHealth.has(h.level);
        return (
          <div key={h.level} onClick={() => onToggleHealth(h.level)}
            className="flex items-center cursor-pointer select-none"
            style={{ gap: 6, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: on ? 700 : 600, border: `1.5px solid ${on ? h.dot : 'rgba(124,58,237,0.16)'}`, background: on ? h.dot : '#fff', color: on ? '#fff' : '#4a3870', boxShadow: on ? `0 2px 10px ${h.onShadow}` : undefined, transition: 'all 0.14s' }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#f2f0fb'; }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff'; }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.8)' : h.dot, display: 'inline-block' }} />
            {h.label}
          </div>
        );
      })}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="text-[11px] font-semibold text-[#8e7ec0]">{totalVisible} shown</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: '6px 11px' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.6" style={{ width: 12, height: 12, flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search…" value={search} onChange={e => onSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 11.5, color: '#18103a', width: 130 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── LicensePanel ──────────────────────────────────────────────────────────── */
function LicensePanel({ groups, stats, search, onSearch, filters, onToggleFilter, onRemoveFilter, onDndStart, loading, error, onRetry, onViewBranches }: {
  groups: CompanyLicenseGroup[]; stats: { expired: number; critical: number; warning: number; upcoming: number };
  search: string; onSearch: (s: string) => void; filters: Set<string>;
  onToggleFilter: (s: string) => void; onRemoveFilter: (s: string) => void; onDndStart: () => void;
  loading: boolean; error: string | null; onRetry: () => void; onViewBranches: (g: CompanyLicenseGroup) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const total = stats.expired + stats.critical + stats.warning + stats.upcoming;

  const pills = [
    { id: 'expired',  label: 'Expired',  n: stats.expired,  hex: '#ef4444', bg: 'bg-red-50',    sublabel: 'licenses past due' },
    { id: 'critical', label: 'Critical', n: stats.critical, hex: '#f97316', bg: 'bg-orange-50', sublabel: 'expiring within 30d' },
    { id: 'warning',  label: 'Warning',  n: stats.warning,  hex: '#eab308', bg: 'bg-yellow-50', sublabel: 'expiring within 90d' },
    { id: 'upcoming', label: 'Upcoming', n: stats.upcoming, hex: '#22c55e', bg: 'bg-green-50',  sublabel: 'expiring within 180d' },
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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isActive ? color : color + '99'} strokeWidth={isActive ? 4.5 : 3.5} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.4s ease' }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 9, fontWeight: 700, fill: isActive ? color : '#8e7ec0' }}>
          {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </text>
      </svg>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 25 }}>
        <div style={{ flex: 1 }} />
        {!loading && !error && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8e7ec0', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap' }}>
            {groups.length} compan{groups.length !== 1 ? 'ies' : 'y'}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: '6px 11px', width: 230 }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.6" style={{ width: 12, height: 12, flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search company…" value={search} onChange={e => onSearch(e.target.value)}
            className="placeholder:text-[#b8aed8]"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 11.5, color: '#18103a', width: '100%' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
          {error}
          <button onClick={onRetry} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      <div className="flex flex-shrink-0" style={{ gap: 8, marginBottom: 10 }}>
        {pills.map(p => {
          const isActive = filters.has(p.id);
          const isDragging = draggingId === p.id;
          return (
            <div key={p.id} draggable={!isActive}
              onDragStart={e => !isActive && handlePillDragStart(e, p.id)} onDragEnd={handlePillDragEnd}
              title={isActive ? 'Filter active — click × to remove' : 'Drag to filter'}
              style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', background: isActive ? undefined : '#fff', border: `1.5px solid ${isActive ? p.hex + '88' : 'rgba(124,58,237,0.1)'}`, cursor: isActive ? 'default' : isDragging ? 'grabbing' : 'grab', transition: 'all 0.18s', userSelect: 'none' as const, opacity: isDragging ? 0.38 : 1, transform: isDragging ? 'scale(0.95) rotate(-1deg)' : undefined, boxShadow: isActive ? `0 2px 14px ${p.hex}30` : isDragging ? 'none' : '0 1px 6px rgba(0,0,0,0.06)' }}
              className={isActive ? p.bg : ''}
              onMouseEnter={e => { if (isActive || isDragging) return; const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 24px ${p.hex}28`; el.style.borderColor = p.hex + '55'; }}
              onMouseLeave={e => { if (isActive || isDragging) return; const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)'; el.style.borderColor = 'rgba(124,58,237,0.1)'; }}>
              <div style={{ height: 3, width: '100%', background: isActive ? p.hex : `linear-gradient(90deg,${p.hex}88,${p.hex}22)` }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 14px 14px', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: p.hex, boxShadow: isActive ? `0 0 7px ${p.hex}` : `0 0 4px ${p.hex}88` }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? p.hex : '#4a3870', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{p.label}</span>
                    {isActive ? (
                      <div style={{ marginLeft: 'auto', width: 17, height: 17, borderRadius: '50%', background: `${p.hex}1a`, border: `1px solid ${p.hex}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={p.hex} strokeWidth="2.2"><path d="M1.5 4l2 2 3-3"/></svg>
                      </div>
                    ) : (
                      <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, opacity: 0.25, flexShrink: 0 }}>
                        {[0,1,2].map(i => <div key={i} style={{ display: 'flex', gap: 2.5 }}><div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: '#4a3870' }} /><div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: '#4a3870' }} /></div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: isActive ? p.hex : '#18103a', marginBottom: 4 }}>{p.n}</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: isActive ? p.hex + 'bb' : '#8e7ec0', marginBottom: 12, lineHeight: 1.3 }}>{p.sublabel}</div>
                  <div style={{ paddingTop: 8, borderTop: isActive ? `1px solid ${p.hex}22` : '1px dashed rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isActive
                      ? <span style={{ fontSize: 8.5, fontWeight: 700, color: p.hex, opacity: 0.75, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Filter active</span>
                      : <><svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke={p.hex} strokeWidth="2" style={{ opacity: 0.55, flexShrink: 0 }}><path d="M7 1v10M3 8l4 4 4-4"/></svg><span style={{ fontSize: 9, fontWeight: 600, color: p.hex, opacity: 0.6 }}>drag to filter</span></>
                    }
                  </div>
                </div>
                <div style={{ flexShrink: 0, paddingTop: 2 }}><Donut n={p.n} color={p.hex} isActive={isActive} /></div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 12, border: isDragOver ? '2px dashed #7c3aed' : '1px solid rgba(124,58,237,0.1)', boxShadow: isDragOver ? '0 0 0 4px rgba(124,58,237,0.08)' : undefined, background: isDragOver ? 'rgba(124,58,237,0.02)' : '#fff', transition: 'border 0.15s, box-shadow 0.15s', position: 'relative', overflow: 'hidden' }}
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
                <button onClick={() => onRemoveFilter(p.id)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', border: 'none', background: `color-mix(in srgb,${p.hex} 18%,white)`, color: p.hex, cursor: 'pointer', padding: 0, marginLeft: 2 }}>
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l6 6M7 1L1 7"/></svg>
                </button>
              </div>
            ))}
            {activeFilters.length > 1 && (
              <button onClick={() => activeFilters.forEach(p => onRemoveFilter(p.id))} style={{ fontSize: 9.5, fontWeight: 600, color: '#8e7ec0', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline', textUnderlineOffset: 2 }}>Clear all</button>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="_shimmer" style={{ height: 56, borderRadius: 8, background: '#f2f0fb' }} />
              ))}
            </div>
          ) : groups.length === 0 && !error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, color: '#8e7ec0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, opacity: 0.5 }}>📋</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4a3870' }}>No expiring licenses</div>
              <div style={{ fontSize: 11 }}>{filters.size > 0 ? 'No results match the active filters' : 'No branches with license data found'}</div>
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', fontFamily: 'DM Sans,sans-serif', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 44 }} /><col style={{ width: 220 }} /><col style={{ width: 100 }} />
                <col style={{ width: 260 }} /><col style={{ width: 160 }} /><col style={{ width: 148 }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f5f4fc', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['', 'Company', 'Industry', 'Branch Status', 'Acct Manager', ''].map((h, i) => (
                    <th key={i} style={{ padding: i === 0 ? '10px 0 10px 14px' : '10px 14px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#8e7ec0', textAlign: i === 5 ? 'right' as const : 'left' as const, borderBottom: '1px solid rgba(124,58,237,0.1)', whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const worst = g.worstStatus !== 'none' ? STATUS_META[g.worstStatus] : null;
                  const visibleStatuses = (filters.size > 0
                    ? (['expired', 'critical', 'warning', 'upcoming'] as const).filter(s => filters.has(s))
                    : ['expired', 'critical', 'warning', 'upcoming'] as const
                  );
                  return (
                    <tr key={g.companyId} style={{ borderBottom: '1px solid rgba(124,58,237,0.05)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0 8px 0 14px', height: 56, verticalAlign: 'middle' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, background: worst ? `${worst.hex}18` : 'rgba(124,58,237,0.1)', color: worst ? worst.hex : '#7c3aed', letterSpacing: '-0.02em', flexShrink: 0 }}>{getInitials(g.companyName)}</div>
                      </td>
                      <td style={{ padding: '0 14px', height: 56, verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.companyName}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 500, color: '#8e7ec0', marginTop: 2 }}>{g.totalBranches} branch{g.totalBranches !== 1 ? 'es' : ''}</div>
                      </td>
                      <td style={{ padding: '0 14px', height: 56, verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, background: 'rgba(124,58,237,0.1)', color: '#5b21b6', border: '1px solid rgba(124,58,237,0.2)' }}>{g.cat}</span>
                      </td>
                      <td style={{ padding: '0 14px', height: 56, verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          {visibleStatuses.map(s => {
                            const n = g.counts[s]; if (n === 0) return null;
                            const m = STATUS_META[s];
                            return (
                              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px 3px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', color: m.hex, background: `${m.hex}16`, border: `1px solid ${m.hex}38` }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.hex, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 4px ${m.hex}88` }} />
                                {n} {s.charAt(0).toUpperCase() + s.slice(1)}
                              </span>
                            );
                          })}
                          {visibleStatuses.every(s => g.counts[s] === 0) && <span style={{ fontSize: 11, color: '#c4b5e0', fontWeight: 500 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0 14px', height: 56, verticalAlign: 'middle', overflow: 'hidden' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#4a3870', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{g.accountManager || '—'}</span>
                      </td>
                      <td style={{ padding: '0 14px', height: 56, verticalAlign: 'middle', textAlign: 'right' }}>
                        <button onClick={() => onViewBranches(g)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 9, border: '1.5px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.14s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(124,58,237,0.3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; e.currentTarget.style.color = '#7c3aed'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'; e.currentTarget.style.boxShadow = ''; }}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>
                          View Branches
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
    </>
  );
}
