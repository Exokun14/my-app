/* ==============================================================
   DshAdmFunc.ts  ·  Company Database — Types, Data & Utilities
          Connection function for DashboardAdmin.tsx
   ============================================================== */


/* ═══════════════════════════════════════════════
   SECTION 1: TYPES & INTERFACES
   ═══════════════════════════════════════════════ */

export type HealthLevel = 'green' | 'yellow' | 'red';
export type ClientCategory = 'F&B' | 'Retail' | 'Warehouse';
export type LicenseStatus = 'expired' | 'critical' | 'warning' | 'upcoming';
export type LicPeriod = 'all' | '3m' | '6m' | '1y' | 'custom';

export interface Client {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  altContact?: string;
  altEmail?: string;
  altPhone?: string;
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
}

export interface StatsBarData {
  total: number;
  fb: { count: number; tickets: number };
  retail: { count: number; tickets: number };
  warehouse: { count: number; tickets: number };
}

export interface LicenseItem extends Client {
  _endDate: Date;
  _daysLeft: number;
  _status: LicenseStatus;
}


/* ═══════════════════════════════════════════════
   SECTION 2: DATA CONSTANTS
   ═══════════════════════════════════════════════ */

export const CLIENTS: Client[] = [
  {
    id: 1,
    name: 'Starbucks',
    contact: 'Martin Roberts',
    email: 'martin@starbucks.com',
    phone: '+63 2 8888 1001',
    altContact: 'Sarah Lim',
    altEmail: 'sarah@starbucks.com',
    altPhone: '+63 917 111 2001',
    accountManager: 'Lisa Cruz',
    products: 12,
    users: 16,
    tickets: 0,
    level: 'green',
    cat: 'F&B',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/200px-Starbucks_Corporation_Logo_2011.svg.png',
    branches: ['Makati', 'BGC', 'Ortigas'],
    posCount: 5,
    seats: 16,
    site: 'Makati CBD',
    krunchNum: 'KRN-10231',
    saStart: '2024-01-15',
    saEnd: '2026-06-14',
    licenseId: 'LIC-SBX-2024-0112',
    keysPerStore: 3,
  },
  {
    id: 2,
    name: 'Ace Hardware',
    contact: 'John Kent',
    email: 'john@ace.com',
    phone: '+63 2 8555 2002',
    altContact: 'Mel Torres',
    altEmail: 'mel@ace.com',
    altPhone: '+63 918 222 3002',
    accountManager: 'Renz Tolentino',
    products: 4,
    users: 9,
    tickets: 5,
    level: 'yellow',
    cat: 'Retail',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Ace_Hardware_logo.svg/200px-Ace_Hardware_logo.svg.png',
    branches: ['Quezon City', 'Pasay'],
    posCount: 4,
    seats: 9,
    site: 'QC Main Store',
    krunchNum: 'KRN-20445',
    saStart: '2024-03-01',
    saEnd: '2026-02-14',
    licenseId: 'LIC-ACE-2024-0203',
  },
  {
    id: 3,
    name: 'Popeyes',
    contact: 'John Doe',
    email: 'john@popeyes.com',
    phone: '+63 2 8444 3003',
    altContact: 'Rica Cruz',
    altEmail: 'rica@popeyes.com',
    altPhone: '+63 919 333 4003',
    accountManager: 'Maria Santos',
    products: 8,
    users: 9,
    tickets: 8,
    level: 'red',
    cat: 'F&B',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b8/Popeyes_logo.svg/200px-Popeyes_logo.svg.png',
    branches: ['Manila Branch', 'Makati Branch'],
    posCount: 7,
    seats: 12,
    site: 'Manila HQ',
    krunchNum: 'KRN-30887',
    saStart: '2024-06-01',
    saEnd: '2026-03-15',
    licenseId: 'LIC-POP-2024-0601',
    keysPerStore: 4,
  },
  {
    id: 4,
    name: '7-Eleven',
    contact: 'Kyle Jennings',
    email: 'kyle@7eleven.com',
    phone: '+63 2 8333 4004',
    altContact: 'Anna Cruz',
    altEmail: 'anna@7eleven.com',
    altPhone: '+63 920 444 5004',
    accountManager: 'Jake Reyes',
    products: 1,
    users: 1,
    tickets: 0,
    level: 'green',
    cat: 'Retail',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/7-eleven_logo.svg/200px-7-eleven_logo.svg.png',
    branches: ['Caloocan', 'Pasig'],
    posCount: 3,
    seats: 5,
    site: 'Caloocan',
    krunchNum: 'KRN-40123',
    saStart: '2025-01-01',
    saEnd: '2027-01-01',
    licenseId: 'LIC-7EL-2025-0101',
  },
  {
    id: 5,
    name: 'Wolfgang Grill',
    contact: 'Walter King',
    email: 'walter@wolfganggrill.com',
    phone: '+63 2 8222 5005',
    altContact: 'Petra Reyes',
    altEmail: 'petra@wolfganggrill.com',
    altPhone: '+63 921 555 6005',
    accountManager: 'Ana Mendez',
    products: 14,
    users: 9,
    tickets: 0,
    level: 'green',
    cat: 'F&B',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Wolfgang_Puck_logo.svg/200px-Wolfgang_Puck_logo.svg.png',
    branches: ['BGC Main'],
    posCount: 2,
    seats: 10,
    site: 'BGC Fort',
    krunchNum: 'KRN-50321',
    saStart: '2024-09-01',
    saEnd: '2026-04-30',
    licenseId: 'LIC-WGG-2024-0901',
    keysPerStore: 2,
  },
  {
    id: 6,
    name: 'Rolex',
    contact: 'James Blue',
    email: 'james@rolex.com',
    phone: '+63 2 8111 6006',
    altContact: 'Chloe Tan',
    altEmail: 'chloe@rolex.com',
    altPhone: '+63 922 666 7006',
    accountManager: 'Lisa Cruz',
    products: 4,
    users: 8,
    tickets: 0,
    level: 'green',
    cat: 'Retail',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Rolex_logo.svg/200px-Rolex_logo.svg.png',
    branches: ['Greenbelt', 'Shangri-La'],
    posCount: 3,
    seats: 8,
    site: 'Greenbelt 5',
    krunchNum: 'KRN-60014',
    saStart: '2024-02-01',
    saEnd: '2026-03-20',
    licenseId: 'LIC-RLX-2024-0201',
  },
  {
    id: 7,
    name: 'Amazon Fulfillment',
    contact: 'Sara Chen',
    email: 'sara@amazon.com',
    phone: '+63 2 8000 7007',
    altContact: 'Dan Park',
    altEmail: 'dan@amazon.com',
    altPhone: '+63 923 777 8007',
    accountManager: 'Renz Tolentino',
    products: 32,
    users: 24,
    tickets: 2,
    level: 'yellow',
    cat: 'Warehouse',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png',
    branches: ['Laguna Warehouse', 'Cavite Hub'],
    posCount: 6,
    seats: 30,
    site: 'Laguna Tech',
    krunchNum: 'KRN-70556',
    saStart: '2024-04-01',
    saEnd: '2027-03-31',
    licenseId: 'LIC-AMZ-2024-0401',
  },
  {
    id: 8,
    name: 'FedEx Depot',
    contact: 'Tom Harris',
    email: 'tom@fedex.com',
    phone: '+63 2 7999 8008',
    altContact: 'Kim Lee',
    altEmail: 'kim@fedex.com',
    altPhone: '+63 924 888 9008',
    accountManager: 'Jake Reyes',
    products: 8,
    users: 12,
    tickets: 0,
    level: 'green',
    cat: 'Warehouse',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/FedEx_Corporation_-_2016_Logo.svg/200px-FedEx_Corporation_-_2016_Logo.svg.png',
    branches: ['Paranaque Depot'],
    posCount: 4,
    seats: 12,
    site: 'Paranaque',
    krunchNum: 'KRN-80223',
    saStart: '2024-05-15',
    saEnd: '2026-06-30',
    licenseId: 'LIC-FDX-2024-0515',
  },
  {
    id: 9,
    name: 'IKEA',
    contact: 'Lisa Park',
    email: 'lisa@ikea.com',
    phone: '+63 2 7888 9009',
    altContact: 'Max Weber',
    altEmail: 'max@ikea.com',
    altPhone: '+63 925 999 1009',
    accountManager: 'Maria Santos',
    products: 22,
    users: 15,
    tickets: 3,
    level: 'yellow',
    cat: 'Retail',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ikea_logo.svg/200px-Ikea_logo.svg.png',
    branches: ['Pasay Store'],
    posCount: 5,
    seats: 15,
    site: 'Pasay City',
    krunchNum: 'KRN-90112',
    saStart: '2024-07-01',
    saEnd: '2026-05-10',
    licenseId: 'LIC-IKA-2024-0701',
  },
  {
    id: 10,
    name: 'DHL Warehouse',
    contact: 'Mike Sato',
    email: 'mike@dhl.com',
    phone: '+63 2 7777 1010',
    altContact: 'Nina Cruz',
    altEmail: 'nina@dhl.com',
    altPhone: '+63 926 100 2010',
    accountManager: 'Ana Mendez',
    products: 11,
    users: 18,
    tickets: 1,
    level: 'yellow',
    cat: 'Warehouse',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/DHL_Logo.svg/200px-DHL_Logo.svg.png',
    branches: ['Taguig Hub', 'Clark'],
    posCount: 4,
    seats: 20,
    site: 'Taguig',
    krunchNum: 'KRN-10045',
    saStart: '2024-08-01',
    saEnd: '2026-07-31',
    licenseId: 'LIC-DHL-2024-0801',
  },
  {
    id: 11,
    name: "McDonald's",
    contact: 'Amy Fox',
    email: 'amy@mcdonalds.com',
    phone: '+63 2 7666 1111',
    altContact: 'Leo Santos',
    altEmail: 'leo@mcdonalds.com',
    altPhone: '+63 927 111 3011',
    accountManager: 'Lisa Cruz',
    products: 9,
    users: 11,
    tickets: 0,
    level: 'green',
    cat: 'F&B',
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/200px-McDonald%27s_Golden_Arches.svg.png",
    branches: ['Makati', 'Manila', 'Cebu'],
    posCount: 7,
    seats: 15,
    site: 'Manila',
    krunchNum: 'KRN-11033',
    saStart: '2024-10-01',
    saEnd: '2026-04-15',
    licenseId: 'LIC-MCD-2024-1001',
    keysPerStore: 5,
  },
  {
    id: 12,
    name: 'Nike Retail',
    contact: 'Chris Lee',
    email: 'chris@nike.com',
    phone: '+63 2 7555 1212',
    altContact: 'Faye Uy',
    altEmail: 'faye@nike.com',
    altPhone: '+63 928 222 4012',
    accountManager: 'Renz Tolentino',
    products: 17,
    users: 13,
    tickets: 0,
    level: 'green',
    cat: 'Retail',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png',
    branches: ['SM Mall', 'Ayala'],
    posCount: 4,
    seats: 14,
    site: 'SM MOA',
    krunchNum: 'KRN-12044',
    saStart: '2025-01-15',
    saEnd: '2026-06-14',
    licenseId: 'LIC-NKE-2025-0115',
  },
  {
    id: 13,
    name: 'Puma',
    contact: 'Elena Torres',
    email: 'elena@puma.com',
    phone: '+63 2 7444 1313',
    altContact: 'Roy Kim',
    altEmail: 'roy@puma.com',
    altPhone: '+63 929 333 5013',
    accountManager: 'Jake Reyes',
    products: 6,
    users: 7,
    tickets: 1,
    level: 'yellow',
    cat: 'Retail',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Puma_logo.svg/200px-Puma_logo.svg.png',
    branches: ['Eastwood Store'],
    posCount: 2,
    seats: 7,
    site: 'Eastwood',
    krunchNum: 'KRN-13067',
    saStart: '2024-11-01',
    saEnd: '2027-10-31',
    licenseId: 'LIC-PMA-2024-1101',
  },
  {
    id: 14,
    name: 'Jollibee',
    contact: 'Rico Santos',
    email: 'rico@jollibee.com',
    phone: '+63 2 7333 1414',
    altContact: 'Lena Delos Reyes',
    altEmail: 'lena@jollibee.com',
    altPhone: '+63 930 444 6014',
    accountManager: 'Maria Santos',
    products: 10,
    users: 14,
    tickets: 3,
    level: 'yellow',
    cat: 'F&B',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Jollibee_logo.svg/200px-Jollibee_logo.svg.png',
    branches: ['Manila', 'Davao', 'Cebu'],
    posCount: 5,
    seats: 18,
    site: 'Manila',
    krunchNum: 'KRN-14023',
    saStart: '2024-12-01',
    saEnd: '2027-11-30',
    licenseId: 'LIC-JLB-2024-1201',
    keysPerStore: 4,
  },
  {
    id: 15,
    name: 'UPS Supply Chain',
    contact: 'Drew Campbell',
    email: 'drew@ups.com',
    phone: '+63 2 7222 1515',
    altContact: 'Sandy Ho',
    altEmail: 'sandy@ups.com',
    altPhone: '+63 931 555 7015',
    accountManager: 'Ana Mendez',
    products: 18,
    users: 22,
    tickets: 0,
    level: 'green',
    cat: 'Warehouse',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/UPS_Logo_Shield_2017.svg/200px-UPS_Logo_Shield_2017.svg.png',
    branches: ['NLEX Hub'],
    posCount: 6,
    seats: 25,
    site: 'Bulacan',
    krunchNum: 'KRN-15099',
    saStart: '2025-02-01',
    saEnd: '2027-01-31',
    licenseId: 'LIC-UPS-2025-0201',
  },
];

