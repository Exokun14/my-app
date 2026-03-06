// ─────────────────────────────────────────────
//  user_functions.ts  –  Types, Data & Utilities
//  Contains all shared types, constants, and pure functions for the User Management page.
// ─────────────────────────────────────────────

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole   = 'System Admin' | 'Manager' | 'User';
export type UserStatus = 'Active' | 'Inactive';

export interface User {
  id:        number;
  name:      string;
  email:     string;
  role:      UserRole;
  company:   string;
  position:  string;
  status:    UserStatus;
  phone?:    string;
  imgSrc?:   string | null;
}

export interface UserFilters {
  role:    Set<string>;
  status:  Set<string>;
  company: Set<string>;
}

export interface AddUserForm {
  firstName:       string;
  lastName:        string;
  email:           string;
  role:            string;
  company:         string;
  position:        string;
  phone:           string;
  status:          UserStatus;
  imgSrc?:         string | null;
  password:        string;
  confirmPassword: string;
}

export interface EditUserForm extends AddUserForm {
  userId:          number;
  newPassword:     string;
  // confirmPassword is inherited from AddUserForm
}

export interface RoleCardInfo {
  role:        UserRole;
  description: string;
  iconBg:      string;
  iconColor:   string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const COMPANY_OPTIONS: string[] = [
  'GenieX',
  'Starbucks',
  'Ace Hardware',
  'Popeyes',
  '7-Eleven',
  'Wolfgang Grill',
  'Rolex',
  'Amazon Fulfillment',
  'FedEx Depot',
  'IKEA',
  'DHL Warehouse',
  "McDonald's",
  'Nike Retail',
  'Puma',
  'Jollibee',
  'UPS Supply Chain',
];

export const ROLE_CARDS: RoleCardInfo[] = [
  {
    role:        'System Admin',
    description: 'Manage Users & Settings',
    iconBg:      'var(--sky-lt)',
    iconColor:   'var(--sky)',
  },
  {
    role:        'Manager',
    description: 'Team & Client Oversight',
    iconBg:      '#fce7f3',
    iconColor:   '#9d174d',
  },
  {
    role:        'User',
    description: 'Standard Access',
    iconBg:      'var(--green-lt)',
    iconColor:   'var(--green)',
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    name:     'Kathryn Weeks',
    email:    'Kathryn_genieX@gmail.com',
    role:     'System Admin',
    company:  'GenieX',
    position: 'CRM Administrator',
    status:   'Active',
  },
  {
    id: 2,
    name:     'Michael Johnson',
    email:    'Michaelevictus@gmail.com',
    role:     'User',
    company:  'Victus',
    position: 'Support Specialist',
    status:   'Inactive',
  },
  {
    id: 3,
    name:     'Sarah Miller',
    email:    'sarah_miller_lenovo@gmail.com',
    role:     'User',
    company:  'Lenovo',
    position: 'Technical Support',
    status:   'Active',
  },
  {
    id: 4,
    name:     'David Anderson',
    email:    'david_anderson_rolex@gmail.com',
    role:     'User',
    company:  'Rolex',
    position: 'Sales Associate',
    status:   'Active',
  },
  {
    id: 5,
    name:     'Emily Thompson',
    email:    'thompson_google@gmail.com',
    role:     'Manager',
    company:  'Google',
    position: 'Operations Manager',
    status:   'Active',
  },
  {
    id: 6,
    name:     'James Roberts',
    email:    'james_stratospark@gmail.com',
    role:     'System Admin',
    company:  'Stratospark',
    position: 'IT Lead',
    status:   'Active',
  },
  {
    id: 7,
    name:     'Ana Reyes',
    email:    'ana_reyes@popeyes.com',
    role:     'User',
    company:  'Popeyes',
    position: 'Store Supervisor',
    status:   'Active',
  },
  {
    id: 8,
    name:     'Chris Park',
    email:    'cpark_nike@gmail.com',
    role:     'Manager',
    company:  'Nike Retail',
    position: 'Regional Manager',
    status:   'Inactive',
  },
];

export const EMPTY_ADD_FORM: AddUserForm = {
  firstName:       '',
  lastName:        '',
  email:           '',
  role:            '',
  company:         '',
  position:        '',
  phone:           '',
  status:          'Active',
  imgSrc:          null,
  password:        '',
  confirmPassword: '',
};

export const EMPTY_EDIT_FORM: EditUserForm = {
  userId:          -1,
  firstName:       '',
  lastName:        '',
  email:           '',
  role:            '',
  company:         '',
  position:        '',
  phone:           '',
  status:          'Active',
  imgSrc:          null,
  password:        '',
  confirmPassword: '',
  newPassword:     '',
};

// ── Utility Functions ──────────────────────────────────────────────────────

/** Returns up to 2 uppercase initials from a full name. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Returns the CSS class string for a role badge. */
export function getRoleBadgeClass(role: string): string {
  if (role === 'System Admin') return 'badge bg-s';
  if (role === 'Manager')      return 'badge bg-mgr';
  return 'badge bg-gray';
}

/** Returns the CSS class string for a status badge. */
export function getStatusBadgeClass(status: string): string {
  return status === 'Active' ? 'badge bg-g' : 'badge bg-r';
}

/** Filters users by search query and active filter sets. */
export function filterUsers(
  users:   User[],
  query:   string,
  filters: UserFilters,
): User[] {
  const q = query.toLowerCase();
  return users.filter((u) => {
    const matchQ =
      !q ||
      `${u.name} ${u.email} ${u.company} ${u.role} ${u.position ?? ''}`
        .toLowerCase()
        .includes(q);
    const matchRole    = filters.role.size    === 0 || filters.role.has(u.role);
    const matchStatus  = filters.status.size  === 0 || filters.status.has(u.status);
    const matchCompany = filters.company.size === 0 || filters.company.has(u.company);
    return matchQ && matchRole && matchStatus && matchCompany;
  });
}

/** Returns unique, sorted company names from a user list. */
export function getUniqueCompanies(users: User[]): string[] {
  return [...new Set(users.map((u) => u.company))].sort();
}

/** Returns how many users have a given role. */
export function getRoleCount(users: User[], role: UserRole): number {
  return users.filter((u) => u.role === role).length;
}

/** Returns total active filter count across all filter groups. */
export function countActiveFilters(filters: UserFilters): number {
  return filters.role.size + filters.status.size + filters.company.size;
}

/** Toggles a value in a Set (immutably) and returns the new Set. */
export function toggleFilterValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Returns a fresh empty filter object. */
export function emptyFilters(): UserFilters {
  return { role: new Set(), status: new Set(), company: new Set() };
}

/**
 * Validates the Add / Edit user form.
 * Returns an error string or null if valid.
 */
export function validateUserForm(form: AddUserForm): string | null {
  if (!form.firstName.trim()) return "Please enter the user's first name.";
  if (!form.lastName.trim())  return "Please enter the user's last name.";
  if (!form.email.trim())     return 'Please enter an email address.';
  if (!form.role)             return 'Please select a role.';
  if (!form.company)          return 'Please select a company.';
  return null;
}

/**
 * Validates password fields on the Add form (password required).
 * Returns an error string or null if valid.
 */
export function validateNewUserPassword(
  password:        string,
  confirmPassword: string,
): string | null {
  if (!password)                return 'Please enter a password.';
  if (password.length < 6)      return 'Password must be at least 6 characters.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

/**
 * Validates password fields on Edit form.
 * Returns an error string or null if valid (blank passwords = no change).
 */
export function validatePasswordChange(
  newPw:     string,
  confirmPw: string,
): string | null {
  if (!newPw && !confirmPw) return null;
  if (newPw.length < 6)     return 'Password must be at least 6 characters.';
  if (newPw !== confirmPw)  return 'Passwords do not match.';
  return null;
}

/** Converts an AddUserForm + id into a User object. */
export function formToUser(form: AddUserForm, id: number): User {
  return {
    id,
    name:     `${form.firstName} ${form.lastName}`.trim(),
    email:    form.email,
    role:     form.role as UserRole,
    company:  form.company,
    position: form.position,
    status:   form.status,
    phone:    form.phone || undefined,
    imgSrc:   form.imgSrc ?? null,
  };
}

/** Splits a User back into an EditUserForm for pre-filling the modal. */
export function userToEditForm(user: User): EditUserForm {
  const [firstName = '', ...rest] = user.name.split(' ');
  return {
    userId:          user.id,
    firstName,
    lastName:        rest.join(' '),
    email:           user.email,
    role:            user.role,
    company:         user.company,
    position:        user.position ?? '',
    phone:           user.phone ?? '',
    status:          user.status,
    imgSrc:          user.imgSrc ?? null,
    password:        '',
    confirmPassword: '',
    newPassword:     '',
  };
}