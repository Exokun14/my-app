/* ==============================================================
   DshAdmFunc.ts  ·  Company Database — Types, Data & Utilities
   UPDATED: Added CompanyLicenseGroup type and
            groupBranchesByCompany() which collapses all
            BranchLicenseItem[] into one row per company for the
            License Expiry panel. Each group carries the full
            branch list and per-status counts so the summary
            pills can be rendered without re-computing.
   UPDATED: Added apiFetchIndustryCards() to load industry cards
            from /api/industry-cards for the dynamic StatsBar.
   UPDATED: industry_type is now an int FK. CompanyRow now carries
            industry_title (joined from industry_cards) which is
            used as the ClientCategory directly — no keyword
            guessing. ClientCategory is now string-based so any
            custom industry title maps correctly.
   UPDATED: License expiry status thresholds revised:
            - critical : ≤ 30 days  (1 month)
            - warning  : ≤ 60 days  (2 months)
            - upcoming : ≤ 90 days  (3 months)
            - expired  : past due   (≤ 0 days)
   ============================================================== */

/* ─── Re-export only ACCOUNT_MANAGERS from Sample_Data ─────────────────────── */
export { ACCOUNT_MANAGERS } from '../../Sample_Data/Company_Database_sample';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — TYPES & INTERFACES
   ═══════════════════════════════════════════════════════════════════════════════ */

export type HealthLevel = 'green' | 'yellow' | 'red';
export type LicPeriod   = 'all' | '3m' | '6m' | '1y';

/**
 * ClientCategory is now an open string type.
 * The three legacy buckets (F&B, Retail, Warehouse) are still used
 * for display colour fallbacks, but any industry_cards.title value
 * is now accepted without keyword matching.
 */
export type ClientCategory = 'F&B' | 'Retail' | 'Warehouse' | string;

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

/* ─── Branch types ──────────────────────────────────────────────────────────── */

export interface BranchRow {
  id:              number;
  company_id:      number;
  branch_name:     string;
  license_number:  string | null;
  msa_start_date:  string | null;
  msa_end_date:    string | null;
  created_at:      string;
  updated_at:      string;
}

export interface BranchLicenseItem {
  branchId:       number;
  branchName:     string;
  licenseNumber:  string | null;
  msaStart:       string | null;
  msaEnd:         string | null;
  companyId:      number;
  companyName:    string;
  cat:            ClientCategory;
  accountManager: string;
  logo:           string | null;
  _daysLeft:      number;
  _status:        'expired' | 'critical' | 'warning' | 'upcoming';
}

/**
 * One row in the License Expiry table — one company with all its branches
 * collapsed inside. The modal opens on "View Branches".
 */
export interface CompanyLicenseGroup {
  companyId:      number;
  companyName:    string;
  cat:            ClientCategory;
  accountManager: string;
  logo:           string | null;
  /** Full branch list (all periods) — shown inside the modal */
  branches:       BranchLicenseItem[];
  /** Total branch count regardless of period */
  totalBranches:  number;
  /** Per-status counts within the currently active period filter */
  counts: {
    expired:  number;
    critical: number;
    warning:  number;
    upcoming: number;
  };
  /** Worst status among branches in the current period */
  worstStatus: 'expired' | 'critical' | 'warning' | 'upcoming' | 'none';
}

