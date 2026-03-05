// API Service Layer - Connects React app to Laravel backend
// Place this file at: app/Services/api.service.ts

// CRITICAL: Must use absolute URL to Laravel, not relative path
// Relative paths like '/api' go to Next.js (port 3000), not Laravel
const API_BASE_URL = 'http://localhost/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // IMPORTANT: This builds the full URL: http://localhost/api/courses
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('🔵 Fetching:', fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Get response as text first to debug
    const text = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Content-Type:', response.headers.get('content-type'));
    console.log('📥 Body preview:', text.substring(0, 200));

    // Check if it's JSON
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('❌ Expected JSON but got:', contentType);
      console.error('❌ Full response:', text);
      return {
        success: false,
        error: `Server returned HTML instead of JSON. Laravel route may not exist.`,
      };
    }

    // Parse JSON
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

// ─────────────────────────────────────────────────────────────────────────────
// COURSES API
// ─────────────────────────────────────────────────────────────────────────────

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

  updateProgress: async (id: number, progress: number, enrolled?: boolean): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/courses/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress, enrolled }),
    });
  },

  updateModules: async (id: number, modules: any[]): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/courses/${id}/modules`, {
      method: 'PUT',
      body: JSON.stringify({ modules }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITIES API
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS API
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS API
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS API
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// FILE UPLOAD API
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  courses: coursesAPI,
  activities: activitiesAPI,
  progress: progressAPI,
  clients: clientsAPI,
  settings: settingsAPI,
  upload: uploadAPI,
};

export default api;
