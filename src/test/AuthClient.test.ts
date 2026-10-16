import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseJwtClaims,
  isTokenExpired,
  getAuthToken,
  setAuthToken,
  getApiBaseUrl,
  buildApiUrl,
  ApiError,
  api,
} from '../api/client';

describe('Auth Client & JWT Utilities', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
  });

  it('parses valid JWT claims correctly', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin@washgo.com', role: 'ADMIN', exp }));
    const token = `header.${payload}.signature`;

    const claims = parseJwtClaims(token);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('admin@washgo.com');
    expect(claims?.role).toBe('ADMIN');
    expect(claims?.exp).toBe(exp);
  });

  it('returns null for malformed tokens', () => {
    expect(parseJwtClaims('invalid-token')).toBeNull();
    expect(parseJwtClaims('')).toBeNull();
    expect(parseJwtClaims('a.b')).toBeNull();
  });

  it('correctly identifies expired vs unexpired tokens', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredPayload = btoa(JSON.stringify({ sub: 'user', exp: nowSec - 60 }));
    const activePayload = btoa(JSON.stringify({ sub: 'user', exp: nowSec + 3600 }));

    expect(isTokenExpired(`h.${expiredPayload}.s`)).toBe(true);
    expect(isTokenExpired(`h.${activePayload}.s`)).toBe(false);
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired('garbage')).toBe(true);
  });

  it('automatically prunes expired tokens from getAuthToken()', () => {
    const expiredSec = Math.floor(Date.now() / 1000) - 120;
    const expiredPayload = btoa(JSON.stringify({ sub: 'user', exp: expiredSec }));
    const expiredToken = `h.${expiredPayload}.s`;

    sessionStorage.setItem('washgo_admin_token', expiredToken);
    expect(getAuthToken()).toBeNull();
    expect(sessionStorage.getItem('washgo_admin_token')).toBeNull();
  });

  it('retains valid unexpired token in getAuthToken()', () => {
    const activeSec = Math.floor(Date.now() / 1000) + 3600;
    const activePayload = btoa(JSON.stringify({ sub: 'admin', exp: activeSec }));
    const activeToken = `h.${activePayload}.s`;

    setAuthToken(activeToken);
    expect(getAuthToken()).toBe(activeToken);
    expect(sessionStorage.getItem('washgo_admin_token')).toBe(activeToken);
  });

  it('handles 401 on login as AUTHENTICATION_FAILED without claiming session expired', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        status: 401,
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await expect(api.auth.login('wrong@washgo.com', 'badpass')).rejects.toThrowError(
      'Authentication failed'
    );
  });

  it('handles network failure as NETWORK_ERROR with informative message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await api.auth.login('admin@washgo.com', 'password123');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.status).toBe(0);
      expect(err.message).toContain('Unable to connect to the backend server');
    }
  });

  it('treats 401 on protected endpoint (/api/v1/users/me) as session expiry and clears token', async () => {
    const activeSec = Math.floor(Date.now() / 1000) + 3600;
    const activePayload = btoa(JSON.stringify({ sub: 'admin', exp: activeSec }));
    const activeToken = `h.${activePayload}.s`;
    setAuthToken(activeToken);

    const mockResponse = new Response(
      JSON.stringify({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await expect(api.auth.me()).rejects.toThrowError('Session expired. Please log in again.');
    expect(getAuthToken()).toBeNull();
  });

  it('handles 403 on protected endpoint with FORBIDDEN ApiError', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient administrative privileges',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    try {
      await api.auth.me();
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('Insufficient administrative privileges');
    }
  });

  it('handles request timeout gracefully with TIMEOUT_ERROR', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    try {
      await api.auth.login('admin@washgo.com', 'password');
      expect.fail('Should have thrown timeout ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(0);
      expect(err.code).toBe('TIMEOUT_ERROR');
      expect(err.message).toContain('timed out');
    }
  });

  it('resolves API base URL dynamically without trailing slashes', () => {
    const url = getApiBaseUrl();
    expect(url).toBeDefined();
    expect(url.endsWith('/')).toBe(false);

    const loginUrl = buildApiUrl('/api/v1/auth/login');
    expect(loginUrl).toBe(`${url}/api/v1/auth/login`);
  });

  it('correctly decodes unpadded base64url JWT tokens', () => {
    // Generate an unpadded base64url payload
    const unpaddedPayload = 'eyJzdWIiOiJhZG1pbkB3YXNoZ28uY29tIiwicm9sZSI6IkFETUlOIiwiZXhwIjoxODAwMDAwMDAwfQ'; // Length 78, 78 % 4 = 2
    const token = `eyJhbGciOiJIUzI1NiJ9.${unpaddedPayload}.signature`;

    const claims = parseJwtClaims(token);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('admin@washgo.com');
    expect(claims?.role).toBe('ADMIN');
    expect(claims?.exp).toBe(1800000000);
  });

  it('preserves authentication token when a resource endpoint (like /api/v1/admin/bookings) returns 401', async () => {
    const activeSec = Math.floor(Date.now() / 1000) + 3600;
    const activePayload = btoa(JSON.stringify({ sub: 'admin', exp: activeSec }));
    const activeToken = `h.${activePayload}.s`;
    setAuthToken(activeToken);

    const mockResponse = new Response(
      JSON.stringify({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    // Bookings 401 should throw ApiError, but NOT wipe the valid token or redirect
    await expect(api.bookings.list({ size: 6 })).rejects.toThrowError(
      'Authentication is required'
    );

    // CRITICAL: Token must remain intact in memory and storage
    expect(getAuthToken()).toBe(activeToken);
    expect(sessionStorage.getItem('washgo_admin_token')).toBe(activeToken);
  });

  it('builds /api/v1/admin/bookings query parameters without conflicting sort parameter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { content: [], totalElements: 0, totalPages: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await api.bookings.list({ page: 0, size: 6 });

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/v1/admin/bookings?page=0&size=6');
    expect(calledUrl).not.toContain('sort=');
  });

  it('normalizes nested backend BookingDtos.BookingResponse structure into flattened fields', async () => {
    const rawBackendBooking = {
      id: 'book-uuid-1',
      bookingReference: 'WG-2026-999',
      status: 'CONFIRMED',
      customer: {
        id: 'cust-uuid-1',
        firstName: 'Aarav',
        lastName: 'Sharma',
        email: 'aarav@example.com',
      },
      vehicle: {
        id: 'veh-uuid-1',
        make: 'Hyundai',
        model: 'Creta',
        registrationNumber: 'KA-01-AB-1234',
        vehicleType: 'SUV',
      },
      service: {
        id: 'srv-uuid-1',
        name: 'Full Body Foam Wash',
        slug: 'full-foam',
        category: 'EXTERIOR',
        durationMinutes: 45,
      },
      servicePrice: 499,
      serviceNameSnapshot: 'Full Body Foam Wash',
      scheduledStartTime: '2026-10-15T10:00:00Z',
      scheduledEndTime: '2026-10-15T10:45:00Z',
      serviceAddress: {
        addressLine1: '123 MG Road',
        city: 'Bengaluru',
      },
      assignedStaff: {
        id: 'staff-uuid-1',
        staffCode: 'AG-BLR-001',
        displayName: 'Rajesh Kumar',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            content: [rawBackendBooking],
            totalElements: 1,
            totalPages: 1,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await api.bookings.list({ size: 6 });
    expect(result.content).toHaveLength(1);

    const booking = result.content[0];
    expect(booking.customerName).toBe('Aarav Sharma');
    expect(booking.vehicleMake).toBe('Hyundai');
    expect(booking.vehicleModel).toBe('Creta');
    expect(booking.vehiclePlate).toBe('KA-01-AB-1234');
    expect(booking.serviceName).toBe('Full Body Foam Wash');
    expect(booking.agentName).toBe('Rajesh Kumar');
    expect(booking.city).toBe('Bengaluru');
  });

  it('attaches the Authorization Bearer token consistently across dashboard and bookings endpoints', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin', exp }));
    const validToken = `header.${payload}.sig`;
    setAuthToken(validToken);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { content: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await api.bookings.list({ size: 6 });

    expect(fetchSpy).toHaveBeenCalled();
    const headers = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe(`Bearer ${validToken}`);
  });
});
