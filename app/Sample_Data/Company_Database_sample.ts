/* ==============================================================
   Company_Database_sample.ts  ·  Unified Sample Data
   USED BY:
     Dashboard_Admin_Main    / DshAdmFunc.ts
     Dashboard_Admin_Main    / DashboardAdmin.tsx
     Dashboard_Admin_Overview / dashboard_overview_func.ts
     Dashboard_Admin_Overview / dashboard_overview_users.tsx
     User_Management          / user_functions.ts
   Contains:
     ACCOUNT_MANAGERS  — shared account manager list
     CLIENTS           — all 15 client companies (superset: includes
                         branchLicenses + branchMsaDates)
     CLIENT_USERS      — per-client user records (keyed by client id)
     GLOBAL_USERS      — global user list for the Users panel
     GENIEX_STAFF      — internal GenieX accounts
     ALL_TICKETS       — open / pending / closed ticket groups
     CLIENT_TICKET_ANALYTICS — per-client trend, category, backlog &
                         ticket list data for the Overview Tickets panel
   ============================================================== */

import type { Client as DBClient, ClientCategory } from '../pages/Dashboard_Admin_Main/DshAdmFunc';
import type {
  Client       as OVClient,
  ClientUser,
  GlobalUser,
  TicketGroup,
  TicketPriority,
  TicketStatus,
} from '../pages/Dashboard_Admin_Overview/dashboard_overview_func';

/* ─── Account Managers (shared) ─────────────────────────────────────────────── */
export const ACCOUNT_MANAGERS: string[] = [
  'Lisa Cruz',
  'Renz Tolentino',
  'Maria Santos',
  'Jake Reyes',
  'Ana Mendez',
];

/* ─── Client seed data ───────────────────────────────────────────────────────
   Explicitly typed as (DBClient & OVClient)[] so TypeScript enforces that
   every `cat` value satisfies ClientCategory ('F&B' | 'Retail' | 'Warehouse')
   rather than widening to plain string.
   ─────────────────────────────────────────────────────────────────────────── */
