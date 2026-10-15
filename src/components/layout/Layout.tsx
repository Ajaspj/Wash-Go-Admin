import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';
import { setAuthToken } from '../../api/client';
import { Sparkles, AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, token, isLoading, isNetworkError, error, retryAuth, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F172A',
            animation: 'pulse 1.5s infinite',
          }}
        >
          <Sparkles size={28} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Wash-Go Operations</h2>
          <p style={{ fontSize: '13px', color: '#94A3B8' }}>Authenticating administrative session...</p>
        </div>
      </div>
    );
  }

  // If a valid token exists but profile verification failed due to a temporary network issue,
  // do NOT log out or redirect to login. Give the administrator a clean retry UI.
  if (token && isNetworkError) {
    const handleRetry = async () => {
      setRetrying(true);
      try {
        await retryAuth();
      } finally {
        setRetrying(false);
      }
    };

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0F1D',
          padding: '24px',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '20px',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#F59E0B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
            Backend Connection Issue
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5', marginBottom: '24px' }}>
            {error || 'Unable to establish a connection to the Wash-Go backend service. Your administrative session is preserved.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 22px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
              <span>{retrying ? 'Connecting...' : 'Retry Connection'}</span>
            </button>

            <button
              onClick={() => {
                setAuthToken(null);
                window.location.href = '/login';
              }}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                fontSize: '14px',
              }}
            >
              <LogIn size={16} />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/access-denied" replace />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--surface-main)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
