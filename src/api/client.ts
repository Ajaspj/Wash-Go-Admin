import {
  ApiResponse,
  AuthResponse,
  UserProfile,
  OperationsSummary,
  AgentProfile,
  AgentDocument,
  BookingResponse,
  AuditLog,
  Page,
  AgentStatus,
  DocumentVerificationStatus,
  DocumentType,
  BookingStatus,
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://wash-go-api.onrender.com').replace(/\/+$/, '');

// Safer in-memory token state with sessionStorage session-only fallback
let memoryToken: string | null = sessionStorage.getItem('washgo_admin_token');

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
  if (token) {
    sessionStorage.setItem('washgo_admin_token', token);
  } else {
    sessionStorage.removeItem('washgo_admin_token');
  }
};

export const getAuthToken = (): string | null => {
  if (!memoryToken) {
    memoryToken = sessionStorage.getItem('washgo_admin_token');
  }
  return memoryToken;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAuthToken(null);
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?expired=true';
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  let body: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = { data: text };
  }

  if (!response.ok) {
    const errorCode = body?.code || (response.status === 403 ? 'FORBIDDEN' : 'API_ERROR');
    const errorMessage = body?.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorCode, errorMessage, body?.fieldErrors);
  }

  // Handle ApiResponse<T> envelope or bare payload
  return (body && typeof body === 'object' && 'data' in body) ? body.data : body;
}

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const result = await request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(result.accessToken);
      return result;
    },
    me: async (): Promise<UserProfile> => {
      return request<UserProfile>('/api/v1/users/me');
    },
    logout: async (refreshToken?: string): Promise<void> => {
      try {
        if (refreshToken) {
          await request('/api/v1/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
        }
      } finally {
        setAuthToken(null);
      }
    },
  },

  // Operations Dashboard
  dashboard: {
    getOperations: async (): Promise<OperationsSummary> => {
      return request<OperationsSummary>('/api/v1/admin/dashboard/operations');
    },
  },

  // Agent Management
  agents: {
    list: async (params: {
      status?: AgentStatus | '';
      isOnline?: boolean;
      search?: string;
      page?: number;
      size?: number;
    } = {}): Promise<Page<AgentProfile>> => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.isOnline !== undefined) searchParams.append('isOnline', String(params.isOnline));
      if (params.search) searchParams.append('search', params.search);
      searchParams.append('page', String(params.page ?? 0));
      searchParams.append('size', String(params.size ?? 15));
      searchParams.append('sort', 'createdAt,desc');

      return request<Page<AgentProfile>>(`/api/v1/admin/agents?${searchParams.toString()}`);
    },

    get: async (id: string): Promise<AgentProfile> => {
      return request<AgentProfile>(`/api/v1/admin/agents/${id}`);
    },

    review: async (id: string, status: AgentStatus, reason?: string): Promise<AgentProfile> => {
      return request<AgentProfile>(`/api/v1/admin/agents/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },

    getDocuments: async (agentId: string): Promise<AgentDocument[]> => {
      return request<AgentDocument[]>(`/api/v1/admin/agents/${agentId}/documents`);
    },
  },

  // Dedicated KYC Documents
  documents: {
    listAll: async (params: {
      status?: DocumentVerificationStatus | '';
      documentType?: DocumentType | '';
      page?: number;
      size?: number;
    } = {}): Promise<Page<AgentDocument>> => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.documentType) searchParams.append('documentType', params.documentType);
      searchParams.append('page', String(params.page ?? 0));
      searchParams.append('size', String(params.size ?? 15));

      return request<Page<AgentDocument>>(`/api/v1/admin/documents?${searchParams.toString()}`);
    },

    review: async (
      documentId: string,
      status: DocumentVerificationStatus,
      reason?: string
    ): Promise<AgentDocument> => {
      return request<AgentDocument>(`/api/v1/admin/documents/${documentId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      });
    },

    download: async (documentId: string): Promise<Blob> => {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'Failed to securely download document');
      }
      return response.blob();
    },
  },

  // Bookings
  bookings: {
    list: async (params: {
      status?: BookingStatus | '';
      bookingReference?: string;
      page?: number;
      size?: number;
    } = {}): Promise<Page<BookingResponse>> => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.bookingReference) searchParams.append('bookingReference', params.bookingReference);
      searchParams.append('page', String(params.page ?? 0));
      searchParams.append('size', String(params.size ?? 15));
      searchParams.append('sort', 'createdAt,desc');

      return request<Page<BookingResponse>>(`/api/v1/admin/bookings?${searchParams.toString()}`);
    },

    get: async (id: string): Promise<BookingResponse> => {
      return request<BookingResponse>(`/api/v1/admin/bookings/${id}`);
    },

    cancel: async (id: string, reason: string): Promise<BookingResponse> => {
      return request<BookingResponse>(`/api/v1/admin/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
  },

  // Audit Logs
  audit: {
    list: async (params: {
      action?: string;
      page?: number;
      size?: number;
    } = {}): Promise<Page<AuditLog>> => {
      const searchParams = new URLSearchParams();
      if (params.action) searchParams.append('action', params.action);
      searchParams.append('page', String(params.page ?? 0));
      searchParams.append('size', String(params.size ?? 20));
      searchParams.append('sort', 'createdAt,desc');

      return request<Page<AuditLog>>(`/api/v1/admin/audit-logs?${searchParams.toString()}`);
    },
  },
};
