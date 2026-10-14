import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  FileBadge,
  Users,
  CalendarCheck2,
  FileClock,
  Settings,
  Sparkles,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // Real-time metric badge query for pending items
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-operations-badge'],
    queryFn: () => api.dashboard.getOperations(),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/applications',
      label: 'Agent Applications',
      icon: UserCheck,
      badge: metrics?.pendingReviewAgents && metrics.pendingReviewAgents > 0
        ? metrics.pendingReviewAgents
        : null,
      badgeColor: '#F59E0B',
    },
    {
      to: '/kyc',
      label: 'KYC Verification',
      icon: FileBadge,
      badge: metrics?.pendingKycDocuments && metrics.pendingKycDocuments > 0
        ? metrics.pendingKycDocuments
        : null,
      badgeColor: '#3B82F6',
    },
    {
      to: '/agents',
      label: 'All Agents',
      icon: Users,
      badge: null,
    },
    {
      to: '/bookings',
      label: 'Bookings',
      icon: CalendarCheck2,
      badge: null,
    },
    {
      to: '/audit-logs',
      label: 'Audit Logs',
      icon: FileClock,
      badge: null,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
          className="md-hidden"
        />
      )}

      <aside
        style={{
          width: '260px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderRight: '1px solid #1E293B',
          transition: 'transform 0.2s ease-in-out',
        }}
        className={isOpen ? 'sidebar-open' : 'sidebar-closed'}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '20px',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                WASH-GO
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: '#F59E0B',
                  color: '#0F172A',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                PRO
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Enterprise Operations</p>
          </div>
        </div>

        {/* Live Service Indicator */}
        <div style={{ padding: '12px 20px 4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: '#1E293B',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#94A3B8',
            }}
          >
            <Radio size={14} className="text-emerald-400" style={{ color: '#10B981' }} />
            <span>Live Dispatch System</span>
            <span
              style={{
                marginLeft: 'auto',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 8px #10B981',
              }}
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ padding: '0 8px 6px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em' }}>
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive ? '#0F172A' : '#94A3B8',
                  backgroundColor: isActive ? '#F59E0B' : 'transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} color={isActive ? '#0F172A' : '#94A3B8'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== null && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: isActive ? '#0F172A' : (item.badgeColor || '#3B82F6'),
                          color: '#FFFFFF',
                          padding: '1px 7px',
                          borderRadius: '9999px',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Security & Version Footnote */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11px',
            color: '#64748B',
          }}
        >
          <ShieldCheck size={18} style={{ color: '#10B981', flexShrink: 0 }} />
          <div>
            <p style={{ color: '#E2E8F0', fontWeight: 600 }}>Security Enforced</p>
            <p>JWT &bull; Strict Role Guard</p>
          </div>
        </div>
      </aside>
    </>
  );
};