export const CLIENTS: (DBClient & OVClient)[] = [
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
    branchLicenses: {
      'Makati':  'LIC-SBX-MKT-0112',
      'BGC':     'LIC-SBX-BGC-0113',
      'Ortigas': 'LIC-SBX-ORT-0114',
    },
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
    branchLicenses: {
      'Manila Branch': 'LIC-POP-MNL-0601',
      'Makati Branch': 'LIC-POP-MKT-0602',
    },
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
    branchLicenses: {
      'BGC Main': 'LIC-WGG-BGC-0901',
    },
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
    branchLicenses: {
      'Makati': 'LIC-MCD-MKT-1001',
      'Manila': 'LIC-MCD-MNL-1002',
      'Cebu':   'LIC-MCD-CBU-1003',
    },
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
    branchLicenses: {
      'Manila': 'LIC-JLB-MNL-1201',
      'Davao':  'LIC-JLB-DVO-1202',
      'Cebu':   'LIC-JLB-CBU-1203',
    },
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

/* ─── Per-client users (keyed by client id) ─────────────────────────────────── */
export const CLIENT_USERS: Record<number, ClientUser[]> = {
  1: [
    { name: 'Martin Roberts', email: 'martin@starbucks.com', role: 'Manager', status: 'Active',   branch: 'Makati', position: 'Regional Manager' },
    { name: 'Sarah Lim',      email: 'sarah@starbucks.com',  role: 'Manager', status: 'Active',   branch: 'BGC',    position: 'Branch Manager'   },
  ],
  3: [
    { name: 'John Doe',      email: 'john@popeyes.com',  role: 'Manager', status: 'Active', branch: 'Manila Branch', position: 'Store Manager' },
    { name: 'Ana Reyes',     email: 'ana@popeyes.com',   role: 'User',    status: 'Active', branch: 'Manila Branch', position: 'Cashier'       },
    { name: 'Carlo Bautista',email: 'carlo@popeyes.com', role: 'User',    status: 'Active', branch: 'Makati Branch', position: 'Cashier'       },
  ],
};

/* ─── Global users (shown in the Users panel) ────────────────────────────────── */
export const GLOBAL_USERS: GlobalUser[] = [
  // ── Starbucks (2 Managers, 3 Users)
  { name: 'Martin Roberts',   email: 'martin@starbucks.com',   role: 'Manager', status: 'Active',   company: 'Starbucks',          position: 'Regional Manager'    },
  { name: 'Sarah Lim',        email: 'sarah@starbucks.com',    role: 'Manager', status: 'Active',   company: 'Starbucks',          position: 'Branch Manager'      },
  { name: 'Kevin Tan',        email: 'kevin@starbucks.com',    role: 'User',    status: 'Active',   company: 'Starbucks',          position: 'Barista'             },
  { name: 'Diane Castro',     email: 'diane@starbucks.com',    role: 'User',    status: 'Active',   company: 'Starbucks',          position: 'Barista'             },
  { name: 'Paolo Mendez',     email: 'paolo@starbucks.com',    role: 'User',    status: 'Inactive', company: 'Starbucks',          position: 'Cashier'             },
  // ── Ace Hardware (2 Managers, 3 Users)
  { name: 'John Kent',        email: 'john@acehardware.com',   role: 'Manager', status: 'Active',   company: 'Ace Hardware',       position: 'Store Manager'       },
  { name: 'Mel Torres',       email: 'mel@acehardware.com',    role: 'Manager', status: 'Active',   company: 'Ace Hardware',       position: 'Assistant Manager'   },
  { name: 'Grace Villanueva', email: 'grace@acehardware.com',  role: 'User',    status: 'Active',   company: 'Ace Hardware',       position: 'Sales Associate'     },
  { name: 'Ramon dela Cruz',  email: 'ramon@acehardware.com',  role: 'User',    status: 'Active',   company: 'Ace Hardware',       position: 'Stock Clerk'         },
  { name: 'Trisha Ocampo',    email: 'trisha@acehardware.com', role: 'User',    status: 'Inactive', company: 'Ace Hardware',       position: 'Cashier'             },
  // ── Popeyes (2 Managers, 3 Users)
  { name: 'John Doe',         email: 'john@popeyes.com',       role: 'Manager', status: 'Active',   company: 'Popeyes',            position: 'Store Manager'       },
  { name: 'Rica Cruz',        email: 'rica@popeyes.com',       role: 'Manager', status: 'Active',   company: 'Popeyes',            position: 'Shift Supervisor'    },
  { name: 'Ana Reyes',        email: 'ana@popeyes.com',        role: 'User',    status: 'Active',   company: 'Popeyes',            position: 'Cashier'             },
  { name: 'Carlo Bautista',   email: 'carlo@popeyes.com',      role: 'User',    status: 'Active',   company: 'Popeyes',            position: 'Crew Member'         },
  { name: 'Liza Navarro',     email: 'liza@popeyes.com',       role: 'User',    status: 'Inactive', company: 'Popeyes',            position: 'Crew Member'         },
  // ── 7-Eleven (1 Manager, 2 Users)
  { name: 'Kyle Jennings',    email: 'kyle@7eleven.com',       role: 'Manager', status: 'Active',   company: '7-Eleven',           position: 'Store Manager'       },
  { name: 'Anna Cruz',        email: 'anna@7eleven.com',       role: 'User',    status: 'Active',   company: '7-Eleven',           position: 'Cashier'             },
  { name: 'Benny Aguilar',    email: 'benny@7eleven.com',      role: 'User',    status: 'Active',   company: '7-Eleven',           position: 'Stock Associate'     },
  // ── Wolfgang Grill (2 Managers, 2 Users)
  { name: 'Walter King',      email: 'walter@wolfganggrill.com', role: 'Manager', status: 'Active', company: 'Wolfgang Grill',     position: 'General Manager'     },
  { name: 'Petra Reyes',      email: 'petra@wolfganggrill.com',  role: 'Manager', status: 'Active', company: 'Wolfgang Grill',     position: 'Floor Manager'       },
  { name: 'Noel Aquino',      email: 'noel@wolfganggrill.com',   role: 'User',    status: 'Active', company: 'Wolfgang Grill',     position: 'Waiter'              },
  { name: 'Carla Domingo',    email: 'carla@wolfganggrill.com',  role: 'User',    status: 'Active', company: 'Wolfgang Grill',     position: 'Host'                },
  // ── Rolex (1 Manager, 3 Users)
  { name: 'James Blue',       email: 'james@rolex.com',        role: 'Manager', status: 'Active',   company: 'Rolex',              position: 'Boutique Manager'    },
  { name: 'Chloe Tan',        email: 'chloe@rolex.com',        role: 'User',    status: 'Active',   company: 'Rolex',              position: 'Sales Consultant'    },
  { name: 'Felix Huang',      email: 'felix@rolex.com',        role: 'User',    status: 'Active',   company: 'Rolex',              position: 'Sales Consultant'    },
  { name: 'Rina Espinosa',    email: 'rina@rolex.com',         role: 'User',    status: 'Inactive', company: 'Rolex',              position: 'Receptionist'        },
  // ── Amazon Fulfillment (2 Managers, 3 Users)
  { name: 'Sara Chen',        email: 'sara@amazon.com',        role: 'Manager', status: 'Active',   company: 'Amazon Fulfillment', position: 'Operations Lead'     },
  { name: 'Dan Park',         email: 'dan@amazon.com',         role: 'Manager', status: 'Active',   company: 'Amazon Fulfillment', position: 'Warehouse Supervisor'},
  { name: 'Eli Magno',        email: 'eli@amazon.com',         role: 'User',    status: 'Active',   company: 'Amazon Fulfillment', position: 'Picker'              },
  { name: 'Mia Soriano',      email: 'mia@amazon.com',         role: 'User',    status: 'Active',   company: 'Amazon Fulfillment', position: 'Packer'              },
  { name: 'Troy Valdez',      email: 'troy@amazon.com',        role: 'User',    status: 'Inactive', company: 'Amazon Fulfillment', position: 'Forklift Operator'   },
  // ── FedEx Depot (2 Managers, 3 Users)
  { name: 'Tom Harris',       email: 'tom@fedex.com',          role: 'Manager', status: 'Active',   company: 'FedEx Depot',        position: 'Depot Manager'       },
  { name: 'Kim Lee',          email: 'kim@fedex.com',          role: 'Manager', status: 'Active',   company: 'FedEx Depot',        position: 'Shift Supervisor'    },
  { name: 'Gab Santos',       email: 'gab@fedex.com',          role: 'User',    status: 'Active',   company: 'FedEx Depot',        position: 'Courier'             },
  { name: 'Ivy Ramos',        email: 'ivy@fedex.com',          role: 'User',    status: 'Active',   company: 'FedEx Depot',        position: 'Sorter'              },
  { name: 'Nico Flores',      email: 'nico@fedex.com',         role: 'User',    status: 'Inactive', company: 'FedEx Depot',        position: 'Scanner'             },
  // ── IKEA (2 Managers, 3 Users)
  { name: 'Lisa Park',        email: 'lisa@ikea.com',          role: 'Manager', status: 'Active',   company: 'IKEA',               position: 'Store Manager'       },
  { name: 'Max Weber',        email: 'max@ikea.com',           role: 'Manager', status: 'Active',   company: 'IKEA',               position: 'Department Head'     },
  { name: 'Jade Ong',         email: 'jade@ikea.com',          role: 'User',    status: 'Active',   company: 'IKEA',               position: 'Sales Co-worker'     },
  { name: 'Rex Cabrera',      email: 'rex@ikea.com',           role: 'User',    status: 'Active',   company: 'IKEA',               position: 'Assembly Staff'      },
  { name: 'Demi Pascual',     email: 'demi@ikea.com',          role: 'User',    status: 'Inactive', company: 'IKEA',               position: 'Cashier'             },
  // ── DHL Warehouse (2 Managers, 3 Users)
  { name: 'Mike Sato',        email: 'mike@dhl.com',           role: 'Manager', status: 'Active',   company: 'DHL Warehouse',      position: 'Warehouse Manager'   },
  { name: 'Nina Cruz',        email: 'nina@dhl.com',           role: 'Manager', status: 'Active',   company: 'DHL Warehouse',      position: 'Operations Supervisor'},
  { name: 'Bert Lim',         email: 'bert@dhl.com',           role: 'User',    status: 'Active',   company: 'DHL Warehouse',      position: 'Logistics Staff'     },
  { name: 'Ching Velarde',    email: 'ching@dhl.com',          role: 'User',    status: 'Active',   company: 'DHL Warehouse',      position: 'Courier'             },
  { name: 'Pio Macaraeg',     email: 'pio@dhl.com',            role: 'User',    status: 'Inactive', company: 'DHL Warehouse',      position: 'Scanner'             },
  // ── McDonald's (2 Managers, 3 Users)
  { name: 'Amy Fox',          email: 'amy@mcdonalds.com',      role: 'Manager', status: 'Active',   company: "McDonald's",         position: 'Store Manager'       },
  { name: 'Leo Santos',       email: 'leo@mcdonalds.com',      role: 'Manager', status: 'Active',   company: "McDonald's",         position: 'Assistant Manager'   },
  { name: 'Vince Padilla',    email: 'vince@mcdonalds.com',    role: 'User',    status: 'Active',   company: "McDonald's",         position: 'Crew Member'         },
  { name: 'Stella Mercado',   email: 'stella@mcdonalds.com',   role: 'User',    status: 'Active',   company: "McDonald's",         position: 'Cashier'             },
  { name: 'Archie Batac',     email: 'archie@mcdonalds.com',   role: 'User',    status: 'Inactive', company: "McDonald's",         position: 'Kitchen Staff'       },
  // ── Nike Retail (2 Managers, 3 Users)
  { name: 'Chris Lee',        email: 'chris@nike.com',         role: 'Manager', status: 'Active',   company: 'Nike Retail',        position: 'Store Manager'       },
  { name: 'Faye Uy',          email: 'faye@nike.com',          role: 'Manager', status: 'Active',   company: 'Nike Retail',        position: 'Visual Merchandiser' },
  { name: 'Zack Rivera',      email: 'zack@nike.com',          role: 'User',    status: 'Active',   company: 'Nike Retail',        position: 'Sales Associate'     },
  { name: 'Bea Castillo',     email: 'bea@nike.com',           role: 'User',    status: 'Active',   company: 'Nike Retail',        position: 'Cashier'             },
  { name: 'Hugo dela Torre',  email: 'hugo@nike.com',          role: 'User',    status: 'Inactive', company: 'Nike Retail',        position: 'Stock Room Staff'    },
  // ── Puma (1 Manager, 2 Users)
  { name: 'Elena Torres',     email: 'elena@puma.com',         role: 'Manager', status: 'Active',   company: 'Puma',               position: 'Store Manager'       },
  { name: 'Roy Kim',          email: 'roy@puma.com',           role: 'User',    status: 'Active',   company: 'Puma',               position: 'Sales Associate'     },
  { name: 'Vera Ignacio',     email: 'vera@puma.com',          role: 'User',    status: 'Active',   company: 'Puma',               position: 'Cashier'             },
  // ── Jollibee (2 Managers, 3 Users)
  { name: 'Rico Santos',      email: 'rico@jollibee.com',      role: 'Manager', status: 'Active',   company: 'Jollibee',           position: 'Store Manager'       },
  { name: 'Lena Delos Reyes', email: 'lena@jollibee.com',      role: 'Manager', status: 'Active',   company: 'Jollibee',           position: 'Assistant Manager'   },
  { name: 'Raffy Guevarra',   email: 'raffy@jollibee.com',     role: 'User',    status: 'Active',   company: 'Jollibee',           position: 'Crew Member'         },
  { name: 'Tess Bondoc',      email: 'tess@jollibee.com',      role: 'User',    status: 'Active',   company: 'Jollibee',           position: 'Cashier'             },
  { name: 'Nonoy Corpus',     email: 'nonoy@jollibee.com',     role: 'User',    status: 'Inactive', company: 'Jollibee',           position: 'Kitchen Staff'       },
  // ── UPS Supply Chain (2 Managers, 3 Users)
  { name: 'Drew Campbell',      email: 'drew@ups.com',  role: 'Manager', status: 'Active',   company: 'UPS Supply Chain', position: 'Operations Manager' },
  { name: 'Sandy Ho',           email: 'sandy@ups.com', role: 'Manager', status: 'Active',   company: 'UPS Supply Chain', position: 'Hub Supervisor'     },
  { name: 'Lance Buenaventura', email: 'lance@ups.com', role: 'User',    status: 'Active',   company: 'UPS Supply Chain', position: 'Package Handler'    },
  { name: 'Fiona Salas',        email: 'fiona@ups.com', role: 'User',    status: 'Active',   company: 'UPS Supply Chain', position: 'Scanner'            },
  { name: 'Dino Reyes',         email: 'dino@ups.com',  role: 'User',    status: 'Inactive', company: 'UPS Supply Chain', position: 'Driver'             },
];

/* ─── GenieX Internal Staff ──────────────────────────────────────────────────── */
export interface GenieXStaffMember {
  name:     string;
  email:    string;
  role:     'Super Admin' | 'System Admin';
  position: string;
  company:  'GenieX';
  status:   'Active' | 'Inactive';
}

export const GENIEX_STAFF: GenieXStaffMember[] = [
  // ── Super Admins ──
  { name: 'Ravenal Joson',         email: 'ravenal.joson@geniex.tech',    role: 'Super Admin',  position: 'Director',              company: 'GenieX', status: 'Active' },
  { name: 'Alther Roven Albano',   email: 'alther.albano@geniex.tech',    role: 'Super Admin',  position: 'Support Manager',        company: 'GenieX', status: 'Active' },
  { name: 'Jomar Serrano',         email: 'jomar.serrano@geniex.tech',    role: 'Super Admin',  position: 'Support Manager',        company: 'GenieX', status: 'Active' },
  { name: 'John Howell Nomabiles', email: 'john.nomabiles@geniex.tech',   role: 'Super Admin',  position: 'Asst. Support Manager',  company: 'GenieX', status: 'Active' },
  { name: 'Yeng Morales',          email: 'gracedel.morales@geniex.tech', role: 'Super Admin',  position: 'Development Manager',    company: 'GenieX', status: 'Active' },
  { name: 'Emman Lopez',           email: 'emmanuel.lopez@geniex.tech',   role: 'Super Admin',  position: 'System Administrator',   company: 'GenieX', status: 'Active' },
  // ── System Admins ──
  { name: 'Mark Dhan Saway',       email: 'mark.saway@geniex.tech',       role: 'System Admin', position: 'Project Manager',        company: 'GenieX', status: 'Active' },
  { name: 'Rosalinda Lim',         email: 'rosalinda.lim@geniex.tech',    role: 'System Admin', position: 'Technical Support',      company: 'GenieX', status: 'Active' },
  { name: 'John Clarence Joven',   email: 'clarence.joven@geniex.tech',   role: 'System Admin', position: 'Technical Support',      company: 'GenieX', status: 'Active' },
];

/* ─── Tickets ────────────────────────────────────────────────────────────────── */
export const ALL_TICKETS: TicketGroup = {
  open: [
    { id: 'TKT-001', subject: 'POS crash on receipt print',    priority: 'critical', status: 'open',    time: '2h ago',  client: 'Popeyes'           },
    { id: 'TKT-002', subject: 'Inventory sync error',          priority: 'high',     status: 'open',    time: '4h ago',  client: 'IKEA'               },
    { id: 'TKT-003', subject: 'Login issue for new staff',     priority: 'normal',   status: 'open',    time: '5h ago',  client: 'Ace Hardware'       },
    { id: 'TKT-004', subject: 'Barcode scanner not reading',   priority: 'high',     status: 'open',    time: '1d ago',  client: 'Jollibee'           },
    { id: 'TKT-005', subject: 'Network timeout on reports',    priority: 'normal',   status: 'open',    time: '1d ago',  client: 'Amazon Fulfillment' },
    { id: 'TKT-006', subject: 'Card payment declined error',   priority: 'critical', status: 'open',    time: '2d ago',  client: 'Rolex'              },
    { id: 'TKT-007', subject: 'Drawer not opening',            priority: 'normal',   status: 'open',    time: '2d ago',  client: 'Popeyes'            },
    { id: 'TKT-008', subject: 'End-of-day report mismatch',    priority: 'high',     status: 'open',    time: '3d ago',  client: 'DHL Warehouse'      },
  ],
  pending: [
    { id: 'TKT-009', subject: 'POS update installation pending',        priority: 'normal', status: 'pending', time: '1d ago', client: 'Puma'      },
    { id: 'TKT-010', subject: 'User access change request',             priority: 'low',    status: 'pending', time: '2d ago', client: 'Starbucks' },
    { id: 'TKT-011', subject: 'Hardware replacement awaiting delivery', priority: 'high',   status: 'pending', time: '3d ago', client: 'IKEA'      },
  ],
  closed: Array.from({ length: 42 }, (_, i) => ({
    id:       `TKT-CL-${String(i + 1).padStart(3, '0')}`,
    subject:  `Resolved issue #${i + 1}`,
    priority: (['low', 'normal', 'high', 'critical'] as TicketPriority[])[i % 4],
    status:   'closed' as TicketStatus,
    time:     `${i + 1}d ago`,
    client:   [
      'Starbucks', 'Ace Hardware', 'Popeyes', '7-Eleven', 'Wolfgang Grill',
      'Rolex', 'Amazon Fulfillment', 'FedEx Depot', 'IKEA', 'DHL Warehouse',
      "McDonald's", 'Nike Retail', 'Puma', 'Jollibee', 'UPS Supply Chain',
    ][i % 15],
  })),
};

/* ─── CLIENT_TICKET_ANALYTICS ────────────────────────────────────────────────── */
export interface ClientTicketTrend {
  newTickets: number[];
  resolved:   number[];
  critical:   number[];
}
export interface ClientTicketCategory {
  label:  string;
  n:      number;
  color:  string;
  change: number;
  dir:    'up' | 'dn' | 'flat';
}
export interface ClientBacklogData {
  fresh:      number;
  aging:      number;
  overdue:    number;
  freshPct:   number;
  agingPct:   number;
  overduePct: number;
  summary:    string;
}
export interface ClientTicketItem {
  id:       string;
  subject:  string;
  priority: TicketPriority;
  status:   TicketStatus;
  time:     string;
  branch?:  string;
}
export interface ClientTicketAnalytics {
  trend:      ClientTicketTrend;
  categories: ClientTicketCategory[];
  backlog:    ClientBacklogData;
  tickets: {
    open:    ClientTicketItem[];
    pending: ClientTicketItem[];
    closed:  ClientTicketItem[];
  };
}

function buildTrend(seed: number, baseNew: number, baseResolved: number): ClientTicketTrend {
  const newTickets = Array.from({ length: 30 }, (_, i) =>
    Math.max(1, Math.round(baseNew + Math.sin((i + seed) / 3.2) * (baseNew * 0.4) + Math.sin((i * 0.7 + seed)) * (baseNew * 0.2))),
  );
  const resolved = newTickets.map(n => Math.max(0, n - Math.round((Math.random() * 0.4 + 0.1) * n)));
  const critical = newTickets.map(n => Math.max(0, Math.round(n * 0.12 + Math.sin(n + seed) * 1.2)));
  return { newTickets, resolved, critical };
}

function buildBacklog(openCount: number, seed: number): ClientBacklogData {
  const freshPct   = Math.min(70, Math.max(30, 52 + (seed % 20) - 10));
  const agingPct   = Math.min(40, Math.max(15, 31 - (seed % 12)));
  const overduePct = 100 - freshPct - agingPct;
  const fresh   = Math.round(openCount * freshPct   / 100);
  const aging   = Math.round(openCount * agingPct   / 100);
  const overdue = openCount - fresh - aging;
  const overdueLabel = overdue > openCount * 0.25 ? 'escalation is recommended' : 'within acceptable range';
  return {
    fresh, aging, overdue, freshPct, agingPct, overduePct,
    summary: `${overdue} ticket${overdue !== 1 ? 's' : ''} open >72h — ${overdueLabel}. Fresh tickets make up ${freshPct}% of the backlog.`,
  };
}

export const CLIENT_TICKET_ANALYTICS: Record<number, ClientTicketAnalytics> = {
  1: {
    trend: buildTrend(1, 4, 4),
    categories: [
      { label: 'POS Hardware',      n: 18, color: '#7c3aed', change: +8,  dir: 'up'   },
      { label: 'Software / App',    n: 12, color: '#0284c7', change: -5,  dir: 'dn'   },
      { label: 'Network',           n:  9, color: '#0d9488', change: +2,  dir: 'up'   },
      { label: 'Account / Access',  n:  6, color: '#d97706', change:  0,  dir: 'flat' },
      { label: 'Other',             n:  3, color: '#6b7280', change: -1,  dir: 'dn'   },
    ],
    backlog: buildBacklog(6, 1),
    tickets: {
      open: [
        { id: 'SBX-001', subject: 'Makati POS touchscreen unresponsive', priority: 'high',   status: 'open', time: '3h ago',  branch: 'Makati'  },
        { id: 'SBX-002', subject: 'BGC daily report sync failure',        priority: 'normal', status: 'open', time: '1d ago',  branch: 'BGC'     },
        { id: 'SBX-003', subject: 'Ortigas Wi-Fi drops every morning',    priority: 'normal', status: 'open', time: '2d ago',  branch: 'Ortigas' },
      ],
      pending: [
        { id: 'SBX-004', subject: 'Makati receipt printer driver update', priority: 'low',    status: 'pending', time: '9d ago', branch: 'Makati' },
        { id: 'SBX-005', subject: 'BGC POS software upgrade scheduled',   priority: 'normal', status: 'pending', time: '5d ago', branch: 'BGC'    },
      ],
      closed: [
        { id: 'SBX-006', subject: 'Ortigas POS freezing on void',    priority: 'high',   status: 'closed', time: '3d ago',  branch: 'Ortigas' },
        { id: 'SBX-007', subject: 'Makati card reader offline',       priority: 'normal', status: 'closed', time: '5d ago',  branch: 'Makati'  },
        { id: 'SBX-008', subject: 'BGC login error after update',     priority: 'normal', status: 'closed', time: '7d ago',  branch: 'BGC'     },
        { id: 'SBX-009', subject: 'Ortigas network timeout on shift', priority: 'low',    status: 'closed', time: '9d ago',  branch: 'Ortigas' },
        { id: 'SBX-010', subject: 'POS drawer stuck',                 priority: 'high',   status: 'closed', time: '12d ago', branch: 'Makati'  },
      ],
    },
  },
  2: { trend: buildTrend(2,10,8), categories: [{ label:'POS Hardware',n:28,color:'#7c3aed',change:+15,dir:'up'},{label:'Software / App',n:18,color:'#0284c7',change:-4,dir:'dn'},{label:'Network',n:14,color:'#0d9488',change:+6,dir:'up'},{label:'Account / Access',n:10,color:'#d97706',change:+2,dir:'up'},{label:'Hardware Other',n:7,color:'#dc2626',change:+3,dir:'up'},{label:'Other',n:4,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(18,2), tickets: { open:[{id:'ACE-001',subject:'QC barcode scanner intermittent',priority:'high',status:'open',time:'1h ago',branch:'Quezon City'},{id:'ACE-002',subject:'Pasay POS crash on large transaction',priority:'critical',status:'open',time:'3h ago',branch:'Pasay'},{id:'ACE-003',subject:'QC inventory count mismatch',priority:'high',status:'open',time:'6h ago',branch:'Quezon City'},{id:'ACE-004',subject:'Pasay network latency on peak hours',priority:'normal',status:'open',time:'1d ago',branch:'Pasay'},{id:'ACE-005',subject:'QC new staff login not working',priority:'normal',status:'open',time:'2d ago',branch:'Quezon City'}], pending:[{id:'ACE-006',subject:'Pasay POS printer replacement pending',priority:'high',status:'pending',time:'2d ago',branch:'Pasay'},{id:'ACE-007',subject:'QC software update scheduled',priority:'normal',status:'pending',time:'3d ago',branch:'Quezon City'},{id:'ACE-008',subject:'License renewal documentation required',priority:'low',status:'pending',time:'5d ago',branch:'Quezon City'}], closed:[{id:'ACE-009',subject:'QC POS offline overnight',priority:'critical',status:'closed',time:'2d ago',branch:'Quezon City'},{id:'ACE-010',subject:'Pasay drawer jam',priority:'normal',status:'closed',time:'4d ago',branch:'Pasay'},{id:'ACE-011',subject:'QC card reader pairing issue',priority:'high',status:'closed',time:'6d ago',branch:'Quezon City'},{id:'ACE-012',subject:'Pasay report discrepancy resolved',priority:'normal',status:'closed',time:'8d ago',branch:'Pasay'},{id:'ACE-013',subject:'QC account locked out',priority:'low',status:'closed',time:'10d ago',branch:'Quezon City'},{id:'ACE-014',subject:'Pasay Wi-Fi AP replaced',priority:'high',status:'closed',time:'14d ago',branch:'Pasay'}] } },
  3: { trend: buildTrend(3,18,12), categories: [{label:'POS Hardware',n:42,color:'#7c3aed',change:+28,dir:'up'},{label:'Software / App',n:24,color:'#0284c7',change:-3,dir:'dn'},{label:'Network',n:18,color:'#0d9488',change:+10,dir:'up'},{label:'Account / Access',n:12,color:'#d97706',change:+5,dir:'up'},{label:'Hardware Other',n:9,color:'#dc2626',change:+7,dir:'up'},{label:'Other',n:6,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(30,3), tickets: { open:[{id:'POP-001',subject:'Manila POS crash on receipt print',priority:'critical',status:'open',time:'30m ago',branch:'Manila Branch'},{id:'POP-002',subject:'Makati POS card reader offline',priority:'critical',status:'open',time:'2h ago',branch:'Makati Branch'},{id:'POP-003',subject:'Manila drawer not opening',priority:'high',status:'open',time:'3h ago',branch:'Manila Branch'},{id:'POP-004',subject:'Makati daily Z-report missing',priority:'high',status:'open',time:'5h ago',branch:'Makati Branch'},{id:'POP-005',subject:'Manila network drops every 2 hours',priority:'high',status:'open',time:'8h ago',branch:'Manila Branch'},{id:'POP-006',subject:'Makati inventory sync not running',priority:'normal',status:'open',time:'1d ago',branch:'Makati Branch'},{id:'POP-007',subject:'Manila split-payment error',priority:'critical',status:'open',time:'1d ago',branch:'Manila Branch'},{id:'POP-008',subject:'Makati staff PIN reset needed',priority:'normal',status:'open',time:'2d ago',branch:'Makati Branch'}], pending:[{id:'POP-009',subject:'Manila POS replacement unit on order',priority:'critical',status:'pending',time:'1d ago',branch:'Manila Branch'},{id:'POP-010',subject:'Makati network switch replacement',priority:'high',status:'pending',time:'2d ago',branch:'Makati Branch'},{id:'POP-011',subject:'Manila software patch scheduled',priority:'normal',status:'pending',time:'3d ago',branch:'Manila Branch'},{id:'POP-012',subject:'Makati POS calibration scheduled',priority:'low',status:'pending',time:'4d ago',branch:'Makati Branch'}], closed:[{id:'POP-013',subject:'Manila POS offline 4 hours',priority:'critical',status:'closed',time:'1d ago',branch:'Manila Branch'},{id:'POP-014',subject:'Makati voids not processing',priority:'high',status:'closed',time:'2d ago',branch:'Makati Branch'},{id:'POP-015',subject:'Manila printer jam',priority:'normal',status:'closed',time:'3d ago',branch:'Manila Branch'},{id:'POP-016',subject:'Makati login lockout resolved',priority:'normal',status:'closed',time:'4d ago',branch:'Makati Branch'},{id:'POP-017',subject:'Manila network cable replaced',priority:'low',status:'closed',time:'5d ago',branch:'Manila Branch'},{id:'POP-018',subject:'Makati POS OS update applied',priority:'high',status:'closed',time:'7d ago',branch:'Makati Branch'},{id:'POP-019',subject:'Manila duplicate transaction fixed',priority:'critical',status:'closed',time:'9d ago',branch:'Manila Branch'},{id:'POP-020',subject:'Makati receipt font corrupted',priority:'low',status:'closed',time:'12d ago',branch:'Makati Branch'}] } },
  4: { trend: buildTrend(4,2,2), categories: [{label:'POS Hardware',n:8,color:'#7c3aed',change:+2,dir:'up'},{label:'Software / App',n:5,color:'#0284c7',change:-1,dir:'dn'},{label:'Network',n:3,color:'#0d9488',change:0,dir:'flat'},{label:'Other',n:2,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(4,4), tickets: { open:[{id:'SEV-001',subject:'Caloocan POS slow startup',priority:'normal',status:'open',time:'4h ago',branch:'Caloocan'},{id:'SEV-002',subject:'Pasig scanner disconnects randomly',priority:'low',status:'open',time:'1d ago',branch:'Pasig'}], pending:[{id:'SEV-003',subject:'Caloocan software patch pending',priority:'normal',status:'pending',time:'3d ago',branch:'Caloocan'}], closed:[{id:'SEV-004',subject:'Pasig POS offline weekend',priority:'high',status:'closed',time:'5d ago',branch:'Pasig'},{id:'SEV-005',subject:'Caloocan card reader replaced',priority:'normal',status:'closed',time:'9d ago',branch:'Caloocan'},{id:'SEV-006',subject:'Pasig report sync fixed',priority:'low',status:'closed',time:'14d ago',branch:'Pasig'}] } },
  5: { trend: buildTrend(5,3,3), categories: [{label:'POS Hardware',n:10,color:'#7c3aed',change:+4,dir:'up'},{label:'Software / App',n:6,color:'#0284c7',change:-2,dir:'dn'},{label:'Network',n:4,color:'#0d9488',change:+1,dir:'up'},{label:'Other',n:2,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(3,5), tickets: { open:[{id:'WGG-001',subject:'BGC POS thermal print quality poor',priority:'normal',status:'open',time:'6h ago',branch:'BGC Main'},{id:'WGG-002',subject:'BGC split-bill feature missing',priority:'high',status:'open',time:'2d ago',branch:'BGC Main'}], pending:[{id:'WGG-003',subject:'BGC POS firmware update pending',priority:'low',status:'pending',time:'5d ago',branch:'BGC Main'}], closed:[{id:'WGG-004',subject:'BGC card reader pairing lost',priority:'high',status:'closed',time:'4d ago',branch:'BGC Main'},{id:'WGG-005',subject:'BGC Wi-Fi router replaced',priority:'normal',status:'closed',time:'10d ago',branch:'BGC Main'}] } },
  6: { trend: buildTrend(6,3,3), categories: [{label:'POS Hardware',n:9,color:'#7c3aed',change:+3,dir:'up'},{label:'Software / App',n:5,color:'#0284c7',change:-1,dir:'dn'},{label:'Network',n:3,color:'#0d9488',change:0,dir:'flat'},{label:'Other',n:2,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(4,6), tickets: { open:[{id:'RLX-001',subject:'Greenbelt card payment declined',priority:'critical',status:'open',time:'2h ago',branch:'Greenbelt'},{id:'RLX-002',subject:'Shangri-La receipt paper jam',priority:'normal',status:'open',time:'1d ago',branch:'Shangri-La'}], pending:[{id:'RLX-003',subject:'Greenbelt POS OS update scheduled',priority:'normal',status:'pending',time:'3d ago',branch:'Greenbelt'}], closed:[{id:'RLX-004',subject:'Shangri-La POS offline 1 hour',priority:'high',status:'closed',time:'3d ago',branch:'Shangri-La'},{id:'RLX-005',subject:'Greenbelt network intermittent',priority:'normal',status:'closed',time:'8d ago',branch:'Greenbelt'}] } },
  7: { trend: buildTrend(7,12,10), categories: [{label:'POS Hardware',n:30,color:'#7c3aed',change:+12,dir:'up'},{label:'Software / App',n:22,color:'#0284c7',change:-6,dir:'dn'},{label:'Network',n:18,color:'#0d9488',change:+8,dir:'up'},{label:'Account / Access',n:12,color:'#d97706',change:+3,dir:'up'},{label:'Hardware Other',n:8,color:'#dc2626',change:+2,dir:'up'},{label:'Other',n:5,color:'#6b7280',change:-1,dir:'dn'}], backlog: buildBacklog(20,7), tickets: { open:[{id:'AMZ-001',subject:'Laguna scanner conveyor integration broken',priority:'critical',status:'open',time:'1h ago',branch:'Laguna Warehouse'},{id:'AMZ-002',subject:'Cavite WMS sync delayed',priority:'high',status:'open',time:'4h ago',branch:'Cavite Hub'},{id:'AMZ-003',subject:'Laguna POS intermittent offline',priority:'normal',status:'open',time:'8h ago',branch:'Laguna Warehouse'},{id:'AMZ-004',subject:'Cavite barcode gun not pairing',priority:'normal',status:'open',time:'1d ago',branch:'Cavite Hub'}], pending:[{id:'AMZ-005',subject:'Laguna network switch upgrade pending',priority:'high',status:'pending',time:'2d ago',branch:'Laguna Warehouse'},{id:'AMZ-006',subject:'Cavite bulk account creation queued',priority:'normal',status:'pending',time:'4d ago',branch:'Cavite Hub'}], closed:[{id:'AMZ-007',subject:'Laguna POS offline shift',priority:'critical',status:'closed',time:'2d ago',branch:'Laguna Warehouse'},{id:'AMZ-008',subject:'Cavite label printer replaced',priority:'high',status:'closed',time:'5d ago',branch:'Cavite Hub'},{id:'AMZ-009',subject:'Laguna Wi-Fi access point replaced',priority:'normal',status:'closed',time:'7d ago',branch:'Laguna Warehouse'},{id:'AMZ-010',subject:'Cavite login credential reset',priority:'low',status:'closed',time:'11d ago',branch:'Cavite Hub'}] } },
  8: { trend: buildTrend(8,7,7), categories: [{label:'POS Hardware',n:20,color:'#7c3aed',change:+5,dir:'up'},{label:'Software / App',n:14,color:'#0284c7',change:-2,dir:'dn'},{label:'Network',n:10,color:'#0d9488',change:+3,dir:'up'},{label:'Account / Access',n:7,color:'#d97706',change:0,dir:'flat'},{label:'Other',n:4,color:'#6b7280',change:-1,dir:'dn'}], backlog: buildBacklog(8,8), tickets: { open:[{id:'FDX-001',subject:'Paranaque POS slow boot',priority:'normal',status:'open',time:'5h ago',branch:'Paranaque Depot'},{id:'FDX-002',subject:'Paranaque handheld scanner dead',priority:'high',status:'open',time:'1d ago',branch:'Paranaque Depot'}], pending:[{id:'FDX-003',subject:'Paranaque UPS battery replacement',priority:'high',status:'pending',time:'3d ago',branch:'Paranaque Depot'},{id:'FDX-004',subject:'Paranaque OS upgrade scheduled',priority:'normal',status:'pending',time:'5d ago',branch:'Paranaque Depot'}], closed:[{id:'FDX-005',subject:'Paranaque POS crashed on shift end',priority:'high',status:'closed',time:'3d ago',branch:'Paranaque Depot'},{id:'FDX-006',subject:'Paranaque network drop fixed',priority:'normal',status:'closed',time:'6d ago',branch:'Paranaque Depot'},{id:'FDX-007',subject:'Paranaque label print queue stuck',priority:'normal',status:'closed',time:'10d ago',branch:'Paranaque Depot'}] } },
  9: { trend: buildTrend(9,11,9), categories: [{label:'POS Hardware',n:32,color:'#7c3aed',change:+18,dir:'up'},{label:'Software / App',n:20,color:'#0284c7',change:-5,dir:'dn'},{label:'Network',n:15,color:'#0d9488',change:+7,dir:'up'},{label:'Account / Access',n:9,color:'#d97706',change:+2,dir:'up'},{label:'Hardware Other',n:6,color:'#dc2626',change:+3,dir:'up'},{label:'Other',n:3,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(16,9), tickets: { open:[{id:'IKA-001',subject:'Pasay POS inventory sync error',priority:'high',status:'open',time:'2h ago',branch:'Pasay Store'},{id:'IKA-002',subject:'Pasay barcode scanner intermittent',priority:'normal',status:'open',time:'6h ago',branch:'Pasay Store'},{id:'IKA-003',subject:'Pasay card payment declined intermit',priority:'critical',status:'open',time:'1d ago',branch:'Pasay Store'}], pending:[{id:'IKA-004',subject:'Pasay POS hardware replacement',priority:'high',status:'pending',time:'2d ago',branch:'Pasay Store'},{id:'IKA-005',subject:'Pasay network infra upgrade',priority:'normal',status:'pending',time:'4d ago',branch:'Pasay Store'}], closed:[{id:'IKA-006',subject:'Pasay self-checkout offline',priority:'critical',status:'closed',time:'2d ago',branch:'Pasay Store'},{id:'IKA-007',subject:'Pasay POS printer paper jam',priority:'normal',status:'closed',time:'5d ago',branch:'Pasay Store'},{id:'IKA-008',subject:'Pasay account access revoked fix',priority:'low',status:'closed',time:'8d ago',branch:'Pasay Store'},{id:'IKA-009',subject:'Pasay POS update patched',priority:'high',status:'closed',time:'11d ago',branch:'Pasay Store'}] } },
  10: { trend: buildTrend(10,9,8), categories: [{label:'POS Hardware',n:24,color:'#7c3aed',change:+9,dir:'up'},{label:'Software / App',n:16,color:'#0284c7',change:-3,dir:'dn'},{label:'Network',n:14,color:'#0d9488',change:+5,dir:'up'},{label:'Account / Access',n:8,color:'#d97706',change:+1,dir:'up'},{label:'Other',n:4,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(12,10), tickets: { open:[{id:'DHL-001',subject:'Taguig POS handheld offline',priority:'high',status:'open',time:'3h ago',branch:'Taguig Hub'},{id:'DHL-002',subject:'Clark WMS report not generating',priority:'normal',status:'open',time:'1d ago',branch:'Clark'}], pending:[{id:'DHL-003',subject:'Taguig scanner firmware update',priority:'normal',status:'pending',time:'3d ago',branch:'Taguig Hub'},{id:'DHL-004',subject:'Clark account provisioning',priority:'low',status:'pending',time:'5d ago',branch:'Clark'}], closed:[{id:'DHL-005',subject:'Taguig POS crashed on export',priority:'high',status:'closed',time:'2d ago',branch:'Taguig Hub'},{id:'DHL-006',subject:'Clark network latency resolved',priority:'normal',status:'closed',time:'6d ago',branch:'Clark'},{id:'DHL-007',subject:'Taguig label printer jammed',priority:'low',status:'closed',time:'10d ago',branch:'Taguig Hub'}] } },
  11: { trend: buildTrend(11,8,8), categories: [{label:'POS Hardware',n:22,color:'#7c3aed',change:+6,dir:'up'},{label:'Software / App',n:15,color:'#0284c7',change:-4,dir:'dn'},{label:'Network',n:11,color:'#0d9488',change:+2,dir:'up'},{label:'Account / Access',n:7,color:'#d97706',change:0,dir:'flat'},{label:'Other',n:4,color:'#6b7280',change:-1,dir:'dn'}], backlog: buildBacklog(7,11), tickets: { open:[{id:'MCD-001',subject:'Makati kiosk touchscreen unresponsive',priority:'high',status:'open',time:'4h ago',branch:'Makati'},{id:'MCD-002',subject:'Manila drive-thru POS connection drop',priority:'normal',status:'open',time:'1d ago',branch:'Manila'},{id:'MCD-003',subject:'Cebu split-payment rejected',priority:'high',status:'open',time:'2d ago',branch:'Cebu'}], pending:[{id:'MCD-004',subject:'Makati POS unit swap pending',priority:'high',status:'pending',time:'2d ago',branch:'Makati'},{id:'MCD-005',subject:'Manila software upgrade queued',priority:'normal',status:'pending',time:'4d ago',branch:'Manila'}], closed:[{id:'MCD-006',subject:'Cebu POS freezing',priority:'high',status:'closed',time:'3d ago',branch:'Cebu'},{id:'MCD-007',subject:'Makati receipt printer resolved',priority:'normal',status:'closed',time:'6d ago',branch:'Makati'},{id:'MCD-008',subject:'Manila Wi-Fi drop fixed',priority:'normal',status:'closed',time:'9d ago',branch:'Manila'},{id:'MCD-009',subject:'Cebu card swipe error resolved',priority:'low',status:'closed',time:'13d ago',branch:'Cebu'}] } },
  12: { trend: buildTrend(12,6,6), categories: [{label:'POS Hardware',n:16,color:'#7c3aed',change:+5,dir:'up'},{label:'Software / App',n:10,color:'#0284c7',change:-2,dir:'dn'},{label:'Network',n:8,color:'#0d9488',change:+1,dir:'up'},{label:'Account / Access',n:5,color:'#d97706',change:0,dir:'flat'},{label:'Other',n:2,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(5,12), tickets: { open:[{id:'NKE-001',subject:'SM Mall POS item lookup slow',priority:'normal',status:'open',time:'5h ago',branch:'SM Mall'},{id:'NKE-002',subject:'Ayala barcode scanner offline',priority:'high',status:'open',time:'1d ago',branch:'Ayala'}], pending:[{id:'NKE-003',subject:'SM Mall POS software update',priority:'normal',status:'pending',time:'4d ago',branch:'SM Mall'}], closed:[{id:'NKE-004',subject:'Ayala card reader replaced',priority:'high',status:'closed',time:'4d ago',branch:'Ayala'},{id:'NKE-005',subject:'SM Mall network latency fixed',priority:'normal',status:'closed',time:'7d ago',branch:'SM Mall'},{id:'NKE-006',subject:'Ayala account access restored',priority:'low',status:'closed',time:'11d ago',branch:'Ayala'}] } },
  13: { trend: buildTrend(13,5,4), categories: [{label:'POS Hardware',n:12,color:'#7c3aed',change:+4,dir:'up'},{label:'Software / App',n:7,color:'#0284c7',change:-1,dir:'dn'},{label:'Network',n:5,color:'#0d9488',change:+2,dir:'up'},{label:'Other',n:3,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(7,13), tickets: { open:[{id:'PMA-001',subject:'Eastwood POS update installation pending',priority:'normal',status:'open',time:'2h ago',branch:'Eastwood Store'},{id:'PMA-002',subject:'Eastwood card reader pairing failed',priority:'high',status:'open',time:'1d ago',branch:'Eastwood Store'}], pending:[{id:'PMA-003',subject:'Eastwood hardware replacement on hold',priority:'high',status:'pending',time:'3d ago',branch:'Eastwood Store'}], closed:[{id:'PMA-004',subject:'Eastwood printer jam resolved',priority:'normal',status:'closed',time:'3d ago',branch:'Eastwood Store'},{id:'PMA-005',subject:'Eastwood Wi-Fi reconnect issue',priority:'normal',status:'closed',time:'7d ago',branch:'Eastwood Store'},{id:'PMA-006',subject:'Eastwood POS reboot loop fixed',priority:'high',status:'closed',time:'12d ago',branch:'Eastwood Store'}] } },
  14: { trend: buildTrend(14,14,11), categories: [{label:'POS Hardware',n:36,color:'#7c3aed',change:+20,dir:'up'},{label:'Software / App',n:22,color:'#0284c7',change:-4,dir:'dn'},{label:'Network',n:16,color:'#0d9488',change:+8,dir:'up'},{label:'Account / Access',n:10,color:'#d97706',change:+3,dir:'up'},{label:'Hardware Other',n:7,color:'#dc2626',change:+4,dir:'up'},{label:'Other',n:4,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(24,14), tickets: { open:[{id:'JLB-001',subject:'Manila POS void stuck on processing',priority:'critical',status:'open',time:'1h ago',branch:'Manila'},{id:'JLB-002',subject:'Davao POS printer head damaged',priority:'high',status:'open',time:'3h ago',branch:'Davao'},{id:'JLB-003',subject:'Cebu network dropped during peak',priority:'high',status:'open',time:'6h ago',branch:'Cebu'},{id:'JLB-004',subject:'Manila card swipe error',priority:'normal',status:'open',time:'1d ago',branch:'Manila'},{id:'JLB-005',subject:'Davao daily Z-report not closing',priority:'high',status:'open',time:'2d ago',branch:'Davao'}], pending:[{id:'JLB-006',subject:'Manila POS hardware swap pending',priority:'critical',status:'pending',time:'1d ago',branch:'Manila'},{id:'JLB-007',subject:'Cebu software patch scheduled',priority:'normal',status:'pending',time:'3d ago',branch:'Cebu'},{id:'JLB-008',subject:'Davao account reactivation request',priority:'low',status:'pending',time:'5d ago',branch:'Davao'}], closed:[{id:'JLB-009',subject:'Manila POS offline 3 hours',priority:'critical',status:'closed',time:'2d ago',branch:'Manila'},{id:'JLB-010',subject:'Davao receipt print corruption',priority:'high',status:'closed',time:'4d ago',branch:'Davao'},{id:'JLB-011',subject:'Cebu scanner pairing fixed',priority:'normal',status:'closed',time:'6d ago',branch:'Cebu'},{id:'JLB-012',subject:'Manila login lockout cleared',priority:'low',status:'closed',time:'9d ago',branch:'Manila'},{id:'JLB-013',subject:'Davao network router replaced',priority:'high',status:'closed',time:'12d ago',branch:'Davao'}] } },
  15: { trend: buildTrend(15,8,8), categories: [{label:'POS Hardware',n:22,color:'#7c3aed',change:+7,dir:'up'},{label:'Software / App',n:16,color:'#0284c7',change:-3,dir:'dn'},{label:'Network',n:12,color:'#0d9488',change:+4,dir:'up'},{label:'Account / Access',n:8,color:'#d97706',change:+1,dir:'up'},{label:'Other',n:4,color:'#6b7280',change:0,dir:'flat'}], backlog: buildBacklog(9,15), tickets: { open:[{id:'UPS-001',subject:'NLEX Hub scanner firmware crash',priority:'high',status:'open',time:'4h ago',branch:'NLEX Hub'},{id:'UPS-002',subject:'NLEX Hub POS connectivity drop',priority:'normal',status:'open',time:'1d ago',branch:'NLEX Hub'}], pending:[{id:'UPS-003',subject:'NLEX Hub network infra upgrade',priority:'high',status:'pending',time:'3d ago',branch:'NLEX Hub'},{id:'UPS-004',subject:'NLEX Hub bulk user onboarding',priority:'normal',status:'pending',time:'5d ago',branch:'NLEX Hub'}], closed:[{id:'UPS-005',subject:'NLEX Hub POS froze on midnight run',priority:'high',status:'closed',time:'3d ago',branch:'NLEX Hub'},{id:'UPS-006',subject:'NLEX Hub label printer replaced',priority:'normal',status:'closed',time:'7d ago',branch:'NLEX Hub'},{id:'UPS-007',subject:'NLEX Hub account lockout cleared',priority:'low',status:'closed',time:'11d ago',branch:'NLEX Hub'}] } },
};