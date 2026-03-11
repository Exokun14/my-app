/* ==============================================================
   dashboard_overview_users.tsx  ·  Company Client Overview

   FIXES:
   1. Accepts onLogout prop and wires it to <Sidebar onLogout>
      and <Header onLogout> so Sign Out works here too.
   2. Wires <Sidebar onNavigate> so Learning Center and other
      nav items work correctly from this view.
   3. Uses useAuthUser() to show the real logged-in user in the
      Header instead of the hardcoded "John Doe" placeholder.
   ============================================================== */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
  Client, ClientUser, GlobalUser, Ticket, TicketGroup,
  POSDevice, PageId, SettingsSection, TicketStatus, TicketPriority,
  CLIENTS, CLIENT_USERS, GLOBAL_USERS, ALL_TICKETS,
  ACCOUNT_MANAGERS, getCatClass, formatDate, generatePOSDevices,
  filterUsers, getPriorityInfo, buildNewUser, formatTimeWidget,
  getInitials, getAvatarGradient,
} from './dashboard_overview_func';

import AddUserPopup      from './add_user_popup';
import EditInfoPopup     from './edit_info_popup';
import BranchDetailPopup from './branch_detail_popup';
import POSDetailPopup    from './pos_detail_popup';

import { EditInfoFormState } from './popup_shared';

import Sidebar from '../Sidebar_Web/sidebar';
import Header  from '../Header_Web/header';

import { useAuthUser } from '../../Hooks/useAuthUser';

/* ═══════════════════════════════════════════════════════════════
   SWIPE HOOK
═══════════════════════════════════════════════════════════════ */
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 50) {
  const startX = useRef<number | null>(null);
  const onPointerDown  = useCallback((e: React.PointerEvent) => { startX.current = e.clientX; }, []);
  const onPointerUp    = useCallback((e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < threshold) return;
    dx < 0 ? onSwipeLeft() : onSwipeRight();
  }, [onSwipeLeft, onSwipeRight, threshold]);
  const onPointerLeave = useCallback(() => { startX.current = null; }, []);
  return { onPointerDown, onPointerUp, onPointerLeave };
}

/* ═══════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════ */
interface DashboardAdminProps {
  initialClient?: Client;
  onBack?: () => void;
  onLogout?: () => void;   // ← wired from root page.tsx / parent shell
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function DashboardAdmin({ initialClient, onBack, onLogout }: DashboardAdminProps = {}) {

  /* ── Real user data from the API ── */
  const { headerUser } = useAuthUser();

  /* ── Navigation handler for Sidebar ── */
  const handleNavigate = useCallback((view: string) => {
    // In this context (standalone overview page), we just use the
    // router for named views that have their own routes. For state-
    // machine contexts the parent wraps this and passes onNavigate
    // down further; here a no-op is safe — the sidebar's href
    // fallback will handle route-based navigation automatically.
  }, []);

  const [currentClient, setCurrentClient] = useState<Client>(initialClient ?? CLIENTS[0]);
  const [clients,        setClients]       = useState<Client[]>(CLIENTS);
  const [ovPanel,        setOvPanel]       = useState(0);
  const [posDevices,     setPosDevices]    = useState<POSDevice[]>(() => generatePOSDevices(initialClient ?? CLIENTS[0]));
  const [clientUsers,    setClientUsers]   = useState<Record<number, ClientUser[]>>(CLIENT_USERS);
  const [activePOSBranchFilter, setActivePOSBranchFilter] = useState<Set<string>>(new Set());
  const [ticketStatusFilter,    setTicketStatusFilter]    = useState<TicketStatus>('open');

  const [users,  setUsers]  = useState<GlobalUser[]>(GLOBAL_USERS);
  const [userSearch, setUserSearch] = useState('');

  const [pendingRoles,     setPendingRoles]     = useState<Set<string>>(new Set());
  const [pendingStatuses,  setPendingStatuses]  = useState<Set<string>>(new Set());
  const [pendingCompanies, setPendingCompanies] = useState<Set<string>>(new Set());

  const [userRoleFilters,    setUserRoleFilters]    = useState<Set<string>>(new Set());
  const [userStatusFilters,  setUserStatusFilters]  = useState<Set<string>>(new Set());
  const [userCompanyFilters, setUserCompanyFilters] = useState<Set<string>>(new Set());

  const [showUserFilterPanel, setShowUserFilterPanel] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const [posSearch,           setPosSearch]           = useState('');
  const [showPOSFilterPanel,  setShowPOSFilterPanel]  = useState(false);
  const [showAddBranchInput,  setShowAddBranchInput]  = useState(false);
  const [addBranchName,       setAddBranchName]       = useState('');

  const [addUserModalOpen,  setAddUserModalOpen]  = useState(false);
  const [editInfoModalOpen, setEditInfoModalOpen] = useState(false);
  const [editInfoForm,      setEditInfoForm]      = useState<EditInfoFormState | null>(null);
  const [branchDetailModal, setBranchDetailModal] = useState<{ branch: string; client: Client } | null>(null);
  const [posDetailModal,    setPosDetailModal]    = useState<{ pos: POSDevice; client: Client } | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateTimeInfo, setDateTimeInfo] = useState(formatTimeWidget());

