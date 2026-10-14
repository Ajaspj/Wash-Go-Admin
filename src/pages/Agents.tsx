import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Radio,
  Droplet,
  Star,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldAlert,
  Loader2,
  Check,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { api } from '../api/client';
import { AgentProfile, AgentStatus } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const Agents: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | ''>('');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [pageNumber, setPageNumber] = useState(0);

  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const isOnlineParam =
    onlineFilter === 'online' ? true : onlineFilter === 'offline' ? false : undefined;

  const { data: page, isLoading, isFetching } = useQuery({
    queryKey: ['admin-agents-list', statusFilter, isOnlineParam, search, pageNumber],
    queryFn: () =>
      api.agents.list({
        status: statusFilter,
        isOnline: isOnlineParam,
        search: search.trim() || undefined,
        page: pageNumber,
        size: 15,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: AgentStatus; reason?: string }) =>
      api.agents.review(id, status, reason),
    onSuccess: (updatedAgent) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-operations-badge'] });
      success(`Agent status updated to ${updatedAgent.status}.`);
      setSuspendModalOpen(false);
      setSelectedAgent(null);
      setSuspendReason('');
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to update agent status.');
    },
  });

  const handleSuspendSubmit = () => {
    if (!selectedAgent) return;
    if (!suspendReason.trim()) {
      toastError('A reason for suspension is required.');
      return;
    }
    reviewMutation.mutate({
      id: selectedAgent.id,
      status: 'SUSPENDED',
      reason: suspendReason.trim(),
    });
  };

  const handleReactivate = (agent: AgentProfile) => {
    reviewMutation.mutate({
      id: agent.id,
      status: 'APPROVED',
      reason: 'Reactivated by administrator.',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Partner Agents Directory</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Overview of all registered mobile detailing partners, their active dispatch readiness, equipment capacity, and quality scores.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: '', label: 'All Partners' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'UNDER_REVIEW', label: 'Under Review' },
            { value: 'PENDING_VERIFICATION', label: 'Pending Docs' },
            { value: 'SUSPENDED', label: 'Suspended' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value as any);
                setPageNumber(0);
              }}
              className={`btn btn-sm ${statusFilter === tab.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontWeight: 600 }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Online Filter & Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={onlineFilter}
            onChange={(e) => {
              setOnlineFilter(e.target.value as any);
              setPageNumber(0);
            }}
            className="form-select"
            style={{ width: '150px', height: '38px', fontSize: '13px' }}
          >
            <option value="all">All Dispatch</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, phone, code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageNumber(0);
              }}
              className="form-input"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : page?.content && page.content.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Partner</th>
                  <th>Dispatch State</th>
                  <th>Mobile Detailing Rig</th>
                  <th>Quality &amp; Washes</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '15px',
                          }}
                        >
                          {agent.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{agent.displayName}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: '#64748B',
                                backgroundColor: '#F1F5F9',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              {agent.agentCode}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Phone size={11} /> {agent.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: agent.isOnline ? '#10B981' : '#94A3B8',
                              boxShadow: agent.isOnline ? '0 0 8px #10B981' : 'none',
                            }}
                          />
                          <span style={{ fontWeight: 600, color: agent.isOnline ? '#065F46' : '#64748B' }}>
                            {agent.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {agent.available ? 'Ready for jobs' : 'Busy / On Pause'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Droplet size={13} style={{ color: '#0284C7' }} />
                          Water: {agent.waterCapacityLiters != null ? `${agent.waterCapacityLiters}L` : 'Unspecified'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {agent.hasPressureWasher && (
                            <span style={{ fontSize: '10.5px', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '4px' }}>
                              Pressure Washer
                            </span>
                          )}
                          {agent.hasVacuumExtractor && (
                            <span style={{ fontSize: '10.5px', backgroundColor: '#F5F3FF', color: '#6D28D9', padding: '1px 5px', borderRadius: '4px' }}>
                              Extractor
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#0F172A' }}>
                          <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                          <span>{agent.averageRating ? agent.averageRating.toFixed(1) : '5.0'}</span>
                          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 400 }}>
                            ({agent.totalReviewsCount || 0} reviews)
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {agent.totalCompletedWashes || 0} completed washes
                        </span>
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={agent.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link
                          to={`/agents/${agent.id}`}
                          className="btn btn-secondary btn-sm"
                          title="View Full Profile & Specs"
                        >
                          <Eye size={13} />
                          <span>Profile</span>
                        </Link>

                        {agent.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleReactivate(agent)}
                            className="btn btn-success btn-sm"
                            title="Reactivate Agent"
                            disabled={reviewMutation.isPending}
                          >
                            <Check size={13} />
                            <span>Reactivate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAgent(agent);
                              setSuspendReason('');
                              setSuspendModalOpen(true);
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#EF4444' }}
                            title="Suspend Partner Account"
                          >
                            <ShieldAlert size={14} />
                            <span>Suspend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
            <Users size={40} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No Partners Found</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No agent partners match the given filter criteria.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {page && page.totalPages > 1 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
            }}
          >
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              Showing Page {page.number + 1} of {page.totalPages} ({page.totalElements} total partners)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page.first}
                onClick={() => setPageNumber((p) => Math.max(0, p - 1))}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                disabled={page.last}
                onClick={() => setPageNumber((p) => p + 1)}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend Confirmation Modal */}
      {selectedAgent && suspendModalOpen && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          title={`Suspend Partner: ${selectedAgent.displayName}`}
          description={`Partner Code: ${selectedAgent.agentCode} • Phone: ${selectedAgent.phone}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: '#991B1B',
              }}
            >
              Suspending this partner account will instantly revoke their ability to receive bookings and take jobs on
              the Wash-Go Agent app.
            </div>

            <div className="form-group">
              <label className="form-label">
                Suspension Reason (Mandatory) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Quality violation, customer complaint investigation, or damaged equipment."
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSuspendModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSuspendSubmit}
                disabled={!suspendReason.trim() || reviewMutation.isPending}
                className="btn btn-danger"
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Suspending...</span>
                  </>
                ) : (
                  <span>Confirm Account Suspension</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
