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

export interface JwtClaims {
  sub?: string;
  role?: string;
  userId?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function parseJwtClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, bufferSeconds = 10): boolean {
  if (!token) return true;
  const claims = parseJwtClaims(token);
  if (!claims || !claims.exp) return true;
  return Date.now() >= (claims.exp * 1000) - (bufferSeconds * 1000);
}

// Safer in-memory token state with sessionStorage session-only fallback
let memoryToken: string | null = null;
try {
  memoryToken = sessionStorage.getItem('washgo_admin_token');
} catch {
  memoryToken = null;
}

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem('washgo_admin_token', token);
    } else {
      sessionStorage.removeItem('washgo_admin_token');
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
};

export const getAuthToken = (): string | null => {
  if (!memoryToken) {
    try {
      memoryToken = sessionStorage.getItem('washgo_admin_token');
    } catch {
      memoryToken = null;
    }
  }
  if (memoryToken && isTokenExpired(memoryToken)) {
    setAuthToken(null);
    return null;
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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Unable to connect to the backend server (${API_BASE_URL}). Please verify your network connection or backend availability.`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  let body: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    const text = await response.text();
    body = text ? { message: text } : null;
  }

  if (response.status === 401) {
    // If authenticating at /api/v1/auth/login, 401 is bad credentials, NOT an expired session
    if (endpoint.includes('/api/v1/auth/login')) {
      const errorCode = body?.code || 'AUTHENTICATION_FAILED';
      const errorMessage = body?.message || 'Invalid email or password. Please verify your credentials.';
      throw new ApiError(401, errorCode, errorMessage, body?.fieldErrors);
    }

    // On protected endpoints, 401 indicates genuine session expiry / invalid token
    setAuthToken(null);
    if (typeof window !== 'undefined' && window.location && !window.location.pathname.includes('/login')) {
      window.location.href = '/login?expired=true';
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
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