/* ─── Industry Card type (mirrors add_industry_popup.IndustryCard) ─────────── */
export interface IndustryCard {
  id:         number;
  icon:       string;
  title:      string;
  sub_title:  string | null;
  count:      number;
  tickets:    number;
  color:      string | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — API FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Resolve a ClientCategory from an industry card title.
 *
 * We no longer do keyword guessing. The title from industry_cards IS the
 * category. This ensures "Test Industry", "Logistics", etc. all map to
 * themselves rather than being wrongly bucketed as "Warehouse".
 *
 * The three legacy string values (F&B, Retail, Warehouse) are handled
 * naturally because their titles in industry_cards will match exactly.
 */
function resolveCatFromTitle(title: string): ClientCategory {
  return title?.trim() || 'Warehouse';
}

/**
 * Legacy string map for rows that still carry the old plain-text
 * industry_type string before the FK migration.
 */
const LEGACY_INDUSTRY_TO_CAT: Record<string, ClientCategory> = {
  'Aloha (Food & Beverage)': 'F&B',
  'Retail':                  'Retail',
  'Warehouse':               'Warehouse',
};

interface CompanyRow {
  id:                   number;
  company_name:         string;
  company_logo:         string | null;
  /**
   * After the FK migration this is an int. The index() query joins
   * industry_cards and returns industry_title alongside it.
   */
  industry_type:        number | string | null;
  /** Joined from industry_cards.title — present in all new rows */
  industry_title?:      string | null;
  contact_person:       string;
  email:                string;
  phone:                string | null;
  account_manager:      string | null;
  alternate_contact_1?: number | null;
  alternate_contact_2?: number | null;
  created_at:           string;
  alt1_name?:  string | null;
  alt1_email?: string | null;
  alt1_phone?: string | null;
  alt2_name?:  string | null;
  alt2_email?: string | null;
  alt2_phone?: string | null;
}

function mapRowToClient(row: CompanyRow): Client {
  /*
   * Priority:
   *  1. industry_title from the joined industry_cards row  (new FK rows)
   *  2. Legacy string value of industry_type               (pre-migration rows)
   *  3. Fallback to 'Warehouse'
   */
  let cat: ClientCategory = 'Warehouse';

  if (row.industry_title) {
    cat = resolveCatFromTitle(row.industry_title);
  } else if (typeof row.industry_type === 'string' && row.industry_type) {
    cat = LEGACY_INDUSTRY_TO_CAT[row.industry_type] ?? row.industry_type;
  }

  return {
    id:             row.id,
    name:           row.company_name,
    contact:        row.contact_person,
    email:          row.email,
    phone:          row.phone           ?? '',
    accountManager: row.account_manager ?? '',
    altContact:  row.alt1_name  ?? undefined,
    altEmail:    row.alt1_email ?? undefined,
    altPhone:    row.alt1_phone ?? undefined,
    altContact2: row.alt2_name  ?? undefined,
    altEmail2:   row.alt2_email ?? undefined,
    altPhone2:   row.alt2_phone ?? undefined,
    products:       0,
    users:          0,
    tickets:        0,
    level:          'green',
    cat,
    logo:           row.company_logo ?? null,
    branches:       [],
    posCount:       0,
    seats:          0,
  };
}

export async function apiFetchCompanies(): Promise<Client[]> {
  const res = await fetch(`${API_BASE}/api/companies`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to load companies (HTTP ${res.status})`);
  const data: { success: boolean; data: CompanyRow[] } = await res.json();
  if (!data.success || !Array.isArray(data.data))
    throw new Error('Unexpected response shape from /api/companies');
  return data.data.map(mapRowToClient);
}

export async function apiFetchBranches(companyId?: number): Promise<BranchRow[]> {
  const url = companyId
    ? `${API_BASE}/api/branches?company_id=${companyId}`
    : `${API_BASE}/api/branches`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to load branches (HTTP ${res.status})`);
  const data: { success: boolean; branches: BranchRow[] } = await res.json();
  if (!data.success || !Array.isArray(data.branches))
    throw new Error('Unexpected response shape from /api/branches');
  return data.branches;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 — UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getHealthLabel(level: HealthLevel): string {
  if (level === 'green')  return 'Healthy';
  if (level === 'yellow') return 'Attention';
  return 'Critical';
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function getDaysLeft(dateStr: string | undefined | null): number | null {
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
    const searchOk = !q
      || c.name.toLowerCase().includes(q)
      || c.contact.toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q);
    return catOk && healthOk && searchOk;
  });
}

/* ─── computeLicenseExpiryFromBranches ─────────────────────────────────────── */

const STATUS_ORDER = { expired: 0, critical: 1, warning: 2, upcoming: 3 } as const;

/**
 * Status thresholds (revised):
 *   expired  — past due          (daysLeft ≤ 0)
 *   critical — within 1 month    (daysLeft ≤ 30)
 *   warning  — within 2 months   (daysLeft ≤ 60)
 *   upcoming — within 3 months   (daysLeft ≤ 90)
 *
 * Branches with msa_end_date more than 90 days away are classified as
 * 'upcoming' so they still surface in the panel rather than being silently
 * dropped.  The period filter has been removed so all branches with a date
 * are always included.
 */
