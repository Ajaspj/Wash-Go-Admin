import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CheckCircle,
  XCircle,
  Radio,
  Calendar,
  FileBadge,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Clock,
  Car,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';

export const Dashboard: React.FC = () => {
  // 1. Operational Metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
    isFetching: metricsFetching,
  } = useQuery({
    queryKey: ['admin-dashboard-operations'],
    queryFn: () => api.dashboard.getOperations(),
    refetchInterval: 30000,
  });

  // 2. Recent Agent Applications
  const {
    data: recentAgentsPage,
    isLoading: agentsLoading,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ['admin-recent-agents'],
    queryFn: () => api.agents.list({ size: 6 }),
  });

  // 3. Recent Bookings
  const {
    data: recentBookingsPage,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['admin-recent-bookings'],
    queryFn: () => api.bookings.list({ size: 6 }),
  });

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchAgents();
    refetchBookings();
  };

  const statCards = [
    {
      label: 'Total Registered Agents',
      value: metrics?.totalAgents ?? 0,
      icon: Users,
      color: '#3B82F6',
      bg: '#EFF6FF',
    },
    {
      label: 'Applications Pending',
      value: metrics?.pendingReviewAgents ?? 0,
      icon: UserCheck,
      color: '#F59E0B',
      bg: '#FFFBEB',
      highlight: (metrics?.pendingReviewAgents ?? 0) > 0,
    },
    {
      label: 'Approved Partners',
      value: metrics?.approvedAgents ?? 0,
      icon: CheckCircle,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      label: 'Rejected Applications',
      value: metrics?.rejectedAgents ?? 0,
      icon: XCircle,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
    {
      label: 'Agents Online Now',
      value: metrics?.onlineAgents ?? 0,
      icon: Radio,
      color: '#06B6D4',
      bg: '#ECFEFF',
    },
    {
      label: "Today's Bookings",
      value: metrics?.bookingsToday ?? 0,
      icon: Calendar,
      color: '#8B5CF6',
      bg: '#F5F3FF',
    },
    {
      label: 'Pending KYC Documents',
      value: metrics?.pendingKycDocuments ?? 0,
      icon: FileBadge,
      color: '#D97706',
      bg: '#FEF3C7',
      highlight: (metrics?.pendingKycDocuments ?? 0) > 0,
    },
    {
      label: "Today's Revenue",
      value: `₹${(metrics?.capturedRevenueToday ?? 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: '#16A34A',
      bg: '#DCFCE7',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>Operations Command Center</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
            Real-time monitoring of agent onboarding, KYC verification, and booking operations.
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          className="btn btn-secondary"
          disabled={metricsFetching}
        >
          <RefreshCw size={16} className={metricsFetching ? 'animate-spin' : ''} />
          <span>{metricsFetching ? 'Refreshing Data...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Error Banner if Metrics fail */}
      {metricsError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            color: '#991B1B',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={20} />
          <div style={{ flex: 1 }}>
            <strong>Unable to fetch latest operational metrics.</strong> Backend may be warming up or rate-limited.
          </div>
          <button onClick={() => refetchMetrics()} className="btn btn-sm btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
        }}
      >
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="card card-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                position: 'relative',
                borderLeft: card.highlight ? `4px solid ${card.color}` : '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: card.bg,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{card.label}</p>
                {metricsLoading ? (
                  <Skeleton width="60px" height="28px" style={{ marginTop: '4px' }} />
                ) : (
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {card.value}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section: Recent Agent Applications & Recent Bookings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Recent Applications */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Recent Agent Applications</h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>Latest partner registrations requiring review</p>
            </div>
            <Link to="/applications" className="btn btn-ghost btn-sm" style={{ color: '#D97706', fontWeight: 700 }}>
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {agentsLoading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : recentAgentsPage?.content && recentAgentsPage.content.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAgentsPage.content.map((agent) => (
                    <tr key={agent.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{agent.displayName}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{agent.phone}</div>
                      </td>
                      <td>
                        <StatusBadge status={agent.status} />
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B' }}>
                        {new Date(agent.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/agents/${agent.id}`} className="btn btn-secondary btn-sm">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <Users size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
              <p style={{ fontWeight: 600 }}>No applications registered yet.</p>
            </div>
          )}
        </div>

        {/* Recent Bookings Activity */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Live Bookings Stream</h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>Latest on-demand car-wash dispatch activity</p>
            </div>
            <Link to="/bookings" className="btn btn-ghost btn-sm" style={{ color: '#D97706', fontWeight: 700 }}>
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {bookingsLoading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : bookingsError ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 8px', color: '#EF4444' }} />
              <p style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>Unable to load live bookings</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', maxWidth: '320px', margin: '4px auto 12px' }}>
                {(bookingsError as any)?.message || 'The bookings service returned an error.'}
              </p>
              <button
                onClick={() => refetchBookings()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : recentBookingsPage?.content && recentBookingsPage.content.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref / Service</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookingsPage.content.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0F172A', fontSize: '12px' }}>
                          {b.bookingReference}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{b.serviceName || 'Mobile Wash'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{b.customerName || 'Customer'}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{b.vehicleMake} {b.vehicleModel}</div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                        ₹{b.servicePrice}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <Car size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
              <p style={{ fontWeight: 600 }}>No recent bookings in the system.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
