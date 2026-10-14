import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api, setAuthToken, getAuthToken, ApiError } from '../api/client';

const TestConsumer: React.FC = () => {
  const { user, token, isLoading, isNetworkError, error, retryAuth, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="network-error">{String(isNetworkError)}</div>
      <div data-testid="error-msg">{error || ''}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="token-val">{token || 'none'}</div>
      <button onClick={() => retryAuth()} data-testid="retry-btn">
        Retry
      </button>
      <button onClick={() => logout()} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

describe('AuthContext Session Resilience & Network Failure Handling', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
  });

  it('preserves authentication token on temporary network error during profile fetch', async () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin@washgo.com', role: 'ADMIN', exp: validExp }));
    const validToken = `h.${payload}.s`;

    setAuthToken(validToken);

    // Mock network failure (status 0)
    vi.spyOn(api.auth, 'me').mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', 'Network connection timeout')
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Token must be preserved
    expect(screen.getByTestId('network-error').textContent).toBe('true');
    expect(screen.getByTestId('token-val').textContent).toBe(validToken);
    expect(getAuthToken()).toBe(validToken);
    expect(sessionStorage.getItem('washgo_admin_token')).toBe(validToken);
  });

  it('recovers session when retryAuth succeeds after network restores', async () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin@washgo.com', role: 'ADMIN', exp: validExp }));
    const validToken = `h.${payload}.s`;

    setAuthToken(validToken);

    // Initial call fails with network error
    const meMock = vi
      .spyOn(api.auth, 'me')
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Connection refused'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('network-error').textContent).toBe('true');
    });

    // Subsequent call succeeds with ADMIN profile
    meMock.mockResolvedValueOnce({
      id: 'admin-id',
      name: 'Operations Lead',
      email: 'admin@washgo.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    act(() => {
      screen.getByTestId('retry-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('network-error').textContent).toBe('false');
      expect(screen.getByTestId('user-email').textContent).toBe('admin@washgo.com');
    });
  });

  it('clears token and marks unauthenticated when profile returns authoritative 401', async () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin@washgo.com', role: 'ADMIN', exp: validExp }));
    const validToken = `h.${payload}.s`;

    setAuthToken(validToken);

    // Mock 401 unauthorized (token revoked or invalidated on backend)
    vi.spyOn(api.auth, 'me').mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.')
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('network-error').textContent).toBe('false');
    expect(screen.getByTestId('token-val').textContent).toBe('none');
    expect(getAuthToken()).toBeNull();
    expect(sessionStorage.getItem('washgo_admin_token')).toBeNull();
  });
});