export const ACCOUNT_MANAGERS = ['Lisa Cruz', 'Renz Tolentino', 'Maria Santos', 'Jake Reyes', 'Ana Mendez'];


/* ═══════════════════════════════════════════════
   SECTION 3: UTILITY FUNCTIONS
   ═══════════════════════════════════════════════ */

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function getCatClass(cat: ClientCategory | string): string {
  if (cat === 'F&B') return 'cat-fb';
  if (cat === 'Retail') return 'cat-retail';
  return 'cat-wh';
}

export function getLogoWrapClass(cat: ClientCategory | string): string {
  if (cat === 'F&B') return 'lw-fb';
  if (cat === 'Retail') return 'lw-retail';
  return 'lw-wh';
}

export function getHealthLabel(level: HealthLevel): string {
  if (level === 'green') return 'Healthy';
  if (level === 'yellow') return 'Attention';
  return 'Critical';
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDaysLeft(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function getLicenseStatus(daysLeft: number): LicenseStatus {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'critical';
  if (daysLeft <= 90) return 'warning';
  return 'upcoming';
}

export function computeStatsBarData(clients: Client[]): StatsBarData {
  const fb        = clients.filter((c) => c.cat === 'F&B');
  const retail    = clients.filter((c) => c.cat === 'Retail');
  const warehouse = clients.filter((c) => c.cat === 'Warehouse');
  return {
    total: clients.length,
    fb:        { count: fb.length,        tickets: fb.reduce((s, c) => s + c.tickets, 0) },
    retail:    { count: retail.length,    tickets: retail.reduce((s, c) => s + c.tickets, 0) },
    warehouse: { count: warehouse.length, tickets: warehouse.reduce((s, c) => s + c.tickets, 0) },
  };
}

export function filterClients(
  clients: Client[],
  activeCategories: Set<string>,
  activeHealthFilters: Set<string>,
  searchQuery: string
): Client[] {
  const q = searchQuery.toLowerCase().trim();
  return clients.filter((c) => {
    const categoryMatch = activeCategories.size === 0 || activeCategories.has(c.cat);
    const healthMatch   = activeHealthFilters.size === 0 || activeHealthFilters.has(c.level);
    const searchMatch   =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.contact.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.cat.toLowerCase().includes(q);
    return categoryMatch && healthMatch && searchMatch;
  });
}

export function computeLicenseExpiry(
  clients: Client[],
  period: LicPeriod,
  customFrom?: string | null,
  customTo?: string | null
): LicenseItem[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let from = new Date(now);
  let to   = new Date(now);

  if (period === '3m')           to.setMonth(to.getMonth() + 3);
  else if (period === '6m')      to.setMonth(to.getMonth() + 6);
  else if (period === '1y')      to.setFullYear(to.getFullYear() + 1);
  else if (period === 'custom' && customFrom && customTo) {
    from = new Date(customFrom);
    to   = new Date(customTo);
  } else {
    to.setFullYear(to.getFullYear() + 10);
  }

  const all: LicenseItem[] = clients
    .filter((c) => c.saEnd)
    .map((c) => {
      const d  = new Date(c.saEnd!);
      const dl = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      return { ...c, _endDate: d, _daysLeft: dl, _status: getLicenseStatus(dl) };
    });

  const isAllPeriod = period === 'all';
  return all
    .filter((c) => {
      if (c._status === 'expired') return isAllPeriod;
      return c._endDate >= from && c._endDate <= to;
    })
    .sort((a, b) => a._endDate.getTime() - b._endDate.getTime());
}

export function buildNewClient(
  name: string,
  contact: string,
  email: string,
  phone: string,
  cat: string,
  site: string,
  seats: number,
  accountManager: string,
  logoUrl?: string,
  altContacts?: { name: string; email: string; phone: string }[],
  keysPerStore?: number
): Client | null {
  if (!name.trim() || !contact.trim() || !email.trim() || !cat) return null;
  const alt0 = altContacts?.[0];
  return {
    id: Date.now(),
    name: name.trim(),
    contact: contact.trim(),
    email: email.trim(),
    phone: phone.trim(),
    altContact: alt0?.name  || undefined,
    altEmail:   alt0?.email || undefined,
    altPhone:   alt0?.phone || undefined,
    accountManager: accountManager.trim() || 'Unassigned',
    products: 0,
    users: 1,
    tickets: 0,
    level: 'green',
    cat: cat as ClientCategory,
    logo: logoUrl?.trim() || null,
    branches: [site.trim() || 'Main Branch'],
    posCount: 0,
    seats,
    keysPerStore: cat === 'F&B' ? (keysPerStore || 0) : undefined,
    site: site.trim(),
    saStart: new Date().toISOString().slice(0, 10),
    saEnd: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    licenseId: `LIC-${name.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  };
}













/* ═══════════════════════════════════════════════
   SECTION 4: COMPANIES API FETCH
   Fetches directly from /api/companies (auth:sanctum)
   Maps DB columns → Client shape used by DashboardAdmin
   ═══════════════════════════════════════════════ */

export async function fetchCompanies(): Promise<{ clients: Client[]; error: string | null }> {
  console.log('🏢 [fetchCompanies] called — fetching /api/companies');
  try {
    const response = await fetch('/api/companies', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // sends sanctum session cookie
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[fetchCompanies] HTTP', response.status, text);
      return { clients: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    // /api/companies returns a plain array from DB::table('companies')->get()
    const rows: any[] = Array.isArray(data) ? data : [];

    const clients: Client[] = rows.map((c) => ({
      id:             c.id,
      name:           c.name        ?? c.store_name ?? `Company ${c.id}`,
      contact:        c.contact_person     ?? '',
      email:          c.contact_email      ?? '',
      phone:          c.phone              ?? '',
      altContact:     c.alt_contact_person ?? undefined,
      altEmail:       c.alt_contact_email  ?? undefined,
      altPhone:       c.alt_contact_phone  ?? undefined,
      accountManager: c.account_manager   ?? 'Unassigned',
      products:       0,
      users:          0,
      tickets:        0,
      level:          'green' as HealthLevel,
      cat:            (
                        c.industry === 'fnb'       ? 'F&B'
                      : c.industry === 'retail'    ? 'Retail'
                      : c.industry === 'warehouse' ? 'Warehouse'
                      : 'Warehouse'
                      ) as ClientCategory,
      logo:           null,
      branches:       c.store_name ? [c.store_name] : [],
      posCount:       0,
      seats:          0,
      site:           c.store_name ?? '',
      saStart:        c.msa_start  ?? undefined,
      saEnd:          c.msa_end    ?? undefined,
    }));

    console.log('[fetchCompanies] ✅ loaded', clients.length, 'companies');
    return { clients, error: null };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[fetchCompanies] ❌', msg);
    return { clients: [], error: msg };
  }
}
