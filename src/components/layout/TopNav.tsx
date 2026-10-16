import React from 'react';
import { Menu, LogOut, ShieldAlert, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../api/client';

interface TopNavProps {
  onToggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const apiHost = (() => {
    try {
      return getApiBaseUrl()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
    } catch {
      return 'Configuration Error';
    }
  })();

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-ghost"
          style={{ padding: '8px' }}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #A7F3D0',
            }}
          >
            <Globe size={13} />
            {apiHost}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Administrator Profile Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 12px 4px 6px',
            backgroundColor: 'var(--surface-alt)',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>
              {user?.name || 'Administrator'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldAlert size={10} style={{ color: '#F59E0B' }} />
              ROLE_ADMIN
            </div>
          </div>
        </div>

        {/* Quick Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Sign out of Admin Panel"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
