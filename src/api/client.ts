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

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test';
  return isDevOrTest
    ? 'https://wash-go-api-hsvt.onrender.com'
    : 'https://wash-go-api.onrender.com';
};

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
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
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
  if (token.split('.').length !== 3) return true;
  const claims = parseJwtClaims(token);
  // If a 3-part JWT has no exp claim or cannot be decoded client-side,
  // do not unilaterally assume expired and nuke it.
  if (!claims || typeof claims.exp !== 'number') {
    return false;
  }
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

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const { timeoutMs = 20000, signal: customSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  if (customSignal) {
    customSignal.addEventListener('abort', () => controller.abort(customSignal.reason));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (netErr: any) {
    if (netErr?.name === 'AbortError' || controller.signal.aborted) {
      throw new ApiError(
        0,
        'TIMEOUT_ERROR',
        `The request to backend (${baseUrl}) timed out after ${Math.round(timeoutMs / 1000)}s. Please check backend availability or retry.`
      );
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Unable to connect to the backend server (${baseUrl}). Please verify your network connection or backend availability.`
    );
  } finally {
    clearTimeout(timeoutId);
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
    // 1. If authenticating at /api/v1/auth/login, 401 is bad credentials, NOT an expired session
    if (endpoint.includes('/api/v1/auth/login')) {
      const errorCode = body?.code || 'AUTHENTICATION_FAILED';
      const errorMessage = body?.message || 'Invalid email or password. Please verify your credentials.';
      throw new ApiError(401, errorCode, errorMessage, body?.fieldErrors);
    }

    // 2. Only if the authoritative profile endpoint (/api/v1/users/me) returns 401,
    // does it signify that the session token is truly revoked or expired.
    if (endpoint.includes('/api/v1/users/me')) {
      setAuthToken(null);
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
    }

    // 3. For any other endpoint (such as dashboard data queries, /api/v1/admin/bookings, etc.),
    // a 401 must NOT nuke the valid session token or trigger a hard window.location reload loop.
    // Throw ApiError so TanStack Query / UI error boundary can handle it locally.
    const errorCode = body?.code || 'UNAUTHORIZED';
    const errorMessage = body?.message || 'Unauthorized access to this resource.';
    throw new ApiError(401, errorCode, errorMessage, body?.fieldErrors);
  }

  if (response.status === 403) {
    const errorCode = body?.code || 'FORBIDDEN';
    const errorMessage = body?.message || 'Access Denied: Administrator privileges required.';
    throw new ApiError(403, errorCode, errorMessage, body?.fieldErrors);
  }

  if (!response.ok) {
    const errorCode = body?.code || 'API_ERROR';
    const errorMessage = body?.message || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorCode, errorMessage, body?.fieldErrors);
  }

  // Handle ApiResponse<T> envelope or bare payload
  return (body && typeof body === 'object' && 'data' in body) ? body.data : body;
}

function normalizeBooking(b: any): BookingResponse {
  if (!b) return b;
  const customerName =
    b.customerName ||
    (b.customer ? `${b.customer.firstName || ''} ${b.customer.lastName || ''}`.trim() : '') ||
    'Customer';
  const customerPhone = b.customerPhone || b.customer?.phone || '';
  const vehicleMake = b.vehicleMake || b.vehicle?.make || 'Vehicle';
  const vehicleModel = b.vehicleModel || b.vehicle?.model || '';
  const vehiclePlate = b.vehiclePlate || b.vehicle?.registrationNumber || '';
  const serviceName = b.serviceName || b.service?.name || b.serviceNameSnapshot || 'Mobile Wash';
  const agentName = b.agentName || b.assignedStaff?.displayName || null;
  const city = b.city || b.serviceAddress?.city || null;
  const addressLine = b.addressLine || b.serviceAddress?.addressLine1 || null;

  return {
    ...b,
    customerId: b.customerId || b.customer?.id || '',
    customerName,
    customerPhone,
    vehicleId: b.vehicleId || b.vehicle?.id || '',
    vehicleMake,
    vehicleModel,
    vehiclePlate,
    serviceId: b.serviceId || b.service?.id || '',
    serviceName,
    agentName,
    city,
    addressLine,
  };
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
      const baseUrl = getApiBaseUrl();
      const token = getAuthToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(`${baseUrl}/api/v1/admin/documents/${documentId}/download`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'Failed to securely download document');
        }
        return await response.blob();
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          throw new ApiError(0, 'TIMEOUT_ERROR', 'Document download timed out. Please retry.');
        }
        if (err instanceof ApiError) throw err;
        throw new ApiError(0, 'NETWORK_ERROR', 'Network failure while downloading document.');
      } finally {
        clearTimeout(timeoutId);
      }
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

      const res = await request<Page<any>>(`/api/v1/admin/bookings?${searchParams.toString()}`);
      if (res && Array.isArray(res.content)) {
        return {
          ...res,
          content: res.content.map(normalizeBooking),
        };
      }
      return res as Page<BookingResponse>;
    },

    get: async (id: string): Promise<BookingResponse> => {
      const res = await request<any>(`/api/v1/admin/bookings/${id}`);
      return normalizeBooking(res);
    },

    cancel: async (id: string, reason: string): Promise<BookingResponse> => {
      const res = await request<any>(`/api/v1/admin/bookings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return normalizeBooking(res);
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
