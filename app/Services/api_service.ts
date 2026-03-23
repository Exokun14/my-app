// API Service Layer - Connects React app to Laravel backend

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

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('🔵 Fetching:', fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Id': '1',
        ...options.headers,
      },
      ...options,
    });

    const text = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Content-Type:', response.headers.get('content-type'));
    console.log('📥 Body preview:', text.substring(0, 200));

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('❌ Expected JSON but got:', contentType);
      console.error('❌ Full response:', text);
      return {
        success: false,
        error: `Server returned HTML instead of JSON. Laravel route may not exist.`,
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
      console.error('❌ Response was:', text);
      return {
        success: false,
        error: 'Invalid JSON from server',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
      };
    }

    console.log('✅ Success:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

export const coursesAPI = {
  getAll: async (filters?: { category?: string; active?: boolean; client_id?: number }): Promise<ApiResponse<Course[]>> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    if (filters?.client_id) params.append('client_id', String(filters.client_id));
    
    const query = params.toString();
    return apiRequest<Course[]>(`/courses${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getById: async (id: number): Promise<ApiResponse<Course>> => {
    return apiRequest<Course>(`/courses/${id}`, { method: 'GET' });
  },

  getFullCourse: async (id: number): Promise<ApiResponse<Course>> => {
    return apiRequest<Course>(`/courses/${id}`, { method: 'GET' });
  },

  create: async (course: Partial<Course>): Promise<ApiResponse<{ id: number; message: string }>> => {
    return apiRequest<{ id: number; message: string }>('/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    });
  },

  update: async (id: number, course: Partial<Course>): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    });
  },

  delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/courses/${id}`, { method: 'DELETE' });
  },

  updateProgress: async (id: number, payload: {
    progress: number;
    enrolled?: boolean;
    time_spent?: number;
    completed?: boolean;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/courses/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  updateModules: async (id: number, modules: any[]): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/courses/${id}/modules`, {
      method: 'PUT',
      body: JSON.stringify({ modules }),
    });
  },
};

export const activitiesAPI = {
  getAll: async (filters?: { type?: string; status?: string }): Promise<ApiResponse<Activity[]>> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return apiRequest<Activity[]>(`/activities${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getById: async (activityId: string): Promise<ApiResponse<Activity>> => {
    return apiRequest<Activity>(`/activities/${activityId}`, { method: 'GET' });
  },

  create: async (activity: Activity): Promise<ApiResponse<{ activity_id: string; message: string }>> => {
    return apiRequest<{ activity_id: string; message: string }>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  update: async (activityId: string, activity: Partial<Activity>): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(activity),
    });
  },

  delete: async (activityId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/activities/${activityId}`, { method: 'DELETE' });
  },
};

export const progressAPI = {
  getAll: async (filters?: { company?: string; status?: string }): Promise<ApiResponse<UserProgress[]>> => {
    const params = new URLSearchParams();
    if (filters?.company) params.append('company', filters.company);
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString();
    return apiRequest<UserProgress[]>(`/progress${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  create: async (progress: UserProgress): Promise<ApiResponse<{ id: number; message: string }>> => {
    return apiRequest<{ id: number; message: string }>('/progress', {
      method: 'POST',
      body: JSON.stringify(progress),
    });
  },

  update: async (id: number, progress: Partial<UserProgress>): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/progress/${id}`, {
      method: 'PUT',
      body: JSON.stringify(progress),
    });
  },
};

export const clientsAPI = {
  getAll: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>('/clients', { method: 'GET' });
  },

  getById: async (id: number): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/clients/${id}`, { method: 'GET' });
  },

  getCourses: async (id: number): Promise<ApiResponse<Course[]>> => {
    return apiRequest<Course[]>(`/clients/${id}/courses`, { method: 'GET' });
  },
};

export const settingsAPI = {
  getAll: async (): Promise<ApiResponse<{ categories: string[]; colors: string[] }>> => {
    return apiRequest<{ categories: string[]; colors: string[] }>('/settings', { method: 'GET' });
  },

  getCategories: async (): Promise<ApiResponse<string[]>> => {
    return apiRequest<string[]>('/settings/categories', { method: 'GET' });
  },

  getColors: async (): Promise<ApiResponse<string[]>> => {
    return apiRequest<string[]>('/settings/colors', { method: 'GET' });
  },

  createCategory: async (name: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>('/settings/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  deleteCategory: async (name: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/settings/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },
};

export const uploadAPI = {
  uploadFile: async (file: File): Promise<ApiResponse<{ url: string; name: string; size: number; type: string }>> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const fullUrl = `${API_BASE_URL}/upload`;
      console.log('🔵 Uploading to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-User-Id': '1',
        },
      });

      const text = await response.text();
      const contentType = response.headers.get('content-type');
      
      if (!contentType?.includes('application/json')) {
        return {
          success: false,
          error: 'Upload endpoint returned HTML instead of JSON',
        };
      }

      const data = JSON.parse(text);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Upload failed',
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },
};

