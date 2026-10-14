import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Server,
  ShieldCheck,
  Activity,
  CheckCircle2,
  RefreshCw,
  Lock,
  User,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [testingConnection, setTestingConnection] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<'IDLE' | 'HEALTHY' | 'ERROR'>('IDLE');

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://wash-go-api.onrender.com').replace(/\/+$/, '');

  const testApiHealth = async () => {
    setTestingConnection(true);
    setApiStatus('IDLE');
    const start = performance.now();
    try {
      const resp = await fetch(`${apiBaseUrl}/actuator/health`, {
        headers: { Accept: 'application/json' },
      });
      const end = performance.now();
      setLatency(Math.round(end - start));
      if (resp.ok) {
        setApiStatus('HEALTHY');
        success(`API Connection verified in ${Math.round(end - start)}ms`);
      } else {
        setApiStatus('ERROR');
        toastError(`API returned status ${resp.status}`);
      }
    } catch (err: any) {
      setApiStatus('ERROR');
      toastError(`API connection failed: ${err?.message || 'Network error'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>System Configuration &amp; Health</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Operations panel environment variables, authenticated administrator state, and backend connectivity.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Backend API Health & Connection Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Server size={20} style={{ color: '#F59E0B' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Spring Boot Backend Service</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Target API Endpoint</span>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  backgroundColor: 'var(--surface-alt)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginTop: '4px',
                  border: '1px solid var(--border-subtle)',
                  wordBreak: 'break-all',
                }}
              >
                {apiBaseUrl}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Health Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor:
                        apiStatus === 'HEALTHY' ? '#10B981' : apiStatus === 'ERROR' ? '#EF4444' : '#94A3B8',
                    }}
                  />
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {apiStatus === 'HEALTHY'
                      ? `Online (${latency}ms)`
                      : apiStatus === 'ERROR'
                      ? 'Connection Error'
                      : 'Unverified (Click Test)'}
                  </span>
                </div>
              </div>

              <button
                onClick={testApiHealth}
                disabled={testingConnection}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Authenticated Admin Identity */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <User size={20} style={{ color: '#3B82F6' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Administrator Identity</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Full Name</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{user?.name || 'Administrator'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Email Address</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{user?.email || 'admin@washgo.com'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Security Role</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                ROLE_{user?.role || 'ADMIN'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Account Status</span>
              <span style={{ fontWeight: 700, color: '#16A34A' }}>{user?.status || 'ACTIVE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Information */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Lock size={20} style={{ color: '#10B981' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Security &amp; Compliance Enforcements</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--surface-alt)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Session Isolation</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Authentication tokens reside in memory and sessionStorage to prevent persistent cross-tab contamination.
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--surface-alt)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Authoritative Role Verification</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Every login and page route strictly cross-verifies `ROLE_ADMIN` with backend `/api/v1/users/me`.
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--surface-alt)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Strict KYC Verification</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Partner activation requires affirmative verification of Government ID, Driving License, and Vehicle registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
