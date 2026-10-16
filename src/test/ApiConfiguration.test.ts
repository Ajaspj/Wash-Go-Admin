import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl, buildApiUrl, api, setAuthToken } from '../api/client';

describe('Centralized API Configuration & Endpoint Resolution', () => {
  const STAGING_URL = 'https://wash-go-api-hsvt.onrender.com';
  const PRODUCTION_URL = 'https://wash-go-api.onrender.com';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    sessionStorage.clear();
    setAuthToken(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Base URL Resolution & Precedence', () => {
    it('uses VITE_API_URL when configured', () => {
      vi.stubEnv('VITE_API_URL', STAGING_URL);
      vi.stubEnv('VITE_API_BASE_URL', '');

      expect(getApiBaseUrl()).toBe(STAGING_URL);
    });

    it('prioritizes VITE_API_URL over legacy VITE_API_BASE_URL', () => {
      vi.stubEnv('VITE_API_URL', STAGING_URL);
      vi.stubEnv('VITE_API_BASE_URL', PRODUCTION_URL);

      // Must pick staging from VITE_API_URL and NOT production from VITE_API_BASE_URL
      expect(getApiBaseUrl()).toBe(STAGING_URL);
      expect(getApiBaseUrl()).not.toBe(PRODUCTION_URL);
    });

    it('falls back to VITE_API_BASE_URL when VITE_API_URL is unset or empty', () => {
      vi.stubEnv('VITE_API_URL', '');
      vi.stubEnv('VITE_API_BASE_URL', STAGING_URL);

      expect(getApiBaseUrl()).toBe(STAGING_URL);
    });

    it('does NOT use the production URL when staging is configured', () => {
      vi.stubEnv('VITE_API_URL', STAGING_URL);

      const resolved = getApiBaseUrl();
      expect(resolved).toBe(STAGING_URL);
      expect(resolved).not.toContain('wash-go-api.onrender.com');
      expect(resolved).toContain('wash-go-api-hsvt.onrender.com');
    });
  });

  describe('Trailing Slash & Path Normalization', () => {
    it('safely normalizes a single trailing slash', () => {
      vi.stubEnv('VITE_API_URL', `${STAGING_URL}/`);

      expect(getApiBaseUrl()).toBe(STAGING_URL);
    });

    it('safely normalizes multiple trailing slashes', () => {
      vi.stubEnv('VITE_API_URL', `${STAGING_URL}///`);

      expect(getApiBaseUrl()).toBe(STAGING_URL);
    });

    it('strips redundant /api/v1 suffix from base URL to avoid segment duplication', () => {
      vi.stubEnv('VITE_API_URL', `${STAGING_URL}/api/v1/`);

      expect(getApiBaseUrl()).toBe(STAGING_URL);
      expect(buildApiUrl('/api/v1/auth/login')).toBe(`${STAGING_URL}/api/v1/auth/login`);
      expect(buildApiUrl('/api/v1/auth/login')).not.toContain('/api/v1/api/v1');
    });

    it('strips redundant /api suffix from base URL to avoid segment duplication', () => {
      vi.stubEnv('VITE_API_URL', `${STAGING_URL}/api`);

      expect(getApiBaseUrl()).toBe(STAGING_URL);
      expect(buildApiUrl('/api/v1/auth/login')).toBe(`${STAGING_URL}/api/v1/auth/login`);
    });

    it('builds full URL ensuring leading slash on endpoint', () => {
      vi.stubEnv('VITE_API_URL', STAGING_URL);

      expect(buildApiUrl('api/v1/auth/login')).toBe(`${STAGING_URL}/api/v1/auth/login`);
      expect(buildApiUrl('/api/v1/auth/login')).toBe(`${STAGING_URL}/api/v1/auth/login`);
    });

    it('ensures the login endpoint resolves to exactly /api/v1/auth/login', () => {
      vi.stubEnv('VITE_API_URL', STAGING_URL);

      const loginUrl = buildApiUrl('/api/v1/auth/login');
      expect(loginUrl).toBe('https://wash-go-api-hsvt.onrender.com/api/v1/auth/login');
    });
  });

  describe('Fail-Safe Validation & Error Handling', () => {
    it('throws a descriptive error when both VITE_API_URL and VITE_API_BASE_URL are missing', () => {
      vi.stubEnv('VITE_API_URL', '');
      vi.stubEnv('VITE_API_BASE_URL', '');

      expect(() => getApiBaseUrl()).toThrowError(/Missing API configuration/i);
    });

    it('does NOT silently fall back to production when staging variable is missing', () => {
      vi.stubEnv('VITE_API_URL', '');
      vi.stubEnv('VITE_API_BASE_URL', '');

      let errorThrown = false;
      try {
        getApiBaseUrl();
      } catch (err: any) {
        errorThrown = true;
        expect(err.message).toContain('Missing API configuration');
        expect(err.message).not.toContain(PRODUCTION_URL);
      }
      expect(errorThrown).toBe(true);
    });

    it('throws a descriptive error when URL is invalid or malformed', () => {
      vi.stubEnv('VITE_API_URL', 'not-a-valid-url');

      expect(() => getApiBaseUrl()).toThrowError(/Invalid API URL configuration/i);
    });

    it('throws a descriptive error when URL protocol is unsupported (e.g. ftp://)', () => {
      vi.stubEnv('VITE_API_URL', 'ftp://wash-go-api-hsvt.onrender.com');

      expect(() => getApiBaseUrl()).toThrowError(/Invalid API URL configuration/i);
    });
  });

  describe('API Services Request Verification against Staging Base URL', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_API_URL', STAGING_URL);
    });

    it('verifies login request is sent to configured staging backend and never to production', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            accessToken: 'test-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await api.auth.login('admin@washgo.com', 'Password123!');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;

      expect(calledUrl).toBe(`${STAGING_URL}/api/v1/auth/login`);
      expect(calledUrl).not.toContain('wash-go-api.onrender.com/api/v1/auth/login');
      expect(calledUrl.startsWith(STAGING_URL)).toBe(true);
    });

    it('verifies all API services consistently use the centralized staging base URL', async () => {
      const dummyPage = { data: { content: [], totalElements: 0, totalPages: 0 } };
      const dummyResponse = { data: {} };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/download')) {
          return new Response(new Blob(['test-blob']), { status: 200 });
        }
        return new Response(JSON.stringify(urlStr.includes('list') || urlStr.includes('agents') || urlStr.includes('documents') || urlStr.includes('bookings') || urlStr.includes('audit-logs') ? dummyPage : dummyResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      // 1. Auth endpoints
      await api.auth.login('admin@washgo.com', 'pass');
      await api.auth.me();
      await api.auth.logout('refresh-token-123');

      // 2. Dashboard
      await api.dashboard.getOperations();

      // 3. Agents
      await api.agents.list({ page: 0, size: 5 });
      await api.agents.get('agent-123');
      await api.agents.review('agent-123', 'APPROVED', 'All clear');
      await api.agents.getDocuments('agent-123');

      // 4. KYC Documents
      await api.documents.listAll({ page: 0, size: 5 });
      await api.documents.review('doc-123', 'VERIFIED');
      await api.documents.download('doc-123');

      // 5. Bookings
      await api.bookings.list({ page: 0, size: 5 });
      await api.bookings.get('booking-123');
      await api.bookings.cancel('booking-123', 'Customer request');

      // 6. Audit
      await api.audit.list({ page: 0, size: 5 });

      // Check all calls: every single request MUST start with STAGING_URL and NONE with PRODUCTION_URL
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(14);
      for (const call of fetchSpy.mock.calls) {
        const url = String(call[0]);
        expect(url.startsWith(STAGING_URL)).toBe(true);
        expect(url).not.toContain(PRODUCTION_URL);
      }
    });
  });
});
