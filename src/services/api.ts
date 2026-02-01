const API_BASE_URL = 'https://jobpins-backend.onrender.com';

// Token management
const TOKEN_KEY = 'jobpins_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// API request helper
const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
};

// Helper to decode JWT and extract user info
const decodeTokenToUser = (token: string): { id: string; email: string } => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: String(payload.id || payload.sub || ''),
      email: payload.email || '',
    };
  } catch {
    throw new Error('Invalid token format');
  }
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> => {
    const data = await request<{ token: string; user?: { id: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    // If backend doesn't return user, decode from token
    const user = data.user || decodeTokenToUser(data.token);
    return { token: data.token, user };
  },

  register: async (email: string, password: string, companyName?: string): Promise<{ token: string; user: { id: string; email: string } }> => {
    const data = await request<{ token: string; user?: { id: string; email: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, company_name: companyName }),
    });
    setToken(data.token);
    // If backend doesn't return user, decode from token
    const user = data.user || decodeTokenToUser(data.token);
    return { token: data.token, user };
  },

  logout: (): void => {
    removeToken();
  },
};

// Jobs API
export interface ApiJob {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  apply_url: string;
  company_name?: string;
  location_address?: string;
  created_at?: string;
}

export const jobsApi = {
  // Public: Get all jobs
  getAll: async (): Promise<ApiJob[]> => {
    return request<ApiJob[]>('/api/jobs');
  },

  // Protected: Get employer's jobs
  getMyJobs: async (): Promise<ApiJob[]> => {
    return request<ApiJob[]>('/api/jobs/my-jobs');
  },

  // Protected: Create a job
  create: async (job: {
    title: string;
    description: string;
    maps_url: string;
    apply_url: string;
    contact_email: string;
  }): Promise<ApiJob> => {
    return request<ApiJob>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  },

  // Protected: Delete a job
  delete: async (jobId: string): Promise<void> => {
    await request<{ success: boolean }>(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },
};
