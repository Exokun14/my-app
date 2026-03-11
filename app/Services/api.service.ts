// API Service Layer - Connects React app to Laravel backend
// DEBUG BUILD — verbose logs on every request to help trace issues.
// Search for "🔵", "✅", "❌" in the browser console.

const API_BASE_URL = 'http://localhost/api';

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
  media?: {
    url: string;
    type: 'image' | 'video' | 'file';
    name: string;
  };
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
  industry?: string;
  contact_email?: string;
  active: boolean;
  courses?: Course[];
  created_at?: string;
  updated_at?: string;
}

// ── Auth / Current User ───────────────────────────────────────────────────────
export interface AuthUser {
  id:           number;
  name:         string;
  email:        string;
  role:         'admin' | 'user';
  industry:     'fnb' | 'retail' | 'warehouse' | null;
  company_id:   number | null;
  company_name: string | null;
}

export function formatRole(role: AuthUser['role'] | null | undefined): string {
  if (!role) return 'User';
  return role === 'admin' ? 'System Admin' : 'User';
}

// ─────────────────────────────────────────────────────────────────────────────
// Core request — every call goes through here, all logs in one place
// ─────────────────────────────────────────────────────────────────────────────
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method  = options.method ?? 'GET';

  console.groupCollapsed(`[API] ${method} ${endpoint}`);
  console.log('🔵 URL:', fullUrl);
  if (options.body) {
    try   { console.log('📤 Body:', JSON.parse(options.body as string)); }
    catch { console.log('📤 Body (raw):', options.body); }
  }

  try {
    const response    = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        'X-User-Id':    '1',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    const text        = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    console.log('📥 Status:', response.status, response.statusText);
    console.log('📥 Content-Type:', contentType);
    console.log('📥 Body preview:', text.substring(0, 300));

    if (!contentType.includes('application/json')) {
      console.error('❌ Expected JSON but got:', contentType);
      console.error('❌ Route missing or not in api middleware group — check routes/api.php');
      console.groupEnd();
      return { success: false, error: `Server returned ${contentType} instead of JSON. Check routes/api.php.` };
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ JSON.parse failed:', e);
      console.groupEnd();
      return { success: false, error: 'Invalid JSON from server' };
    }

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
    console.error('💡 Causes: Laravel not running | CORS blocked | wrong API_BASE_URL');
    console.groupEnd();
    return { success: false, error: error instanceof Error ? error.message : 'Request failed' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const coursesAPI = {
  getAll: async (filters?: {
    category?: string; active?: boolean; client_id?: number;
    stage?: 'draft' | 'review_ready' | 'published' | 'unpublished' | 'template';
  }): Promise<ApiResponse<Course[]>> => {
    const params = new URLSearchParams();
    if (filters?.category)            params.append('category',  filters.category);
    if (filters?.active !== undefined) params.append('active',   String(filters.active));
    if (filters?.client_id)           params.append('client_id', String(filters.client_id));
    if (filters?.stage)               params.append('stage',     filters.stage);
    const query = params.toString();
    return apiRequest<Course[]>(`/courses${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getUserCourses: async (): Promise<ApiResponse<Course[]>> => {
    console.log('[courses] getUserCourses → GET /user/courses');
    return apiRequest<Course[]>('/user/courses', { method: 'GET' });
  },

  getById: async (id: number): Promise<ApiResponse<Course>> =>
    apiRequest<Course>(`/courses/${id}`, { method: 'GET' }),

  getFullCourse: async (id: number): Promise<ApiResponse<Course>> => {
    console.log('[courses] getFullCourse id=', id);
    return apiRequest<Course>(`/courses/${id}`, { method: 'GET' });
  },

  create: async (course: Partial<Course>): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest<{ id: number; message: string }>('/courses', { method: 'POST', body: JSON.stringify(course) }),

  update: async (id: number, course: Partial<Course>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(course) }),

  delete: async (id: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/courses/${id}`, { method: 'DELETE' }),

  updateProgress: async (id: number, payload: {
    progress: number; enrolled?: boolean | number; time_spent?: number; completed?: boolean | number;
  }): Promise<ApiResponse<{ message: string }>> => {
    console.log('[courses] updateProgress id=', id, payload);
    return apiRequest<{ message: string }>(`/courses/${id}/progress`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  updateModules: async (id: number, modules: any[]): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/courses/${id}/modules`, { method: 'PUT', body: JSON.stringify({ modules }) }),

  clone: async (id: number): Promise<ApiResponse<{ id: number; course: Course; message: string }>> =>
    apiRequest<{ id: number; course: Course; message: string }>(`/courses/${id}/clone`, { method: 'POST' }),

  markChapterDone: async (chapterId: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/chapters/${chapterId}/done`, { method: 'PUT' }),
};

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
    apiRequest<{ activity_id: string; message: string }>('/activities', { method: 'POST', body: JSON.stringify(activity) }),
  update: async (id: string, activity: Partial<Activity>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(activity) }),
  delete: async (id: string): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/activities/${id}`, { method: 'DELETE' }),
};

export const progressAPI = {
  getAll: async (filters?: { company?: string; status?: string }): Promise<ApiResponse<UserProgress[]>> => {
    const params = new URLSearchParams();
    if (filters?.company) params.append('company', filters.company);
    if (filters?.status)  params.append('status',  filters.status);
    const query = params.toString();
    return apiRequest<UserProgress[]>(`/progress${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  create: async (progress: UserProgress): Promise<ApiResponse<{ id: number; message: string }>> =>
    apiRequest<{ id: number; message: string }>('/progress', { method: 'POST', body: JSON.stringify(progress) }),
  update: async (id: number, progress: Partial<UserProgress>): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/progress/${id}`, { method: 'PUT', body: JSON.stringify(progress) }),
};

export const companiesAPI = {
  getAll: async (): Promise<ApiResponse<Company[]>> =>
    apiRequest<Company[]>('/companies', { method: 'GET' }),
  getById: async (id: number): Promise<ApiResponse<Company>> =>
    apiRequest<Company>(`/companies/${id}`, { method: 'GET' }),
  assignCourse: async (companyId: number, courseId: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/companies/${companyId}/courses`, { method: 'POST', body: JSON.stringify({ course_id: courseId }) }),
  removeCourse: async (companyId: number, courseId: number): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/companies/${companyId}/courses/${courseId}`, { method: 'DELETE' }),
  syncCourses: async (companyId: number, courseIds: number[]): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/companies/${companyId}/courses`, { method: 'PUT', body: JSON.stringify({ course_ids: courseIds }) }),
};

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
    apiRequest<{ categories: string[]; colors: string[] }>('/settings', { method: 'GET' }),
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    console.log('[settings] getCategories');
    return apiRequest<string[]>('/settings/categories', { method: 'GET' });
  },
  getColors: async (): Promise<ApiResponse<string[]>> =>
    apiRequest<string[]>('/settings/colors', { method: 'GET' }),
  createCategory: async (name: string): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>('/settings/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteCategory: async (name: string): Promise<ApiResponse<{ message: string }>> =>
    apiRequest<{ message: string }>(`/settings/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),
};

export const uploadAPI = {
  uploadFile: async (file: File): Promise<ApiResponse<{ url: string; name: string; size: number; type: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const fullUrl  = `${API_BASE_URL}/upload`;
      console.log('[upload] uploading', file.name, 'size=', file.size);
      const response = await fetch(fullUrl, { method: 'POST', body: formData, headers: { 'X-User-Id': '1' }, credentials: 'include' });
      const text        = await response.text();
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) return { success: false, error: 'Upload returned HTML not JSON' };
      const data = JSON.parse(text);
      if (!response.ok) return { success: false, error: data.error || data.message || 'Upload failed' };
      console.log('[upload] ✅', data.url);
      return { success: true, data };
    } catch (error) {
      console.error('[upload] ❌', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  },
};

// ── Auth API ──────────────────────────────────────────────────────────────────
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
      console.warn('[auth] 💡 Is the user logged in? Does /api/user include company_name?');
    }
    return result;
  },

  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    console.log('[auth] logout → POST /api/logout');
    return apiRequest<{ message: string }>('/logout', { method: 'POST' });
  },
};

export const api = {
  courses:    coursesAPI,
  activities: activitiesAPI,
  progress:   progressAPI,
  companies:  companiesAPI,
  clients:    clientsAPI,
  settings:   settingsAPI,
  upload:     uploadAPI,
  auth:       authAPI,
};

export default api;
