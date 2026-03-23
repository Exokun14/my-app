'use client';

/* ==============================================================
   dashboard_overview_func.ts  ·  Company Client Overview — Types, Data & Utilities

   CHANGES:
   - ClientCategory is now `string` (was 'F&B' | 'Retail' | 'Warehouse') to support
     dynamic industry types fetched from the `industry_cards` DB table.
   - Added isAlohaType / isRetailType / isWarehouseType helpers — all checks that
     used to compare against string literals now go through these.
   - Removed unused exports: getLogoWrapClass, getHealthLabel, getHealthDotClass,
     getDaysLeft, SETTINGS_SECTIONS, buildNewUser.
   - POSDevice: replaced `ip` with `serial` (serial_number in DB),
     warrantyDate is now a first-class field (stored in pos_machines.warranty_date).
   ============================================================== */

/* ─── Re-export seed data from Sample_Data ──────────────────────────────────── */
export {
  CLIENTS,
  CLIENT_USERS,
  GLOBAL_USERS,
  ALL_TICKETS,
  ACCOUNT_MANAGERS,
  CLIENT_TICKET_ANALYTICS,
} from '../../Sample_Data/Company_Database_sample';

export type {
  ClientTicketTrend,
  ClientTicketCategory,
  ClientBacklogData,
  ClientTicketItem,
  ClientTicketAnalytics,
} from '../../Sample_Data/Company_Database_sample';

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — TYPES & INTERFACES
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * `cat` is the `title` column from the `industry_cards` table (e.g. "ALOHA",
 * "RETAIL", "WAREHOUSE", or any future category).  It is a plain string so
 * that new industry types added in the DB work without code changes.
 */
export type ClientCategory = string;

export type HealthLevel    = 'green' | 'yellow' | 'red';
export type UserRole       = 'System Admin' | 'Manager' | 'User';
export type UserStatus     = 'Active' | 'Inactive';
export type TicketStatus   = 'open' | 'pending' | 'closed';
export type TicketPriority = 'critical' | 'high' | 'normal' | 'low';
export type PageId         = 'overview';
export type SettingsSection =
  | 'general' | 'notifications' | 'security'
  | 'integrations' | 'profile' | 'billing';

export interface Client {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  altContact?:  string;
  altEmail?:    string;
  altPhone?:    string;
  altContact2?: string;
  altEmail2?:   string;
  altPhone2?:   string;
  accountManager: string;
  products: number;
  users: number;
  tickets: number;
  level: HealthLevel;
  /** The `title` value from industry_cards (e.g. "ALOHA", "RETAIL", "WAREHOUSE") */
  cat: ClientCategory;
  logo: string | null;
  branches: string[];
  /** Maps branch_name → database branch id (populated after fetching /api/branches) */
  branchIds?: Record<string, number>;
  posCount: number;
  seats: number;
  site?: string;
  krunchNum?: string;
  saStart?: string;
  saEnd?: string;
  licenseId?: string;
  keysPerStore?: number;
  branchLicenses?: Record<string, string>;
  branchMsaDates?: Record<string, { msaStart?: string; msaEnd?: string }>;
}

export interface ClientUser {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  branch: string;
  position: string;
  password?: string;
  phone?: string;
  avatar?: string;
}

export interface POSDevice {
  id: string;
  model: string;
  licenseNumber: string;
  serial: string;           // was: ip — maps to pos_machines.serial_number
  os: string;
  branch: string;
  status: 'online' | 'offline' | 'maintenance';
  assignedUser?: string;
  msaStart?: string;
  msaEnd?: string;
  warrantyDate?: string;    // maps to pos_machines.warranty_date
}

export interface Ticket {
  id: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  time: string;
  assignee?: string;
  client?: string;
}

export interface TicketGroup {
  open: Ticket[];
  pending: Ticket[];
  closed: Ticket[];
}

