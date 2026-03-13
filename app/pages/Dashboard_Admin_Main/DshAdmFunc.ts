/* ==============================================================
   DshAdmFunc.ts  ·  Company Database — Types, Data & Utilities
   UPDATED: apiFetchCompanies now maps alt1/alt2 contact fields
            returned by the Laravel API JOIN query so that the
            Client Overview General Information panel can display
            both alternate contacts from the DB.
   UPDATED: apiFetchCompanies now uses the shared apiRequest helper
            (CSRF token, credentials:include, JSON guard, debug logs)
            consistent with api_service.ts — raw fetch removed.
   ============================================================== */

/* ─── Re-export only ACCOUNT_MANAGERS from Sample_Data ─────────────────────── */
export { ACCOUNT_MANAGERS } from '../../Sample_Data/Company_Database_sample';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost'}/api`;

/* ─── Shared request helper (mirrors api_service.ts apiRequest) ─────────────── */
function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const CSRF_MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const fullUrl = `${API_BASE}${endpoint}`;
  const method  = (options.method ?? 'GET').toUpperCase();

  const logGroup = CSRF_MUTATING.has(method) ? console.group : console.groupCollapsed;
  logGroup(`[DshAdmFunc] ${method} ${endpoint}`);
  console.log('🔵 URL:', fullUrl);

  const csrfHeaders: Record<string, string> = {};
  if (CSRF_MUTATING.has(method)) {
    const token = getCsrfToken();
    if (token) {
      csrfHeaders['X-XSRF-TOKEN'] = token;
      console.log('🔐 CSRF token attached');
    } else {
      console.warn('⚠️ XSRF-TOKEN cookie not found');
    }
  }

  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'X-User-Id':    '1',
      ...csrfHeaders,
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: 'include',
    ...options,
  });

  const text        = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  console.log('📥 Status:', response.status, response.statusText);
  console.log('📥 Body preview:', text.substring(0, 300));

  if (!contentType.includes('application/json')) {
    console.error('❌ Expected JSON but got:', contentType);
    console.groupEnd();
    throw new Error(`Server returned ${contentType} instead of JSON`);
  }

  let data: any;
  try   { data = JSON.parse(text); }
  catch { console.groupEnd(); throw new Error('Invalid JSON from server'); }

  if (!response.ok) {
    console.warn('⚠️ HTTP', response.status, data);
    console.groupEnd();
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  console.log('✅ Success');
  console.groupEnd();
  return data as T;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — TYPES & INTERFACES
   ═══════════════════════════════════════════════════════════════════════════════ */

export type HealthLevel    = 'green' | 'yellow' | 'red';
export type LicPeriod      = 'all' | '3m' | '6m' | '1y';

/** Matches the ClientCategory union in dashboard_overview_func.ts */
export type ClientCategory = 'F&B' | 'Retail' | 'Warehouse';

export interface Client {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  /* ── Alternate contact 1 ── */
  altContact?:  string;
  altEmail?:    string;
  altPhone?:    string;
  /* ── Alternate contact 2 ── */
  altContact2?: string;
  altEmail2?:   string;
  altPhone2?:   string;
  accountManager: string;
  products: number;
  users: number;
  tickets: number;
  level: HealthLevel;
  cat: ClientCategory;
  logo: string | null;
  branches: string[];
  posCount: number;
  seats: number;
  site?: string;
  krunchNum?: string;
  saStart?: string;
  saEnd?: string;
  licenseId?: string;
  keysPerStore?: number;
  /** Aloha: per-branch license map. Retail/Warehouse: use licenseId (shared). */
  branchLicenses?: Record<string, string>;
}

export interface StatsBarData {
  total: number;
  fb:        { count: number; tickets: number };
  retail:    { count: number; tickets: number };
  warehouse: { count: number; tickets: number };
}

export interface LicenseItem extends Client {
  _daysLeft: number;
  _status: 'expired' | 'critical' | 'warning' | 'upcoming';
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — API → Client MAPPER
   Actual field names returned by GET /api/companies:
     id, name, store_name, industry ('fnb'|'retail'|'warehouse'),
     contact_email, contact_person, phone, account_manager,
     alt_contact_person, alt_contact_email, alt_contact_phone,
     company_logo (may be absent), msa_start, msa_end, active
   ═══════════════════════════════════════════════════════════════════════════════ */

const INDUSTRY_TO_CAT: Record<string, ClientCategory> = {
  /* API returns short codes */
  'fnb':       'F&B',
  'retail':    'Retail',
  'warehouse': 'Warehouse',
  /* Legacy / long-form values kept for safety */
  'Aloha (Food & Beverage)': 'F&B',
  'Retail':                  'Retail',
  'Warehouse':               'Warehouse',
};

/** Shape actually returned by GET /api/companies */
interface CompanyRow {
  id:                    number;
  name?:                 string | null;    // old column
  company_name?:         string | null;    // new column added by migration
  store_name?:           string | null;
  industry?:             string | null;    // old column: 'fnb' | 'retail' | 'warehouse'
  industry_type?:        string | null;    // new column: 'Aloha (Food & Beverage)' | 'Retail' | 'Warehouse'
  contact_email?:        string | null;    // old primary email column
  email?:                string | null;    // new email column
  contact_person?:       string | null;
  phone?:                string | null;
  account_manager?:      string | null;
  /* Alternate contact (single row, not joined) */
  alt_contact_person?:   string | null;
  alt_contact_email?:    string | null;
  alt_contact_phone?:    string | null;
  /* Joined alternate contacts from new schema */
  alt1_name?:            string | null;
  alt1_email?:           string | null;
  alt1_phone?:           string | null;
  alt2_name?:            string | null;
  alt2_email?:           string | null;
  alt2_phone?:           string | null;
  /* Optional fields */
  company_logo?:         string | null;
  msa_start?:            string | null;
  msa_end?:              string | null;
  active?:               boolean | number | null;
  created_at?:           string;
}

function mapRowToClient(row: CompanyRow): Client {
  /* ── Resolve name: new rows use company_name, old rows use name ── */
  const resolvedName     = row.company_name || row.name || 'Unknown';
  const resolvedIndustry = row.industry_type || row.industry || '';
  const resolvedEmail    = row.email || row.contact_email || '';

  console.log(
    `[DshAdmFunc] mapRowToClient — id:${row.id} name:"${resolvedName}" industry:"${resolvedIndustry}"`,
  );
  return {
    id:             row.id,
    name:           resolvedName,
    contact:        row.contact_person  ?? '',
    email:          resolvedEmail,
    phone:          row.phone           ?? '',
    accountManager: row.account_manager ?? '',

    /* ── Alternate contact 1: prefer joined alt1, fall back to flat columns ── */
    altContact:  row.alt1_name  || row.alt_contact_person || undefined,
    altEmail:    row.alt1_email || row.alt_contact_email  || undefined,
    altPhone:    row.alt1_phone || row.alt_contact_phone  || undefined,

    /* ── Alternate contact 2 ── */
    altContact2: row.alt2_name  || undefined,
    altEmail2:   row.alt2_email || undefined,
    altPhone2:   row.alt2_phone || undefined,

    products:       0,
    users:          0,
    tickets:        0,
    level:          'green',
    cat:            INDUSTRY_TO_CAT[resolvedIndustry] ?? 'Warehouse',
    logo:           row.company_logo ?? null,
    branches:       [],
    posCount:       0,
    seats:          0,
    saStart:        row.msa_start ?? undefined,
    saEnd:          row.msa_end   ?? undefined,
  };
}

/**
 * Fetch all companies from the Laravel API and return them as Client[].
 * The endpoint returns a flat array — no success/data wrapper.
 * Uses the shared apiRequest helper (CSRF, credentials, JSON guard, debug logs).
 */
export async function apiFetchCompanies(): Promise<Client[]> {
  // The endpoint returns either a flat array OR a {success,data} envelope —
  // handle both so this works regardless of Laravel API Resource version.
  const raw = await apiRequest<CompanyRow[] | { success: boolean; data: CompanyRow[] }>('/companies');

  let rows: CompanyRow[];
  if (Array.isArray(raw)) {
    console.log(`[DshAdmFunc] apiFetchCompanies — flat array response, ${raw.length} rows`);
    rows = raw;
  } else if (raw && Array.isArray((raw as any).data)) {
    const envelope = raw as { success: boolean; data: CompanyRow[] };
    console.log(`[DshAdmFunc] apiFetchCompanies — envelope response, success=${envelope.success}, ${envelope.data.length} rows`);
    rows = envelope.data;
  } else {
    console.error('[DshAdmFunc] apiFetchCompanies — unexpected response shape:', raw);
    throw new Error('Unexpected response shape from /api/companies');
  }

  const clients = rows.map(mapRowToClient);
  console.log(`[DshAdmFunc] apiFetchCompanies — mapped ${clients.length} clients`);
  return clients;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 — UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

export function getInitials(name: string | undefined | null): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getHealthLabel(level: HealthLevel): string {
  if (level === 'green')  return 'Healthy';
  if (level === 'yellow') return 'Attention';
  return 'Critical';
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

export function getDaysLeft(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function computeStatsBarData(clients: Client[]): StatsBarData {
  const total     = clients.length;
  const fb        = clients.filter(c => c.cat === 'F&B');
  const retail    = clients.filter(c => c.cat === 'Retail');
  const warehouse = clients.filter(c => c.cat === 'Warehouse');
  return {
    total,
    fb:        { count: fb.length,        tickets: fb.reduce((s, c)        => s + c.tickets, 0) },
    retail:    { count: retail.length,    tickets: retail.reduce((s, c)    => s + c.tickets, 0) },
    warehouse: { count: warehouse.length, tickets: warehouse.reduce((s, c) => s + c.tickets, 0) },
  };
}

export function filterClients(
  clients: Client[],
  activeCats: Set<string>,
  activeHealth: Set<string>,
  search: string,
): Client[] {
  const q = search.toLowerCase().trim();
  return clients.filter(c => {
    const catOk    = activeCats.size === 0   || activeCats.has(c.cat);
    const healthOk = activeHealth.size === 0 || activeHealth.has(c.level);
    const searchOk =
      !q ||
      c.name.toLowerCase().includes(q)    ||
      c.contact.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    return catOk && healthOk && searchOk;
  });
}

export function computeLicenseExpiry(clients: Client[], period: LicPeriod): LicenseItem[] {
  const now     = new Date(); now.setHours(0, 0, 0, 0);
  const maxDays = period === '3m' ? 90 : period === '6m' ? 180 : period === '1y' ? 365 : Infinity;
  const result: LicenseItem[] = [];

  for (const c of clients) {
    if (!c.saEnd) continue;
    const daysLeft = getDaysLeft(c.saEnd) ?? Infinity;
    if (daysLeft > maxDays) continue;
    const status: LicenseItem['_status'] =
      daysLeft <= 0  ? 'expired'  :
      daysLeft <= 30 ? 'critical' :
      daysLeft <= 90 ? 'warning'  : 'upcoming';
    result.push({ ...c, _daysLeft: daysLeft, _status: status });
  }

  return result.sort((a, b) => a._daysLeft - b._daysLeft);
}

export function buildNewClient(
  name: string,
  contact: string,
  email: string,
  phone: string,
  cat: ClientCategory,
  site: string,
  seats: number,
  accountManager: string,
  logo: string,
  altContacts: { name: string; email: string; phone: string }[],
  keysPerStore?: number,
): Client | null {
  if (!name.trim() || !contact.trim() || !email.trim() || !cat) return null;
  const alt0 = altContacts[0];
  const alt1 = altContacts[1];
  return {
    id: Date.now(),
    name: name.trim(),
    contact: contact.trim(),
    email: email.trim(),
    phone: phone.trim(),
    altContact:  alt0?.name  || undefined,
    altEmail:    alt0?.email || undefined,
    altPhone:    alt0?.phone || undefined,
    altContact2: alt1?.name  || undefined,
    altEmail2:   alt1?.email || undefined,
    altPhone2:   alt1?.phone || undefined,
    accountManager,
    products: 0,
    users: 0,
    tickets: 0,
    level: 'green',
    cat,
    logo: logo || null,
    branches: site ? [site] : [],
    posCount: 0,
    seats,
    site,
    keysPerStore,
    branchLicenses: cat === 'F&B' ? {} : undefined,
  };
}