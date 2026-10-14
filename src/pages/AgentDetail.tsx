import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  AlertTriangle,
  Clock,
  Shield,
  Droplet,
  Gauge,
  Wind,
  Phone,
  Mail,
  Calendar,
  Star,
  Check,
  X,
  Ban,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { AgentStatus, DocumentVerificationStatus, AgentDocument } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [agentDecisionType, setAgentDecisionType] = useState<AgentStatus | null>(null);
  const [agentDecisionReason, setAgentDecisionReason] = useState('');

  const [selectedDocForReview, setSelectedDocForReview] = useState<AgentDocument | null>(null);
  const [docDecisionStatus, setDocDecisionStatus] = useState<DocumentVerificationStatus | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // 1. Fetch Agent Profile
  const {
    data: agent,
    isLoading: agentLoading,
    error: agentError,
  } = useQuery({
    queryKey: ['admin-agent-detail', id],
    queryFn: () => (id ? api.agents.get(id) : Promise.reject('No ID')),
    enabled: !!id,
  });

  // 2. Fetch Agent Documents
  const {
    data: documents,
    isLoading: docsLoading,
  } = useQuery({
    queryKey: ['admin-agent-documents', id],
    queryFn: () => (id ? api.agents.getDocuments(id) : Promise.resolve([])),
    enabled: !!id,
  });

  // Agent Review Mutation
  const agentReviewMutation = useMutation({
    mutationFn: ({ status, reason }: { status: AgentStatus; reason?: string }) =>
      api.agents.review(id!, status, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-agents-directory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      success(`Partner status updated to ${updated.status}.`);
      setAgentDecisionType(null);
      setAgentDecisionReason('');
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to update partner verification status.');
    },
  });

  // Document Review Mutation
  const docReviewMutation = useMutation({
    mutationFn: ({ docId, status, reason }: { docId: string; status: DocumentVerificationStatus; reason?: string }) =>
      api.documents.review(docId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-documents', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-documents'] });
      success('Document review decision recorded successfully.');
      closeDocModal();
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to record document decision.');
    },
  });

  const handleDownload = async (doc: AgentDocument) => {
    try {
      setDownloadingDocId(doc.id);
      const blob = await api.documents.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `document-${doc.documentType}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success(`Downloaded ${doc.fileName}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to download document');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const openDocModal = (doc: AgentDocument, status: DocumentVerificationStatus) => {
    setSelectedDocForReview(doc);
    setDocDecisionStatus(status);
    setDocRejectReason('');
  };

  const closeDocModal = () => {
    setSelectedDocForReview(null);
    setDocDecisionStatus(null);
    setDocRejectReason('');
  };

  const handleDocDecisionSubmit = () => {
    if (!selectedDocForReview || !docDecisionStatus) return;

    if (docDecisionStatus === 'REJECTED' && !docRejectReason.trim()) {
      toastError('A rejection reason is mandatory.');
      return;
    }

    docReviewMutation.mutate({
      docId: selectedDocForReview.id,
      status: docDecisionStatus,
      reason: docDecisionStatus === 'REJECTED' ? docRejectReason.trim() : undefined,
    });
  };

  const handleAgentDecisionSubmit = () => {
    if (!agentDecisionType) return;

    if (agentDecisionType !== 'APPROVED' && !agentDecisionReason.trim()) {
      toastError('A clear reason is required for rejection or suspension.');
      return;
    }

    agentReviewMutation.mutate({
      status: agentDecisionType,
      reason: agentDecisionType !== 'APPROVED' ? agentDecisionReason.trim() : undefined,
    });
  };

  // Approval readiness check
  const totalDocs = documents?.length ?? 0;
  const hasUnverifiedDocs = documents?.some((d) => d.verificationStatus !== 'VERIFIED');
  const canApprove = totalDocs > 0 && !hasUnverifiedDocs;

  if (agentLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton width="180px" height="32px" />
        <Skeleton width="100%" height="220px" />
        <Skeleton width="100%" height="340px" />
      </div>
    );
  }

  if (agentError || !agent) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <AlertTriangle size={48} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Agent Profile Not Found</h2>
        <p style={{ color: '#64748B', marginTop: '6px' }}>The requested partner profile could not be retrieved.</p>
        <button onClick={() => navigate('/agents')} className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" aria-label="Go back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{agent.displayName}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              Partner Code: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{agent.agentCode}</span> &bull;
              User ID: <span style={{ fontFamily: 'monospace' }}>{agent.userId}</span>
            </p>
          </div>
        </div>

        {/* Action Decision Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {agent.status !== 'APPROVED' && (
            <button
              onClick={() => setAgentDecisionType('APPROVED')}
              className="btn btn-success"
              disabled={!canApprove}
              title={
                !canApprove
                  ? 'All KYC documents must be verified before approval can be granted'
                  : 'Approve agent for live dispatch'
              }
            >
              <Check size={16} />
              <span>Approve Partner</span>
            </button>
          )}

          {agent.status !== 'REJECTED' && (
            <button
              onClick={() => setAgentDecisionType('REJECTED')}
              className="btn btn-danger"
            >
              <X size={16} />
              <span>Reject Application</span>
            </button>
          )}

          {agent.status === 'APPROVED' && (
            <button
              onClick={() => setAgentDecisionType('SUSPENDED')}
              className="btn btn-secondary"
              style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
            >
              <Ban size={16} />
              <span>Suspend Partner</span>
            </button>
          )}
        </div>
      </div>

      {/* Rejection / Notice Banner */}
      {agent.rejectionReason && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            color: '#991B1B',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Previous Rejection Reason:</strong>
            {agent.rejectionReason}
          </div>
        </div>
      )}

      {/* Two Column Grid: Profile Specs & Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Contact & Registration Information */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0F172A' }}>
            Contact &amp; Account
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={16} style={{ color: '#64748B' }} />
              <span style={{ color: '#64748B', width: '100px' }}>Phone:</span>
              <strong style={{ color: '#0F172A' }}>{agent.phone}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} style={{ color: '#64748B' }} />
              <span style={{ color: '#64748B', width: '100px' }}>Email:</span>
              <span style={{ color: '#0F172A' }}>{agent.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} style={{ color: '#64748B' }} />
              <span style={{ color: '#64748B', width: '100px' }}>Registered:</span>
              <span style={{ color: '#0F172A' }}>
                {new Date(agent.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} style={{ color: '#64748B' }} />
              <span style={{ color: '#64748B', width: '100px' }}>Last Updated:</span>
              <span style={{ color: '#0F172A' }}>
                {new Date(agent.updatedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Detailing Equipment Specs */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0F172A' }}>
            Mobile Detailing Equipment
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface-alt)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <Droplet size={20} style={{ color: '#0284C7', margin: '0 auto 6px' }} />
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>WATER TANK</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {agent.waterCapacityLiters != null ? `${agent.waterCapacityLiters} L` : 'N/A'}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface-alt)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <Gauge size={20} style={{ color: '#16A34A', margin: '0 auto 6px' }} />
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>PRESSURE WASHER</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {agent.hasPressureWasher ? 'Equipped' : 'None'}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface-alt)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <Wind size={20} style={{ color: '#8B5CF6', margin: '0 auto 6px' }} />
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>VACUUM EXTRACTOR</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {agent.hasVacuumExtractor ? 'Equipped' : 'None'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={16} style={{ fill: '#F59E0B', color: '#F59E0B' }} />
              <span style={{ fontSize: '14px', fontWeight: 700 }}>
                {agent.averageRating != null ? Number(agent.averageRating).toFixed(1) : '5.0'} Rating
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>({agent.totalReviewsCount ?? 0} reviews)</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              {agent.totalCompletedWashes ?? 0} Total Washes Completed
            </div>
          </div>
        </div>
      </div>

      {/* KYC Documents Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Submitted KYC Documents</h3>
            <p style={{ fontSize: '13px', color: '#64748B' }}>
              Government ID, Driving License, and Vehicle Verification Records
            </p>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: canApprove ? '#DCFCE7' : '#FEF3C7',
              color: canApprove ? '#166534' : '#854D0E',
            }}
          >
            {canApprove
              ? '✓ All Documents Verified'
              : `${documents?.filter((d) => d.verificationStatus === 'VERIFIED').length ?? 0} of ${totalDocs} Verified`}
          </span>
        </div>

        {docsLoading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height="80px" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Document Number</th>
                  <th>File Name / Size</th>
                  <th>Verification Status</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0F172A' }}>
                        <FileText size={16} style={{ color: '#F59E0B' }} />
                        <span>{doc.documentType.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569', fontSize: '13px' }}>
                      {doc.documentNumber || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#0F172A' }}>{doc.fileName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Unknown size'} &bull; {doc.contentType}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={doc.verificationStatus} />
                      {doc.rejectionReason && (
                        <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>
                          Reason: {doc.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingDocId === doc.id}
                          className="btn btn-secondary btn-sm"
                          title="Download & View Document"
                        >
                          {downloadingDocId === doc.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>View</span>
                        </button>

                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => openDocModal(doc, 'VERIFIED')}
                            className="btn btn-success btn-sm"
                            title="Verify Document"
                          >
                            <Check size={13} />
                            <span>Verify</span>
                          </button>
                        )}

                        {doc.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => openDocModal(doc, 'REJECTED')}
                            className="btn btn-danger btn-sm"
                            title="Reject Document with Reason"
                          >
                            <X size={13} />
                            <span>Reject</span>
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
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
            <FileText size={36} style={{ margin: '0 auto 10px', color: '#CBD5E1' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No Documents Uploaded</h4>
            <p style={{ fontSize: '13px', marginTop: '2px' }}>
              The partner has not submitted any KYC verification documents yet.
            </p>
          </div>
        )}
      </div>

      {/* Agent Review Modal */}
      {agentDecisionType && (
        <Modal
          isOpen={!!agentDecisionType}
          onClose={() => setAgentDecisionType(null)}
          title={`Confirm ${agentDecisionType}: ${agent.displayName}`}
          description={`Partner Code: ${agent.agentCode}`}
        >
          {agentDecisionType === 'APPROVED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#334155' }}>
                Are you sure you want to approve <strong>{agent.displayName}</strong>?
              </p>
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: '#065F46',
                }}
              >
                All {totalDocs} documents have been confirmed verified. Once approved, the agent will receive active status
                and can activate availability on their Android device.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setAgentDecisionType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleAgentDecisionSubmit}
                  disabled={agentReviewMutation.isPending}
                  className="btn btn-success"
                >
                  {agentReviewMutation.isPending ? 'Saving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Reason for {agentDecisionType} <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={agentDecisionReason}
                  onChange={(e) => setAgentDecisionReason(e.target.value)}
                  placeholder="Explain why this application is being rejected or suspended. This will be shown to the partner."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setAgentDecisionType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleAgentDecisionSubmit}
                  disabled={!agentDecisionReason.trim() || agentReviewMutation.isPending}
                  className="btn btn-danger"
                >
                  {agentReviewMutation.isPending ? 'Saving...' : `Confirm ${agentDecisionType}`}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Document Review Modal */}
      {selectedDocForReview && docDecisionStatus && (
        <Modal
          isOpen={!!selectedDocForReview}
          onClose={closeDocModal}
          title={
            docDecisionStatus === 'VERIFIED'
              ? `Verify Document: ${selectedDocForReview.documentType}`
              : `Reject Document: ${selectedDocForReview.documentType}`
          }
          description={`File: ${selectedDocForReview.fileName}`}
        >
          {docDecisionStatus === 'VERIFIED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#334155' }}>
                Confirm that you have reviewed the document contents and validated its authenticity.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeDocModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDocDecisionSubmit}
                  disabled={docReviewMutation.isPending}
                  className="btn btn-success"
                >
                  {docReviewMutation.isPending ? 'Verifying...' : 'Confirm Verified'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Document Rejection Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={docRejectReason}
                  onChange={(e) => setDocRejectReason(e.target.value)}
                  placeholder="e.g. Image is blurry, document expired, name does not match applicant."
                  className="form-textarea"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeDocModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDocDecisionSubmit}
                  disabled={!docRejectReason.trim() || docReviewMutation.isPending}
                  className="btn btn-danger"
                >
                  {docReviewMutation.isPending ? 'Rejecting...' : 'Confirm Reject Document'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