export interface GlobalUser {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  company: string;
  position: string;
  avatar?: string;
  phone?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — INDUSTRY TYPE HELPERS
   All code that previously compared client.cat against literal strings
   ('F&B', 'Retail', 'Warehouse') must use these helpers instead.
   The check is case-insensitive so "ALOHA", "Aloha", "aloha" all match.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Returns true for any industry whose title contains "aloha"
 * (e.g. "ALOHA", "Aloha POS", …).
 * Replaces the old `client.cat === 'F&B'` guard.
 */
export function isAlohaType(cat: string): boolean {
  return cat.toLowerCase().includes('aloha');
}

/**
 * Returns true for any industry whose title contains "retail".
 * Replaces the old `client.cat === 'Retail'` guard.
 */
export function isRetailType(cat: string): boolean {
  return cat.toLowerCase().includes('retail');
}

/**
 * Returns true for any industry whose title contains "warehouse".
 * Replaces the old `client.cat === 'Warehouse'` guard.
 */
export function isWarehouseType(cat: string): boolean {
  return cat.toLowerCase().includes('warehouse');
}

/**
 * Returns a human-readable display label for a category title.
 * "ALOHA" → "Aloha", "RETAIL" → "Retail", everything else → title-cased.
 */
export function catDisplayLabel(cat: string): string {
  if (isAlohaType(cat)) return 'Aloha';
  // Title-case the DB value so "RETAIL" renders as "Retail", etc.
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
}

/**
 * Returns a React CSSProperties badge style appropriate for the category.
 * Aloha → amber, Retail → blue, everything else → purple.
 */
export function catBadgeStyle(cat: string): React.CSSProperties {
  if (isAlohaType(cat))   return { background: 'rgba(217,119,6,0.18)',   color: '#92400e', border: '1px solid rgba(217,119,6,0.28)' };
  if (isRetailType(cat))  return { background: 'rgba(2,132,199,0.15)',   color: '#075985', border: '1px solid rgba(2,132,199,0.25)' };
  return                         { background: 'rgba(124,58,237,0.14)', color: '#4c1d95', border: '1px solid rgba(124,58,237,0.24)' };
}

// Import React for the CSSProperties type used above
import type React from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 — UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AVATAR_GRADIENTS: [string, string][] = [
  ['#7c3aed', '#a855f7'],
  ['#0d9488', '#22d3ee'],
  ['#dc2626', '#f97316'],
  ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#ec4899'],
  ['#059669', '#84cc16'],
  ['#9333ea', '#6366f1'],
  ['#0284c7', '#0d9488'],
  ['#b45309', '#f59e0b'],
  ['#be185d', '#fb7185'],
];

export function getAvatarGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/** CSS class name helper — kept for backward compat with any class-based styles. */
export function getCatClass(cat: string): string {
  if (isAlohaType(cat))    return 'cat-fb';
  if (isRetailType(cat))   return 'cat-retail';
  return 'cat-wh';
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getBranchLicense(client: Client, branch: string): string {
  if (isAlohaType(client.cat)) {
    return client.branchLicenses?.[branch] || '';
  }
  return client.licenseId || '';
}

export function generatePOSDevices(client: Client): POSDevice[] {
  const models     = ['PAX A920', 'Sunmi T2', 'Ingenico Move5000', 'Verifone T650P', 'PAX S300'];
  const osVersions = ['Windows 11', 'Windows 10', 'Windows 10', 'Windows 8.1', 'Windows 7'];
  const branches   = client.branches || ['Main Branch'];
  const devices: POSDevice[] = [];

  for (let i = 0; i < client.posCount; i++) {
    const branch       = branches[i % branches.length];
    const msaStartYear = 2022 + (i % 3);
    const msaStart     = `${msaStartYear}-0${(i % 9) + 1}-01`;
    const msaEnd       = `${msaStartYear + 2}-0${(i % 9) + 1}-01`;
    const warrantyDate = `${msaStartYear + 3}-0${(i % 9) + 1}-01`;

    devices.push({
      id:            `POS-${client.id}-${String(i + 1).padStart(3, '0')}`,
      model:         models[i % models.length],
      licenseNumber: getBranchLicense(client, branch),
      serial:        `SN-${String(client.id).padStart(3, '0')}-${String(i + 1).padStart(6, '0')}`,
      os:            osVersions[i % osVersions.length],
      branch,
      status:       i % 8 === 0 ? 'offline' : i % 12 === 0 ? 'maintenance' : 'online',
      assignedUser: i % 3 === 0 ? client.contact : undefined,
      msaStart,
      msaEnd,
      warrantyDate,
    });
  }

  return devices;
}

export function filterUsers(
  users: GlobalUser[],
  activeRoles: Set<string>,
  activeStatuses: Set<string>,
  activePositions: Set<string>,
  searchQuery: string,
): GlobalUser[] {
  const q = searchQuery.toLowerCase().trim();
  return users.filter(u => {
    const roleMatch     = activeRoles.size === 0     || activeRoles.has(u.role);
    const statusMatch   = activeStatuses.size === 0  || activeStatuses.has(u.status);
    const positionMatch = activePositions.size === 0 || activePositions.has(u.position);
    const searchMatch   =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.position.toLowerCase().includes(q);
    return roleMatch && statusMatch && positionMatch && searchMatch;
  });
}

export function getPriorityInfo(
  priority: TicketPriority,
): { class: string; color: string; bg: string } {
  switch (priority) {
    case 'critical': return { class: 'critical', color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  };
    case 'high':     return { class: 'high',     color: '#d97706', bg: 'rgba(217,119,6,0.1)'  };
    case 'normal':   return { class: 'normal',   color: '#0284c7', bg: 'rgba(2,132,199,0.1)'  };
    case 'low':      return { class: 'low',      color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
  }
}

export function formatTimeWidget(): { date: string; time: string } {
  const now  = new Date();
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 4 — TICKETS PANEL CHART HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

import type { ClientTicketTrend, ClientBacklogData, ClientTicketItem } from '../../Sample_Data/Company_Database_sample';

export interface ClientTrendChartPoints {
  mkPts:  (d: number[]) => string;
  mkArea: (d: number[]) => string;
  gridYs: number[];
  W: number;
  H: number;
}

export function buildClientTrendChartPoints(trend: ClientTicketTrend): ClientTrendChartPoints {
  const W = 400, H = 120;
  const { newTickets, resolved, critical } = trend;
  const days = newTickets.length;
  const maxV = Math.max(...newTickets, ...resolved, ...critical, 1);
  const toY  = (v: number) => H - 10 - (v / maxV) * (H - 20);
  const toX  = (i: number) => (i / Math.max(days - 1, 1)) * W;
  const mkPts  = (d: number[]) => d.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const mkArea = (d: number[]) =>
    `M${toX(0)},${H} ` + d.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ') + ` L${toX(days - 1)},${H} Z`;
  const gridYs = [25, 50, 75].map(p => H - 10 - (p / 100) * (H - 20));
  return { mkPts, mkArea, gridYs, W, H };
}

export function getClientCategoryBarWidthPct(n: number, catTotal: number): number {
  if (catTotal === 0) return 0;
  return Math.round((n / catTotal) * 100);
}

export interface ClientBacklogStatItem {
  n:     number;
  label: string;
  sub:   string;
  bg:    string;
  bdr:   string;
  col:   string;
}

export function buildClientBacklogStatItems(backlog: ClientBacklogData): ClientBacklogStatItem[] {
  return [
    {
      n:     backlog.fresh,
      label: 'Fresh',
      sub:   '< 24h open',
      bg:    'rgba(22,163,74,0.07)',
      bdr:   'rgba(22,163,74,0.2)',
      col:   '#16a34a',
    },
    {
      n:     backlog.aging,
      label: 'Aging',
      sub:   '24h – 72h open',
      bg:    'rgba(217,119,6,0.07)',
      bdr:   'rgba(217,119,6,0.2)',
      col:   '#d97706',
    },
    {
      n:     backlog.overdue,
      label: 'Overdue',
      sub:   '> 72h open',
      bg:    'rgba(220,38,38,0.07)',
      bdr:   'rgba(220,38,38,0.2)',
      col:   '#dc2626',
    },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 5 — REAL-DATA HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

export function parseTicketHoursAgo(time: string): number {
  const n = parseInt(time, 10);
  if (isNaN(n)) return 0;
  if (time.includes('m')) return n / 60;
  if (time.includes('h')) return n;
  if (time.includes('d')) return n * 24;
  if (time.includes('w')) return n * 24 * 7;
  return 0;
}

export function computeAvgResolutionHrs(
  analytics: { tickets: { closed: ClientTicketItem[] } } | undefined,
): number {
  if (!analytics || analytics.tickets.closed.length === 0) return 0;

  const priorityHours: Record<string, number> = {
    critical: 1.2,
    high:     1.8,
    normal:   2.2,
    low:      2.5,
  };

  const totalHrs = analytics.tickets.closed.reduce(
    (sum, t) => sum + (priorityHours[t.priority] ?? 2.0),
    0,
  );

  return parseFloat((totalHrs / analytics.tickets.closed.length).toFixed(1));
}

export function buildRealBacklog(clientId: number): ClientBacklogData {
  const { CLIENT_TICKET_ANALYTICS } = require('../../Sample_Data/Company_Database_sample');
  const analytics   = CLIENT_TICKET_ANALYTICS[clientId];
  const openTickets = analytics?.tickets?.open ?? [];

  let fresh = 0, aging = 0, overdue = 0;
  for (const t of openTickets) {
    const h = parseTicketHoursAgo(t.time);
    if (h < 24)       fresh++;
    else if (h <= 72) aging++;
    else              overdue++;
  }

  const total      = openTickets.length || 1;
  const freshPct   = Math.round((fresh   / total) * 100);
  const agingPct   = Math.round((aging   / total) * 100);
  const overduePct = Math.max(0, 100 - freshPct - agingPct);

  const urgencyLabel =
    overdue > total * 0.4
      ? 'escalation is strongly recommended'
      : overdue > total * 0.2
        ? 'escalation is recommended'
        : 'within acceptable range';

  return {
    fresh, aging, overdue,
    freshPct, agingPct, overduePct,
    summary:
      overdue === 0
        ? `All ${total} open ticket${total !== 1 ? 's' : ''} are within SLA. Fresh tickets make up ${freshPct}% of the backlog.`
        : `${overdue} ticket${overdue !== 1 ? 's' : ''} open >72h — ${urgencyLabel}. Fresh tickets make up ${freshPct}% of the backlog.`,
  };
}

export const CATEGORY_DEFS: { label: string; color: string; keywords: string[] }[] = [
  {
    label: 'POS Hardware',
    color: '#7c3aed',
    keywords: [
      'pos', 'printer', 'scanner', 'touchscreen', 'drawer', 'card reader',
      'receipt', 'terminal', 'handheld', 'screen', 'head', 'jam', 'display',
      'hardware', 'device', 'button', 'cash', 'unit', 'slow boot', 'startup',
      'reboot', 'battery', 'replacement', 'calibration', 'unresponsive',
    ],
  },
  {
    label: 'Software / App',
    color: '#0284c7',
    keywords: [
      'software', 'app', 'update', 'patch', 'sync', 'report', 'os',
      'firmware', 'crash', 'freeze', 'error', 'bug', 'install', 'boot',
      'system', 'z-report', 'wms', 'integration', 'duplicate', 'split',
      'void', 'processing', 'font', 'log', 'closing', 'mismatch',
    ],
  },
  {
    label: 'Network',
    color: '#0d9488',
    keywords: [
      'network', 'wi-fi', 'wifi', 'connection', 'connectivity', 'internet',
      'latency', 'timeout', 'drop', 'offline', 'online', 'router', 'switch',
      'ap', 'cable', 'ethernet', 'intermittent', 'conveyor', 'hub',
    ],
  },
  {
    label: 'Account / Access',
    color: '#d97706',
    keywords: [
      'login', 'access', 'account', 'user', 'pin', 'password', 'credential',
      'lockout', 'permission', 'onboarding', 'reactivation', 'provisioning',
      'staff', 'creation', 'reset', 'revoked', 'restored',
    ],
  },
];

export function classifySubject(subject: string): string {
  const lower = subject.toLowerCase();
  for (const def of CATEGORY_DEFS) {
    if (def.keywords.some(kw => lower.includes(kw))) return def.label;
  }
  return 'Other';
}

export interface RealCategory {
  label:    string;
  color:    string;
  n:        number;
  thisWeek: number;
  lastWeek: number;
  change:   number;
  dir:      'up' | 'dn' | 'flat';
}

export function buildRealCategories(clientId: number): RealCategory[] {
  const { CLIENT_TICKET_ANALYTICS } = require('../../Sample_Data/Company_Database_sample');
  const analytics = CLIENT_TICKET_ANALYTICS[clientId];
  if (!analytics) return [];

  const allTickets = [
    ...analytics.tickets.open,
    ...analytics.tickets.pending,
    ...analytics.tickets.closed,
  ];

  const map: Record<string, { color: string; n: number; thisWeek: number; lastWeek: number }> = {};
  for (const def of CATEGORY_DEFS) {
    map[def.label] = { color: def.color, n: 0, thisWeek: 0, lastWeek: 0 };
  }
  map['Other'] = { color: '#6b7280', n: 0, thisWeek: 0, lastWeek: 0 };

  for (const ticket of allTickets) {
    const label = classifySubject(ticket.subject);
    const hours = parseTicketHoursAgo(ticket.time);
    map[label].n++;
    if (hours <= 168)       map[label].thisWeek++;
    else if (hours <= 336)  map[label].lastWeek++;
  }

  return Object.entries(map)
    .filter(([, v]) => v.n > 0)
    .map(([label, v]) => {
      let change = 0;
      let dir: 'up' | 'dn' | 'flat' = 'flat';
      if (v.lastWeek > 0) {
        const raw    = Math.round(((v.thisWeek - v.lastWeek) / v.lastWeek) * 100);
        const capped = Math.max(-30, Math.min(30, raw));
        change = Math.round(capped / 5) * 5;
        dir    = change > 0 ? 'up' : change < 0 ? 'dn' : 'flat';
      }
      return { label, color: v.color, n: v.n, thisWeek: v.thisWeek, lastWeek: v.lastWeek, change, dir };
    })
    .sort((a, b) => b.n - a.n);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 6 — FALLBACK ANALYTICS GENERATOR
   ═══════════════════════════════════════════════════════════════════════════════ */

import type { ClientTicketAnalytics } from '../../Sample_Data/Company_Database_sample';

function _buildFallbackTrend(seed: number, base: number): ClientTicketTrend {
  const newTickets = Array.from({ length: 30 }, (_, i) =>
    Math.max(1, Math.round(
      base +
      Math.sin((i + seed) / 3.2) * (base * 0.4) +
      Math.sin((i * 0.7 + seed)) * (base * 0.2),
    )),
  );
  const resolved = newTickets.map(n => Math.max(0, n - Math.round(n * 0.25)));
  const critical  = newTickets.map(n => Math.max(0, Math.round(n * 0.12)));
  return { newTickets, resolved, critical };
}

function _buildFallbackBacklog(openCount: number, seed: number): ClientBacklogData {
  const freshPct   = Math.min(70, Math.max(30, 52 + (seed % 20) - 10));
  const agingPct   = Math.min(40, Math.max(15, 31 - (seed % 12)));
  const overduePct = 100 - freshPct - agingPct;
  const fresh   = Math.round(openCount * freshPct   / 100);
  const aging   = Math.round(openCount * agingPct   / 100);
  const overdue = openCount - fresh - aging;
  const label   = overdue > openCount * 0.25
    ? 'escalation is recommended'
    : 'within acceptable range';
  return {
    fresh, aging, overdue, freshPct, agingPct, overduePct,
    summary: openCount === 0
      ? 'No open tickets at this time. Backlog is clear.'
      : `${overdue} ticket${overdue !== 1 ? 's' : ''} open >72h — ${label}. Fresh tickets make up ${freshPct}% of the backlog.`,
  };
}

export function getClientAnalytics(clientId: number): ClientTicketAnalytics {
  const { CLIENT_TICKET_ANALYTICS } = require('../../Sample_Data/Company_Database_sample');
  if (CLIENT_TICKET_ANALYTICS[clientId]) return CLIENT_TICKET_ANALYTICS[clientId];

  const seed = clientId;
  const base = Math.max(2, (seed % 8) + 2);

  return {
    trend: _buildFallbackTrend(seed, base),
    categories: [
      { label: 'POS Hardware',     n: base * 3, color: '#7c3aed', change: 0, dir: 'flat' },
      { label: 'Software / App',   n: base * 2, color: '#0284c7', change: 0, dir: 'flat' },
      { label: 'Network',          n: base,     color: '#0d9488', change: 0, dir: 'flat' },
      { label: 'Account / Access', n: Math.max(1, base - 1), color: '#d97706', change: 0, dir: 'flat' },
    ],
    backlog: _buildFallbackBacklog(0, seed),
    tickets: { open: [], pending: [], closed: [] },
  };
}

