export function computeLicenseExpiryFromBranches(
  branches: BranchRow[],
  clients:  Client[],
  period:   LicPeriod,
): BranchLicenseItem[] {
  const maxDays   = period === '3m' ? 90 : period === '6m' ? 180 : period === '1y' ? 365 : Infinity;
  const clientMap = new Map<number, Client>(clients.map(c => [c.id, c]));
  const result: BranchLicenseItem[] = [];

  for (const branch of branches) {
    const company = clientMap.get(branch.company_id);
    if (!company) continue;
    const daysLeft = getDaysLeft(branch.msa_end_date) ?? Infinity;
    if (branch.msa_end_date && daysLeft > maxDays) continue;

    /*
     * Revised thresholds:
     *   expired  ≤ 0 days
     *   critical ≤ 30 days  (1 month)
     *   warning  ≤ 60 days  (2 months)
     *   upcoming ≤ 90 days  (3 months)
     *   beyond 90 days → still 'upcoming' (shown but not urgent)
     */
    const status: BranchLicenseItem['_status'] =
      daysLeft <= 0  ? 'expired'  :
      daysLeft <= 30 ? 'critical' :
      daysLeft <= 60 ? 'warning'  : 'upcoming';

    result.push({
      branchId:       branch.id,
      branchName:     branch.branch_name,
      licenseNumber:  branch.license_number,
      msaStart:       branch.msa_start_date,
      msaEnd:         branch.msa_end_date,
      companyId:      company.id,
      companyName:    company.name,
      cat:            company.cat,
      accountManager: company.accountManager,
      logo:           company.logo,
      _daysLeft:      daysLeft === Infinity ? 999999 : daysLeft,
      _status:        status,
    });
  }

  return result.sort((a, b) =>
    STATUS_ORDER[a._status] !== STATUS_ORDER[b._status]
      ? STATUS_ORDER[a._status] - STATUS_ORDER[b._status]
      : a._daysLeft - b._daysLeft,
  );
}

/* ─── groupBranchesByCompany ────────────────────────────────────────────────── */

/**
 * Collapses a flat BranchLicenseItem[] into one CompanyLicenseGroup per company.
 *
 * @param filteredItems  Period-filtered items — drives counts + which rows appear
 * @param allItems       ALL branch items (all periods) — shown inside the modal
 */
export function groupBranchesByCompany(
  filteredItems: BranchLicenseItem[],
  allItems:      BranchLicenseItem[],
): CompanyLicenseGroup[] {
  const groupMap = new Map<number, CompanyLicenseGroup>();

  /* Seed groups from filtered items */
  for (const item of filteredItems) {
    if (!groupMap.has(item.companyId)) {
      groupMap.set(item.companyId, {
        companyId:      item.companyId,
        companyName:    item.companyName,
        cat:            item.cat,
        accountManager: item.accountManager,
        logo:           item.logo,
        branches:       [],
        totalBranches:  0,
        counts:         { expired: 0, critical: 0, warning: 0, upcoming: 0 },
        worstStatus:    'none',
      });
    }
    groupMap.get(item.companyId)!.counts[item._status]++;
  }

  /* Fill full branch list from allItems (for the modal) */
  const allByCompany = new Map<number, BranchLicenseItem[]>();
  for (const item of allItems) {
    if (!allByCompany.has(item.companyId)) allByCompany.set(item.companyId, []);
    allByCompany.get(item.companyId)!.push(item);
  }

  for (const [cid, group] of groupMap) {
    group.branches      = allByCompany.get(cid) ?? [];
    group.totalBranches = group.branches.length;

    if      (group.counts.expired  > 0) group.worstStatus = 'expired';
    else if (group.counts.critical > 0) group.worstStatus = 'critical';
    else if (group.counts.warning  > 0) group.worstStatus = 'warning';
    else if (group.counts.upcoming > 0) group.worstStatus = 'upcoming';
    else                                group.worstStatus  = 'none';
  }

  const WORST_ORDER: Record<string, number> = { expired: 0, critical: 1, warning: 2, upcoming: 3, none: 4 };
  return Array.from(groupMap.values()).sort((a, b) =>
    WORST_ORDER[a.worstStatus] !== WORST_ORDER[b.worstStatus]
      ? WORST_ORDER[a.worstStatus] - WORST_ORDER[b.worstStatus]
      : a.companyName.localeCompare(b.companyName),
  );
}

/* ─── Legacy computeLicenseExpiry ───────────────────────────────────────────── */
export function computeLicenseExpiry(clients: Client[], period: LicPeriod): LicenseItem[] {
  const maxDays = period === '3m' ? 90 : period === '6m' ? 180 : period === '1y' ? 365 : Infinity;
  const result: LicenseItem[] = [];
  for (const c of clients) {
    if (!c.saEnd) continue;
    const daysLeft = getDaysLeft(c.saEnd) ?? Infinity;
    if (daysLeft > maxDays) continue;
    /*
     * Revised thresholds (kept in sync with computeLicenseExpiryFromBranches):
     *   expired  ≤ 0   days
     *   critical ≤ 30  days (1 month)
     *   warning  ≤ 60  days (2 months)
     *   upcoming > 60  days
     */
    const status: LicenseItem['_status'] =
      daysLeft <= 0  ? 'expired'  :
      daysLeft <= 30 ? 'critical' :
      daysLeft <= 60 ? 'warning'  : 'upcoming';
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
    products: 0, users: 0, tickets: 0,
    level: 'green', cat,
    logo: logo || null,
    branches: site ? [site] : [],
    posCount: 0, seats, site, keysPerStore,
    branchLicenses: cat === 'F&B' ? {} : undefined,
  };
}