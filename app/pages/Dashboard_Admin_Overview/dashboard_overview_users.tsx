'use client';

/* ==============================================================
   dashboard_overview_users.tsx  ·  Company Client Overview — Main
   FIX: Added onLogout prop → passed to <Header onLogout={onLogout} />
        For pages reached via Next.js routing (not root page.tsx),
        logout clears sessionStorage and hard-navigates to "/".
   ============================================================== */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
  Client, ClientUser, GlobalUser, Ticket, TicketGroup,
  POSDevice, PageId, SettingsSection, TicketStatus, TicketPriority,
  CLIENTS, CLIENT_USERS, GLOBAL_USERS, ALL_TICKETS,
  CLIENT_TICKET_ANALYTICS,
  ACCOUNT_MANAGERS, getCatClass, formatDate, generatePOSDevices,
  filterUsers, getPriorityInfo, formatTimeWidget,
  getInitials, getAvatarGradient, getBranchLicense,
  buildClientTrendChartPoints, getClientCategoryBarWidthPct,
  buildClientBacklogStatItems, parseTicketHoursAgo,
  computeAvgResolutionHrs, buildRealBacklog, classifySubject,
  CATEGORY_DEFS, buildRealCategories,
  isAlohaType, catBadgeStyle, catDisplayLabel,
} from './dashboard_overview_func';

import type { ClientTicketItem, ClientBacklogData, RealCategory } from './dashboard_overview_func';

import {
  OverviewPanel, TicketsPanel, UsersPanel,
} from './dashboard_overview_panels';

import EditInfoPopup      from './edit_info_popup';
import BranchDetailPopup  from './branch_detail_popup';
import POSDetailPopup     from './pos_detail_popup';
import AddBranchPopup     from './add_branch_popup';
import MSAExpirationPopup from './msa_expiration_popup';

import { EditInfoFormState } from './popup_shared';

import Sidebar from '../Sidebar_Web/sidebar';
import Header  from '../Header/header_main';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';
const SESSION_KEY         = 'gx_user_role';
const SESSION_PROFILE_KEY = 'gx_user_profile';

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
  onBack?:        () => void;
  onLogout?:      () => void;
}

