import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login } = useAuth();
  const { error: toastError, success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isExpired = searchParams.get('expired') === 'true';
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setLocalError(null);

    try {
      const profile = await login(email.trim(), password);
      success(`Welcome back, ${profile.name || 'Administrator'}!`);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your credentials.';
      setLocalError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
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
        backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 60%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.1)',
          padding: '36px 32px',
          color: '#FFFFFF',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#F59E0B',
              color: '#0F172A',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)',
            }}
          >
            <Sparkles size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            Wash-Go Operations
          </h1>
          <p style={{ fontSize: '13.5px', color: '#94A3B8', marginTop: '4px' }}>
            Administrative Control &amp; Partner Verification Portal
          </p>
        </div>

        {/* Session Expired Notice */}
        {isExpired && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              color: '#FCD34D',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {/* Error Alert */}
        {localError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#FCA5A5',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#E2E8F0' }}>
              Administrator Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@washgo.com"
                className="form-input"
                style={{
                  paddingLeft: '38px',
                  backgroundColor: '#1E293B',
                  borderColor: '#334155',
                  color: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ color: '#E2E8F0' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="form-input"
                style={{
                  paddingLeft: '38px',
                  backgroundColor: '#1E293B',
                  borderColor: '#334155',
                  color: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '12px',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying Authorization...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security Footnote */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#64748B',
            fontSize: '12px',
          }}
        >
          <ShieldCheck size={16} style={{ color: '#10B981' }} />
          <span>Strict Role-Based Access Control Enforced</span>
        </div>
      </div>
    </div>
  );
};
