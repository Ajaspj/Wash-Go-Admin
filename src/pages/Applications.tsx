import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
  Eye,
  Check,
  X,
  Droplet,
  Shield,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { AgentProfile, AgentStatus } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const Applications: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | ''>('UNDER_REVIEW');
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: page, isLoading, refetch } = useQuery({
    queryKey: ['admin-agent-applications', statusFilter, search],
    queryFn: () =>
      api.agents.list({
        status: statusFilter,
        search: search.trim() || undefined,
        size: 20,
      }),
  });

  // Query documents for the selected agent in review dialog
  const { data: agentDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['admin-agent-docs', selectedAgent?.id],
    queryFn: () => (selectedAgent ? api.agents.getDocuments(selectedAgent.id) : Promise.resolve([])),
    enabled: !!selectedAgent,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: AgentStatus; reason?: string }) =>
      api.agents.review(id, status, reason),
    onSuccess: (updatedAgent) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-operations-badge'] });
      success(
        `Agent ${updatedAgent.displayName} application has been ${
          updatedAgent.status === 'APPROVED' ? 'approved' : 'rejected'
        }.`
      );
      closeDecisionModal();
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to submit application review decision.');
    },
  });

  const openDecisionModal = (agent: AgentProfile, type: 'APPROVED' | 'REJECTED') => {
    setSelectedAgent(agent);
    setDecisionType(type);
    setRejectReason('');
  };

  const closeDecisionModal = () => {
    setSelectedAgent(null);
    setDecisionType(null);
    setRejectReason('');
  };

  const handleDecisionSubmit = () => {
    if (!selectedAgent || !decisionType) return;

    if (decisionType === 'REJECTED' && !rejectReason.trim()) {
      toastError('A clear rejection reason is mandatory.');
      return;
    }

    reviewMutation.mutate({
      id: selectedAgent.id,
      status: decisionType,
      reason: decisionType === 'REJECTED' ? rejectReason.trim() : undefined,
    });
  };

  // Check if documents are ready for approval
  const hasDocuments = (agentDocs?.length ?? 0) > 0;
  const hasUnverifiedDocs = agentDocs?.some((d) => d.verificationStatus !== 'VERIFIED');
  const canApprove = hasDocuments && !hasUnverifiedDocs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Agent Applications Review</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Evaluate partner registrations, verify mobile detailing equipment, and approve on-demand dispatch readiness.
        </p>
      </div>

      {/* Filters & Search Toolbar */}
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
            { value: 'UNDER_REVIEW', label: 'Under Review' },
            { value: 'PENDING_VERIFICATION', label: 'Pending Docs' },
            { value: '', label: 'All Applications' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as any)}
              className={`btn btn-sm ${statusFilter === tab.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontWeight: 600 }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
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
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : page?.content && page.content.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Partner Identity</th>
                  <th>Equipment Specs</th>
                  <th>Status</th>
                  <th>Submission Date</th>
                  <th style={{ textAlign: 'right' }}>Review Decision</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                          }}
                        >
                          {agent.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{agent.displayName}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '8px' }}>
                            <span>{agent.phone}</span>
                            <span>&bull;</span>
                            <span style={{ fontFamily: 'monospace' }}>{agent.agentCode}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Droplet size={13} style={{ color: '#0284C7' }} />
                          Water: {agent.waterCapacityLiters != null ? `${agent.waterCapacityLiters}L` : 'Unspecified'}
                        </span>
                        <span style={{ color: '#64748B' }}>
                          Washer: {agent.hasPressureWasher ? 'Yes' : 'No'} &bull; Vacuum: {agent.hasVacuumExtractor ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={agent.status} />
                    </td>
                    <td style={{ fontSize: '13px', color: '#64748B' }}>
                      {new Date(agent.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link
                          to={`/agents/${agent.id}`}
                          className="btn btn-secondary btn-sm"
                          title="View Full Profile & KYC Checklist"
                        >
                          <Eye size={14} />
                          <span>Inspect</span>
                        </Link>
                        <button
                          onClick={() => openDecisionModal(agent, 'APPROVED')}
                          className="btn btn-success btn-sm"
                          title="Approve Agent"
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => openDecisionModal(agent, 'REJECTED')}
                          className="btn btn-danger btn-sm"
                          title="Reject Agent"
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
            <UserCheck size={40} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No Applications Found</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No applications match the current status filter "{statusFilter || 'ALL'}".
            </p>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedAgent && decisionType && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={closeDecisionModal}
          title={
            decisionType === 'APPROVED'
              ? `Confirm Approval: ${selectedAgent.displayName}`
              : `Reject Application: ${selectedAgent.displayName}`
          }
          description={`Partner Code: ${selectedAgent.agentCode} • Phone: ${selectedAgent.phone}`}
        >
          {decisionType === 'APPROVED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  color: '#1E40AF',
                }}
              >
                Approving this partner will authorize them to toggle availability and accept real dispatch offers on the
                Wash-Go Agent Android application.
              </div>

              {/* KYC Document Checklist */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
                  KYC Verification Checklist
                </h4>
                {docsLoading ? (
                  <p style={{ fontSize: '13px', color: '#64748B' }}>Checking verification records...</p>
                ) : !hasDocuments ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      color: '#991B1B',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>
                      <strong>Blocking condition:</strong> No verification documents have been submitted yet. Backend rules
                      prohibit approval without verified documents.
                    </span>
                  </div>
                ) : hasUnverifiedDocs ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#FEF9C3',
                      border: '1px solid #FDE047',
                      borderRadius: '8px',
                      color: '#854D0E',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>
                      Some submitted documents are still pending review. Please verify all documents before final agent approval.
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      color: '#065F46',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>All {agentDocs?.length} submitted KYC documents are confirmed VERIFIED. Ready for approval!</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button onClick={closeDecisionModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDecisionSubmit}
                  disabled={!canApprove || reviewMutation.isPending}
                  className="btn btn-success"
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Approval...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Approve Partner</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
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
                Rejecting this application will disable dispatch eligibility. The rejection reason will be displayed
                authoritatively in the agent's Android app so they may rectify and resubmit.
              </div>

              <div className="form-group">
                <label className="form-label">
                  Rejection Reason (Mandatory) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Blurry driving license upload, vehicle registration expired, or insufficient water tank capacity."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeDecisionModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDecisionSubmit}
                  disabled={!rejectReason.trim() || reviewMutation.isPending}
                  className="btn btn-danger"
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Recording Rejection...</span>
                    </>
                  ) : (
                    <span>Confirm Rejection</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