/* ─── DB shape returned by GET /api/pos ─── */
interface DBPosMachine {
  id: number;
  branch_id: number;
  model: string;
  serial_number: string;
  operating_system: string;
  warranty_date: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── DB shape returned by GET /api/branches ─── */
interface DBBranch {
  id: number;
  company_id: number;
  branch_name: string;
  license_number: string | null;
  msa_start_date: string | null;
  msa_end_date: string | null;
}

/* ─── DB shape returned by GET /api/users ─── */
export interface DBUser {
  id: number;
  profile_photo: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  company_id: number | null;
  company_name: string | null;
  position_title: string | null;
  access_level: 'super_admin' | 'system_admin' | 'manager' | 'user';
  account_type: 'admin' | 'account_manager' | 'user';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/* ─── DB shape returned by GET /api/companies (index) ─── */
interface DBCompany {
  id: number;
  company_name: string;
  company_logo: string | null;
  industry_type: number | null;
  industry_title: string | null;
  contact_person: string;
  email: string;
  phone: string | null;
  account_manager: string | null;
  activation_code: string | null;
  krunch_id: number | null;
  krunch_num: string | null;
  alternate_contact_1: number | null;
  alternate_contact_2: number | null;
  created_at: string;
  alt1_name: string | null;
  alt1_email: string | null;
  alt1_phone: string | null;
  alt2_name: string | null;
  alt2_email: string | null;
  alt2_phone: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function dbIdFromPosId(posId: string): number | null {
  if (posId.startsWith('POS-DB-')) {
    const n = parseInt(posId.replace('POS-DB-', ''), 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

function posFromDBRow(
  p: DBPosMachine,
  branchName: string,
  licenseNumber: string,
  msaStart?: string,
  msaEnd?: string,
): POSDevice {
  return {
    id:           `POS-DB-${p.id}`,
    model:         p.model,
    licenseNumber,
    serial:        p.serial_number,
    os:            p.operating_system,
    branch:        branchName,
    status:       'online',
    msaStart,
    msaEnd,
    warrantyDate:  p.warranty_date ?? undefined,
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function DashboardAdmin({ initialClient, onBack, onLogout }: DashboardAdminProps = {}) {

  /* ── Default logout: clear session + hard-navigate to "/" ── */
  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_PROFILE_KEY);
      window.location.href = '/';
    }
  }, [onLogout]);

  // ── Read logged-in user profile from sessionStorage for Header ──
  const [_headerUser] = useState(() => {
    if (typeof window === 'undefined') return { initials: '', fullName: '', position: '', company: '', profilePhoto: null };
    try {
      const raw = sessionStorage.getItem(SESSION_PROFILE_KEY);
      if (!raw) return { initials: '', fullName: '', position: '', company: '', profilePhoto: null };
      const p = JSON.parse(raw);
      return {
        initials:     p.initials     ?? '',
        fullName:     p.fullName     ?? '',
        position:     p.position     ?? '',
        company:      p.company      ?? '',
        profilePhoto: p.profilePhoto ?? null,
      };
    } catch { return { initials: '', fullName: '', position: '', company: '', profilePhoto: null }; }
  });

  /* ── Core state ── */
  const [currentClient, setCurrentClient] = useState<Client>(initialClient ?? CLIENTS[0]);
  const [clients,        setClients]       = useState<Client[]>(CLIENTS);
  const [ovPanel,        setOvPanel]       = useState(0);
  const [posDevices,     setPosDevices]    = useState<POSDevice[]>([]);
  const [users,          setUsers]         = useState<GlobalUser[]>(GLOBAL_USERS);

  /* ── DB users state ── */
  const [dbUsers,        setDbUsers]       = useState<DBUser[]>([]);
  const [dbUsersLoading, setDbUsersLoading] = useState(false);

  /* ── POS / branch filter state ── */
  const [posSearch,              setPosSearch]              = useState('');
  const [showPOSFilterPanel,     setShowPOSFilterPanel]     = useState(false);
  const [activePOSBranchFilter,  setActivePOSBranchFilter]  = useState<Set<string>>(new Set());
  const [branchesLoading,        setBranchesLoading]        = useState(false);

  /* ── Ticket state ── */
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus>('open');
  const [ticketPeriod,       setTicketPeriod]       = useState<'7D' | '30D' | '90D' | 'custom'>('7D');

  /* ── User filter state ── */
  const [userSearch,          setUserSearch]          = useState('');
  const [userRoleFilters,     setUserRoleFilters]     = useState<Set<string>>(new Set());
  const [userStatusFilters,   setUserStatusFilters]   = useState<Set<string>>(new Set());
  const [userPositionFilters, setUserPositionFilters] = useState<Set<string>>(new Set());

  /* ── Modal state ── */
  const [addUserModalOpen,   setAddUserModalOpen]   = useState(false);
  const [editInfoModalOpen,  setEditInfoModalOpen]  = useState(false);
  const [editInfoForm,       setEditInfoForm]       = useState<EditInfoFormState | null>(null);
  const [branchDetailModal,  setBranchDetailModal]  = useState<{ branch: string; client: Client } | null>(null);
  const [posDetailModal,     setPosDetailModal]     = useState<{ pos: POSDevice; client: Client } | null>(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [msaModalOpen,       setMsaModalOpen]       = useState(false);

  /* ── Toast ── */
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dateTimeInfo, setDateTimeInfo] = useState(formatTimeWidget());

  const isAloha = isAlohaType(currentClient.cat);

  const clientAnalytics    = CLIENT_TICKET_ANALYTICS[currentClient.id];
  const clientTicketCounts = clientAnalytics
    ? { open: clientAnalytics.tickets.open.length, pending: clientAnalytics.tickets.pending.length, closed: clientAnalytics.tickets.closed.length }
    : { open: 0, pending: 0, closed: 0 };

  const clientUsers_filtered = users.filter(u => u.company === currentClient.name);
  const clientDbUsers = dbUsers.filter(u => u.company_id === currentClient.id);

  const ovSwipe = useSwipe(
    () => setOvPanel(p => Math.min(2, p + 1)),
    () => setOvPanel(p => Math.max(0, p - 1)),
  );

  /* ── Clock ── */
  useEffect(() => {
    const t = setInterval(() => setDateTimeInfo(formatTimeWidget()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Reset on client change ── */
  useEffect(() => {
    if (initialClient) {
      setCurrentClient(initialClient);
      setPosDevices([]);
      setOvPanel(0);
      setActivePOSBranchFilter(new Set());
      setPosSearch('');
      setUserRoleFilters(new Set());
      setUserStatusFilters(new Set());
      setUserPositionFilters(new Set());
    }
  }, [initialClient]);

  /* ══════════════════════════════════════════════════════════════
     FETCH COMPANY DETAIL (krunch_num + activation_code)
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!currentClient?.id) return;

    fetch(`${API_BASE}/api/companies`, { headers: { Accept: 'application/json' } })
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data: { success: boolean; data: DBCompany[] }) => {
        if (!data.success) return;

        const row = data.data.find(c => c.id === currentClient.id);
        if (!row) return;

        const krunchNum      = row.krunch_num      ?? undefined;
        const activationCode = row.activation_code ?? undefined;

        const needsUpdate =
          krunchNum      !== currentClient.krunchNum ||
          activationCode !== currentClient.saStart;

        if (!needsUpdate) return;

        const updated: Client = { ...currentClient, krunchNum, saStart: activationCode };
        setCurrentClient(updated);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
      })
      .catch(err => console.error('[CompanyFetch] krunch/activation hydration failed:', err));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient.id]);

  /* ══════════════════════════════════════════════════════════════
     FETCH DB USERS
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    setDbUsersLoading(true);
    fetch(`${API_BASE}/api/users`, { headers: { 'Accept': 'application/json' } })
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data: { success: boolean; data: DBUser[] }) => {
        if (data.success) setDbUsers(data.data);
      })
      .catch(err => console.error('[UsersFetch] failed:', err))
      .finally(() => setDbUsersLoading(false));
  }, []);

  /* ══════════════════════════════════════════════════════════════
     FETCH BRANCHES + POS FROM DB
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!currentClient?.id) return;
    setBranchesLoading(true);

    fetch(`${API_BASE}/api/branches?company_id=${currentClient.id}`, {
      headers: { 'Accept': 'application/json' },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then(async (data: { success: boolean; branches: DBBranch[] }) => {
        if (!data.success) return;

        const branchNames: string[]                                          = [];
        const blMap:  Record<string, string>                                 = {};
        const bmMap:  Record<string, { msaStart?: string; msaEnd?: string }> = {};
        const branchIds: Record<string, number>                              = {};

        data.branches.forEach(b => {
          branchNames.push(b.branch_name);
          branchIds[b.branch_name] = b.id;
          if (b.license_number)
            blMap[b.branch_name] = b.license_number;
          if (b.msa_start_date || b.msa_end_date)
            bmMap[b.branch_name] = {
              msaStart: b.msa_start_date ?? undefined,
              msaEnd:   b.msa_end_date   ?? undefined,
            };
        });

        const updated: Client = {
          ...currentClient,
          branches:       branchNames,
          branchIds,
          branchLicenses: Object.keys(blMap).length > 0 ? blMap : currentClient.branchLicenses,
          branchMsaDates: Object.keys(bmMap).length > 0 ? bmMap : currentClient.branchMsaDates,
        };
        setCurrentClient(updated);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));

        const allPOS: POSDevice[] = [];

        await Promise.all(
          data.branches.map(async branch => {
            try {
              const posRes = await fetch(
                `${API_BASE}/api/pos?branch_id=${branch.id}`,
                { headers: { 'Accept': 'application/json' } },
              );
              if (!posRes.ok) return;
              const posData: { success: boolean; pos_machines: DBPosMachine[] } = await posRes.json();
              if (!posData.success) return;

              const licenseNumber = blMap[branch.branch_name] || updated.licenseId || '';

              posData.pos_machines.forEach(p => {
                allPOS.push(posFromDBRow(
                  p,
                  branch.branch_name,
                  licenseNumber,
                  branch.msa_start_date ?? undefined,
                  branch.msa_end_date   ?? undefined,
                ));
              });
            } catch (err) {
              console.error(`[POSFetch] failed for branch "${branch.branch_name}":`, err);
            }
          }),
        );

        setPosDevices(allPOS);
      })
      .catch(err => console.error('[BranchFetch] failed:', err))
      .finally(() => setBranchesLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient.id]);

  /* ── Toast ── */
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg); setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2800);
  }, []);

  /* ── Edit Info ── */
  const openEditInfoModal = (client: Client) => {
    const alts = client.altContact
      ? [{ name: client.altContact, email: client.altEmail || '', phone: client.altPhone || '' }]
      : [];
    if (client.altContact2) alts.push({ name: client.altContact2, email: client.altEmail2 || '', phone: client.altPhone2 || '' });
    setEditInfoForm({
      storeName:    client.name,
      contact:      client.contact,
      email:        client.email,
      phone:        client.phone || '',
      altContacts:  alts,
      site:         client.site || '',
      seats:        String(client.seats || ''),
      keysPerStore: String(client.keysPerStore || ''),
      licenseId:    client.licenseId || '',
      saStart:      client.saStart   || '',
      saEnd:        client.saEnd     || '',
      krunchNum:    client.krunchNum || '',
      logoUrl:      typeof client.logo === 'string' ? client.logo : '',
      logoFile:     undefined,
    });
    setEditInfoModalOpen(true);
  };

  const handleSaveEditInfo = () => {
    if (!editInfoForm || !currentClient) return;
    const alt0 = editInfoForm.altContacts[0];
    const alt1 = editInfoForm.altContacts[1];
    const updated: Client = {
      ...currentClient,
      name:         editInfoForm.storeName,
      contact:      editInfoForm.contact,
      email:        editInfoForm.email,
      phone:        editInfoForm.phone,
      altContact:   alt0?.name  || undefined,
      altEmail:     alt0?.email || undefined,
      altPhone:     alt0?.phone || undefined,
      altContact2:  alt1?.name  || undefined,
      altEmail2:    alt1?.email || undefined,
      altPhone2:    alt1?.phone || undefined,
      site:         editInfoForm.site,
      seats:        parseInt(editInfoForm.seats) || 0,
      keysPerStore: editInfoForm.keysPerStore ? parseInt(editInfoForm.keysPerStore) : undefined,
      licenseId:    editInfoForm.licenseId  || undefined,
      saStart:      editInfoForm.saStart    || undefined,
      saEnd:        editInfoForm.saEnd      || undefined,
      krunchNum:    editInfoForm.krunchNum  || undefined,
      logo:         editInfoForm.logoUrl    || currentClient.logo,
    };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setEditInfoModalOpen(false);
    showToast('Client information updated successfully!');
  };

  /* ══════════════════════════════════════════════════════════════
     BRANCH HANDLERS
  ══════════════════════════════════════════════════════════════ */

  const refreshBranchesFromDB = async (forClient: Client) => {
    try {
      const res  = await fetch(`${API_BASE}/api/branches?company_id=${forClient.id}`, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!res.ok || !data.success) return;

      const branchNames: string[]                                          = [];
      const blMap:  Record<string, string>                                 = {};
      const bmMap:  Record<string, { msaStart?: string; msaEnd?: string }> = {};
      const branchIds: Record<string, number>                              = {};

      (data.branches as DBBranch[]).forEach(b => {
        branchNames.push(b.branch_name);
        branchIds[b.branch_name] = b.id;
        if (b.license_number) blMap[b.branch_name] = b.license_number;
        if (b.msa_start_date || b.msa_end_date)
          bmMap[b.branch_name] = { msaStart: b.msa_start_date ?? undefined, msaEnd: b.msa_end_date ?? undefined };
      });

      const refreshed: Client = {
        ...forClient,
        branches:       branchNames,
        branchIds,
        branchLicenses: Object.keys(blMap).length > 0 ? blMap : forClient.branchLicenses,
        branchMsaDates: Object.keys(bmMap).length > 0 ? bmMap : forClient.branchMsaDates,
      };
      setClients(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      setCurrentClient(refreshed);

      const allPOS: POSDevice[] = [];
      await Promise.all(
        (data.branches as DBBranch[]).map(async branch => {
          try {
            const posRes  = await fetch(`${API_BASE}/api/pos?branch_id=${branch.id}`, { headers: { 'Accept': 'application/json' } });
            const posData: { success: boolean; pos_machines: DBPosMachine[] } = await posRes.json();
            if (!posData.success) return;
            const licenseNumber = blMap[branch.branch_name] || refreshed.licenseId || '';
            posData.pos_machines.forEach(p => {
              allPOS.push(posFromDBRow(p, branch.branch_name, licenseNumber, branch.msa_start_date ?? undefined, branch.msa_end_date ?? undefined));
            });
          } catch (err) {
            console.error(`[POSFetch] refresh failed for branch "${branch.branch_name}":`, err);
          }
        }),
      );
      setPosDevices(allPOS);

    } catch (err) { console.error('[BranchFetch] refresh failed:', err); }
  };

  const handleAddBranch = (branchName: string, license?: string, msaStart?: string, msaEnd?: string) => {
    if (!branchName || !currentClient) return;
    const updatedBranchLicenses = isAloha && license
      ? { ...(currentClient.branchLicenses || {}), [branchName]: license }
      : currentClient.branchLicenses;
    const updatedBranchMsaDates = (msaStart || msaEnd)
      ? { ...(currentClient.branchMsaDates || {}), [branchName]: { msaStart, msaEnd } }
      : currentClient.branchMsaDates;
    const updated: Client = {
      ...currentClient,
      branches:       [...(currentClient.branches || []), branchName],
      branchLicenses: updatedBranchLicenses,
      branchMsaDates: updatedBranchMsaDates,
    };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setShowAddBranchModal(false);
    showToast(`Branch "${branchName}" added!`);
    refreshBranchesFromDB(updated);
  };

  const handleDeleteBranch = (branchName: string) => {
    if (!currentClient) return;
    const removedPOSCount = posDevices.filter(p => p.branch === branchName).length;
    setPosDevices(prev => prev.filter(p => p.branch !== branchName));
    const updated: Client = {
      ...currentClient,
      branches:       (currentClient.branches || []).filter(b => b !== branchName),
      branchIds:      currentClient.branchIds ? Object.fromEntries(Object.entries(currentClient.branchIds).filter(([k]) => k !== branchName)) : undefined,
      branchLicenses: currentClient.branchLicenses ? Object.fromEntries(Object.entries(currentClient.branchLicenses).filter(([k]) => k !== branchName)) : undefined,
      branchMsaDates: currentClient.branchMsaDates ? Object.fromEntries(Object.entries(currentClient.branchMsaDates).filter(([k]) => k !== branchName)) : undefined,
      posCount:       Math.max(0, currentClient.posCount - removedPOSCount),
    };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setActivePOSBranchFilter(prev => { const next = new Set(prev); next.delete(branchName); return next; });
    showToast(`Branch "${branchName}" deleted.`);
  };

  /* ══════════════════════════════════════════════════════════════
     POS HANDLERS
  ══════════════════════════════════════════════════════════════ */

  const handleAddPOSFromBranch = async (branch: string, posData: any) => {
    if (!currentClient) return;

    const branchDbId = currentClient.branchIds?.[branch];
    if (!branchDbId) {
      showToast('Branch ID not found — cannot save POS to database.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/pos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          branch_id:        branchDbId,
          model:            posData.model            || 'PAX A920',
          serial_number:    posData.serial           || '',
          operating_system: posData.os               || 'Windows 10',
          warranty_date:    posData.warrantyDate     || null,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      const p: DBPosMachine = result.pos_machine;
      const licenseNumber   = posData.licenseNumber || getBranchLicense(currentClient, branch) || '';

      const newPOS: POSDevice = {
        id:           `POS-DB-${p.id}`,
        model:         p.model,
        licenseNumber,
        serial:        p.serial_number,
        os:            p.operating_system,
        branch,
        status:       'online',
        msaStart:      posData.msaStart    || undefined,
        msaEnd:        posData.msaEnd      || undefined,
        warrantyDate:  p.warranty_date     || undefined,
      };

      setPosDevices(prev => [...prev, newPOS]);
      const updated: Client = { ...currentClient, posCount: currentClient.posCount + 1 };
      setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
      setCurrentClient(updated);
      showToast(`POS added to "${branch}"!`);

    } catch (err: any) {
      console.error('[handleAddPOSFromBranch]', err);
      showToast(`Failed to add POS: ${err.message}`);
    }
  };

  const handleEditPOS = async (posId: string, posData: any) => {
    const dbId = dbIdFromPosId(posId);

    if (dbId !== null) {
      try {
        const res = await fetch(`${API_BASE}/api/pos/${dbId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            model:            posData.model,
            serial_number:    posData.serial,
            operating_system: posData.os,
            warranty_date:    posData.warrantyDate || null,
          }),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
      } catch (err: any) {
        console.error('[handleEditPOS]', err);
        showToast(`Failed to update POS: ${err.message}`);
        return;
      }
    }

    setPosDevices(prev =>
      prev.map(p =>
        p.id === posId
          ? { ...p, model: posData.model, licenseNumber: posData.licenseNumber, serial: posData.serial, os: posData.os, msaStart: posData.msaStart || undefined, msaEnd: posData.msaEnd || undefined, warrantyDate: posData.warrantyDate || undefined }
          : p,
      ),
    );
    showToast('POS device updated successfully!');
  };

  const handleRemovePOS = async (posId: string) => {
    if (!currentClient) return;
    const dbId = dbIdFromPosId(posId);

    if (dbId !== null) {
      try {
        const res = await fetch(`${API_BASE}/api/pos/${dbId}`, {
          method:  'DELETE',
          headers: { 'Accept': 'application/json' },
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
      } catch (err: any) {
        console.error('[handleRemovePOS]', err);
        showToast(`Failed to remove POS: ${err.message}`);
        return;
      }
    }

    setPosDevices(prev => prev.filter(p => p.id !== posId));
    const updated: Client = { ...currentClient, posCount: Math.max(0, currentClient.posCount - 1) };
    setClients(prev => prev.map(c => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    showToast('POS device removed.');
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <Sidebar />

      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'var(--gxh-sw, 220px)', minHeight: '100vh', marginTop: 54, transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        {/* ── FIX: pass handleLogout + _headerUser so Header shows logged-in user ── */}
        <Header
          user={_headerUser}
          onLogout={handleLogout}
        />

        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 60% 50% at 0% 0%, rgba(124,58,237,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 100% 100%, rgba(13,148,136,0.05) 0%, transparent 60%), #f8f7ff` }} />
        <canvas id="rc" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100vh' }}>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '20px 28px 50px', overflow: 'hidden', zIndex: 2, fontFamily: "'DM Sans', sans-serif" }}>

              {/* ── Page Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
                {onBack && (
                  <button onClick={onBack}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.15)', color: '#4a3870', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.3)'; el.style.color = '#7c3aed'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.15)'; el.style.color = '#4a3870'; }}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12"><path d="M9 2L4 7l5 5"/></svg>
                    Back
                  </button>
                )}

                {currentClient.logo && (
                  <div style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: '#fff', border: '1px solid rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <img src={currentClient.logo} alt={currentClient.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                    <div key={i} onClick={() => setOvPanel(i)}
                      style={{ height: 6, borderRadius: i === ovPanel ? 3 : '50%', cursor: 'pointer', width: i === ovPanel ? 18 : 6, background: i === ovPanel ? '#7c3aed' : 'rgba(124,58,237,0.2)', transition: 'all 220ms' }} />
                  ))}
                </div>

                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />

                <span style={{ ...catBadgeStyle(currentClient.cat), fontSize: 10, padding: '4px 12px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {catDisplayLabel(currentClient.cat)}
                </span>
              </div>

              {/* ── Swipe container ── */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }} {...ovSwipe}>
                <div style={{ display: 'flex', height: '100%', transform: `translateX(-${ovPanel * 100}%)`, transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)' }}>

                  <OverviewPanel
                    currentClient={currentClient}
                    clientUsers_filtered={clientUsers_filtered}
                    posDevices={posDevices}
                    clientTicketCounts={clientTicketCounts}
                    isAloha={isAloha}
                    posSearch={posSearch}
                    setPosSearch={setPosSearch}
                    showPOSFilterPanel={showPOSFilterPanel}
                    setShowPOSFilterPanel={setShowPOSFilterPanel}
                    activePOSBranchFilter={activePOSBranchFilter}
                    setActivePOSBranchFilter={setActivePOSBranchFilter}
                    branchesLoading={branchesLoading}
                    setOvPanel={setOvPanel}
                    setShowAddBranchModal={setShowAddBranchModal}
                    setMsaModalOpen={setMsaModalOpen}
                    setBranchDetailModal={setBranchDetailModal}
                    setPosDetailModal={setPosDetailModal}
                    openEditInfoModal={openEditInfoModal}
                  />

                  <TicketsPanel
                    currentClient={currentClient}
                    clientTicketCounts={clientTicketCounts}
                    ticketStatusFilter={ticketStatusFilter}
                    setTicketStatusFilter={setTicketStatusFilter}
                    ticketPeriod={ticketPeriod}
                    setTicketPeriod={setTicketPeriod}
                    showToast={showToast}
                  />

                  <UsersPanel
                    currentClient={currentClient}
                    clients={clients}
                    users={users}
                    dbUsers={clientDbUsers}
                    dbUsersLoading={dbUsersLoading}
                    userSearch={userSearch}
                    setUserSearch={setUserSearch}
                    userRoleFilters={userRoleFilters}
                    userStatusFilters={userStatusFilters}
                    userPositionFilters={userPositionFilters}
                    setUserRoleFilters={setUserRoleFilters}
                    setUserStatusFilters={setUserStatusFilters}
                    setUserPositionFilters={setUserPositionFilters}
                    setAddUserModalOpen={setAddUserModalOpen}
                    showToast={showToast}
                    onRefreshUsers={() => {
                      setDbUsersLoading(true);
                      fetch(`${API_BASE}/api/users`, { headers: { 'Accept': 'application/json' } })
                        .then(r => r.json())
                        .then((d: { success: boolean; data: DBUser[] }) => { if (d.success) setDbUsers(d.data); })
                        .catch(err => console.error('[UsersFetch] refresh failed:', err))
                        .finally(() => setDbUsersLoading(false));
                    }}
                  />

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════ POPUP MODALS ════ */}
      {editInfoModalOpen && editInfoForm && currentClient && (
        <EditInfoPopup client={currentClient} form={editInfoForm} onChange={setEditInfoForm} onSaved={handleSaveEditInfo} onClose={() => setEditInfoModalOpen(false)} />
      )}
      {branchDetailModal && (
        <BranchDetailPopup
          branch={branchDetailModal.branch}
          client={branchDetailModal.client}
          posDevices={posDevices}
          branchMsaStart={branchDetailModal.client.branchMsaDates?.[branchDetailModal.branch]?.msaStart}
          branchMsaEnd={branchDetailModal.client.branchMsaDates?.[branchDetailModal.branch]?.msaEnd}
          onClose={() => setBranchDetailModal(null)}
          onAddPOS={handleAddPOSFromBranch}
          onEditPOS={handleEditPOS}
          onRemovePOS={handleRemovePOS}
          onDeleteBranch={handleDeleteBranch}
        />
      )}
      {posDetailModal && (
        <POSDetailPopup pos={posDetailModal.pos} client={posDetailModal.client} posIndex={posDevices.findIndex(p => p.id === posDetailModal.pos.id) + 1} onClose={() => setPosDetailModal(null)} />
      )}
      {showAddBranchModal && (
        <AddBranchPopup client={currentClient} onAdd={handleAddBranch} onClose={() => setShowAddBranchModal(false)} />
      )}
      {msaModalOpen && (
        <MSAExpirationPopup client={currentClient} posDevices={posDevices} onClose={() => setMsaModalOpen(false)} />
      )}

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? '0' : '20px'})`, display: 'flex', alignItems: 'center', gap: 8, background: '#18103a', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none', opacity: toastVisible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0d9488', flexShrink: 0 }} />
        <span>{toastMessage}</span>
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </>
  );
}