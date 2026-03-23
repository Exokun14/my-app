// API Service Layer - Connects React app to Laravel backend
// DEBUG BUILD — verbose logs on every request to help trace issues.
// Search for "🔵", "✅", "❌" in the browser console.

const API_BASE_URL = 'http://localhost/api';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface Course {
  id?: number;
  title: string;
  desc?: string;
  time: string;
  cat: string;
  thumb?: string;
  thumb_emoji?: string;
  enrolled?: boolean;
  progress?: number;
  active?: boolean;
  stage?: 'draft' | 'review_ready' | 'published' | 'unpublished' | 'template';
  companies?: string[];
  modules?: any[];
  [key: string]: any;
}

export interface Activity {
  id: string;
  type: 'accordion' | 'flashcard' | 'checklist' | 'matching' | 'fillblank' | 'hotspot';
  title: string;
  status: 'draft' | 'published';
  items?: any[];
  cards?: any[];
  questions?: any[];
  checklist?: any[];
  pairs?: any[];
  media?: { url: string; type: 'image' | 'video' | 'file'; name: string };
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserProgress {
  id?: number;
  name: string;
  company: string;
  course: string;
  progress: number;
  started: string;
  completed?: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  time_spent?: number;
  assessment_score?: number;
}

export interface Company {
  id: number;
  name: string;
  store_name?: string;
  industry?: string;
  contact_email?: string;
  contact_person?: string;
  phone?: string;
  alt_contact_person?: string;
  alt_contact_email?: string;
  alt_contact_phone?: string;
  account_manager?: string;
  msa_start?: string;
  msa_end?: string;
  active: boolean;
  courses?: Course[];
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id:           number;
  name:         string;
  email:        string;
  role:         'admin' | 'user';
  industry:     'fnb' | 'retail' | 'warehouse' | null;
  company_id:   number | null;
  company_name: string | null;
  position?:    string | null;
  phone?:       string | null;
  status?:      string | null;
}

export interface Branch {
  id?: number;
  company_id: number;
  name: string;
  site?: string;
  seats?: number;
  license_tag?: string;
}

export interface PosDevice {
  id?: number;
  company_id: number;
  branch_id?: number | null;
  status?: string;   // 'active' | 'offline' | 'maintenance'
  model?: string;
  serial?: string;
  ip_address?: string;
  os?: string;
  msa_start?: string;
  msa_end?: string;
  warranty_end?: string;
}

export interface License {
  id?: number;
  company_id: number;
  license_key?: string;
  sa_start?: string;
  sa_end?: string;
  krunch_version?: string;
}

export interface Ticket {
  id?: number;
  company_id: number;
  branch_id?: number | null;
  user_id?: number | null;
  subject: string;
  description?: string;
  status?: 'open' | 'pending' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id?: number;
  user_id?: number | null;
  company_id?: number | null;
  type?: 'info' | 'warning' | 'alert';
  title?: string;
  message: string;
  read?: boolean;
  created_at?: string;
}

export interface PortalUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  industry?: string;
  company_id?: number | null;
  phone?: string;
  position?: string;
  status?: string;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatRole(role: AuthUser['role'] | null | undefined): string {
  if (!role) return 'User';
  return role === 'admin' ? 'System Admin' : 'User';
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function getUserId(): string {
  try {
    const raw = sessionStorage.getItem('gx_user_profile');
    if (raw) {
      const profile = JSON.parse(raw);
      if (profile?.id) return String(profile.id);
    }
  } catch { /* ignore */ }
  return '';
}

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method  = (options.method ?? 'GET').toUpperCase();

  const logGroup = CSRF_METHODS.has(method) ? console.group : console.groupCollapsed;
  logGroup(`[API] ${method} ${endpoint}`);
  console.log('🔵 URL:', fullUrl);
  if (options.body) {
    try   { console.log('📤 Body:', JSON.parse(options.body as string)); }
    catch { console.log('📤 Body (raw):', options.body); }
  }

  const csrfHeaders: Record<string, string> = {};
  if (CSRF_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token) {
      csrfHeaders['X-XSRF-TOKEN'] = token;
      console.log('🔐 CSRF token attached');
    } else {
      console.warn('⚠️ XSRF-TOKEN cookie not found');
    }
  }

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        'X-User-Id':    getUserId(),
        ...csrfHeaders,
        ...options.headers,
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
      return { success: false, error: `Server returned ${contentType} instead of JSON.` };
    }

    let data: any;
    try   { data = JSON.parse(text); }
    catch { console.groupEnd(); return { success: false, error: 'Invalid JSON from server' }; }

    if (!response.ok) {
      console.warn('⚠️ HTTP', response.status, data);
      console.groupEnd();
      return { success: false, error: data.error || data.message || `HTTP ${response.status}` };
    }

    console.log('✅ Success:', data);
    console.groupEnd();
    return { success: true, data };

  } catch (error) {
    console.error('❌ Network error:', error);
    console.groupEnd();
    return { success: false, error: error instanceof Error ? error.message : 'Request failed' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────────────────────────────────────
export const coursesAPI = {
  getAll: async (filters?: {
    category?: string;
    active?: boolean;
    client_id?: number;
    stage?: 'draft' | 'review_ready' | 'published' | 'unpublished' | 'template';
    include_templates?: boolean;
  }): Promise<ApiResponse<Course[]>> => {
    const params = new URLSearchParams();
    if (filters?.category)             params.append('category',          filters.category);
    if (filters?.active !== undefined) params.append('active',            String(filters.active));
    if (filters?.client_id)            params.append('client_id',         String(filters.client_id));
    if (filters?.stage)                params.append('stage',             filters.stage);
    if (filters?.include_templates)    params.append('include_templates', 'true');
    const query = params.toString();
    return apiRequest<Course[]>(`/courses${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getUserCourses: async (): Promise<ApiResponse<Course[]>> =>
    apiRequest<Course[]>('/courses', { method: 'GET' }),
  getById: async (id: number): Promise<ApiResponse<Course>> =>
    apiRequest<Course>(`/courses/${id}`, { method: 'GET' }),
  getFullCourse: async (id: number): Promise<ApiResponse<Course>> =>
    apiRequest<Course>(`/courses/${id}`, { method: 'GET' }),
  create: async (course: Partial<Course>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest(`/courses`, { method: 'POST', body: JSON.stringify(course) }),
  update: async (id: number, course: Partial<Course>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(course) }),
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/courses/${id}`, { method: 'DELETE' }),
  updateProgress: async (id: number, payload: {
    progress: number; enrolled?: boolean | number; time_spent?: number; completed?: boolean | number;
  }): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/courses/${id}/progress`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateModules: async (id: number, modules: any[]): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/courses/${id}/modules`, { method: 'PUT', body: JSON.stringify({ modules }) }),
  clone: async (id: number): Promise<ApiResponse<{ id: number; course: Course; message: string }>> =>
    apiRequest(`/courses/${id}/clone`, { method: 'POST' }),
  markChapterDone: async (chapterId: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/chapters/${chapterId}/done`, { method: 'PUT' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Activities
// ─────────────────────────────────────────────────────────────────────────────
export const activitiesAPI = {
  getAll: async (filters?: { type?: string; status?: string }): Promise<ApiResponse<Activity[]>> => {
    const params = new URLSearchParams();
    if (filters?.type)   params.append('type',   filters.type);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return apiRequest<Activity[]>(`/activities${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getById:  async (id: string): Promise<ApiResponse<Activity>> =>
    apiRequest<Activity>(`/activities/${id}`, { method: 'GET' }),
  create: async (activity: Activity): Promise<ApiResponse<{ activity_id: string; message: string }>> =>
    apiRequest('/activities', { method: 'POST', body: JSON.stringify(activity) }),
  update: async (id: string, activity: Partial<Activity>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(activity) }),
  delete: async (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/activities/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────────────
export const progressAPI = {
  getAll: async (filters?: { company?: string; status?: string }): Promise<ApiResponse<UserProgress[]>> => {
    const params = new URLSearchParams();
    if (filters?.company) params.append('company', filters.company);
    if (filters?.status)  params.append('status',  filters.status);
    const query = params.toString();
    return apiRequest<UserProgress[]>(`/progress${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  create: async (progress: UserProgress): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest('/progress', { method: 'POST', body: JSON.stringify(progress) }),
  update: async (id: number, progress: Partial<UserProgress>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/progress/${id}`, { method: 'PUT', body: JSON.stringify(progress) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Companies
// ─────────────────────────────────────────────────────────────────────────────
export const companiesAPI = {
  getAll: async (): Promise<ApiResponse<Company[]>> =>
    apiRequest<Company[]>('/companies', { method: 'GET' }),
  getById: async (id: number): Promise<ApiResponse<Company>> =>
    apiRequest<Company>(`/companies/${id}`, { method: 'GET' }),
  assignCourse: async (companyId: number, courseId: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/companies/${companyId}/courses`, { method: 'POST', body: JSON.stringify({ course_id: courseId }) }),
  removeCourse: async (companyId: number, courseId: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/companies/${companyId}/courses/${courseId}`, { method: 'DELETE' }),
  syncCourses: async (companyId: number, courseIds: number[]): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/companies/${companyId}/courses`, { method: 'PUT', body: JSON.stringify({ course_ids: courseIds }) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────────────────────────────────────
export const branchesAPI = {
  getAll: async (companyId?: number): Promise<ApiResponse<Branch[]>> => {
    const query = companyId ? `?company_id=${companyId}` : '';
    return apiRequest<Branch[]>(`/branches${query}`, { method: 'GET' });
  },
  getById: async (id: number): Promise<ApiResponse<Branch>> =>
    apiRequest<Branch>(`/branches/${id}`, { method: 'GET' }),
  create: async (branch: Partial<Branch>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest('/branches', { method: 'POST', body: JSON.stringify(branch) }),
  update: async (id: number, branch: Partial<Branch>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(branch) }),
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/branches/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// POS Devices
// ─────────────────────────────────────────────────────────────────────────────
export const posDevicesAPI = {
  getAll: async (filters?: { company_id?: number; branch_id?: number }): Promise<ApiResponse<PosDevice[]>> => {
    const params = new URLSearchParams();
    if (filters?.company_id) params.append('company_id', String(filters.company_id));
    if (filters?.branch_id)  params.append('branch_id',  String(filters.branch_id));
    const query = params.toString();
    return apiRequest<PosDevice[]>(`/pos-devices${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getById: async (id: number): Promise<ApiResponse<PosDevice>> =>
    apiRequest<PosDevice>(`/pos-devices/${id}`, { method: 'GET' }),
  create: async (device: Partial<PosDevice>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest('/pos-devices', { method: 'POST', body: JSON.stringify(device) }),
  update: async (id: number, device: Partial<PosDevice>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/pos-devices/${id}`, { method: 'PUT', body: JSON.stringify(device) }),
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/pos-devices/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Licenses
// ─────────────────────────────────────────────────────────────────────────────
export const licensesAPI = {
  getAll: async (companyId?: number): Promise<ApiResponse<License[]>> => {
    const query = companyId ? `?company_id=${companyId}` : '';
    return apiRequest<License[]>(`/licenses${query}`, { method: 'GET' });
  },
  create: async (license: Partial<License>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest('/licenses', { method: 'POST', body: JSON.stringify(license) }),
  update: async (id: number, license: Partial<License>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/licenses/${id}`, { method: 'PUT', body: JSON.stringify(license) }),
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/licenses/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Tickets
// ─────────────────────────────────────────────────────────────────────────────
export const ticketsAPI = {
  getAll: async (filters?: {
    company_id?: number;
    branch_id?: number;
    status?: 'open' | 'pending' | 'closed';
  }): Promise<ApiResponse<Ticket[]>> => {
    const params = new URLSearchParams();
    if (filters?.company_id) params.append('company_id', String(filters.company_id));
    if (filters?.branch_id)  params.append('branch_id',  String(filters.branch_id));
    if (filters?.status)     params.append('status',     filters.status);
    const query = params.toString();
    return apiRequest<Ticket[]>(`/tickets${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getById: async (id: number): Promise<ApiResponse<Ticket>> =>
    apiRequest<Ticket>(`/tickets/${id}`, { method: 'GET' }),
  create: async (ticket: Partial<Ticket>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
  update: async (id: number, ticket: Partial<Ticket>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(ticket) }),
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/tickets/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: async (): Promise<ApiResponse<Notification[]>> =>
    apiRequest<Notification[]>('/notifications', { method: 'GET' }),
  markRead: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: async (): Promise<ApiResponse<{ message: string }>> =>
    apiRequest('/notifications/read-all', { method: 'PUT' }),
  create: async (notif: Partial<Notification>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest('/notifications', { method: 'POST', body: JSON.stringify(notif) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Portal Users
// ─────────────────────────────────────────────────────────────────────────────
export const portalUsersAPI = {
  getAll: async (filters?: {
    company_id?: number;
    status?: string;
  }): Promise<ApiResponse<PortalUser[]>> => {
    const params = new URLSearchParams();
    if (filters?.company_id) params.append('company_id', String(filters.company_id));
    if (filters?.status)     params.append('status',     filters.status);
    const query = params.toString();
    return apiRequest<PortalUser[]>(`/users${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  update: async (id: number, data: Partial<PortalUser>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/users/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Clients, Settings, Upload
// ─────────────────────────────────────────────────────────────────────────────
export const clientsAPI = {
  getAll: async (): Promise<ApiResponse<any[]>> =>
    apiRequest<any[]>('/clients', { method: 'GET' }),
  getById: async (id: number): Promise<ApiResponse<any>> =>
    apiRequest<any>(`/clients/${id}`, { method: 'GET' }),
  getCourses: async (id: number): Promise<ApiResponse<Course[]>> =>
    apiRequest<Course[]>(`/clients/${id}/courses`, { method: 'GET' }),
};

export const settingsAPI = {
  getAll: async (): Promise<ApiResponse<{ categories: string[]; colors: string[] }>> =>
    apiRequest('/settings', { method: 'GET' }),
  getCategories: async (): Promise<ApiResponse<string[]>> =>
    apiRequest<string[]>('/settings/categories', { method: 'GET' }),
  getColors: async (): Promise<ApiResponse<string[]>> =>
    apiRequest<string[]>('/settings/colors', { method: 'GET' }),
  createCategory: async (name: string): Promise<ApiResponse<{ message: string }>> =>
    apiRequest('/settings/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteCategory: async (name: string): Promise<ApiResponse<{ message: string }>> =>
    apiRequest(`/settings/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),
};

export const uploadAPI = {
  uploadFile: async (file: File): Promise<ApiResponse<{ url: string; name: string; size: number; type: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = getCsrfToken();
      const headers: Record<string, string> = { 'X-User-Id': getUserId() };
      if (token) headers['X-XSRF-TOKEN'] = token;
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST', body: formData, headers, credentials: 'include',
      });
      const text = await response.text();
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) return { success: false, error: 'Upload returned HTML not JSON' };
      const data = JSON.parse(text);
      if (!response.ok) return { success: false, error: data.error || data.message || 'Upload failed' };
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  },
};

export const authAPI = {
  getUser: async (): Promise<ApiResponse<AuthUser>> => {
    console.log('[auth] getUser → GET /api/user');
    const result = await apiRequest<AuthUser>('/user', { method: 'GET' });
    if (result.success && result.data) {
      console.log('[auth] ✅ user:', result.data.name,
        '| role:', result.data.role,
        '| company:', result.data.company_name ?? '(none)');
    } else {
      console.warn('[auth] ❌ failed:', result.error);
    }
    return result;
  },
  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    console.log('[auth] logout → POST /api/logout');
    return apiRequest<{ message: string }>('/logout', { method: 'POST' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default export — grouped namespace
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  courses:       coursesAPI,
  activities:    activitiesAPI,
  progress:      progressAPI,
  companies:     companiesAPI,
  branches:      branchesAPI,
  posDevices:    posDevicesAPI,
  licenses:      licensesAPI,
  tickets:       ticketsAPI,
  notifications: notificationsAPI,
  portalUsers:   portalUsersAPI,
  clients:       clientsAPI,
  settings:      settingsAPI,
  upload:        uploadAPI,
  auth:          authAPI,
};

export default api;
