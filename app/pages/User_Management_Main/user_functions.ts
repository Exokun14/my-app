// ─────────────────────────────────────────────
//  user_functions.ts  –  Types, Data, Utilities & Logic
//  Updated: account_type → access_id (integer FK)
// ─────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole   = 'Super Admin' | 'System Admin' | 'Manager' | 'User';
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
  accessId?: number | null;   // renamed from accountType
}

export interface UserFilters {
  role:    Set<string>;
  status:  Set<string>;
  company: Set<string>;
}

export interface AddUserForm {
  fullName:        string;
  email:           string;
  role:            string;
  accessId:        string;   // stores the numeric ID as a string for <input>
  company:         string;
  position:        string;
  phone:           string;
  status:          UserStatus;
  imgSrc?:         string | null;
  password:        string;
  confirmPassword: string;
}

export interface EditUserForm extends AddUserForm {
  userId:      number;
  newPassword: string;
}

export interface RoleCardInfo {
  role:        UserRole;
  description: string;
  iconBg:      string;
  iconColor:   string;
}

// ── API response shape (mirrors DB columns) ────────────────────────────────

interface ApiUser {
  id:             number;
  profile_photo:  string | null;
  full_name:      string;
  email:          string;
  phone_number:   string | null;
  company_id:     number | null;
  company_name:   string | null;
  position_title: string | null;
  access_level:   string;        // 'super_admin' | 'system_admin' | 'manager' | 'user'
  access_id:      number | null; // FK → roles/access table
  status:         string;        // 'active' | 'inactive'
}

// ── Map DB enum → display label ────────────────────────────────────────────

function toUserRole(access_level: string): UserRole {
  const map: Record<string, UserRole> = {
    super_admin:  'Super Admin',
    system_admin: 'System Admin',
    manager:      'Manager',
    user:         'User',
  };
  return map[access_level] ?? 'User';
}

function toUserStatus(status: string): UserStatus {
  return status === 'active' ? 'Active' : 'Inactive';
}