// ── FormData-aware request (no Content-Type header — browser sets multipart boundary) ──
function getXsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function fetchCsrfCookie(): Promise<void> {
  await fetch(`${API_BASE_URL.replace('/api', '')}/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include',
  });
}

async function apiRequestForm<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: FormData,
): Promise<ApiResponse<T>> {
  try {
    let xsrfToken = getXsrfToken();
    if (!xsrfToken) {
      await fetchCsrfCookie();
      xsrfToken = getXsrfToken();
    }

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('🔵 Fetching (form):', fullUrl);

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Accept': 'application/json',
        'X-User-Id': '1',
        'X-XSRF-TOKEN': xsrfToken,
      },
      credentials: 'include',
      body,
    });

    if (response.status === 419) {
      await fetchCsrfCookie();
      const retryToken = getXsrfToken();
      const retryResponse = await fetch(fullUrl, {
        method,
        headers: {
          'Accept': 'application/json',
          'X-User-Id': '1',
          'X-XSRF-TOKEN': retryToken,
        },
        credentials: 'include',
        body,
      });
      return handleFormResponse<T>(retryResponse);
    }

    return handleFormResponse<T>(response);
  } catch (error) {
    console.error('❌ API Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Request failed' };
  }
}

async function handleFormResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();
  console.log('📥 Response status:', response.status);
  console.log('📥 Response body:', text);

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    console.error('❌ Expected JSON but got:', contentType);
    console.error('❌ Full response body:', text);
    return { success: false, error: `Server returned non-JSON (${response.status}). Check console for full response.` };
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('❌ Failed to parse JSON. Raw body:', text);
    return { success: false, error: 'Invalid JSON from server' };
  }

  if (!response.ok) {
    console.error(`❌ HTTP ${response.status} error:`, JSON.stringify(data, null, 2));
    if (data.errors) {
      const firstError = Object.values(data.errors as Record<string, string[]>)[0][0];
      console.error('❌ Validation errors:', data.errors);
      return { success: false, error: firstError };
    }
    if (data.exception) {
      console.error('❌ Laravel exception:', data.exception);
      console.error('❌ In file:', data.file, 'line', data.line);
      if (data.trace) console.error('❌ Trace:', data.trace.slice(0, 5));
    }
    return { success: false, error: data.message ?? `HTTP ${response.status}` };
  }

  console.log('✅ Success:', data);
  return { success: true, data };
}

export interface User {
  id?: number;
  full_name: string;
  email: string;
  access_level: string;
  account_type: string;
  status: 'active' | 'inactive';
  password?: string;
  phone_number?: string;
  company_id?: number | null;
  position_title?: string;
  profile_photo?: File | null;
}

export const usersAPI = {
  create: async (user: Omit<User, 'id'>): Promise<ApiResponse<{ id: number; message: string }>> => {
    const fd = new FormData();
    fd.append('full_name',    user.full_name);
    fd.append('name',         user.full_name);
    fd.append('email',        user.email);
    fd.append('access_level', user.access_level);
    fd.append('account_type', user.account_type);
    fd.append('status',       user.status);
    if (user.password)                      fd.append('password',       user.password);
    if (user.phone_number)                  fd.append('phone_number',   user.phone_number);
    if (user.company_id != null)            fd.append('company_id',     String(user.company_id));
    if (user.position_title)                fd.append('position_title', user.position_title);
    if (user.profile_photo instanceof File) fd.append('profile_photo',  user.profile_photo);

    return apiRequestForm<{ id: number; message: string }>('/users', 'POST', fd);
  },

  update: async (id: number, user: Partial<User>): Promise<ApiResponse<{ message: string }>> => {
    const fd = new FormData();
    fd.append('_method', 'PUT');
    if (user.full_name)                     fd.append('full_name',      user.full_name);
    if (user.email)                         fd.append('email',          user.email);
    if (user.access_level)                  fd.append('access_level',   user.access_level);
    if (user.account_type)                  fd.append('account_type',   user.account_type);
    if (user.status)                        fd.append('status',         user.status);
    if (user.password)                      fd.append('password',       user.password);
    if (user.phone_number)                  fd.append('phone_number',   user.phone_number);
    if (user.company_id != null)            fd.append('company_id',     String(user.company_id));
    if (user.position_title)                fd.append('position_title', user.position_title);
    if (user.profile_photo instanceof File) fd.append('profile_photo',  user.profile_photo);

    return apiRequestForm<{ message: string }>(`/users/${id}`, 'POST', fd);
  },

  delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/users/${id}`, { method: 'DELETE' });
  },
};

export const api = {
  courses: coursesAPI,
  activities: activitiesAPI,
  progress: progressAPI,
  clients: clientsAPI,
  settings: settingsAPI,
  upload: uploadAPI,
  users: usersAPI,
};

export default api;
