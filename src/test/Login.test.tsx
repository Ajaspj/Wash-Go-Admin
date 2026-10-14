import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

describe('Login Component', () => {
  it('renders login form elements', () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    expect(screen.getByText('Wash-Go Operations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@washgo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });
    fireEvent.click(submitBtn);

    // Form inputs have HTML5 required attribute
    const emailInput = screen.getByPlaceholderText('admin@washgo.com') as HTMLInputElement;
    expect(emailInput.required).toBe(true);
  });
});