export function apiUserToUser(u: ApiUser): User {
  return {
    id:       u.id,
    name:     u.full_name,
    email:    u.email,
    role:     toUserRole(u.access_level),
    company:  u.company_name ?? 'GenieX',
    position: u.position_title ?? '',
    status:   toUserStatus(u.status),
    phone:    u.phone_number ?? undefined,
    imgSrc:   u.profile_photo ?? null,
    accessId: u.access_id ?? null,
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

export const COMPANY_OPTIONS: string[] = [
  'GenieX', 'Starbucks', 'Ace Hardware', 'Popeyes', '7-Eleven',
  'Wolfgang Grill', 'Rolex', 'Amazon Fulfillment', 'FedEx Depot',
  'IKEA', 'DHL Warehouse', "McDonald's", 'Nike Retail', 'Puma',
  'Jollibee', 'UPS Supply Chain',
];

export const ROLE_CARDS: RoleCardInfo[] = [
  { role: 'System Admin', description: 'Manage Users & Settings', iconBg: 'var(--sky-lt)',   iconColor: 'var(--sky)'   },
  { role: 'Manager',      description: 'Team & Client Oversight', iconBg: '#fce7f3',          iconColor: '#9d174d'      },
  { role: 'User',         description: 'Standard Access',         iconBg: 'var(--green-lt)', iconColor: 'var(--green)' },
];

export const EMPTY_ADD_FORM: AddUserForm = {
  fullName: '', email: '', role: '', company: '',
  position: '', phone: '', status: 'Active', imgSrc: null,
  password: '', confirmPassword: '', accessId: '',
};

export const EMPTY_EDIT_FORM: EditUserForm = {
  userId: -1, fullName: '', email: '', role: '', company: '',
  position: '', phone: '', status: 'Active', imgSrc: null,
  password: '', confirmPassword: '', newPassword: '', accessId: '',
};

// ── Pagination constant ────────────────────────────────────────────────────
export const USERS_PER_PAGE = 12;

// ── CSS ────────────────────────────────────────────────────────────────────

export const RESIDUAL_CSS = `
  :root {
    --purple:    #7c3aed;
    --purple-d:  #5b21b6;
    --purple-lt: #ede9fe;
    --teal:      #0d9488;
    --teal-lt:   #ccfbf1;
    --sky:       #0284c7;
    --sky-lt:    #e0f2fe;
    --red:       #dc2626;
    --green:     #16a34a;
    --green-lt:  #dcfce7;
    --bg:        #f8f7ff;
    --s2:        #f2f0fb;
    --border:    rgba(124,58,237,.10);
    --border-md: rgba(124,58,237,.22);
    --t1:        #18103a;
    --t2:        #4a3870;
    --t3:        #8e7ec0;
    --t4:        #b8aed8;
    --grad:      linear-gradient(135deg,#7c3aed,#0d9488);
    --gxh-sw:    220px;
  }

  .badge   { display:inline-flex; align-items:center; gap:3px; font-size:9.5px; font-weight:700; letter-spacing:.04em; padding:2px 8px; border-radius:20px; }
  .bg-p    { background:#ede9fe; color:#5b21b6; }
  .bg-t    { background:#ccfbf1; color:#065f46; }
  .bg-s    { background:#e0f2fe; color:#0c4a6e; }
  .bg-r    { background:#fee2e2; color:#7f1d1d; }
  .bg-g    { background:#dcfce7; color:#14532d; }
  .bg-gray { background:#f4f4f8; color:#4a3870; }
  .bg-mgr  { background:#fce7f3; color:#9d174d; }

  .dot   { display:inline-block; border-radius:50%; flex-shrink:0; width:6px; height:6px; }
  .dot-g { background:#22c55e; box-shadow:0 0 5px rgba(34,197,94,.5); }
  .dot-r { background:#ef4444; box-shadow:0 0 5px rgba(239,68,68,.5); }

  @keyframes rowFadeUp {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes modalIn {
    from { opacity:0; transform:scale(.96) translateY(8px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes dfDropIn {
    from { opacity:0; transform:translateY(-6px) scale(.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes roleModalIn {
    from { opacity:0; transform:scale(.95) translateY(12px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }

  .row-anim tbody tr { animation:rowFadeUp .32s cubic-bezier(.22,1,.36,1) both; }
  .row-anim tbody tr:nth-child(1)    { animation-delay:.04s; }
  .row-anim tbody tr:nth-child(2)    { animation-delay:.09s; }
  .row-anim tbody tr:nth-child(3)    { animation-delay:.14s; }
  .row-anim tbody tr:nth-child(4)    { animation-delay:.19s; }
  .row-anim tbody tr:nth-child(5)    { animation-delay:.24s; }
  .row-anim tbody tr:nth-child(6)    { animation-delay:.29s; }
  .row-anim tbody tr:nth-child(7)    { animation-delay:.34s; }
  .row-anim tbody tr:nth-child(8)    { animation-delay:.39s; }
  .row-anim tbody tr:nth-child(9)    { animation-delay:.44s; }
  .row-anim tbody tr:nth-child(10)   { animation-delay:.49s; }
  .row-anim tbody tr:nth-child(n+11) { animation-delay:.54s; }

  .modal-anim    { animation:modalIn   .26s cubic-bezier(.16,1,.3,1); }
  .df-panel-anim { animation:dfDropIn  .18s cubic-bezier(.16,1,.3,1); }

  .pw-eye-btn {
    position:absolute; right:10px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; padding:2px;
    color:var(--t3); display:flex; align-items:center;
  }

  .um-page-shell {
    margin-left: var(--gxh-sw);
    width: calc(100vw - var(--gxh-sw));
    margin-top: 52px;
    height: calc(100vh - 52px);
    transition: margin-left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
    background: var(--bg);
  }

  .pg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all .15s ease;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--t2);
    user-select: none;
  }
  .pg-btn:hover:not(:disabled) {
    border-color: var(--border-md);
    background: var(--s2);
  }
  .pg-btn.active {
    background: var(--purple);
    border-color: var(--purple);
    color: #fff;
    box-shadow: 0 2px 8px rgba(124,58,237,.30);
  }
  .pg-btn:disabled {
    opacity: .35;
    cursor: default;
  }
  .pg-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    font-size: 12px;
    color: var(--t4);
    letter-spacing: .08em;
  }

  * { scrollbar-width:thin; scrollbar-color:rgba(124,58,237,.15) transparent; }
  ::-webkit-scrollbar       { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(124,58,237,.18); border-radius:4px; }
`;

// ── Utility Functions ──────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

export function getRoleBadgeClass(role: string): string {
  if (role === 'Super Admin')  return 'badge bg-p';
  if (role === 'System Admin') return 'badge bg-s';
  if (role === 'Manager')      return 'badge bg-mgr';
  return 'badge bg-gray';
}

export function getStatusBadgeClass(status: string): string {
  return status === 'Active' ? 'badge bg-g' : 'badge bg-r';
}

export function filterUsers(users: User[], query: string, filters: UserFilters): User[] {
  const q = query.toLowerCase();
  return users.filter(u => {
    const matchQ       = !q || `${u.name} ${u.email} ${u.company} ${u.role} ${u.position ?? ''}`.toLowerCase().includes(q);
    const matchRole    = filters.role.size    === 0 || filters.role.has(u.role);
    const matchStatus  = filters.status.size  === 0 || filters.status.has(u.status);
    const matchCompany = filters.company.size === 0 || filters.company.has(u.company);
    return matchQ && matchRole && matchStatus && matchCompany;
  });
}

export function getUniqueCompanies(users: User[]): string[] {
  return [...new Set(users.map(u => u.company))].sort();
}

export function getRoleCount(users: User[], role: UserRole): number {
  return users.filter(u => u.role === role).length;
}

export function countActiveFilters(filters: UserFilters): number {
  return filters.role.size + filters.status.size + filters.company.size;
}

export function toggleFilterValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

export function emptyFilters(): UserFilters {
  return { role: new Set(), status: new Set(), company: new Set() };
}

export function validateUserForm(form: AddUserForm): string | null {
  if (!form.fullName.trim()) return "Please enter the user's full name.";
  if (!form.email.trim())    return 'Please enter an email address.';
  if (!form.role)            return 'Please select a role.';
  // System Admins are not associated with a company — skip the check for them
  if (form.role !== 'System Admin' && !form.company) return 'Please select a company.';
  return null;
}

export function validateNewUserPassword(password: string, confirmPassword: string): string | null {
  if (!password)                    return 'Please enter a password.';
  if (password.length < 6)          return 'Password must be at least 6 characters.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export function validatePasswordChange(newPw: string, confirmPw: string): string | null {
  if (!newPw && !confirmPw) return null;
  if (newPw.length < 6)     return 'Password must be at least 6 characters.';
  if (newPw !== confirmPw)  return 'Passwords do not match.';
  return null;
}

export function formToUser(form: AddUserForm, id: number): User {
  return {
    id,
    name:     form.fullName.trim(),
    email:    form.email,
    role:     form.role as UserRole,
    company:  form.company,
    position: form.position,
    status:   form.status,
    phone:    form.phone || undefined,
    imgSrc:   form.imgSrc ?? null,
    accessId: form.accessId ? Number(form.accessId) : null,
  };
}

export function userToEditForm(user: User): EditUserForm {
  return {
    userId:          user.id,
    fullName:        user.name,
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
    accessId:        user.accessId != null ? String(user.accessId) : '',
  };
}

// ── Pagination Helper ──────────────────────────────────────────────────────

export interface PaginationInfo {
  currentPage:  number;
  totalPages:   number;
  totalItems:   number;
  startIndex:   number;
  endIndex:     number;
  pageNumbers:  (number | '…')[];
}

export function getPaginationInfo(
  totalItems:  number,
  currentPage: number,
  perPage:     number = USERS_PER_PAGE,
): PaginationInfo {
  const totalPages  = Math.max(1, Math.ceil(totalItems / perPage));
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex  = (clampedPage - 1) * perPage;
  const endIndex    = Math.min(startIndex + perPage, totalItems);

  const pageNumbers: (number | '…')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else if (clampedPage <= 3) {
    pageNumbers.push(1, 2, 3, '…', totalPages);
  } else if (clampedPage >= totalPages - 2) {
    pageNumbers.push(1, '…', totalPages - 2, totalPages - 1, totalPages);
  } else {
    pageNumbers.push(1, '…', clampedPage, '…', totalPages);
  }

  return { currentPage: clampedPage, totalPages, totalItems, startIndex, endIndex, pageNumbers };
}

// ── Custom Hook ────────────────────────────────────────────────────────────

export interface ToastState { visible: boolean; message: string; }

export interface UseUserManagementReturn {
  users:              User[];
  usersLoading:       boolean;
  usersError:         string | null;
  searchQuery:        string;
  filters:            UserFilters;
  addOpen:            boolean;
  editOpen:           boolean;
  editForm:           EditUserForm;
  toast:              ToastState;
  animKey:            number;
  searchFocused:      boolean;
  filteredUsers:      User[];
  visibleUsers:       User[];
  filterCount:        number;
  companies:          string[];
  pagination:         PaginationInfo;
  setSearchQuery:     (q: string) => void;
  setEditForm:        (form: EditUserForm) => void;
  setAddOpen:         (open: boolean) => void;
  setEditOpen:        (open: boolean) => void;
  setSearchFocused:   (focused: boolean) => void;
  setCurrentPage:     (page: number) => void;
  handleToggleFilter: (type: keyof UserFilters, value: string) => void;
  handleClearFilters: () => void;
  handleAddUser:      (form: AddUserForm) => string | null;
  openEditModal:      (user: User) => void;
  handleEditUser:     (form: EditUserForm) => string | null;
  showToast:          (msg: string) => void;
  refreshUsers:       () => void;
}

export function useUserManagement(): UseUserManagementReturn {
  const [users,         setUsers]         = useState<User[]>([]);
  const [usersLoading,  setUsersLoading]  = useState(true);
  const [usersError,    setUsersError]    = useState<string | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filters,       setFilters]       = useState<UserFilters>(emptyFilters());
  const [addOpen,       setAddOpen]       = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const [editForm,      setEditForm]      = useState<EditUserForm>({ ...EMPTY_EDIT_FORM });
  const [toast,         setToast]         = useState<ToastState>({ visible: false, message: '' });
  const [animKey,       setAnimKey]       = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [currentPage,   setCurrentPage]   = useState(1);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch users from API ── */
  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    setUsersError(null);
    fetch(`${API_BASE}/api/users`)
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setUsers(d.data.map(apiUserToUser));
          setAnimKey(k => k + 1);
        } else {
          throw new Error('Unexpected response format');
        }
      })
      .catch(err => setUsersError(err.message ?? 'Failed to load users.'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
    setAnimKey(k => k + 1);
  }, [searchQuery, filters]);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  }, []);

  const filteredUsers = filterUsers(users, searchQuery, filters);
  const pagination    = getPaginationInfo(filteredUsers.length, currentPage, USERS_PER_PAGE);
  const visibleUsers  = filteredUsers.slice(pagination.startIndex, pagination.endIndex);

  const filterCount = countActiveFilters(filters);
  const companies   = getUniqueCompanies(users).length ? getUniqueCompanies(users) : COMPANY_OPTIONS;

  function handleToggleFilter(type: keyof UserFilters, value: string) {
    setFilters(f => ({ ...f, [type]: toggleFilterValue(f[type], value) }));
  }

  function handleClearFilters() { setFilters(emptyFilters()); }

  function handleAddUser(form: AddUserForm): string | null {
    const err = validateUserForm(form) ?? validateNewUserPassword(form.password, form.confirmPassword);
    if (err) { showToast(err); return err; }
    const newId = Math.max(0, ...users.map(u => u.id)) + 1;
    setUsers(prev => [formToUser(form, newId), ...prev]);
    setCurrentPage(1);
    showToast(`User "${form.fullName}" added!`);
    return null;
  }

  function openEditModal(user: User) {
    setEditForm(userToEditForm(user));
    setEditOpen(true);
  }

  function handleEditUser(form: EditUserForm): string | null {
    const err = validateUserForm(form) ?? validatePasswordChange(form.newPassword, form.confirmPassword);
    if (err) { showToast(err); return err; }

    setUsers(prev => prev.map(u => u.id === form.userId ? {
      ...u,
      name:     form.fullName.trim(),
      email:    form.email,
      role:     form.role as UserRole,
      company:  form.company,
      position: form.position,
      status:   form.status,
      phone:    form.phone || undefined,
      imgSrc:   form.imgSrc ?? null,
      accessId: form.accessId ? Number(form.accessId) : null,
    } : u));
    setEditOpen(false);
    showToast(`User "${form.fullName}" updated${form.newPassword ? ' & password changed' : ''}!`);
    return null;
  }

  return {
    users, usersLoading, usersError,
    searchQuery, filters, addOpen, editOpen, editForm, toast, animKey, searchFocused,
    filteredUsers, visibleUsers, filterCount, companies, pagination,
    setSearchQuery, setEditForm, setAddOpen, setEditOpen, setSearchFocused, setCurrentPage,
    handleToggleFilter, handleClearFilters, handleAddUser, openEditModal, handleEditUser,
    showToast, refreshUsers: fetchUsers,
  };
}