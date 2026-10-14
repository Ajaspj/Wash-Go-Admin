import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseJwtClaims,
  isTokenExpired,
  getAuthToken,
  setAuthToken,
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
});
