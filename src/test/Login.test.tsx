import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Login } from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { api, setAuthToken } from '../api/client';

describe('Login Component & Session Flow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  const renderLogin = (initialEntries = ['/login']) => {
    return render(
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<div>Dashboard Home</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    );
  };

  it('renders login form elements', () => {
    renderLogin();

    expect(screen.getByText('Wash-Go Operations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@washgo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });
    fireEvent.click(submitBtn);

    const emailInput = screen.getByPlaceholderText('admin@washgo.com') as HTMLInputElement;
    expect(emailInput.required).toBe(true);
  });

  it('renders session expired notice when query param ?expired=true is present', () => {
    renderLogin(['/login?expired=true']);

    expect(screen.getByText(/Your session has expired. Please sign in again./i)).toBeInTheDocument();
  });

  it('dismisses session expired notice as soon as user types into an input field', () => {
    renderLogin(['/login?expired=true']);

    expect(screen.getByText(/Your session has expired. Please sign in again./i)).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText('admin@washgo.com');
    fireEvent.change(emailInput, { target: { value: 'a' } });

    expect(screen.queryByText(/Your session has expired. Please sign in again./i)).not.toBeInTheDocument();
  });

  it('displays accurate authentication failure message when credentials are invalid, NOT session expired', async () => {
    vi.spyOn(api.auth, 'login').mockRejectedValue(
      new Error('Invalid email or password. Please verify your credentials.')
    );

    renderLogin();

    const emailInput = screen.getByPlaceholderText('admin@washgo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });

    fireEvent.change(emailInput, { target: { value: 'admin@washgo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Invalid email or password/i)[0]).toBeInTheDocument();
    });

    // CRITICAL: Ensure "Session expired" is NOT shown for failed logins
    expect(screen.queryByText(/Session expired/i)).not.toBeInTheDocument();
  });

  it('displays network failure message when server is unreachable', async () => {
    vi.spyOn(api.auth, 'login').mockRejectedValue(
      new Error('Unable to connect to the backend server. Please verify your network connection.')
    );

    renderLogin();

    const emailInput = screen.getByPlaceholderText('admin@washgo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });

    fireEvent.change(emailInput, { target: { value: 'admin@washgo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Unable to connect to the backend server/i)[0]).toBeInTheDocument();
    });
  });

  it('denies access when authenticated user has non-ADMIN role (e.g. CUSTOMER)', async () => {
    vi.spyOn(api.auth, 'login').mockResolvedValue({
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
    });

    vi.spyOn(api.auth, 'me').mockResolvedValue({
      id: 'user-cust-1',
      name: 'Customer Joe',
      email: 'joe@customer.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText('admin@washgo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });

    fireEvent.change(emailInput, { target: { value: 'joe@customer.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Access Denied: Account with role "CUSTOMER"/i)[0]).toBeInTheDocument();
    });
  });

  it('navigates to dashboard on successful administrator authentication', async () => {
    vi.spyOn(api.auth, 'login').mockResolvedValue({
      accessToken: 'token-admin',
      refreshToken: 'refresh-admin',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
    });

    vi.spyOn(api.auth, 'me').mockResolvedValue({
      id: 'admin-uuid',
      name: 'Super Admin',
      email: 'admin@washgo.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText('admin@washgo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });

    fireEvent.change(emailInput, { target: { value: 'admin@washgo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidAdminPass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
    });
  });

  it('automatically redirects away from /login if user is already authenticated with ADMIN role', async () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin@washgo.com', role: 'ADMIN', exp: validExp }));
    const validToken = `h.${payload}.s`;

    setAuthToken(validToken);

    vi.spyOn(api.auth, 'me').mockResolvedValue({
      id: 'admin-uuid',
      name: 'Super Admin',
      email: 'admin@washgo.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
    });
  });

  it('does NOT automatically redirect away if visiting /login?expired=true', async () => {
    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: 'admin@washgo.com', role: 'ADMIN', exp: validExp }));
    const validToken = `h.${payload}.s`;

    setAuthToken(validToken);

    vi.spyOn(api.auth, 'me').mockResolvedValue({
      id: 'admin-uuid',
      name: 'Super Admin',
      email: 'admin@washgo.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    renderLogin(['/login?expired=true']);

    await waitFor(() => {
      expect(screen.getByText(/Your session has expired. Please sign in again./i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Dashboard Home')).not.toBeInTheDocument();
  });
});
