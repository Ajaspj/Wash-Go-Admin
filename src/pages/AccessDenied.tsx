import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDenied: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        padding: '24px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: '#1E293B',
          borderColor: '#334155',
          color: '#FFFFFF',
          padding: '40px 32px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#EF4444',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <ShieldAlert size={36} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Access Denied</h1>
        <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '8px', lineHeight: 1.6 }}>
          You do not have administrative authority (<code style={{ color: '#FCD34D' }}>ROLE_ADMIN</code>) to access
          the Wash-Go operations console. Customer and partner accounts are strictly segregated from administrative functions.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '28px' }}>
          <button onClick={() => logout()} className="btn btn-secondary">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <Link to="/login" className="btn btn-primary">
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
