/* ==============================================================
   DASHBOARD ADMIN PAGE ·  DashboardAdmin.tsx
   ============================================================== */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DashboardAdminStyles.css';

import {
  Client, ClientUser, Course, GlobalUser, Ticket, TicketGroup,
  POSDevice, LicenseItem, StatsBarData,
  PageId, LicPeriod, SettingsSection, TicketStatus, HealthLevel,
  CLIENTS, CLIENT_USERS, GLOBAL_USERS, COURSES, ALL_TICKETS,
  SETTINGS_SECTIONS, ACCOUNT_MANAGERS,
  getInitials, getCatClass, getLogoWrapClass, getHealthLabel,
  getHealthDotClass, formatDate, getDaysLeft, getLicenseStatus,
  computeStatsBarData, filterClients, computeLicenseExpiry,
  generatePOSDevices, filterUsers, filterCourses, getCourseCategories,
  computeLCHeroStats, formatTimeWidget, buildNewUser, buildNewCourse,
  buildNewClient, getPriorityInfo,
} from './DshAdmFunc';

import Sidebar from '../Sidebar_Web/sidebar';
import Header from '../Header_Web/header';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface AltContact {
  name: string;
  email: string;
  phone: string;
}

interface SiteSeat {
  name: string;
  seats: string;
}

interface FnbBranch {
  name: string;
  keysPerStore: string;
}

interface EditInfoFormState {
  storeName: string;
  contact: string;
  email: string;
  phone: string;
  altContacts: AltContact[];
  site: string;
  seats: string;
  keysPerStore: string;
  licenseId: string;
  saStart: string;
  saEnd: string;
  krunchNum: string;
}

interface AddClientFormState {
  logoUrl: string;
  logoPreview: string;
  name: string;
  cat: string;
  contact: string;
  email: string;
  phone: string;
  accountManager: string;
  altContacts: AltContact[];
  /* Retail / Warehouse — multi-site */
  siteSeats: SiteSeat[];
  /* F&B — multi-branch with keys */
  fnbBranches: FnbBranch[];
}

const BLANK_ADD_CLIENT: AddClientFormState = {
  logoUrl: '',
  logoPreview: '',
  name: '',
  cat: '',
  contact: '',
  email: '',
  phone: '',
  accountManager: '',
  altContacts: [],
  siteSeats: [],
  fnbBranches: [],
};