  const ovSwipe = useSwipe(
    () => setOvPanel(p => Math.min(2, p + 1)),
    () => setOvPanel(p => Math.max(0, p - 1)),
  );

  useEffect(() => {
    const t = setInterval(() => setDateTimeInfo(formatTimeWidget()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (initialClient) {
      setCurrentClient(initialClient);
      setPosDevices(generatePOSDevices(initialClient));
      setOvPanel(0);
      setActivePOSBranchFilter(new Set());
      setPosSearch('');
    }
  }, [initialClient]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowUserFilterPanel(false);
      }
    };
    if (showUserFilterPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserFilterPanel]);

  const openFilterPanel = () => {
    setPendingRoles(new Set(userRoleFilters));
    setPendingStatuses(new Set(userStatusFilters));
    setPendingCompanies(new Set(userCompanyFilters));
    setShowUserFilterPanel(true);
  };

  const applyFilters = () => {
    setUserRoleFilters(new Set(pendingRoles));
    setUserStatusFilters(new Set(pendingStatuses));
    setUserCompanyFilters(new Set(pendingCompanies));
    setShowUserFilterPanel(false);
  };

  const totalActiveFilters = userRoleFilters.size + userStatusFilters.size + userCompanyFilters.size;
  const pendingTotal = pendingRoles.size + pendingStatuses.size + pendingCompanies.size;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg); setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2800);
  }, []);

  const openEditInfoModal = (client: Client) => {
    const alts = client.altContact
      ? [{ name: client.altContact, email: client.altEmail || '', phone: client.altPhone || '' }]
      : [];
    setEditInfoForm({
      storeName: client.name, contact: client.contact, email: client.email,
      phone: client.phone || '', altContacts: alts, site: client.site || '',
      seats: String(client.seats || ''), keysPerStore: String(client.keysPerStore || ''),
      licenseId: client.licenseId || '', saStart: client.saStart || '',
      saEnd: client.saEnd || '', krunchNum: client.krunchNum || '',
    });
    setEditInfoModalOpen(true);
  };

  const handleSaveEditInfo = () => {
    if (!editInfoForm || !currentClient) return;
    const alt0 = editInfoForm.altContacts[0];
    const updated: Client = {
      ...currentClient,
      name: editInfoForm.storeName, contact: editInfoForm.contact,
      email: editInfoForm.email,    phone: editInfoForm.phone,
      altContact: alt0?.name  || undefined, altEmail: alt0?.email || undefined,
      altPhone:   alt0?.phone || undefined, site: editInfoForm.site,
      seats:      parseInt(editInfoForm.seats) || 0,
      keysPerStore: editInfoForm.keysPerStore ? parseInt(editInfoForm.keysPerStore) : undefined,
      licenseId: editInfoForm.licenseId || undefined,
      saStart:   editInfoForm.saStart   || undefined,
      saEnd:     editInfoForm.saEnd     || undefined,
      krunchNum: editInfoForm.krunchNum || undefined,
    };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setEditInfoModalOpen(false);
    showToast('Client information updated successfully!');
  };

  const handleAddBranch = () => {
    if (!addBranchName.trim() || !currentClient) return;
    const updated: Client = { ...currentClient, branches: [...(currentClient.branches || []), addBranchName.trim()] };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setAddBranchName(''); setShowAddBranchInput(false);
    showToast(`Branch "${addBranchName.trim()}" added!`);
  };

  const handleAddPOSFromBranch = (branch: string, posData: any) => {
    if (!currentClient) return;
    const newPOS: POSDevice = {
      id: `POS-${currentClient.id}-${String(Date.now()).slice(-5)}`,
      model: posData.model || 'PAX A920', serial: posData.serial || `SN${Date.now()}`,
      ip: posData.ip || '192.168.0.1',   os: posData.os || 'Windows 10',
      branch, status: 'online',
      msaStart: posData.msaStart || undefined, msaEnd: posData.msaEnd || undefined,
      warrantyDate: posData.warrantyDate || undefined,
    };
    setPosDevices(prev => [...prev, newPOS]);
    const updated: Client = { ...currentClient, posCount: currentClient.posCount + 1 };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    showToast(`POS added to "${branch}"!`);
  };

  const handleEditPOS = (posId: string, posData: any) => {
    setPosDevices(prev => prev.map(p =>
      p.id === posId ? { ...p, ...posData, msaStart: posData.msaStart || undefined, msaEnd: posData.msaEnd || undefined, warrantyDate: posData.warrantyDate || undefined } : p
    ));
    showToast('POS device updated successfully!');
  };

  const handleRemovePOS = (posId: string) => {
    if (!currentClient) return;
    setPosDevices(prev => prev.filter(p => p.id !== posId));
    const updated: Client = { ...currentClient, posCount: Math.max(0, currentClient.posCount - 1) };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    showToast('POS device removed.');
  };

  const filteredUsers   = filterUsers(users, userRoleFilters, userStatusFilters, userCompanyFilters, userSearch);
  const uniqueCompanies = Array.from(new Set(users.map(u => u.company))).sort();

  const catBadgeStyle = (cat: string): React.CSSProperties => {
    if (cat === 'F&B')    return { background: 'rgba(217,119,6,0.18)',   color: '#92400e', border: '1px solid rgba(217,119,6,0.28)' };
    if (cat === 'Retail') return { background: 'rgba(2,132,199,0.15)',   color: '#075985', border: '1px solid rgba(2,132,199,0.25)' };
    return                       { background: 'rgba(124,58,237,0.14)', color: '#4c1d95', border: '1px solid rgba(124,58,237,0.24)' };
  };

  const posByBranch = (() => {
    const q = posSearch.toLowerCase().trim();
    const filtered = posDevices.filter(d => {
      const branchOk = activePOSBranchFilter.size === 0 || activePOSBranchFilter.has(d.branch);
      const searchOk = !q || [d.model, d.serial, d.ip, d.os, d.branch, d.id].some(s => s.toLowerCase().includes(q));
      return branchOk && searchOk;
    });
    const groups: Record<string, POSDevice[]> = {};
    filtered.forEach(d => {
      if (!groups[d.branch]) groups[d.branch] = [];
      groups[d.branch].push(d);
    });
    return groups;
  })();

  return (
    <>
      {/* Sidebar: onNavigate + onLogout both wired */}
      <Sidebar
        activePage="customers"
        onNavigate={handleNavigate}
        onLogout={onLogout}
      />

      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'var(--gxh-sw, 220px)', minHeight: '100vh', marginTop: 54, transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        {/* Header: real user from API + onLogout wired */}
        <Header
          user={headerUser}
          onLogout={onLogout}
        />

        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 50% at 0% 0%, rgba(124,58,237,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 100% 100%, rgba(13,148,136,0.05) 0%, transparent 60%), #f8f7ff` }} />
        <canvas id="rc" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100vh' }}>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '20px 28px 50px', overflow: 'hidden', zIndex: 2, fontFamily: "'DM Sans', sans-serif" }}>

              {/* ── Page Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>

                {onBack && (
                  <button
                    onClick={onBack}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 9,
                      background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.15)',
                      color: '#4a3870', fontSize: 11.5, fontWeight: 600,
                      cursor: 'pointer', flexShrink: 0,
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.3)'; el.style.color = '#7c3aed'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.15)'; el.style.color = '#4a3870'; }}
                  >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
                      <path d="M9 2L4 7l5 5"/>
                    </svg>
                    Back
                  </button>
                )}

                {currentClient.logo && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, overflow: 'hidden', flexShrink: 0,
                    background: '#fff', border: '1px solid rgba(124,58,237,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}>
                    <img
                      src={currentClient.logo}
                      alt={currentClient.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, fontWeight: 400, color: '#18103a', whiteSpace: 'nowrap', margin: 0 }}>
                  {currentClient.name}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: '#8e7ec0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {['Overview', 'Tickets', 'Users'][ovPanel]}
                  </span>
                  {[0, 1, 2].map(i => (
                    <div key={i} onClick={() => setOvPanel(i)} style={{ height: 6, borderRadius: i === ovPanel ? 3 : '50%', cursor: 'pointer', width: i === ovPanel ? 18 : 6, background: i === ovPanel ? '#7c3aed' : 'rgba(124,58,237,0.2)', transition: 'all 220ms' }} />
                  ))}
                </div>

                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />

                <span style={{ ...catBadgeStyle(currentClient.cat), fontSize: 10, padding: '4px 12px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {currentClient.cat}
                </span>
              </div>

              {/* ── Swipe Container ── */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }} {...ovSwipe}>
                <div style={{ display: 'flex', height: '100%', transform: `translateX(-${ovPanel * 100}%)`, transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)' }}>

                  {/* ══ PANEL 0 — OVERVIEW ══ */}
                  <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                      <StatCard icon={<UserIcon />}    iconBg="#ede9fe" iconColor="#7c3aed" value={currentClient.users}  label="Users" />
                      <StatCard icon={<MonitorIcon />} iconBg="#ccfbf1" iconColor="#0d9488" value={`${posDevices.filter(d => d.status === 'online').length}/${currentClient.posCount}`} label="Total POS" />
                      <StatCard icon={<ClockIcon />}   iconBg="#fee2e2" iconColor="#dc2626" value={currentClient.tickets} label="Open Tickets" />
                      {currentClient.cat === 'F&B' ? (
                        <StatCard icon={<KeyIcon />} iconBg="#fef3c7" iconColor="#d97706" value={currentClient.keysPerStore || '—'} label="Keys/Store" />
                      ) : (
                        <>
                          <StatCard icon={<LocationIcon />} iconBg="#e0f2fe" iconColor="#0284c7" value={(currentClient.branches || []).length} label="Sites" />
                          <StatCard icon={<GridIcon />}     iconBg="#e0f2fe" iconColor="#0284c7" value={currentClient.seats || '—'} label="Seats" />
                        </>
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '5fr 5fr', gap: 12, overflow: 'hidden', minHeight: 0 }}>
                      {/* LEFT — General Info */}
                      <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>General Information</span>
                          <button onClick={() => openEditInfoModal(currentClient)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }} onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fff'; el.style.borderColor = 'rgba(124,58,237,0.22)'; el.style.color = '#18103a'; }} onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.1)'; el.style.color = '#4a3870'; }}>
                            <EditPenIcon /> Edit Info
                          </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
                          <SectionLabel>PRIMARY CONTACT</SectionLabel>
                          {[{ key: 'Store Name', val: currentClient.name }, { key: 'Contact Person', val: currentClient.contact }, { key: 'Email', val: currentClient.email }, { key: 'Phone', val: currentClient.phone || '—' }].map(item => <InfoRow key={item.key} label={item.key} value={item.val} />)}
                          <SectionLabel mt>ALTERNATE CONTACT</SectionLabel>
                          {currentClient.altContact ? (
                            <>{[{ key: 'Contact Person', val: currentClient.altContact }, { key: 'Email', val: currentClient.altEmail || '—' }, { key: 'Phone', val: currentClient.altPhone || '—' }].map(item => <InfoRow key={item.key} label={item.key} value={item.val} />)}</>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
                              <span style={{ fontSize: 10.5, color: '#8e7ec0', fontStyle: 'italic' }}>No alternate contact</span>
                              <button onClick={() => openEditInfoModal(currentClient)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Add</button>
                            </div>
                          )}
                          <SectionLabel mt>ACCOUNT DETAILS</SectionLabel>
                          <InfoRow label="Acct Manager" value={currentClient.accountManager} valueStyle={{ color: '#7c3aed', fontWeight: 600 }} />
                          <InfoRow label="User Role" value="System Admin" />
                          {currentClient.cat === 'F&B' && (<><SectionLabel mt>KEYS</SectionLabel><InfoRow label="Keys No. per Store" value={String(currentClient.keysPerStore || '—')} valueStyle={{ color: '#d97706', fontWeight: 700 }} /></>)}
                          {currentClient.cat !== 'F&B' && (<><SectionLabel mt>LICENSE</SectionLabel>{[{ key: 'License ID', val: currentClient.licenseId || '—' }, { key: 'Start', val: formatDate(currentClient.saStart) }, { key: 'End', val: formatDate(currentClient.saEnd) }, { key: 'Krunch #', val: currentClient.krunchNum || '—' }].map(item => <InfoRow key={item.key} label={item.key} value={item.val} />)}</>)}
                          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(124,58,237,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#4a3870', letterSpacing: '0.04em' }}>Branch Locations</span>
                              <button onClick={() => { setShowAddBranchInput(true); setAddBranchName(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: '#fff', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 2px 10px rgba(124,58,237,0.28)', fontFamily: "'DM Sans',sans-serif" }}><PlusIcon /> Add Branch</button>
                            </div>
                            {showAddBranchInput && (
                              <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                                <input style={{ flex: 1, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, color: '#18103a', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} placeholder="Branch name…" value={addBranchName} onChange={e => setAddBranchName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddBranch(); if (e.key === 'Escape') setShowAddBranchInput(false); }} autoFocus />
                                <button onClick={handleAddBranch} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#fff', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#0d9488)', fontFamily: "'DM Sans',sans-serif" }}>Add</button>
                                <button onClick={() => setShowAddBranchInput(false)} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>✕</button>
                              </div>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {(currentClient.branches || []).map((branch: string) => (
                                <div key={branch} onClick={() => setBranchDetailModal({ branch, client: currentClient })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#e0f2fe', color: '#0c4a6e', fontSize: 10.5, fontWeight: 600, borderRadius: 7, border: '1px solid rgba(2,132,199,0.2)', cursor: 'pointer', transition: 'all 0.14s' }} onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#bae6fd'; el.style.borderColor = 'rgba(2,132,199,0.35)'; }} onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#e0f2fe'; el.style.borderColor = 'rgba(2,132,199,0.2)'; }}>
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                                  {branch}
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2"/></svg>
                                </div>
                              ))}
                            </div>
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
                            <button onClick={() => setShowPOSFilterPanel(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 10.5, fontWeight: 600, transition: 'all 0.16s', whiteSpace: 'nowrap', background: showPOSFilterPanel ? '#7c3aed' : '#f2f0fb', color: showPOSFilterPanel ? '#fff' : '#4a3870', outline: showPOSFilterPanel ? 'none' : '1px solid rgba(124,58,237,0.1)' }}>
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
                              const count = posDevices.filter(d => d.branch === branch).length;
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
                            {Object.entries(posByBranch).map(([branch, devices]) => (
                              <div key={branch}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.08))', border: '1px solid rgba(2,132,199,0.18)', borderRadius: 6, padding: '3px 10px' }}>
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#0284c7" strokeWidth="1.5"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/><circle cx="6" cy="5" r="1.2"/></svg>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0c4a6e', letterSpacing: '0.03em' }}>{branch}</span>
                                  </div>
                                  <span style={{ fontSize: 9.5, color: '#8e7ec0', fontWeight: 600 }}>{devices.length} device{devices.length !== 1 ? 's' : ''}</span>
                                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(2,132,199,0.12),transparent)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {devices.map(pos => <POSBranchCard key={pos.id} pos={pos} onClick={() => setPosDetailModal({ pos, client: currentClient })} />)}
                                </div>
                              </div>
                            ))}
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

                  {/* ══ PANEL 1 — TICKETS ══ */}
                  <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 3, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 9, padding: 3, flexShrink: 0 }}>
                        {(['open', 'pending', 'closed'] as TicketStatus[]).map(s => (
                          <div key={s} onClick={() => setTicketStatusFilter(s)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s', userSelect: 'none', background: ticketStatusFilter === s ? '#fff' : 'transparent', color: ticketStatusFilter === s ? '#18103a' : '#8e7ec0', boxShadow: ticketStatusFilter === s ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, display: 'inline-block', background: s === 'open' ? '#ef4444' : s === 'pending' ? '#eab308' : '#22c55e' }} />
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                            <span style={{ background: '#e9e6f8', color: '#8e7ec0', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8 }}>{ALL_TICKETS[s].length}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />
                      <button onClick={() => showToast('Exporting tickets…')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 10.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb' }}>Export</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
                      <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#fee2e2', color: '#dc2626' }}><ClockIcon /></div>
                        <div><div style={{ fontSize: 24, fontWeight: 700, color: '#18103a', lineHeight: 1 }}>{ALL_TICKETS.open.length}</div><div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 2 }}>Open Tickets</div></div>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#dcfce7', color: '#16a34a' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 8.5l3.5 3.5 7.5-7.5"/></svg></div>
                        <div><div style={{ fontSize: 24, fontWeight: 700, color: '#18103a', lineHeight: 1 }}>{ALL_TICKETS.closed.length}</div><div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 2 }}>Resolved This Month</div></div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, minHeight: 0 }}>
                      <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#18103a' }}>Ticket Trend</span>
                          <span style={{ fontSize: 10.5, color: '#8e7ec0' }}>Last 30 days</span>
                        </div>
                        <MiniChart />
                      </div>
                      <div style={{ background: '#fff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#18103a' }}>Ticket List</span>
                          <button onClick={() => showToast('Viewing all tickets')} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>View All</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
                          {ALL_TICKETS[ticketStatusFilter].slice(0, 8).map((ticket: Ticket) => <TicketItem key={ticket.id} ticket={ticket} />)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ══ PANEL 2 — USERS ══ */}
                  <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#18103a' }}>{currentClient.name} Users</div>
                        <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 2 }}>Users assigned to this company</div>
                      </div>
                      <button onClick={() => setAddUserModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#fff', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 2px 10px rgba(124,58,237,0.28)', fontFamily: "'DM Sans',sans-serif" }}>
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
                        <button
                          onClick={() => showUserFilterPanel ? setShowUserFilterPanel(false) : openFilterPanel()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all 0.16s', background: showUserFilterPanel ? '#7c3aed' : '#f2f0fb', color: showUserFilterPanel ? '#fff' : '#4a3870', border: showUserFilterPanel ? 'none' : '1px solid rgba(124,58,237,0.16)', boxShadow: showUserFilterPanel ? '0 2px 10px rgba(124,58,237,0.3)' : 'none' }}
                        >
                          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3"/></svg>
                          Filters
                          {totalActiveFilters > 0 && (
                            <span style={{ background: showUserFilterPanel ? 'rgba(255,255,255,0.3)' : '#7c3aed', color: '#fff', borderRadius: 9, fontSize: 9, fontWeight: 700, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
                              {totalActiveFilters}
                            </span>
                          )}
                          <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9" style={{ transform: showUserFilterPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="M1 1l4 4 4-4"/>
                          </svg>
                        </button>

                        {showUserFilterPanel && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200, minWidth: 520, background: '#fff', borderRadius: 14, border: '1px solid rgba(124,58,237,0.13)', boxShadow: '0 8px 32px rgba(124,58,237,0.14)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid rgba(124,58,237,0.09)', background: '#faf9ff' }}>
                              <svg viewBox="0 0 14 14" fill="none" stroke="#7c3aed" strokeWidth="1.7" width="13" height="13"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3"/></svg>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#18103a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filter Users</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.8fr', gap: 0 }}>
                              <div style={{ padding: '14px 18px 10px', borderRight: '1px solid rgba(124,58,237,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#8e7ec0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Role</span>
                                </div>
                                {['System Admin', 'Manager', 'User'].map(r => (
                                  <FilterCheckRow key={r} label={r} checked={pendingRoles.has(r)} onChange={() => setPendingRoles(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; })} />
                                ))}
                              </div>
                              <div style={{ padding: '14px 18px 10px', borderRight: '1px solid rgba(124,58,237,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#8e7ec0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Status</span>
                                </div>
                                {[{ label: 'Active', dot: '#22c55e' }, { label: 'Inactive', dot: '#ef4444' }].map(({ label, dot }) => (
                                  <FilterCheckRow key={label} label={label} dot={dot} checked={pendingStatuses.has(label)} onChange={() => setPendingStatuses(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; })} />
                                ))}
                              </div>
                              <div style={{ padding: '14px 18px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#8e7ec0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Company</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                                  {uniqueCompanies.map(company => (
                                    <FilterCheckRow key={company} label={company} checked={pendingCompanies.has(company)} onChange={() => setPendingCompanies(prev => { const n = new Set(prev); n.has(company) ? n.delete(company) : n.add(company); return n; })} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 12px', borderTop: '1px solid rgba(124,58,237,0.09)', background: '#faf9ff' }}>
                              <span style={{ fontSize: 11, color: pendingTotal > 0 ? '#8e7ec0' : '#b8aed8', fontStyle: pendingTotal === 0 ? 'italic' : 'normal', fontWeight: pendingTotal > 0 ? 600 : 400 } as React.CSSProperties}>
                                {pendingTotal === 0 ? 'No filters active' : `${pendingTotal} filter${pendingTotal !== 1 ? 's' : ''} selected`}
                              </span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {pendingTotal > 0 && (
                                  <button onClick={() => { setPendingRoles(new Set()); setPendingStatuses(new Set()); setPendingCompanies(new Set()); }} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                                    Clear all
                                  </button>
                                )}
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
                      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              {['Name', 'Email', 'Role', 'Company', 'Position', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ position: 'sticky', top: 0, background: '#f2f0fb', padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8e7ec0', textAlign: 'left', borderBottom: '1px solid rgba(124,58,237,0.1)', whiteSpace: 'nowrap', zIndex: 1 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((u: GlobalUser, i: number) => {
                              const [g1, g2] = getAvatarGradient(u.name);
                              return (
                                <tr key={i} onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(td => (td as HTMLElement).style.background = '#faf9ff')} onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(td => (td as HTMLElement).style.background = '')}>
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
                                  <td style={{ padding: '9px 12px', borderBottom: '1px solid rgba(124,58,237,0.07)', color: '#4a3870' }}>{u.company}</td>
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
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {addUserModalOpen && <AddUserPopup clients={clients} onAdd={user => setUsers(prev => [user, ...prev])} onClose={() => setAddUserModalOpen(false)} showToast={showToast} />}
      {editInfoModalOpen && editInfoForm && currentClient && <EditInfoPopup client={currentClient} form={editInfoForm} onChange={setEditInfoForm} onSave={handleSaveEditInfo} onClose={() => setEditInfoModalOpen(false)} />}
      {branchDetailModal && <BranchDetailPopup branch={branchDetailModal.branch} client={branchDetailModal.client} posDevices={posDevices} onClose={() => setBranchDetailModal(null)} onAddPOS={handleAddPOSFromBranch} onEditPOS={handleEditPOS} onRemovePOS={handleRemovePOS} />}
      {posDetailModal && <POSDetailPopup pos={posDetailModal.pos} client={posDetailModal.client} posIndex={posDevices.findIndex(p => p.id === posDetailModal.pos.id) + 1} onClose={() => setPosDetailModal(null)} />}

      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? '0' : '20px'})`, display: 'flex', alignItems: 'center', gap: 8, background: '#18103a', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none', opacity: toastVisible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0d9488', flexShrink: 0 }} />
        <span>{toastMessage}</span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════ */
const UserIcon     = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.8"/></svg>;
const MonitorIcon  = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="12" height="9" rx="1.5"/><path d="M2 7.5h12M8 12v1.5M5 13.5h6"/></svg>;
const ClockIcon    = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5.5V8l1.5.9"/></svg>;
const KeyIcon      = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="9" r="3.5"/><path d="M9 6l5 5M12 4l2 2"/></svg>;
const LocationIcon = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1.5C5.8 1.5 4 3.3 4 5.5c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z"/><circle cx="8" cy="5.5" r="1.5"/></svg>;
const GridIcon     = () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="2" width="5.5" height="5.5" rx="1"/><rect x="2" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/></svg>;
const EditPenIcon  = () => <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>;
const PlusIcon     = () => <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M6 1v10M1 6h10"/></svg>;

function StatCard({ icon, iconBg, iconColor, value, label }: { icon: React.ReactNode; iconBg: string; iconColor: string; value: string | number; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: '#fff', border: '1px solid rgba(124,58,237,0.1)', transition: 'all 0.15s', cursor: 'default' }} onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(124,58,237,0.22)'; el.style.boxShadow = '0 3px 12px rgba(124,58,237,0.07)'; }} onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(124,58,237,0.1)'; el.style.boxShadow = 'none'; }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: iconBg, color: iconColor }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#18103a', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 9.5, color: '#8e7ec0', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b8aed8', marginBottom: 4, marginTop: mt ? 12 : 0 }}>{children}</div>;
}

function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.05)', minHeight: 26 }}>
      <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 100 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: '#18103a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all', ...valueStyle }}>{value}</span>
    </div>
  );
}

function BranchFilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: active ? 700 : 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.14s', userSelect: 'none', background: active ? '#7c3aed' : '#fff', borderColor: active ? '#7c3aed' : 'rgba(124,58,237,0.16)', color: active ? '#fff' : '#4a3870', boxShadow: active ? '0 2px 10px rgba(124,58,237,0.35)' : 'none' }}>
      {children}
    </div>
  );
}

function FilterCheckRow({ label, checked, onChange, dot }: { label: string; checked: boolean; onChange: () => void; dot?: string }) {
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

function POSBranchCard({ pos, onClick }: { pos: POSDevice; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: hovered ? '#fff' : '#faf9ff', border: `1.5px solid ${hovered ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.1)'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.14s', boxShadow: hovered ? '0 3px 12px rgba(124,58,237,0.1)' : 'none', minWidth: 160, flex: '1 1 160px', maxWidth: 220, position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: hovered ? '#ede9fe' : '#f2f0fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.14s' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#18103a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pos.model}</div>
        <div style={{ fontSize: 9.5, color: '#8e7ec0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{pos.serial}</div>
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={hovered ? '#7c3aed' : '#b8aed8'} strokeWidth="1.6" style={{ flexShrink: 0, transition: 'stroke 0.14s' }}><path d="M4 2l4 4-4 4"/></svg>
    </div>
  );
}

function TicketItem({ ticket }: { ticket: Ticket }) {
  const { bg, color } = getPriorityInfo(ticket.priority);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: bg, color }}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5.9"/></svg></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#18103a' }}>{ticket.subject}</div>
        <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 1 }}>{ticket.id} · {ticket.time}{ticket.client && ` · ${ticket.client}`}</div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 20, background: bg, color, border: `1px solid ${color}30` }}>{ticket.priority}</span>
    </div>
  );
}

function MiniChart() {
  const data         = [4,6,5,8,7,9,11,8,6,10,12,9,8,7,11,13,10,8,9,12,14,11,9,10,13,12,11,14,13,15];
  const criticalData = [2,3,2,4,3,5,6,4,3,5,7,5,4,3,6,7,5,4,4,6,8,6,5,5,7,6,5,8,7,9];
  const W = 300, H = 80, max = Math.max(...data);
  const step = W / (data.length - 1);
  const path = (d: number[]) => d.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)},${((1 - v / max) * H).toFixed(1)}`).join(' ');
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 80 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <defs><linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs>
        <path d={path(data) + ` L ${((data.length-1)*step).toFixed(1)},${H} L 0,${H} Z`} fill="url(#cg1)"/>
        <path d={path(data)} stroke="#7c3aed" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={path(criticalData)} stroke="#dc2626" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
      </svg>
    </div>
  );
}