/* ─────────────────────────────────────────────
   SWIPE HOOK
───────────────────────────────────────────── */
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 50) {
  const startX = useRef<number | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => { startX.current = e.clientX; }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < threshold) return;
    if (dx < 0) onSwipeLeft(); else onSwipeRight();
  }, [onSwipeLeft, onSwipeRight, threshold]);
  const onPointerLeave = useCallback(() => { startX.current = null; }, []);
  return { onPointerDown, onPointerUp, onPointerLeave };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function DashboardAdmin() {
  const [currentPage, setCurrentPage] = useState<PageId>('customers');
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeHealthFilters, setActiveHealthFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [cdbPanel, setCdbPanel] = useState(0);
  const [ovPanel, setOvPanel] = useState(0);
  const [posDevices, setPosDevices] = useState<POSDevice[]>([]);
  const [clientUsers, setClientUsers] = useState<Record<number, ClientUser[]>>(CLIENT_USERS);
  const [activePOSBranchFilter, setActivePOSBranchFilter] = useState<Set<string>>(new Set());
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus>('open');
  const [licPeriod, setLicPeriod] = useState<LicPeriod>('all');
  const [licCustomFrom, setLicCustomFrom] = useState<string | null>(null);
  const [licCustomTo, setLicCustomTo] = useState<string | null>(null);
  const [licSearchQuery, setLicSearchQuery] = useState('');
  const [licStatusFilters, setLicStatusFilters] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<GlobalUser[]>(GLOBAL_USERS);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilters, setUserRoleFilters] = useState<Set<string>>(new Set());
  const [userStatusFilters, setUserStatusFilters] = useState<Set<string>>(new Set());
  const [userCompanyFilters, setUserCompanyFilters] = useState<Set<string>>(new Set());
  const [showUserFilterPanel, setShowUserFilterPanel] = useState(false);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [lcPanel, setLcPanel] = useState(0);
  const [lcSearch, setLcSearch] = useState('');
  const [lcActiveCat, setLcActiveCat] = useState('All');
  const [lcEnrollFilter, setLcEnrollFilter] = useState('All');
  const [showLcFilter, setShowLcFilter] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('general');
  const [settingsToggles, setSettingsToggles] = useState({
    emailNotifs: true, smsAlerts: false, twoFactor: true,
    autoLogout: true, darkMode: false, compactView: false, showAnalytics: true,
  });

  /* ── Modals ── */
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [addClientForm, setAddClientForm] = useState<AddClientFormState>(BLANK_ADD_CLIENT);

  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ fname: '', lname: '', email: '', role: '', company: '', position: '', phone: '' });
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [createCourseForm, setCreateCourseForm] = useState({ title: '', desc: '', cat: '', duration: '', thumbUrl: '' });

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateTimeInfo, setDateTimeInfo] = useState(formatTimeWidget());
  const [selectedCourseCompanies, setSelectedCourseCompanies] = useState<Set<string>>(new Set());
  const [ccIndustryFilter, setCcIndustryFilter] = useState('All');

  const [editInfoModalOpen, setEditInfoModalOpen] = useState(false);
  const [editInfoForm, setEditInfoForm] = useState<EditInfoFormState | null>(null);
  const [branchDetailModal, setBranchDetailModal] = useState<{ branch: string; client: Client } | null>(null);

  /* ── POS Detail Modal ── */
  const [posDetailModal, setPosDetailModal] = useState<{ pos: POSDevice; client: Client } | null>(null);

  /* ── POS Search & Filter ── */
  const [posSearch, setPosSearch] = useState('');
  const [showPOSFilterPanel, setShowPOSFilterPanel] = useState(false);

  /* ── Add Branch inline ── */
  const [showAddBranchInput, setShowAddBranchInput] = useState(false);
  const [addBranchName, setAddBranchName] = useState('');

  const cdbSwipe = useSwipe(() => setCdbPanel((p) => Math.min(1, p + 1)), () => setCdbPanel((p) => Math.max(0, p - 1)));
  const ovSwipe = useSwipe(() => setOvPanel((p) => Math.min(2, p + 1)), () => setOvPanel((p) => Math.max(0, p - 1)));
  const lcSwipe = useSwipe(() => setLcPanel((p) => Math.min(1, p + 1)), () => setLcPanel((p) => Math.max(0, p - 1)));

  useEffect(() => {
    const timer = setInterval(() => setDateTimeInfo(formatTimeWidget()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2800);
  }, []);

  const goToPage = useCallback((page: PageId) => { setCurrentPage(page); }, []);

  const getPageState = (page: PageId) => {
    if (page === currentPage) return 'state-active';
    const order: PageId[] = ['customers', 'overview', 'learning', 'analytics', 'users', 'settings'];
    return order.indexOf(page) < order.indexOf(currentPage) ? 'state-left' : 'state-right';
  };

  const filteredClients = filterClients(clients, activeCategories, activeHealthFilters, searchQuery);
  const statsData: StatsBarData = computeStatsBarData(clients);

  const toggleCategoryFilter = (cat: string) => {
    setActiveCategories((prev) => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; });
  };
  const toggleHealthFilter = (level: string) => {
    setActiveHealthFilters((prev) => { const next = new Set(prev); next.has(level) ? next.delete(level) : next.add(level); return next; });
  };

  const openOverview = (client: Client) => {
    setCurrentClient(client);
    setOvPanel(0);
    setPosDevices(generatePOSDevices(client));
    setActivePOSBranchFilter(new Set());
    setPosSearch('');
    setShowPOSFilterPanel(false);
    setTicketStatusFilter('open');
    setShowAddBranchInput(false);
    setAddBranchName('');
    if (!clientUsers[client.id]) {
      setClientUsers((prev) => ({
        ...prev,
        [client.id]: [{ name: client.contact, email: client.email, role: 'System Admin', status: 'Active', branch: client.branches?.[0] || 'Main', position: 'Primary Contact' }],
      }));
    }
    goToPage('overview');
  };

  const openEditInfoModal = (client: Client) => {
    const alts: AltContact[] = [];
    if (client.altContact) {
      alts.push({ name: client.altContact, email: client.altEmail || '', phone: client.altPhone || '' });
    }
    setEditInfoForm({
      storeName: client.name,
      contact: client.contact,
      email: client.email,
      phone: client.phone || '',
      altContacts: alts,
      site: client.site || '',
      seats: String(client.seats || ''),
      keysPerStore: String(client.keysPerStore || ''),
      licenseId: client.licenseId || '',
      saStart: client.saStart || '',
      saEnd: client.saEnd || '',
      krunchNum: client.krunchNum || '',
    });
    setEditInfoModalOpen(true);
  };

  const handleSaveEditInfo = () => {
    if (!editInfoForm || !currentClient) return;
    const alt0 = editInfoForm.altContacts[0];
    const updated: Client = {
      ...currentClient,
      name: editInfoForm.storeName,
      contact: editInfoForm.contact,
      email: editInfoForm.email,
      phone: editInfoForm.phone,
      altContact: alt0?.name || undefined,
      altEmail: alt0?.email || undefined,
      altPhone: alt0?.phone || undefined,
      site: editInfoForm.site,
      seats: parseInt(editInfoForm.seats) || 0,
      keysPerStore: editInfoForm.keysPerStore ? parseInt(editInfoForm.keysPerStore) : undefined,
      licenseId: editInfoForm.licenseId || undefined,
      saStart: editInfoForm.saStart || undefined,
      saEnd: editInfoForm.saEnd || undefined,
      krunchNum: editInfoForm.krunchNum || undefined,
    };
    setClients((prev) => prev.map((c) => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setEditInfoModalOpen(false);
    showToast('Client information updated successfully!');
  };

  /* ── Add Branch ── */
  const handleAddBranch = () => {
    if (!addBranchName.trim() || !currentClient) return;
    const updated: Client = {
      ...currentClient,
      branches: [...(currentClient.branches || []), addBranchName.trim()],
    };
    setClients((prev) => prev.map((c) => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    setAddBranchName('');
    setShowAddBranchInput(false);
    showToast(`Branch "${addBranchName.trim()}" added!`);
  };

  /* ── Add POS from branch modal ── */
  const handleAddPOSFromBranch = (branch: string, posData: {
    model: string; serial: string; ip: string; os: string;
    msaStart?: string; msaEnd?: string; warrantyDate?: string;
  }) => {
    if (!currentClient) return;
    const newPOS: POSDevice = {
      id: `POS-${currentClient.id}-${String(Date.now()).slice(-5)}`,
      model: posData.model || 'PAX A920',
      serial: posData.serial || `SN${Date.now()}`,
      ip: posData.ip || '192.168.0.1',
      os: posData.os || 'Windows 10',
      branch,
      status: 'online',
      msaStart: posData.msaStart || undefined,
      msaEnd: posData.msaEnd || undefined,
      warrantyDate: posData.warrantyDate || undefined,
    };
    setPosDevices((prev) => [...prev, newPOS]);
    const updated: Client = { ...currentClient, posCount: currentClient.posCount + 1 };
    setClients((prev) => prev.map((c) => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    showToast(`POS added to "${branch}"!`);
  };

  /* ── Edit POS from branch modal ── */
  const handleEditPOS = (posId: string, posData: {
    model: string; serial: string; ip: string; os: string;
    msaStart?: string; msaEnd?: string; warrantyDate?: string;
  }) => {
    setPosDevices((prev) => prev.map((p) =>
      p.id === posId
        ? { ...p, ...posData, msaStart: posData.msaStart || undefined, msaEnd: posData.msaEnd || undefined, warrantyDate: posData.warrantyDate || undefined }
        : p
    ));
    showToast('POS device updated successfully!');
  };

  /* ── Remove POS from branch modal ── */
  const handleRemovePOS = (posId: string) => {
    if (!currentClient) return;
    setPosDevices((prev) => prev.filter((p) => p.id !== posId));
    const updated: Client = { ...currentClient, posCount: Math.max(0, currentClient.posCount - 1) };
    setClients((prev) => prev.map((c) => c.id === currentClient.id ? updated : c));
    setCurrentClient(updated);
    showToast('POS device removed.');
  };

  /* ── Add Company ── */
  const handleAddClient = () => {
    const f = addClientForm;
    const isFnB = f.cat === 'F&B';

    const branchNames = isFnB
      ? f.fnbBranches.map((b) => b.name.trim()).filter(Boolean)
      : f.siteSeats.map((s) => s.name.trim()).filter(Boolean);

    const totalSeats = isFnB ? 0 : f.siteSeats.reduce((sum, s) => sum + (parseInt(s.seats) || 0), 0);
    const keysPerStore = isFnB && f.fnbBranches.length > 0 ? parseInt(f.fnbBranches[0].keysPerStore) || 0 : undefined;
    const firstSite = isFnB ? (f.fnbBranches[0]?.name || '') : (f.siteSeats[0]?.name || '');

    const newClient = buildNewClient(
      f.name, f.contact, f.email, f.phone, f.cat,
      firstSite, totalSeats, f.accountManager,
      f.logoUrl,
      f.altContacts.filter(a => a.name.trim()),
      isFnB ? keysPerStore : undefined,
    );
    if (!newClient) { showToast('Please fill in all required fields.'); return; }

    if (branchNames.length > 0) {
      (newClient as any).branches = branchNames;
    }

    setClients((prev) => [newClient, ...prev]);
    setAddClientModalOpen(false);
    setAddClientForm(BLANK_ADD_CLIENT);
    showToast(`Company "${newClient.name}" added successfully!`);
  };

  const openAddClientModal = () => {
    setAddClientForm(BLANK_ADD_CLIENT);
    setAddClientModalOpen(true);
  };

  const handleAddUser = () => {
    const newUser = buildNewUser(addUserForm.fname, addUserForm.lname, addUserForm.email, addUserForm.role, addUserForm.company, addUserForm.position, addUserForm.phone);
    if (!newUser) { showToast('Please fill in all required fields.'); return; }
    setUsers((prev) => [newUser, ...prev]);
    setAddUserModalOpen(false);
    setAddUserForm({ fname: '', lname: '', email: '', role: '', company: '', position: '', phone: '' });
    showToast(`User "${newUser.name}" added successfully!`);
  };

  const handleCreateCourse = () => {
    const newCourse = buildNewCourse(createCourseForm.title, createCourseForm.desc, createCourseForm.cat, createCourseForm.duration, createCourseForm.thumbUrl, Array.from(selectedCourseCompanies));
    if (!newCourse) { showToast('Please fill in all required fields.'); return; }
    setCourses((prev) => [...prev, newCourse]);
    setCreateCourseModalOpen(false);
    setCreateCourseForm({ title: '', desc: '', cat: '', duration: '', thumbUrl: '' });
    setSelectedCourseCompanies(new Set());
    const assignMsg = newCourse.companies?.length ? ` Assigned to: ${newCourse.companies.slice(0, 2).join(', ')}${newCourse.companies.length > 2 ? ` +${newCourse.companies.length - 2} more.` : '.'}` : ' Available to all companies.';
    showToast(`Course "${newCourse.title}" published!${assignMsg}`);
  };

  const licenseItems = computeLicenseExpiry(clients, licPeriod, licCustomFrom, licCustomTo);
  const filteredLicenseItems: LicenseItem[] = licenseItems
    .filter((c) => licStatusFilters.size === 0 || licStatusFilters.has(c._status))
    .filter((c) => !licSearchQuery.trim() || c.name.toLowerCase().includes(licSearchQuery.toLowerCase()));
  const licStats = {
    expired: licenseItems.filter((c) => c._status === 'expired').length,
    critical: licenseItems.filter((c) => c._status === 'critical').length,
    warning: licenseItems.filter((c) => c._status === 'warning').length,
    upcoming: licenseItems.filter((c) => c._status === 'upcoming').length,
  };

  const filteredCourses = filterCourses(courses, lcActiveCat, lcEnrollFilter, lcSearch);
  const courseCategories = getCourseCategories(courses);
  const lcHeroStats = computeLCHeroStats(courses);
  const enrolledCourses = courses.filter((c) => c.enrolled);

  const toggleEnrollCourse = (title: string) => {
    setCourses((prev) => prev.map((c) => c.title === title ? { ...c, enrolled: !c.enrolled, progress: !c.enrolled ? 0 : c.progress } : c));
  };

  const filteredUsers = filterUsers(users, userRoleFilters, userStatusFilters, userCompanyFilters, userSearch);
  const uniqueCompanies = Array.from(new Set(users.map((u) => u.company)));

  const filteredCcCompanies = clients.filter((c) => ccIndustryFilter === 'All' || c.cat === ccIndustryFilter);
  const toggleCcCompany = (name: string) => {
    setSelectedCourseCompanies((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  };

  return (
    <>
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'var(--gxh-sw, 220px)', minHeight: '100vh', marginTop: 54, transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <Header />
        <div className="amb" />
        <canvas id="rc" />
        <div className="da-main">
          <div className="pages-wrap">

            {/* PAGE: COMPANY DATABASE */}
            <div className={`page ${getPageState('customers')}`} id="page-customers">
              <div className="ph">
                <h1 className="ph-title">Company <em>Database</em></h1>
                <div id="cdb-dots" className="tab-dots">
                  <span className="tab-label">{cdbPanel === 0 ? 'Company Database' : 'License Expiry'}</span>
                  {[0, 1].map((i) => (<div key={i} className={`tab-dot${i === cdbPanel ? ' active' : ''}`} onClick={() => setCdbPanel(i)} />))}
                </div>
                <div className="ph-rule" />
                <div className="ph-actions">
                  {cdbPanel === 0 && (
                    <button className="btn btn-p" onClick={openAddClientModal} style={{ gap: 7, padding: '8px 18px', fontSize: 12, borderRadius: 10, boxShadow: '0 3px 14px rgba(124,58,237,0.32)' }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M7 1v12M1 7h12" /></svg>
                      Add Company
                    </button>
                  )}
                </div>
              </div>
              <div className="swipe-container" id="cdb-swipe-container" {...cdbSwipe}>
                <div className="swipe-track" id="cdb-track" style={{ transform: `translateX(-${cdbPanel * 100}%)` }}>
                  <div className="swipe-panel" id="cdb-p0" style={{ gap: 0 }}>
                    <StatsBar data={statsData} onCategoryClick={toggleCategoryFilter} />
                    <FilterBar
                      activeCategories={activeCategories}
                      activeHealthFilters={activeHealthFilters}
                      onToggleCategory={toggleCategoryFilter}
                      onToggleHealth={toggleHealthFilter}
                      statsData={statsData}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      totalVisible={filteredClients.length}
                    />
                    <div className="client-grid-wrap">
                      <div className="client-grid" id="clientGrid">
                        {filteredClients.map((client, i) => (<ClientCard key={client.id} client={client} index={i} onClick={() => openOverview(client)} />))}
                      </div>
                      {filteredClients.length === 0 && (
                        <div className="no-results" style={{ display: 'flex' }}>
                          <div className="no-results-ico">🔍</div>
                          <div className="no-results-msg">No companies found</div>
                          <div className="no-results-sub">Try adjusting your filters or search query</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="swipe-panel" id="cdb-p1">
                    <LicenseExpiryPanel
                      items={filteredLicenseItems}
                      stats={licStats}
                      period={licPeriod}
                      onPeriodChange={(p: LicPeriod) => { setLicPeriod(p); setLicStatusFilters(new Set()); }}
                      searchQuery={licSearchQuery}
                      onSearchChange={setLicSearchQuery}
                      statusFilters={licStatusFilters}
                      onToggleStatusFilter={(s: string) => {
                        setLicStatusFilters((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
                      }}
                      onClientClick={openOverview}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PAGE: OVERVIEW */}
            <div className={`page ${getPageState('overview')}`} id="page-overview">
              {currentClient && (
                <>
                  <div className="ph">
                    <button className="ph-back" onClick={() => goToPage('customers')}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 1L3 6l5 5" /></svg>
                    </button>
                    <h1 className="ph-title" id="ov-title">{currentClient.name}</h1>
                    <div id="ov-dots" className="tab-dots">
                      <span className="tab-label">{['Overview', 'Tickets', 'Users'][ovPanel]}</span>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className={`tab-dot${i === ovPanel ? ' active' : ''}`} onClick={() => setOvPanel(i)} />
                      ))}
                    </div>
                    <div className="ph-rule" />
                    <span className={`c-cat ${getCatClass(currentClient.cat)}`} id="ov-cat-badge" style={{ fontSize: 10, padding: '4px 12px' }}>
                      {currentClient.cat}
                    </span>
                  </div>

                  <div className="swipe-container" {...ovSwipe}>
                    <div className="swipe-track" style={{ transform: `translateX(-${ovPanel * 100}%)` }}>

                      {/* OV PANEL 0: Overview */}
                      <div className="swipe-panel ov2-panel">
                        <div className="ov2-stats-row">
                          <div className="ov2-stat-card">
                            <div className="ov2-stat-icon si-p"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13s2.5-4 6-4 6 4 6 4" /><circle cx="8" cy="6" r="2.8" /></svg></div>
                            <div className="ov2-stat-content"><div className="ov2-stat-num">{currentClient.users}</div><div className="ov2-stat-lbl">Users</div></div>
                          </div>
                          <div className="ov2-stat-card">
                            <div className="ov2-stat-icon si-t"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="12" height="9" rx="1.5" /><path d="M2 7.5h12M8 12v1.5M5 13.5h6" /></svg></div>
                            <div className="ov2-stat-content"><div className="ov2-stat-num">{posDevices.filter(d => d.status === 'online').length}/{currentClient.posCount}</div><div className="ov2-stat-lbl">Total POS</div></div>
                          </div>
                          <div className="ov2-stat-card">
                            <div className="ov2-stat-icon si-r"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5" /><path d="M8 5.5V8l1.5.9" /></svg></div>
                            <div className="ov2-stat-content"><div className="ov2-stat-num">{currentClient.tickets}</div><div className="ov2-stat-lbl">Open Tickets</div></div>
                          </div>
                          {currentClient.cat === 'F&B' ? (
                            <div className="ov2-stat-card">
                              <div className="ov2-stat-icon si-a"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="9" r="3.5" /><path d="M9 6l5 5M12 4l2 2" /></svg></div>
                              <div className="ov2-stat-content"><div className="ov2-stat-num">{currentClient.keysPerStore || '—'}</div><div className="ov2-stat-lbl">Keys/Store</div></div>
                            </div>
                          ) : (
                            <>
                              <div className="ov2-stat-card">
                                <div className="ov2-stat-icon si-loc" style={{ background: 'rgba(2,132,199,0.12)', color: '#0284c7' }}><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1.5C5.8 1.5 4 3.3 4 5.5c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z"/><circle cx="8" cy="5.5" r="1.5"/></svg></div>
                                <div className="ov2-stat-content"><div className="ov2-stat-num">{(currentClient.branches || []).length}</div><div className="ov2-stat-lbl">Sites</div></div>
                              </div>
                              <div className="ov2-stat-card">
                                <div className="ov2-stat-icon si-s" style={{ background: 'rgba(2,132,199,0.10)', color: '#0284c7' }}><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="2" width="5.5" height="5.5" rx="1"/><rect x="2" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/></svg></div>
                                <div className="ov2-stat-content"><div className="ov2-stat-num">{currentClient.seats || '—'}</div><div className="ov2-stat-lbl">Seats</div></div>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="ov2-layout">
                          {/* LEFT */}
                          <div className="surf ov2-info-panel">
                            <div className="ov2-panel-head">
                              <span className="ov2-panel-title">General Information</span>
                              <button className="btn btn-s btn-sm" onClick={() => openEditInfoModal(currentClient)}>
                                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z" /></svg>
                                Edit Info
                              </button>
                            </div>
                            <div className="ov2-info-scroll">
                              <div className="ov2-section-lbl">PRIMARY CONTACT</div>
                              {[
                                { key: 'Store Name', val: currentClient.name },
                                { key: 'Contact Person', val: currentClient.contact },
                                { key: 'Email', val: currentClient.email },
                                { key: 'Phone', val: currentClient.phone || '—' },
                              ].map(item => (
                                <div key={item.key} className="ov2-row">
                                  <span className="ov2-key">{item.key}</span>
                                  <span className="ov2-val">{item.val}</span>
                                </div>
                              ))}

                              <div className="ov2-section-lbl" style={{ marginTop: 12 }}>ALTERNATE CONTACT</div>
                              {currentClient.altContact ? (
                                <>
                                  {[
                                    { key: 'Contact Person', val: currentClient.altContact },
                                    { key: 'Email', val: currentClient.altEmail || '—' },
                                    { key: 'Phone', val: currentClient.altPhone || '—' },
                                  ].map(item => (
                                    <div key={item.key} className="ov2-row">
                                      <span className="ov2-key">{item.key}</span>
                                      <span className="ov2-val">{item.val}</span>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div className="ov2-row">
                                  <span className="ov2-key" style={{ color: 'var(--t4)', fontStyle: 'italic' }}>No alternate contact</span>
                                  <button className="btn btn-s btn-xs" onClick={() => openEditInfoModal(currentClient)} style={{ fontSize: 9.5, padding: '3px 9px' }}>+ Add</button>
                                </div>
                              )}

                              <div className="ov2-section-lbl" style={{ marginTop: 12 }}>ACCOUNT DETAILS</div>
                              <div className="ov2-row">
                                <span className="ov2-key">Acct Manager</span>
                                <span className="ov2-val" style={{ color: 'var(--purple)', fontWeight: 600 }}>{currentClient.accountManager}</span>
                              </div>
                              <div className="ov2-row">
                                <span className="ov2-key">User Role</span>
                                <span className="ov2-val">System Admin</span>
                              </div>

                              {currentClient.cat === 'F&B' && (
                                <>
                                  <div className="ov2-section-lbl" style={{ marginTop: 12 }}>KEYS</div>
                                  <div className="ov2-row">
                                    <span className="ov2-key">Keys No. per Store</span>
                                    <span className="ov2-val" style={{ color: 'var(--amber)', fontWeight: 700 }}>{currentClient.keysPerStore || '—'}</span>
                                  </div>
                                </>
                              )}

                              {currentClient.cat !== 'F&B' && (
                                <>
                                  <div className="ov2-section-lbl" style={{ marginTop: 12 }}>LICENSE</div>
                                  {[
                                    { key: 'License ID', val: currentClient.licenseId || '—' },
                                    { key: 'Start', val: formatDate(currentClient.saStart) },
                                    { key: 'End', val: formatDate(currentClient.saEnd) },
                                    { key: 'Krunch #', val: currentClient.krunchNum || '—' },
                                  ].map(item => (
                                    <div key={item.key} className="ov2-row">
                                      <span className="ov2-key">{item.key}</span>
                                      <span className="ov2-val">{item.val}</span>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* ── Branch Locations ── */}
                              <div className="ov2-branch-section">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                  <div className="ov2-branch-title">Branch Locations</div>
                                  <button
                                    className="btn btn-p btn-sm"
                                    onClick={() => { setShowAddBranchInput(true); setAddBranchName(''); }}
                                    style={{ gap: 5, fontSize: 10.5, padding: '4px 10px' }}
                                  >
                                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M6 1v10M1 6h10" /></svg>
                                    Add Branch
                                  </button>
                                </div>

                                {showAddBranchInput && (
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                                    <input
                                      className="f-in"
                                      type="text"
                                      placeholder="Branch name…"
                                      value={addBranchName}
                                      onChange={(e) => setAddBranchName(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddBranch(); if (e.key === 'Escape') setShowAddBranchInput(false); }}
                                      autoFocus
                                      style={{ fontSize: 11.5, padding: '6px 10px', flex: 1 }}
                                    />
                                    <button className="btn btn-p btn-xs" onClick={handleAddBranch} style={{ padding: '5px 10px' }}>Add</button>
                                    <button className="btn btn-s btn-xs" onClick={() => setShowAddBranchInput(false)} style={{ padding: '5px 10px' }}>✕</button>
                                  </div>
                                )}

                                <div className="ov2-branch-pills">
                                  {(currentClient.branches || []).map(branch => (
                                    <div key={branch} className="branch-tag branch-tag-btn" onClick={() => setBranchDetailModal({ branch, client: currentClient })}>
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z" /><circle cx="6" cy="5" r="1.2" /></svg>
                                      {branch}
                                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h4M7 4l2 2-2 2" /></svg>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT — POS Machines */}
                          <div className="surf ov2-pos-panel">
                            <div className="ov2-panel-head">
                              <span className="ov2-panel-title">POS Machines</span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <div className="search-box" style={{ width: 180, padding: '4px 10px' }}>
                                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" /></svg>
                                  <input
                                    type="text"
                                    placeholder="Search POS…"
                                    value={posSearch}
                                    onChange={(e) => setPosSearch(e.target.value)}
                                    style={{ fontSize: 11 }}
                                  />
                                  {posSearch && (
                                    <button onClick={() => setPosSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--t4)', lineHeight: 1 }}>
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
                                    </button>
                                  )}
                                </div>
                                <button
                                  className={`btn btn-s btn-sm${showPOSFilterPanel ? ' active' : ''}`}
                                  onClick={() => setShowPOSFilterPanel(p => !p)}
                                  style={{ gap: 5, position: 'relative' }}
                                >
                                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" /></svg>
                                  Filter
                                  {activePOSBranchFilter.size > 0 && (
                                    <span style={{ background: 'var(--purple)', color: '#fff', borderRadius: 9, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>
                                      {activePOSBranchFilter.size}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>

                            {showPOSFilterPanel && (currentClient.branches || []).length > 0 && (
                              <div style={{
                                padding: '10px 14px',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--surface2)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 6,
                                alignItems: 'center',
                                flexShrink: 0,
                              }}>
                                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2 }}>Branch:</span>
                                <div
                                  className={`f-chip${activePOSBranchFilter.size === 0 ? ' on' : ''}`}
                                  onClick={() => setActivePOSBranchFilter(new Set())}
                                  style={{ fontSize: 10.5, padding: '3px 10px' }}
                                >
                                  All
                                </div>
                                {(currentClient.branches || []).map(branch => {
                                  const count = posDevices.filter(d => d.branch === branch).length;
                                  return (
                                    <div
                                      key={branch}
                                      className={`f-chip${activePOSBranchFilter.has(branch) ? ' on' : ''}`}
                                      onClick={() => setActivePOSBranchFilter(prev => {
                                        const next = new Set(prev);
                                        next.has(branch) ? next.delete(branch) : next.add(branch);
                                        return next;
                                      })}
                                      style={{ fontSize: 10.5, padding: '3px 10px' }}
                                    >
                                      {branch}
                                      <span className="fc-n">{count}</span>
                                    </div>
                                  );
                                })}
                                {activePOSBranchFilter.size > 0 && (
                                  <button
                                    className="btn btn-xs"
                                    onClick={() => setActivePOSBranchFilter(new Set())}
                                    style={{ marginLeft: 'auto', fontSize: 9.5, padding: '2px 8px', background: 'var(--red-lt)', color: 'var(--red)' }}
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            )}

                            {(() => {
                              const q = posSearch.toLowerCase().trim();
                              const filtered = posDevices.filter(d => {
                                const branchOk = activePOSBranchFilter.size === 0 || activePOSBranchFilter.has(d.branch);
                                const searchOk = !q ||
                                  d.model.toLowerCase().includes(q) ||
                                  d.serial.toLowerCase().includes(q) ||
                                  d.ip.toLowerCase().includes(q) ||
                                  d.os.toLowerCase().includes(q) ||
                                  d.branch.toLowerCase().includes(q) ||
                                  d.id.toLowerCase().includes(q) ||
                                  (d.msaStart && (d.msaStart.includes(q) || new Date(d.msaStart).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toLowerCase().includes(q))) ||
                                  (d.msaEnd && (d.msaEnd.includes(q) || new Date(d.msaEnd).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toLowerCase().includes(q))) ||
                                  (d.warrantyDate && (d.warrantyDate.includes(q) || new Date(d.warrantyDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toLowerCase().includes(q)));
                                return branchOk && searchOk;
                              });
                              return filtered.length > 0 ? (
                                <div className="ov2-pos-grid">
                                  {filtered.map((pos) => (
                                    <SimplePOSCard
                                      key={pos.id}
                                      pos={pos}
                                      index={posDevices.indexOf(pos)}
                                      onClick={() => setPosDetailModal({ pos, client: currentClient })}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '24px 0' }}>
                                  <span style={{ fontSize: 22 }}>🔍</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>No POS devices found</span>
                                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                                    {posSearch ? `No results for "${posSearch}"` : 'No devices in selected branch'}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* OV PANEL 1: Tickets */}
                      <div className="swipe-panel">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div className="tkt-tabs">
                            {(['open', 'pending', 'closed'] as TicketStatus[]).map((s) => (
                              <div key={s} className={`tkt-tab${ticketStatusFilter === s ? ' active-open' : ''}`} onClick={() => setTicketStatusFilter(s)}>
                                <span className={`dot dot-${s === 'open' ? 'r' : s === 'pending' ? 'y' : 'g'}`} style={{ width: 5, height: 5 }} />
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                                <span className="tkt-tab-n">{ALL_TICKETS[s].length}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }} />
                          <button className="btn btn-s btn-sm" onClick={() => showToast('Exporting tickets…')}>Export</button>
                        </div>
                        <div className="g2" style={{ flexShrink: 0 }}>
                          <div className="stat-c"><div className="stat-ico si-r"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5.5" /><path d="M8 5.5V8l1.5.9" /></svg></div><div><div className="stat-num">{ALL_TICKETS.open.length}</div><div className="stat-lbl">Open Tickets</div></div></div>
                          <div className="stat-c"><div className="stat-ico si-g"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 8.5l3.5 3.5 7.5-7.5" /></svg></div><div><div className="stat-num">{ALL_TICKETS.closed.length}</div><div className="stat-lbl">Resolved This Month</div></div></div>
                        </div>
                        <div className="g2" style={{ flex: 1, minHeight: 0 }}>
                          <div className="surf" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}><span className="surf-title">Ticket Trend</span><span className="surf-sub">Last 30 days</span></div>
                            <MiniChart />
                          </div>
                          <div className="surf" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}><span className="surf-title">Ticket List</span><button className="btn btn-s btn-xs" onClick={() => showToast('Viewing all tickets')}>View All</button></div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                              {ALL_TICKETS[ticketStatusFilter].slice(0, 8).map((ticket) => (<TicketItem key={ticket.id} ticket={ticket} />))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* OV PANEL 2: Company Users */}
                      <div className="swipe-panel">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                          <div><div className="surf-title" style={{ fontSize: 14 }}>{currentClient.name} Users</div><div className="surf-sub" style={{ marginTop: 2 }}>Users assigned to this company</div></div>
                          <button className="btn btn-p btn-sm" onClick={() => showToast('Add user to company')} style={{ gap: 6 }}>
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5" /><path d="M7 4.5v5M4.5 7h5" /></svg>
                            Add User
                          </button>
                        </div>
                        <div className="surf" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                          <div className="tbl-wrap">
                            <table className="dt">
                              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr></thead>
                              <tbody>
                                {(clientUsers[currentClient.id] || []).map((u, i) => (
                                  <tr key={i}>
                                    <td style={{ fontWeight: 600, color: 'var(--t1)' }}>{u.name}</td>
                                    <td style={{ fontSize: 11 }}>{u.email}</td>
                                    <td><span className={`badge ${u.role === 'System Admin' ? 'bg-s' : u.role === 'Manager' ? 'bg-mgr' : 'bg-gray'}`}>{u.role}</span></td>
                                    <td>{u.branch}</td>
                                    <td><span className={`badge ${u.status === 'Active' ? 'bg-g' : 'bg-r'}`}><span className={`dot dot-${u.status === 'Active' ? 'g' : 'r'}`} style={{ width: 5, height: 5 }} />{u.status}</span></td>
                                    <td><button className="btn btn-s btn-xs" onClick={() => showToast(`Editing ${u.name}`)}>Edit</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          MODALS
      ══════════════════════════════════ */}

      {addClientModalOpen && (
        <AddCompanyModal
          form={addClientForm}
          onChange={setAddClientForm}
          onSave={handleAddClient}
          onClose={() => { setAddClientModalOpen(false); setAddClientForm(BLANK_ADD_CLIENT); }}
        />
      )}

      {addUserModalOpen && (
        <Modal title="Add New User" subtitle="Create a user account and assign access" onClose={() => setAddUserModalOpen(false)}
          footer={<><button className="btn btn-s" onClick={() => setAddUserModalOpen(false)}>Cancel</button><button className="btn btn-p" onClick={handleAddUser} style={{ padding: '8px 20px' }}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>Add User</button></>}>
          <div className="field-g row">
            <div className="field-g"><label className="f-lbl">First Name <span style={{ color: 'var(--red)' }}>*</span></label><input className="f-in" type="text" placeholder="Jane" value={addUserForm.fname} onChange={(e) => setAddUserForm((p) => ({ ...p, fname: e.target.value }))} /></div>
            <div className="field-g"><label className="f-lbl">Last Name <span style={{ color: 'var(--red)' }}>*</span></label><input className="f-in" type="text" placeholder="Smith" value={addUserForm.lname} onChange={(e) => setAddUserForm((p) => ({ ...p, lname: e.target.value }))} /></div>
          </div>
          <div className="field-g"><label className="f-lbl">Email Address <span style={{ color: 'var(--red)' }}>*</span></label><input className="f-in" type="email" placeholder="jane@company.com" value={addUserForm.email} onChange={(e) => setAddUserForm((p) => ({ ...p, email: e.target.value }))} /></div>
          <div className="field-g row">
            <div className="field-g"><label className="f-lbl">User Role <span style={{ color: 'var(--red)' }}>*</span></label><select className="f-sel" value={addUserForm.role} onChange={(e) => setAddUserForm((p) => ({ ...p, role: e.target.value }))}><option value="">Select role…</option><option>System Admin</option><option>Manager</option><option>User</option></select></div>
            <div className="field-g"><label className="f-lbl">Company <span style={{ color: 'var(--red)' }}>*</span></label><select className="f-sel" value={addUserForm.company} onChange={(e) => setAddUserForm((p) => ({ ...p, company: e.target.value }))}><option value="">Select company…</option>{clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="field-g row">
            <div className="field-g"><label className="f-lbl">Position / Title</label><input className="f-in" type="text" placeholder="e.g. Store Manager" value={addUserForm.position} onChange={(e) => setAddUserForm((p) => ({ ...p, position: e.target.value }))} /></div>
            <div className="field-g"><label className="f-lbl">Phone Number</label><input className="f-in" type="tel" placeholder="+63 9XX XXX XXXX" value={addUserForm.phone} onChange={(e) => setAddUserForm((p) => ({ ...p, phone: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {createCourseModalOpen && (
        <Modal title="Create New Course" subtitle="Build a learning module and assign it to client companies" onClose={() => setCreateCourseModalOpen(false)} wide
          footer={<><div style={{ fontSize: 10.5, color: 'var(--t3)', flex: 1 }}>{!createCourseForm.title || !createCourseForm.cat || !createCourseForm.duration ? 'Fill in the required fields to continue.' : `${selectedCourseCompanies.size === 0 ? 'Available to all companies.' : `Assigned to ${selectedCourseCompanies.size} compan${selectedCourseCompanies.size === 1 ? 'y' : 'ies'}.`}`}</div><button className="btn btn-s" onClick={() => setCreateCourseModalOpen(false)}>Cancel</button><button className="btn btn-p" onClick={handleCreateCourse} style={{ padding: '9px 20px', fontSize: 12.5, borderRadius: 10, boxShadow: '0 3px 12px rgba(124,58,237,0.3)' }}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>Complete Creation</button></>}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <div className="field-g" style={{ marginBottom: 11 }}><label className="f-lbl">Course Title <span style={{ color: 'var(--red)' }}>*</span></label><input className="f-in" type="text" placeholder="e.g. POS Advanced Training" value={createCourseForm.title} onChange={(e) => setCreateCourseForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="field-g" style={{ marginBottom: 11 }}><label className="f-lbl">Description</label><textarea className="f-in" rows={2} placeholder="Briefly describe what this course covers..." value={createCourseForm.desc} onChange={(e) => setCreateCourseForm((p) => ({ ...p, desc: e.target.value }))} style={{ resize: 'vertical', minHeight: 60, lineHeight: 1.5 }} /></div>
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Category <span style={{ color: 'var(--red)' }}>*</span></label><select className="f-sel" value={createCourseForm.cat} onChange={(e) => setCreateCourseForm((p) => ({ ...p, cat: e.target.value }))}><option value="">Select…</option>{courseCategories.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}<option value="New Category">+ Add New</option></select></div>
              <div className="field-g"><label className="f-lbl">Estimated Duration <span style={{ color: 'var(--red)' }}>*</span></label><input className="f-in" type="text" placeholder="e.g. 45 Mins, 1 Hour" value={createCourseForm.duration} onChange={(e) => setCreateCourseForm((p) => ({ ...p, duration: e.target.value }))} /></div>
            </div>
          </div>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 10 }}>Assign to Companies</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {['All', 'F&B', 'Retail', 'Warehouse'].map((ind) => (<span key={ind} className={`ccm-ind-chip${ccIndustryFilter === ind ? ' on' : ''}`} onClick={() => setCcIndustryFilter(ind)}>{ind === 'All' ? 'All Industries' : ind}</span>))}
            </div>
            <div className="ccm-company-grid">
              {filteredCcCompanies.map((c) => (
                <div key={c.id} className={`ccm-company-item${selectedCourseCompanies.has(c.name) ? ' selected' : ''}`} onClick={() => toggleCcCompany(c.name)}>
                  <input type="checkbox" checked={selectedCourseCompanies.has(c.name)} onChange={() => {}} style={{ width: 13, height: 13, accentColor: 'var(--purple)', cursor: 'pointer' }} />
                  <div className="ccm-company-ico" style={{ background: c.cat === 'F&B' ? '#d97706' : c.cat === 'Retail' ? '#0284c7' : '#0d9488' }}>{getInitials(c.name)}</div>
                  <div><div className="ccm-company-name">{c.name}</div><div className="ccm-company-cat">{c.cat}</div></div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {editInfoModalOpen && editInfoForm && currentClient && (
        <EditInfoModal client={currentClient} form={editInfoForm} onChange={setEditInfoForm} onSave={handleSaveEditInfo} onClose={() => setEditInfoModalOpen(false)} />
      )}

      {branchDetailModal && (
        <BranchDetailModal
          branch={branchDetailModal.branch}
          client={branchDetailModal.client}
          posDevices={posDevices}
          onClose={() => setBranchDetailModal(null)}
          onAddPOS={handleAddPOSFromBranch}
          onEditPOS={handleEditPOS}
          onRemovePOS={handleRemovePOS}
        />
      )}

      {posDetailModal && (
        <POSDetailModal
          pos={posDetailModal.pos}
          client={posDetailModal.client}
          posIndex={posDevices.findIndex(p => p.id === posDetailModal.pos.id) + 1}
          onClose={() => setPosDetailModal(null)}
        />
      )}

      <div className={`toast${toastVisible ? ' show' : ''}`}>
        <div className="toast-dot" />
        <span>{toastMessage}</span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

function StatsBar({ data, onCategoryClick }: { data: StatsBarData; onCategoryClick: (cat: string) => void }) {
  return (
    <div className="stats-bar" style={{ marginBottom: 12 }}>
      <div className="sb-total">
        <div className="sb-total-ico"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.5"><rect x="1.5" y="1.5" width="8" height="8" rx="1.5" /><rect x="12.5" y="1.5" width="8" height="8" rx="1.5" /><rect x="1.5" y="12.5" width="8" height="8" rx="1.5" /><rect x="12.5" y="12.5" width="8" height="8" rx="1.5" /></svg></div>
        <div><div className="sb-total-num">{data.total}</div><div className="sb-total-lbl">Total Companies</div></div>
      </div>
      <div className="sb-cats">
        {[
          { key: 'F&B', cls: 'sb-cat-fb', icon: '🍔', num: data.fb.count, sub: 'Food & Beverage', tickets: data.fb.tickets },
          { key: 'Retail', cls: 'sb-cat-retail', icon: '🛍️', num: data.retail.count, sub: 'Stores & Boutiques', tickets: data.retail.tickets },
          { key: 'Warehouse', cls: 'sb-cat-warehouse', icon: '📦', num: data.warehouse.count, sub: 'Logistics & Supply', tickets: data.warehouse.tickets },
        ].map((item) => (
          <div key={item.key} className={`sb-cat ${item.cls}`} onClick={() => onCategoryClick(item.key)}>
            <div className="sb-cat-top"><div className="sb-cat-ico">{item.icon}</div><div className="sb-cat-badge">{item.key}</div></div>
            <div className="sb-cat-num">{item.num}</div>
            <div className="sb-cat-sub">{item.sub}</div>
            <div className="sb-cat-tickets"><svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5" /><path d="M7 4.5V7l1.5.9" /></svg>{item.tickets} ticket{item.tickets !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterBar({ activeCategories, activeHealthFilters, onToggleCategory, onToggleHealth, statsData, searchQuery, onSearchChange, totalVisible }: {
  activeCategories: Set<string>;
  activeHealthFilters: Set<string>;
  onToggleCategory: (cat: string) => void;
  onToggleHealth: (level: string) => void;
  statsData: StatsBarData;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalVisible: number;
}) {
  return (
    <div className="filter-bar">
      <span className="fl">Filter:</span>
      {[{ cat: 'F&B', n: statsData.fb.count }, { cat: 'Retail', n: statsData.retail.count }, { cat: 'Warehouse', n: statsData.warehouse.count }].map((f) => (
        <div key={f.cat} className={`f-chip${activeCategories.has(f.cat) ? ' on' : ''}`} data-cat={f.cat} onClick={() => onToggleCategory(f.cat)}>{f.cat}<span className="fc-n">{f.n}</span></div>
      ))}
      <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
      <span className="fl">Status:</span>
      {[{ level: 'green' as HealthLevel, label: 'Healthy' }, { level: 'yellow' as HealthLevel, label: 'Attention' }, { level: 'red' as HealthLevel, label: 'Critical' }].map((h) => (
        <div key={h.level} className={`f-chip${activeHealthFilters.has(h.level) ? ' on' : ''}`} data-health={h.level} onClick={() => onToggleHealth(h.level)}><span className={`dot dot-${h.level === 'green' ? 'g' : h.level === 'yellow' ? 'y' : 'r'}`} />{h.label}</div>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>{totalVisible} compan{totalVisible !== 1 ? 'ies' : 'y'}</span>
    </div>
  );
}

function ClientCard({ client, index, onClick }: { client: Client; index: number; onClick: () => void }) {
  return (
    <div className="c-card" data-cat={client.cat} data-health={client.level} onClick={onClick} style={{ animation: `fadeUp .3s ease ${index * 0.028}s both` }}>
      <div className={`c-logo-wrap ${getLogoWrapClass(client.cat)}`}>
        <div className="c-logo">
          {client.logo ? (
            <img src={client.logo} alt={client.name} onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="c-logo-ph">${getInitials(client.name)}</div>`; }} />
          ) : (<div className="c-logo-ph">{getInitials(client.name)}</div>)}
        </div>
      </div>
      <div className="c-body">
        <div className="c-head">
          <div className="c-info">
            <div className="c-name">{client.name}</div>
            <div className="c-contact">{client.contact}</div>
            <div className="c-email">{client.email}</div>
          </div>
        </div>
        <div className="c-footer">
          <div className="health-lbl"><span className={`dot dot-${client.level === 'green' ? 'g' : client.level === 'yellow' ? 'y' : 'r'}`} />{getHealthLabel(client.level)}</div>
          <span className={`c-cat ${getCatClass(client.cat)}`}>{client.cat}</span>
        </div>
      </div>
    </div>
  );
}

function SimplePOSCard({ pos, index, onClick }: { pos: POSDevice; index: number; onClick: () => void }) {
  return (
    <div className="spos-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="spos-label">POS {index + 1}</div>
      <div className="spos-icon-wrap">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ color: 'var(--t3)' }}><rect x="2" y="3" width="20" height="13" rx="2" /><path d="M2 10h20M12 16v3M8 19h8" /></svg>
      </div>
      <div className="spos-branch">{pos.branch}</div>
    </div>
  );
}

function TicketItem({ ticket }: { ticket: Ticket }) {
  const { bg, color } = getPriorityInfo(ticket.priority);
  return (
    <div className="tkt-item">
      <div className="tkt-ico" style={{ background: bg, color }}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5" /><path d="M7 4.5V7l1.5.9" /></svg></div>
      <div style={{ flex: 1 }}>
        <div className="tkt-subject">{ticket.subject}</div>
        <div className="tkt-meta">{ticket.id} · {ticket.time} {ticket.client && `· ${ticket.client}`}</div>
      </div>
      <span className="badge" style={{ background: bg, color, border: `1px solid ${color}30` }}>{ticket.priority}</span>
    </div>
  );
}

function MiniChart() {
  const data = [4, 6, 5, 8, 7, 9, 11, 8, 6, 10, 12, 9, 8, 7, 11, 13, 10, 8, 9, 12, 14, 11, 9, 10, 13, 12, 11, 14, 13, 15];
  const criticalData = [2, 3, 2, 4, 3, 5, 6, 4, 3, 5, 7, 5, 4, 3, 6, 7, 5, 4, 4, 6, 8, 6, 5, 5, 7, 6, 5, 8, 7, 9];
  const width = 300; const height = 80;
  const max = Math.max(...data);
  const step = width / (data.length - 1);
  const getPath = (d: number[]) => d.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)},${((1 - v / max) * height).toFixed(1)}`).join(' ');
  return (
    <div className="mini-chart" style={{ flex: 1, height: 'auto', minHeight: 80 }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <defs><linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0" /></linearGradient></defs>
        <path d={getPath(data) + ` L ${((data.length - 1) * step).toFixed(1)},${height} L 0,${height} Z`} fill="url(#cg1)" />
        <path d={getPath(data)} stroke="#7c3aed" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={getPath(criticalData)} stroke="#dc2626" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
      </svg>
    </div>
  );
}

function CourseCard({ course, onEnrollToggle, onToast }: { course: Course; onEnrollToggle: (title: string) => void; onToast: (msg: string) => void }) {
  return (
    <div className="course-card">
      <div className="course-thumb">
        {course.thumb ? <img src={course.thumb} alt={course.title} /> : <div className="course-thumb-ph">{course.thumbEmoji || '📚'}</div>}
        {course.enrolled && <div className="enr-ribbon">ENROLLED</div>}
      </div>
      <div className="course-body">
        <div className="course-title">{course.title}</div>
        <div className="course-desc">{course.desc}</div>
        <div className="course-foot">
          <div className="course-time"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4.5" /><path d="M6 3.5V6l1.5.9" /></svg>{course.time}</div>
          <button className={`enroll-btn ${course.enrolled ? 'done' : 'not'}`} onClick={() => { onEnrollToggle(course.title); onToast(course.enrolled ? `Unenrolled from "${course.title}"` : `Enrolled in "${course.title}"!`); }}>
            {course.enrolled ? '✓ Enrolled' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnrolledCourseCard({ course, onToast }: { course: Course; onToast: (msg: string) => void }) {
  const isCompleted = course.progress === 100;
  return (
    <div className="ec-card">
      <div className="ec-thumb">{course.thumb ? <img src={course.thumb} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : course.thumbEmoji}</div>
      <div className="ec-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div className="ec-title">{course.title}</div>
          <span className={`ec-status ${isCompleted ? 'completed' : 'in-progress'}`}>{isCompleted ? 'Completed' : 'In Progress'}</span>
        </div>
        <div className="ec-desc">{course.desc}</div>
        {!isCompleted && (
          <div className="lc-bar-wrap" style={{ marginTop: 6 }}>
            <div className="lc-prog-bar"><div className="lc-prog-fill" style={{ width: `${course.progress}%`, background: 'linear-gradient(90deg,var(--purple),var(--teal))' }} /></div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>{course.progress}%</span>
          </div>
        )}
      </div>
      <button className={`ec-btn ${isCompleted ? 'review-btn' : 'continue-btn'}`} onClick={() => onToast(`${isCompleted ? 'Reviewing' : 'Continuing'} "${course.title}"`)}>
        {isCompleted ? '✓ Review' : '▶ Continue'}
      </button>
    </div>
  );
}

function LCHeroSection({ stats }: { stats: ReturnType<typeof computeLCHeroStats> }) {
  return (
    <div className="lc-hero">
      <div className="lc-hero-text">
        <div className="lc-hero-title">My Learning Journey</div>
        <div className="lc-hero-sub">Keep up the great work! You're making excellent progress.</div>
        <div className="lc-hero-progress"><div className="lc-hero-bar" style={{ width: `${stats.progressPct}%` }} /></div>
        <div className="lc-hero-note">{stats.progressPct}% average completion across all enrolled courses</div>
      </div>
      <div className="lc-hero-stats">
        <div className="lc-hero-stat"><div className="lc-hero-stat-n">{stats.enrolled}</div><div className="lc-hero-stat-l">Enrolled</div></div>
        <div className="lc-hero-stat"><div className="lc-hero-stat-n">{stats.completed}</div><div className="lc-hero-stat-l">Completed</div></div>
        <div className="lc-hero-stat"><div className="lc-hero-stat-n">{stats.inProgress}</div><div className="lc-hero-stat-l">In Progress</div></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LICENSE EXPIRY PANEL — v2 compact table layout
═══════════════════════════════════════════════════════════ */

function LicenseExpiryPanel({ items, stats, period, onPeriodChange, searchQuery, onSearchChange, statusFilters, onToggleStatusFilter, onClientClick }: {
  items: LicenseItem[]; stats: { expired: number; critical: number; warning: number; upcoming: number }; period: LicPeriod;
  onPeriodChange: (p: LicPeriod) => void; searchQuery: string; onSearchChange: (q: string) => void;
  statusFilters: Set<string>; onToggleStatusFilter: (s: string) => void; onClientClick: (c: Client) => void;
}) {
  const statCards = [
    { id: 'expired',  label: 'Expired',      n: stats.expired,  color: '#ef4444' },
    { id: 'critical', label: 'Critical ≤30d', n: stats.critical, color: '#f97316' },
    { id: 'warning',  label: 'Warning ≤90d',  n: stats.warning,  color: '#eab308' },
    { id: 'upcoming', label: 'Upcoming 1yr',  n: stats.upcoming, color: '#22c55e' },
  ];

  const statusMeta: Record<string, { color: string; barColor: string }> = {
    expired:  { color: '#ef4444', barColor: 'rgba(239,68,68,0.12)' },
    critical: { color: '#f97316', barColor: 'rgba(249,115,22,0.12)' },
    warning:  { color: '#eab308', barColor: 'rgba(234,179,8,0.12)' },
    upcoming: { color: '#22c55e', barColor: 'rgba(34,197,94,0.12)' },
  };

  return (
    <>
      <div className="lic2-toolbar">
        <div className="lic2-periods">
          {[{ id: 'all', label: 'All' }, { id: '3m', label: '3 mo' }, { id: '6m', label: '6 mo' }, { id: '1y', label: '1 yr' }].map((p) => (
            <button key={p.id} className={`lic2-period${period === p.id ? ' on' : ''}`} onClick={() => onPeriodChange(p.id as LicPeriod)}>{p.label}</button>
          ))}
        </div>
        <div className="search-box" style={{ width: 210, padding: '5px 10px', marginLeft: 'auto' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" /></svg>
          <input type="text" placeholder="Search client…" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} style={{ fontSize: 11.5 }} />
        </div>
      </div>
      <div className="lic2-stat-row">
        {statCards.map((s) => {
          const active = statusFilters.has(s.id);
          return (
            <div key={s.id} className={`lic2-stat-pill${active ? ' on' : ''}`} style={{ '--pill-color': s.color } as React.CSSProperties} onClick={() => onToggleStatusFilter(s.id)}>
              <span className="lic2-pill-dot" style={{ background: s.color }} />
              <span className="lic2-pill-n">{s.n}</span>
              <span className="lic2-pill-lbl">{s.label}</span>
            </div>
          );
        })}
      </div>
      <div className="lic2-table-wrap">
        {items.length > 0 ? (
          <table className="lic2-table">
            <thead><tr><th style={{ width: 36 }}></th><th>Company</th><th>Industry</th><th>License ID</th><th>Acct Manager</th><th>Expiry Date</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((c) => {
                const m = statusMeta[c._status] || statusMeta.upcoming;
                const label = c._status === 'expired' ? 'Expired' : `${c._daysLeft}d left`;
                return (
                  <tr key={c.id} className="lic2-row" onClick={() => onClientClick(c)}>
                    <td><div className="lic2-avatar" style={{ background: m.barColor, color: m.color }}>{getInitials(c.name)}</div></td>
                    <td><span className="lic2-name">{c.name}</span></td>
                    <td><span className={`c-cat ${getCatClass(c.cat)}`} style={{ fontSize: 9, padding: '2px 7px' }}>{c.cat}</span></td>
                    <td><span className="lic2-mono">{c.licenseId || '—'}</span></td>
                    <td><span className="lic2-am">{c.accountManager}</span></td>
                    <td><span className="lic2-date">{formatDate(c.saEnd)}</span></td>
                    <td><span className="lic2-status-chip" style={{ color: m.color, background: m.barColor, border: `1px solid ${m.color}40` }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />{label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-results" style={{ display: 'flex' }}>
            <div className="no-results-ico">📋</div>
            <div className="no-results-msg">No expiring licenses</div>
            <div className="no-results-sub">No clients match the selected period</div>
          </div>
        )}
      </div>
    </>
  );
}

function AnalyticsCard({ title, subtitle, badge, children }: { title: string; subtitle: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="an-chart-card">
      <div className="an-card-head">
        <div><div className="an-card-title">{title}</div><div className="an-card-sub">{subtitle}</div></div>
        <span className="an-card-badge">{badge}</span>
      </div>
      {children}
    </div>
  );
}

function AnalyticsClientOverview({ clients }: { clients: Client[] }) {
  const cats: { cat: string; color: string }[] = [{ cat: 'F&B', color: '#d97706' }, { cat: 'Retail', color: '#0284c7' }, { cat: 'Warehouse', color: '#0d9488' }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cats.map(({ cat, color }) => {
        const count = clients.filter((c) => c.cat === cat).length;
        const pct = Math.round((count / clients.length) * 100);
        return (
          <div key={cat} className="prog-item">
            <div className="prog-h"><span className="prog-lbl">{cat}</span><span className="prog-pct">{count} clients ({pct}%)</span></div>
            <div className="prog-wrap"><div className="prog-bar" style={{ width: `${pct}%`, background: color }} /></div>
          </div>
        );
      })}
      <div className="an-summary-block" style={{ marginTop: 8 }}>
        <div className="an-summary-title">📊 Snapshot</div>
        <div className="an-summary-text">{clients.length} total companies. {clients.filter((c) => c.level === 'red').length} critical, {clients.filter((c) => c.level === 'yellow').length} needing attention, {clients.filter((c) => c.level === 'green').length} healthy.</div>
      </div>
    </div>
  );
}

function AnalyticsTicketTrend() { return <MiniChart />; }

function AnalyticsBacklog({ tickets }: { tickets: Ticket[] }) {
  const priorityCounts = { critical: tickets.filter((t) => t.priority === 'critical').length, high: tickets.filter((t) => t.priority === 'high').length, normal: tickets.filter((t) => t.priority === 'normal').length, low: tickets.filter((t) => t.priority === 'low').length };
  const total = tickets.length || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(priorityCounts).map(([p, count]) => {
        const { color, bg } = getPriorityInfo(p as 'critical' | 'high' | 'normal' | 'low');
        return (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: bg, color, border: `1px solid ${color}40`, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', width: 62, textAlign: 'center', flexShrink: 0 }}>{p}</span>
            <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${Math.round((count / total) * 100)}%`, height: '100%', background: color, borderRadius: 3 }} /></div>
            <span style={{ fontSize: 13, fontWeight: 800, color, width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsLicenseHealth({ clients }: { clients: Client[] }) {
  const now = new Date();
  const expired = clients.filter((c) => c.saEnd && new Date(c.saEnd) < now).length;
  const critical = clients.filter((c) => { if (!c.saEnd) return false; const d = getDaysLeft(c.saEnd); return d !== null && d >= 0 && d <= 30; }).length;
  const healthy = clients.length - expired - critical;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[{ label: 'Expired', count: expired, color: '#dc2626' }, { label: 'Critical (≤30d)', count: critical, color: '#d97706' }, { label: 'Healthy', count: healthy, color: '#0d9488' }].map(({ label, count, color }) => (
        <div key={label} className="prog-item">
          <div className="prog-h"><span className="prog-lbl">{label}</span><span className="prog-pct">{count} clients</span></div>
          <div className="prog-wrap"><div className="prog-bar" style={{ width: `${Math.round((count / clients.length) * 100)}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

function FilterChipGroup({ label, options, activeSet, onToggle }: { label: string; options: string[]; activeSet: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {options.map((opt) => (<span key={opt} className={`uf-chip${activeSet.has(opt) ? ' on' : ''}`} onClick={() => onToggle(opt)}>{opt}</span>))}
      </div>
    </div>
  );
}

function SettingsContent({ section, toggles, onToggle, onToast }: { section: SettingsSection; toggles: Record<string, boolean>; onToggle: (key: string) => void; onToast: (msg: string) => void }) {
  const rows: Record<SettingsSection, { label: string; desc: string; key: string }[]> = {
    general: [{ label: 'Compact View', desc: 'Reduce spacing for denser information display', key: 'compactView' }, { label: 'Show Analytics', desc: 'Display analytics widgets on overview pages', key: 'showAnalytics' }, { label: 'Dark Mode', desc: 'Switch to a dark color theme', key: 'darkMode' }],
    notifications: [{ label: 'Email Notifications', desc: 'Receive ticket and system alerts via email', key: 'emailNotifs' }, { label: 'SMS Alerts', desc: 'Get critical alerts via SMS', key: 'smsAlerts' }],
    security: [{ label: 'Two-Factor Authentication', desc: 'Require 2FA on login for all admin accounts', key: 'twoFactor' }, { label: 'Auto Logout', desc: 'Automatically log out after 30 minutes of inactivity', key: 'autoLogout' }],
    integrations: [], profile: [], billing: [],
  };
  const sectionRows = rows[section] || [];
  return (
    <div className="surf">
      <div className="s-section-title">{section.charAt(0).toUpperCase() + section.slice(1)} Settings</div>
      {sectionRows.length > 0 ? sectionRows.map((row) => (
        <div key={row.key} className="setting-row">
          <div><div className="setting-label">{row.label}</div><div className="setting-desc">{row.desc}</div></div>
          <label className="toggle"><input type="checkbox" checked={toggles[row.key] ?? false} onChange={() => onToggle(row.key)} /><span className="toggle-slider" /></label>
        </div>
      )) : (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
          {section === 'integrations' && '🔗 No integrations configured yet.'}
          {section === 'profile' && '👤 Profile settings coming soon.'}
          {section === 'billing' && '💳 Billing information managed externally.'}
        </div>
      )}
    </div>
  );
}

function Modal({ title, subtitle, onClose, footer, children, wide }: { title: string; subtitle: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-ov open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { width: 600, maxWidth: '96vw' } : {}}>
        <div className="modal-head">
          <div className="modal-head-ico"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6"><rect x="2" y="2" width="14" height="14" rx="2" /><path d="M9 6v6M6 9h6" /></svg></div>
          <div style={{ flex: 1 }}><div className="modal-title">{title}</div><div className="modal-sub">{subtitle}</div></div>
          <button className="modal-x" onClick={onClose}><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10" /></svg></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   POS DETAIL MODAL
═══════════════════════════════════════════════════════════ */

function POSDetailModal({ pos, client, posIndex, onClose }: {
  pos: POSDevice; client: Client; posIndex: number; onClose: () => void;
}) {
  const fmtDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };
  const specs = [
    { label: 'Device Model', value: pos.model },
    { label: 'Serial Number', value: pos.serial },
    { label: 'IP Address', value: pos.ip },
    { label: 'OS Version', value: pos.os },
    { label: 'Branch', value: pos.branch },
    { label: 'MSA Start', value: fmtDate(pos.msaStart) },
    { label: 'MSA End', value: fmtDate(pos.msaEnd) },
    { label: 'Warranty Date', value: fmtDate(pos.warrantyDate) },
  ];
  return (
    <div className="modal-ov open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 460, maxWidth: '96vw' }}>
        <div className="modal-head" style={{ background: 'linear-gradient(135deg, #0f766e, #0284c7)' }}>
          <div className="modal-head-ico" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2" /><path d="M2 10h20M12 16v3M8 19h8" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="modal-title">POS {posIndex} — {pos.model}</div>
            <div className="modal-sub">{client.name} · {pos.branch}</div>
          </div>
          <button className="modal-x" onClick={onClose}><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10" /></svg></button>
        </div>
        <div className="modal-body" style={{ padding: '18px 20px', gap: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
            DEVICE SPECIFICATIONS
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {specs.map((row, i) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < specs.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(124,58,237,0.015)', gap: 16 }}>
                <span style={{ fontSize: 11.5, color: 'var(--t3)', fontWeight: 500, flexShrink: 0, minWidth: 110 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.label === 'MSA End' || row.label === 'Warranty Date' ? 'var(--teal)' : row.label === 'OS Version' ? 'var(--purple)' : 'var(--t1)', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-s" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD COMPANY MODAL
═══════════════════════════════════════════════════════════ */

function AddCompanyModal({ form, onChange, onSave, onClose }: {
  form: AddClientFormState; onChange: (f: AddClientFormState) => void; onSave: () => void; onClose: () => void;
}) {
  const MAX_ALT = 2;
  const isFnB = form.cat === 'F&B';
  const isRetailOrWarehouse = form.cat === 'Retail' || form.cat === 'Warehouse';
  const set = (key: keyof AddClientFormState, val: string) => onChange({ ...form, [key]: val });
  const setAlt = (idx: number, field: keyof AltContact, val: string) => { const next = form.altContacts.map((a, i) => (i === idx ? { ...a, [field]: val } : a)); onChange({ ...form, altContacts: next }); };
  const addAlt = () => { if (form.altContacts.length >= MAX_ALT) return; onChange({ ...form, altContacts: [...form.altContacts, { name: '', email: '', phone: '' }] }); };
  const removeAlt = (idx: number) => { onChange({ ...form, altContacts: form.altContacts.filter((_, i) => i !== idx) }); };
  const addSiteSeat = () => onChange({ ...form, siteSeats: [...form.siteSeats, { name: '', seats: '' }] });
  const removeSiteSeat = (idx: number) => onChange({ ...form, siteSeats: form.siteSeats.filter((_, i) => i !== idx) });
  const setSiteSeat = (idx: number, field: keyof SiteSeat, val: string) => { const next = form.siteSeats.map((s, i) => (i === idx ? { ...s, [field]: val } : s)); onChange({ ...form, siteSeats: next }); };
  const addFnbBranch = () => onChange({ ...form, fnbBranches: [...form.fnbBranches, { name: '', keysPerStore: '' }] });
  const removeFnbBranch = (idx: number) => onChange({ ...form, fnbBranches: form.fnbBranches.filter((_, i) => i !== idx) });
  const setFnbBranch = (idx: number, field: keyof FnbBranch, val: string) => { const next = form.fnbBranches.map((b, i) => (i === idx ? { ...b, [field]: val } : b)); onChange({ ...form, fnbBranches: next }); };
  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const dataUrl = ev.target?.result as string; onChange({ ...form, logoPreview: dataUrl, logoUrl: '' }); };
    reader.readAsDataURL(file);
  };
  const logoSrc = form.logoPreview || form.logoUrl;
  const canSave = form.name.trim() && form.cat && form.contact.trim() && form.email.trim();

  return (
    <div className="modal-ov open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 660, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <div className="modal-head-ico"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6"><rect x="2" y="2" width="14" height="14" rx="2" /><path d="M9 6v6M6 9h6" /></svg></div>
          <div style={{ flex: 1 }}><div className="modal-title">Add New Company</div><div className="modal-sub">Register a new client account with contact & billing info</div></div>
          <button className="modal-x" onClick={onClose}><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10" /></svg></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <ACSection icon="🖼️" label="Company Logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 96, height: 96, borderRadius: 18, flexShrink: 0, background: 'var(--surface2)', border: '2px dashed var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {logoSrc ? (<img src={logoSrc} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} onError={() => onChange({ ...form, logoPreview: '', logoUrl: '' })} />) : (<div style={{ textAlign: 'center', color: 'var(--t4)', fontSize: 10, lineHeight: 1.4 }}><div style={{ fontSize: 24, marginBottom: 4 }}>🏢</div>No logo</div>)}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div>
                  <label className="f-lbl" style={{ marginBottom: 5, display: 'block' }}>Upload from device</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--t2)' }}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12"><path d="M7 1v8M4 4l3-3 3 3M2 11h10" /></svg>
                    Choose File
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFile} />
                  </label>
                </div>
                <div>
                  <label className="f-lbl" style={{ marginBottom: 5, display: 'block' }}>Or paste image URL</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="f-in" type="url" placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={(e) => onChange({ ...form, logoUrl: e.target.value, logoPreview: '' })} style={{ flex: 1, fontSize: 11.5 }} />
                    {logoSrc && <button className="btn btn-xs" style={{ background: 'var(--red-lt)', color: 'var(--red)', flexShrink: 0 }} onClick={() => onChange({ ...form, logoUrl: '', logoPreview: '' })}>Clear</button>}
                  </div>
                </div>
              </div>
            </div>
          </ACSection>
          <ACSection icon="🏢" label="Company Information">
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Company Name <Asterisk /></label><input className="f-in" type="text" placeholder="e.g. Starbucks PH" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
              <div className="field-g"><label className="f-lbl">Type of Industry <Asterisk /></label>
                <select className="f-sel" value={form.cat} onChange={(e) => set('cat', e.target.value)}>
                  <option value="">Select industry…</option>
                  <option value="F&B">F&amp;B (Food &amp; Beverage)</option>
                  <option value="Retail">Retail</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>
            </div>
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Contact Person <Asterisk /></label><input className="f-in" type="text" placeholder="Full name" value={form.contact} onChange={(e) => set('contact', e.target.value)} /></div>
              <div className="field-g"><label className="f-lbl">Email <Asterisk /></label><input className="f-in" type="email" placeholder="contact@company.com" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            </div>
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Phone</label><input className="f-in" type="tel" placeholder="+63 2 XXXX XXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              <div className="field-g"><label className="f-lbl">Account Manager</label>
                <select className="f-sel" value={form.accountManager} onChange={(e) => set('accountManager', e.target.value)}>
                  <option value="">Select…</option>
                  {ACCOUNT_MANAGERS.map((am) => <option key={am}>{am}</option>)}
                </select>
              </div>
            </div>
          </ACSection>
          <ACSection icon="📋" label="Alternate Contacts" badge={`${form.altContacts.length} / ${MAX_ALT}`}
            action={form.altContacts.length < MAX_ALT ? (<button className="btn btn-s btn-sm" onClick={addAlt} style={{ gap: 5 }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v10M1 6h10" /></svg>Add Contact</button>) : <span style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>}>
            {form.altContacts.length === 0 && (<div style={{ textAlign: 'center', padding: '14px', color: 'var(--t3)', fontSize: 12, background: 'var(--surface2)', borderRadius: 10, border: '1.5px dashed var(--border-md)' }}>No alternate contacts. <span onClick={addAlt} style={{ color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}>Add one</span></div>)}
            {form.altContacts.map((alt, idx) => (
              <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alternate Contact {idx + 1}</span><button className="btn btn-xs" onClick={() => removeAlt(idx)} style={{ background: 'var(--red-lt)', color: 'var(--red)' }}>Remove</button></div>
                <div className="field-g row">
                  <div className="field-g"><label className="f-lbl">Contact Person</label><input className="f-in" type="text" placeholder="Full name" value={alt.name} onChange={(e) => setAlt(idx, 'name', e.target.value)} /></div>
                  <div className="field-g"><label className="f-lbl">Email</label><input className="f-in" type="email" placeholder="email@company.com" value={alt.email} onChange={(e) => setAlt(idx, 'email', e.target.value)} /></div>
                </div>
                <div className="field-g" style={{ maxWidth: '50%' }}><label className="f-lbl">Phone</label><input className="f-in" type="tel" placeholder="+63 9XX XXX XXXX" value={alt.phone} onChange={(e) => setAlt(idx, 'phone', e.target.value)} /></div>
              </div>
            ))}
          </ACSection>
          {isRetailOrWarehouse && (
            <ACSection icon="🏬" label="Sites & Seats" badge={`${form.siteSeats.length} site${form.siteSeats.length !== 1 ? 's' : ''}`}
              action={<button className="btn btn-s btn-sm" onClick={addSiteSeat} style={{ gap: 5 }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v10M1 6h10" /></svg>Add Site</button>}
              last={!isFnB}>
              <div style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.06), rgba(13,148,136,0.06))', border: '1px solid rgba(2,132,199,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0284c7" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5" /><path d="M7 5v2.5l1.5 1" /></svg>
                <span style={{ fontSize: 11, color: '#075985' }}>Add each site location and its seat count. Applies to <strong>Retail</strong> and <strong>Warehouse</strong> companies.</span>
              </div>
              {form.siteSeats.length === 0 && (<div style={{ textAlign: 'center', padding: '14px', color: 'var(--t3)', fontSize: 12, background: 'var(--surface2)', borderRadius: 10, border: '1.5px dashed var(--border-md)' }}>No sites added yet. <span onClick={addSiteSeat} style={{ color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}>Add one</span></div>)}
              {form.siteSeats.map((site, idx) => (
                <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Site {idx + 1}</span><button className="btn btn-xs" onClick={() => removeSiteSeat(idx)} style={{ background: 'var(--red-lt)', color: 'var(--red)' }}>Remove</button></div>
                  <div className="field-g row">
                    <div className="field-g"><label className="f-lbl">Site / Location Name</label><input className="f-in" type="text" placeholder="e.g. Makati CBD" value={site.name} onChange={(e) => setSiteSeat(idx, 'name', e.target.value)} /></div>
                    <div className="field-g"><label className="f-lbl">Seats</label><input className="f-in" type="number" min="0" placeholder="0" value={site.seats} onChange={(e) => setSiteSeat(idx, 'seats', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              {form.siteSeats.length > 0 && (<div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}><span style={{ fontSize: 10.5, color: 'var(--t3)', fontWeight: 500 }}>Total seats: <strong style={{ color: 'var(--t1)' }}>{form.siteSeats.reduce((s, x) => s + (parseInt(x.seats) || 0), 0)}</strong></span></div>)}
            </ACSection>
          )}
          {isFnB && (
            <ACSection icon="🔑" label="Branches & Keys" badge={`${form.fnbBranches.length} branch${form.fnbBranches.length !== 1 ? 'es' : ''}`}
              action={<button className="btn btn-s btn-sm" onClick={addFnbBranch} style={{ gap: 5 }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v10M1 6h10" /></svg>Add Branch</button>}
              last>
              <div style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.07), rgba(234,179,8,0.05))', border: '1px solid rgba(217,119,6,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#d97706" strokeWidth="1.5"><circle cx="5.5" cy="7" r="3.5" /><path d="M8.5 7h4M11 5.5V7" /></svg>
                <span style={{ fontSize: 11, color: '#92400e' }}>Add each branch with its name and number of keys per store. Applies to <strong>F&amp;B</strong> companies.</span>
              </div>
              {form.fnbBranches.length === 0 && (<div style={{ textAlign: 'center', padding: '14px', color: 'var(--t3)', fontSize: 12, background: 'var(--surface2)', borderRadius: 10, border: '1.5px dashed var(--border-md)' }}>No branches added yet. <span onClick={addFnbBranch} style={{ color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}>Add one</span></div>)}
              {form.fnbBranches.map((branch, idx) => (
                <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Branch {idx + 1}</span><button className="btn btn-xs" onClick={() => removeFnbBranch(idx)} style={{ background: 'var(--red-lt)', color: 'var(--red)' }}>Remove</button></div>
                  <div className="field-g row">
                    <div className="field-g"><label className="f-lbl">Branch Name</label><input className="f-in" type="text" placeholder="e.g. Makati Branch" value={branch.name} onChange={(e) => setFnbBranch(idx, 'name', e.target.value)} /></div>
                    <div className="field-g"><label className="f-lbl">Keys per Store</label><input className="f-in" type="number" min="0" placeholder="e.g. 3" value={branch.keysPerStore} onChange={(e) => setFnbBranch(idx, 'keysPerStore', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </ACSection>
          )}
          {!isFnB && !isRetailOrWarehouse && <div style={{ height: 4 }} />}
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1, fontSize: 10.5, color: 'var(--t4)', fontStyle: 'italic' }}>{!canSave ? 'Fill in required fields (marked with *)' : '✓ Ready to add company'}</div>
          <button className="btn btn-s" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={onSave} style={{ padding: '8px 24px', boxShadow: '0 3px 14px rgba(124,58,237,0.32)', opacity: canSave ? 1 : 0.55, cursor: canSave ? 'pointer' : 'not-allowed' }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12"><path d="M7 1v12M1 7h12" /></svg>
            Add Company
          </button>
        </div>
      </div>
    </div>
  );
}

function ACSection({ icon, label, badge, action, children, last }: { icon: string; label: string; badge?: string; action?: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{label}</span>
        {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--t3)' }}>{badge}</span>}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT INFO MODAL
═══════════════════════════════════════════════════════════ */

function EditInfoModal({ client, form, onChange, onSave, onClose }: {
  client: Client; form: EditInfoFormState; onChange: (f: EditInfoFormState) => void; onSave: () => void; onClose: () => void;
}) {
  const isFnB = client.cat === 'F&B';
  const MAX_ALT = 2;
  const canAddAlt = form.altContacts.length < MAX_ALT;
  const set = (key: keyof EditInfoFormState, val: string) => onChange({ ...form, [key]: val });
  const setAlt = (idx: number, field: keyof AltContact, val: string) => { const next = form.altContacts.map((a, i) => (i === idx ? { ...a, [field]: val } : a)); onChange({ ...form, altContacts: next }); };
  const addAlt = () => { if (!canAddAlt) return; onChange({ ...form, altContacts: [...form.altContacts, { name: '', email: '', phone: '' }] }); };
  const removeAlt = (idx: number) => { onChange({ ...form, altContacts: form.altContacts.filter((_, i) => i !== idx) }); };

  return (
    <div className="modal-ov open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 640, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <div className="modal-head-ico"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6"><path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z" /></svg></div>
          <div style={{ flex: 1 }}><div className="modal-title">Edit General Information</div><div className="modal-sub">{client.name} — update contact, license &amp; account details</div></div>
          <button className="modal-x" onClick={onClose}><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10" /></svg></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <EditSection icon="👤" label="Primary Contact">
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Store / Company Name <Asterisk /></label><input className="f-in" type="text" value={form.storeName} onChange={(e) => set('storeName', e.target.value)} /></div>
              <div className="field-g"><label className="f-lbl">Contact Person <Asterisk /></label><input className="f-in" type="text" value={form.contact} onChange={(e) => set('contact', e.target.value)} /></div>
            </div>
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Email <Asterisk /></label><input className="f-in" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div className="field-g"><label className="f-lbl">Phone</label><input className="f-in" type="tel" placeholder="+63 2 XXXX XXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            </div>
          </EditSection>
          <EditSection icon="📋" label="Alternate Contact" badge={`${form.altContacts.length} / ${MAX_ALT}`}
            action={canAddAlt ? (<button className="btn btn-s btn-sm" onClick={addAlt} style={{ gap: 5 }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v10M1 6h10" /></svg>Add Contact</button>) : (<span style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>)}>
            {form.altContacts.length === 0 && (<div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--t3)', fontSize: 12, background: 'var(--surface2)', borderRadius: 10, border: '1.5px dashed var(--border-md)' }}>No alternate contacts. <span onClick={addAlt} style={{ color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}>Add one</span></div>)}
            {form.altContacts.map((alt, idx) => (
              <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alternate Contact {idx + 1}</span><button className="btn btn-xs" onClick={() => removeAlt(idx)} style={{ background: 'var(--red-lt)', color: 'var(--red)' }}>Remove</button></div>
                <div className="field-g row">
                  <div className="field-g"><label className="f-lbl">Full Name</label><input className="f-in" type="text" placeholder="Contact person" value={alt.name} onChange={(e) => setAlt(idx, 'name', e.target.value)} /></div>
                  <div className="field-g"><label className="f-lbl">Email</label><input className="f-in" type="email" placeholder="email@company.com" value={alt.email} onChange={(e) => setAlt(idx, 'email', e.target.value)} /></div>
                </div>
                <div className="field-g" style={{ maxWidth: '50%' }}><label className="f-lbl">Phone</label><input className="f-in" type="tel" placeholder="+63 9XX XXX XXXX" value={alt.phone} onChange={(e) => setAlt(idx, 'phone', e.target.value)} /></div>
              </div>
            ))}
          </EditSection>
          <EditSection icon="🏢" label="Account Details">
            <div className="field-g row">
              <div className="field-g"><label className="f-lbl">Site / Location</label><input className="f-in" type="text" placeholder="e.g. Makati CBD" value={form.site} onChange={(e) => set('site', e.target.value)} /></div>
              {isFnB ? (<div className="field-g"><label className="f-lbl">Keys per Store</label><input className="f-in" type="number" min="0" value={form.keysPerStore} onChange={(e) => set('keysPerStore', e.target.value)} /></div>) : (<div className="field-g"><label className="f-lbl">Seats</label><input className="f-in" type="number" min="0" value={form.seats} onChange={(e) => set('seats', e.target.value)} /></div>)}
            </div>
          </EditSection>
          {!isFnB && (
            <EditSection icon="🔑" label="License" last>
              <div className="field-g row">
                <div className="field-g"><label className="f-lbl">License ID</label><input className="f-in" type="text" value={form.licenseId} onChange={(e) => set('licenseId', e.target.value)} /></div>
                <div className="field-g"><label className="f-lbl">Krunch #</label><input className="f-in" type="text" value={form.krunchNum} onChange={(e) => set('krunchNum', e.target.value)} /></div>
              </div>
              <div className="field-g row">
                <div className="field-g"><label className="f-lbl">License Start</label><input className="f-in" type="date" value={form.saStart} onChange={(e) => set('saStart', e.target.value)} /></div>
                <div className="field-g"><label className="f-lbl">License End</label><input className="f-in" type="date" value={form.saEnd} onChange={(e) => set('saEnd', e.target.value)} /></div>
              </div>
            </EditSection>
          )}
          {isFnB && <div style={{ height: 4 }} />}
        </div>
        <div className="modal-foot">
          <button className="btn btn-s" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={onSave} style={{ padding: '8px 24px', boxShadow: '0 3px 14px rgba(124,58,237,0.32)' }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BRANCH DETAIL MODAL  — with Edit & Remove POS
═══════════════════════════════════════════════════════════ */

const POS_MODELS = ['PAX A920', 'Sunmi T2', 'Ingenico Move5000', 'Verifone T650P', 'PAX S300'];
const OS_OPTIONS = ['Windows 11', 'Windows 10', 'Windows 8.1', 'Windows 8', 'Windows 7'];

interface POSFormData {
  model: string; serial: string; ip: string; os: string;
  msaStart: string; msaEnd: string; warrantyDate: string;
}

const BLANK_POS_FORM: POSFormData = {
  model: 'PAX A920', serial: '', ip: '', os: 'Windows 10',
  msaStart: '', msaEnd: '', warrantyDate: '',
};

function BranchDetailModal({ branch, client, posDevices, onClose, onAddPOS, onEditPOS, onRemovePOS }: {
  branch: string; client: Client; posDevices: POSDevice[]; onClose: () => void;
  onAddPOS: (branch: string, posData: { model: string; serial: string; ip: string; os: string; msaStart?: string; msaEnd?: string; warrantyDate?: string; }) => void;
  onEditPOS: (posId: string, posData: { model: string; serial: string; ip: string; os: string; msaStart?: string; msaEnd?: string; warrantyDate?: string; }) => void;
  onRemovePOS: (posId: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [posForm, setPosForm] = useState<POSFormData>(BLANK_POS_FORM);
  const [formError, setFormError] = useState('');

  /* ── Edit mode state ── */
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<POSFormData>(BLANK_POS_FORM);
  const [editError, setEditError] = useState('');

  /* ── Remove confirm ── */
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const isFnB = client.cat === 'F&B';
  const isRetail = client.cat === 'Retail';
  const branchPOS = posDevices.filter((d) => d.branch === branch);
  const totalBranches = (client.branches || []).length;
  const seatsPerBranch = Math.ceil((client.seats || 0) / (totalBranches || 1));
  const headerGrad = isFnB ? 'linear-gradient(135deg, #d97706, #f59e0b)' : isRetail ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'linear-gradient(135deg, #0d9488, #14b8a6)';

  const handleSavePOS = () => {
    if (!posForm.serial.trim()) { setFormError('Serial number is required.'); return; }
    if (!posForm.ip.trim()) { setFormError('IP address is required.'); return; }
    setFormError('');
    onAddPOS(branch, posForm);
    setPosForm(BLANK_POS_FORM);
    setShowAddForm(false);
  };

  const startEdit = (pos: POSDevice) => {
    setEditingPosId(pos.id);
    setEditForm({
      model: pos.model,
      serial: pos.serial,
      ip: pos.ip,
      os: pos.os,
      msaStart: pos.msaStart || '',
      msaEnd: pos.msaEnd || '',
      warrantyDate: pos.warrantyDate || '',
    });
    setEditError('');
    setConfirmRemoveId(null);
    setShowAddForm(false);
  };

  const cancelEdit = () => { setEditingPosId(null); setEditError(''); };

  const handleSaveEdit = () => {
    if (!editForm.serial.trim()) { setEditError('Serial number is required.'); return; }
    if (!editForm.ip.trim()) { setEditError('IP address is required.'); return; }
    setEditError('');
    onEditPOS(editingPosId!, editForm);
    setEditingPosId(null);
  };

  const handleRemove = (posId: string) => {
    onRemovePOS(posId);
    setConfirmRemoveId(null);
    if (editingPosId === posId) setEditingPosId(null);
  };

  return (
    <div className="modal-ov open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 600, maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head" style={{ background: headerGrad }}>
          <div className="modal-head-ico"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z" /><circle cx="9" cy="7" r="1.8" /></svg></div>
          <div style={{ flex: 1 }}><div className="modal-title">{branch}</div><div className="modal-sub">{client.name} · {client.cat}</div></div>
          <button className="modal-x" onClick={onClose}><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10" /></svg></button>
        </div>

        <div className="modal-body" style={{ gap: 16, overflowY: 'auto', flex: 1 }}>
          {/* ── Stats row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isFnB ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(13,148,136,0.07)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(13,148,136,0.18)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--teal)', lineHeight: 1 }}>{branchPOS.length}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 4, fontWeight: 500 }}>POS Machines</div>
            </div>
            {isFnB ? (
              <div style={{ background: 'rgba(217,119,6,0.07)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(217,119,6,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706', lineHeight: 1 }}>{client.keysPerStore || '—'}</div>
                <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 4, fontWeight: 500 }}>Keys / Store</div>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(2,132,199,0.07)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(2,132,199,0.18)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>{seatsPerBranch}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 4, fontWeight: 500 }}>Seats</div>
                </div>
                <div style={{ background: 'var(--purple-lt)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(124,58,237,0.18)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--purple)', lineHeight: 1 }}>{totalBranches}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 4, fontWeight: 500 }}>Total Branches</div>
                </div>
              </>
            )}
          </div>

          {/* ── POS list section ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>POS Devices at this Branch</span>
              <span style={{ background: 'var(--purple-lt)', color: 'var(--purple-d)', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{branchPOS.length}</span>
              <div style={{ flex: 1 }} />
              {!showAddForm && !editingPosId && (
                <button className="btn btn-p btn-sm" onClick={() => { setShowAddForm(true); setConfirmRemoveId(null); }} style={{ gap: 5, fontSize: 10.5 }}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M6 1v10M1 6h10" /></svg>
                  Add POS
                </button>
              )}
            </div>

            {/* ── Add new POS form ── */}
            {showAddForm && (
              <div style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.18)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--purple)' }}>New POS Device — {branch}</span>
                  <button className="btn btn-xs" onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(BLANK_POS_FORM); }} style={{ background: 'var(--surface2)', color: 'var(--t2)' }}>✕ Cancel</button>
                </div>
                <POSFormFields form={posForm} onChange={setPosForm} error={formError} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn btn-s btn-sm" onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(BLANK_POS_FORM); }}>Cancel</button>
                  <button className="btn btn-p btn-sm" onClick={handleSavePOS} style={{ boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
                    Save POS
                  </button>
                </div>
              </div>
            )}

            {/* ── POS device list ── */}
            {branchPOS.length === 0 && !showAddForm ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t3)', fontSize: 12, background: 'var(--surface2)', borderRadius: 12, border: '1.5px dashed var(--border-md)' }}>
                No POS machines assigned to this branch yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {branchPOS.map((pos, i) => (
                  <div key={pos.id}>
                    {/* ── Edit form for this POS ── */}
                    {editingPosId === pos.id ? (
                      <div style={{ background: 'rgba(13,148,136,0.04)', border: '1.5px solid rgba(13,148,136,0.22)', borderRadius: 14, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--teal-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--teal)" strokeWidth="1.5"><path d="M9 2l3 3L4 13H1v-3z" /></svg>
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--teal)' }}>Edit POS {i + 1}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'var(--purple-lt)', color: 'var(--purple-d)' }}>{pos.model}</span>
                          </div>
                          <button className="btn btn-xs" onClick={cancelEdit} style={{ background: 'var(--surface2)', color: 'var(--t2)' }}>✕ Cancel</button>
                        </div>
                        <POSFormFields form={editForm} onChange={setEditForm} error={editError} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button className="btn btn-s btn-sm" onClick={cancelEdit}>Cancel</button>
                          <button className="btn btn-p btn-sm" onClick={handleSaveEdit} style={{ background: 'linear-gradient(135deg,var(--teal),#0284c7)', boxShadow: '0 2px 10px rgba(13,148,136,0.3)' }}>
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal POS row ── */
                      <div style={{ borderRadius: 12, border: confirmRemoveId === pos.id ? '1.5px solid var(--red)' : '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)', transition: 'border-color 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--teal-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2" /><path d="M2 10h20M12 16v3M8 19h8" /></svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)' }}>POS {i + 1}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'var(--purple-lt)', color: 'var(--purple-d)' }}>{pos.model}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                              <BranchDetailItem label="Serial" val={pos.serial} />
                              <BranchDetailItem label="IP" val={pos.ip} />
                              <BranchDetailItem label="OS" val={pos.os} />
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                            <button
                              className="btn btn-s btn-xs"
                              onClick={() => { startEdit(pos); }}
                              style={{ gap: 4 }}
                            >
                              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="9" height="9"><path d="M8 1l3 3L4 11H1V8z" /></svg>
                              Edit
                            </button>
                            <button
                              className="btn btn-xs"
                              onClick={() => setConfirmRemoveId(confirmRemoveId === pos.id ? null : pos.id)}
                              style={{ background: 'var(--red-lt)', color: 'var(--red)', gap: 4 }}
                            >
                              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="9" height="9"><path d="M2 3h8M5 3V2h2v1M10 3l-.8 7H2.8L2 3" /></svg>
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* ── Confirm remove banner ── */}
                        {confirmRemoveId === pos.id && (
                          <div style={{ background: 'var(--red-lt)', borderTop: '1px solid rgba(220,38,38,0.18)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--red)" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5" /><path d="M7 4.5v3M7 9.5v.5" /></svg>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', flex: 1 }}>Remove POS {i + 1} ({pos.model})? This cannot be undone.</span>
                            <button className="btn btn-xs" onClick={() => setConfirmRemoveId(null)} style={{ background: 'white', color: 'var(--t2)', border: '1px solid var(--border)' }}>Cancel</button>
                            <button className="btn btn-xs" onClick={() => handleRemove(pos.id)} style={{ background: 'var(--red)', color: 'white', boxShadow: '0 1px 6px rgba(220,38,38,0.3)' }}>Confirm Remove</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot"><button className="btn btn-s" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

/* ── Shared POS form fields ── */
function POSFormFields({ form, onChange, error }: {
  form: POSFormData;
  onChange: (f: POSFormData) => void;
  error: string;
}) {
  const set = (key: keyof POSFormData, val: string) => onChange({ ...form, [key]: val });
  return (
    <>
      <div className="field-g row" style={{ marginBottom: 10 }}>
        <div className="field-g">
          <label className="f-lbl">Model</label>
          <select className="f-sel" value={form.model} onChange={(e) => set('model', e.target.value)}>
            {POS_MODELS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="field-g">
          <label className="f-lbl">Serial Number <Asterisk /></label>
          <input className="f-in" type="text" placeholder="e.g. SN10010001" value={form.serial} onChange={(e) => set('serial', e.target.value)} />
        </div>
      </div>
      <div className="field-g row" style={{ marginBottom: 10 }}>
        <div className="field-g">
          <label className="f-lbl">IP Address <Asterisk /></label>
          <input className="f-in" type="text" placeholder="e.g. 192.168.1.10" value={form.ip} onChange={(e) => set('ip', e.target.value)} />
        </div>
        <div className="field-g">
          <label className="f-lbl">Operating System</label>
          <select className="f-sel" value={form.os} onChange={(e) => set('os', e.target.value)}>
            {OS_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="field-g row" style={{ marginBottom: 10 }}>
        <div className="field-g">
          <label className="f-lbl">MSA Start</label>
          <input className="f-in" type="date" value={form.msaStart} onChange={(e) => set('msaStart', e.target.value)} />
        </div>
        <div className="field-g">
          <label className="f-lbl">MSA End</label>
          <input className="f-in" type="date" value={form.msaEnd} onChange={(e) => set('msaEnd', e.target.value)} />
        </div>
      </div>
      <div className="field-g" style={{ maxWidth: '50%', marginBottom: error ? 6 : 12 }}>
        <label className="f-lbl">Warranty Date</label>
        <input className="f-in" type="date" value={form.warrantyDate} onChange={(e) => set('warrantyDate', e.target.value)} />
      </div>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 10, padding: '6px 10px', background: 'var(--red-lt)', borderRadius: 7 }}>{error}</div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function Asterisk() { return <span style={{ color: 'var(--red)' }}>*</span>; }

function EditSection({ icon, label, badge, action, children, last }: { icon: string; label: string; badge?: string; action?: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{label}</span>
        {badge && (<span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--t3)' }}>{badge}</span>)}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function BranchDetailItem({ label, val }: { label: string; val: string }) {
  return (
    <span style={{ fontSize: 10.5, color: 'var(--t3)' }}>
      <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{label}: </span>{val}
    </span>
  );
}