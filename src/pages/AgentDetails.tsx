import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Droplet,
  Compass,
  Star,
  ShieldCheck,
  ShieldAlert,
  FileBadge,
  Download,
  Check,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { api } from '../api/client';
import { AgentDocument, AgentStatus, DocumentVerificationStatus } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<AgentDocument | null>(null);
  const [docDecision, setDocDecision] = useState<DocumentVerificationStatus | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // 1. Fetch Agent Profile
  const {
    data: agent,
    isLoading: agentLoading,
    error: agentError,
  } = useQuery({
    queryKey: ['admin-agent-details', id],
    queryFn: () => (id ? api.agents.get(id) : Promise.reject('No ID')),
    enabled: !!id,
  });

  // 2. Fetch Agent Documents
  const {
    data: documents,
    isLoading: docsLoading,
  } = useQuery({
    queryKey: ['admin-agent-docs', id],
    queryFn: () => (id ? api.agents.getDocuments(id) : Promise.resolve([])),
    enabled: !!id,
  });

  // Mutation: Agent review (status)
  const agentReviewMutation = useMutation({
    mutationFn: ({ status, reason }: { status: AgentStatus; reason?: string }) =>
      api.agents.review(id!, status, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-details', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agent-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-operations-badge'] });
      success(`Agent status updated to ${updated.status}.`);
      setDecisionModalOpen(false);
      setDecisionType(null);
      setDecisionReason('');
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to update partner status.');
    },
  });

  // Mutation: Document decision
  const docReviewMutation = useMutation({
    mutationFn: ({ docId, status, reason }: { docId: string; status: DocumentVerificationStatus; reason?: string }) =>
      api.documents.review(docId, status, reason),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-docs', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-operations-badge'] });
      success(`Document marked as ${updatedDoc.verificationStatus}.`);
      setDocModalOpen(false);
      setSelectedDoc(null);
      setDocDecision(null);
      setDocRejectReason('');
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to submit document decision.');
    },
  });

  const handleDownloadDoc = async (doc: AgentDocument) => {
    try {
      setDownloadingDocId(doc.id);
      const blob = await api.documents.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `${doc.documentType}_${doc.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(`Downloaded ${doc.fileName}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to download document.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const openDocDecision = (doc: AgentDocument, status: DocumentVerificationStatus) => {
    setSelectedDoc(doc);
    setDocDecision(status);
    setDocRejectReason('');
    setDocModalOpen(true);
  };

  const handleDocDecisionSubmit = () => {
    if (!selectedDoc || !docDecision) return;
    if (docDecision === 'REJECTED' && !docRejectReason.trim()) {
      toastError('Please provide a specific rejection reason.');
      return;
    }
    docReviewMutation.mutate({
      docId: selectedDoc.id,
      status: docDecision,
      reason: docDecision === 'REJECTED' ? docRejectReason.trim() : undefined,
    });
  };

  const handleAgentDecisionSubmit = () => {
    if (!decisionType) return;
    if ((decisionType === 'REJECTED' || decisionType === 'SUSPENDED') && !decisionReason.trim()) {
      toastError('Reason is mandatory.');
      return;
    }
    agentReviewMutation.mutate({
      status: decisionType,
      reason: decisionReason.trim() || undefined,
    });
  };

  if (agentLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton width="180px" height="32px" />
        <Skeleton width="100%" height="180px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <Skeleton height="200px" />
          <Skeleton height="200px" />
        </div>
      </div>
    );
  }

  if (agentError || !agent) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <AlertTriangle size={40} style={{ margin: '0 auto 12px', color: '#EF4444' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Agent Profile Not Found</h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          Unable to locate the partner profile for identifier: {id}
        </p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Go Back
        </button>
      </div>
    );
  }

  const hasDocuments = (documents?.length ?? 0) > 0;
  const allDocsVerified = hasDocuments && documents?.every((d) => d.verificationStatus === 'VERIFIED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748B' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div
        className="card"
        style={{
          padding: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              fontWeight: 800,
              fontSize: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
            }}
          >
            {agent.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{agent.displayName}</h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                }}
              >
                {agent.agentCode}
              </span>
              <StatusBadge status={agent.status} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748B', fontSize: '13px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Phone size={13} /> {agent.phone}
              </span>
              <span>&bull;</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={13} /> {agent.email}
              </span>
              <span>&bull;</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} /> Registered {new Date(agent.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {agent.status !== 'APPROVED' && (
            <button
              onClick={() => {
                setDecisionType('APPROVED');
                setDecisionReason('');
                setDecisionModalOpen(true);
              }}
              className="btn btn-success"
            >
              <Check size={16} />
              <span>Approve Partner</span>
            </button>
          )}

          {agent.status !== 'REJECTED' && (
            <button
              onClick={() => {
                setDecisionType('REJECTED');
                setDecisionReason('');
                setDecisionModalOpen(true);
              }}
              className="btn btn-danger"
            >
              <X size={16} />
              <span>Reject Application</span>
            </button>
          )}

          {agent.status === 'APPROVED' && (
            <button
              onClick={() => {
                setDecisionType('SUSPENDED');
                setDecisionReason('');
                setDecisionModalOpen(true);
              }}
              className="btn btn-secondary"
              style={{ color: '#DC2626' }}
            >
              <ShieldAlert size={16} />
              <span>Suspend Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Rejection Notice if currently rejected */}
      {agent.status === 'REJECTED' && agent.rejectionReason && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            color: '#991B1B',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Rejection Reason:</strong> {agent.rejectionReason}
          </div>
        </div>
      )}

      {/* Grid of details: Equipment Rig, Geolocation, Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Mobile Detailing Equipment Rig */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Droplet size={18} style={{ color: '#0284C7' }} />
            Detailing Equipment Rig
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Water Tank Capacity</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                {agent.waterCapacityLiters != null ? `${agent.waterCapacityLiters} Liters` : 'Not configured'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>High-Pressure Washer</span>
              <span style={{ fontWeight: 700, color: agent.hasPressureWasher ? '#16A34A' : '#64748B' }}>
                {agent.hasPressureWasher ? 'Equipped & Verified' : 'No'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Vacuum / Shampoo Extractor</span>
              <span style={{ fontWeight: 700, color: agent.hasVacuumExtractor ? '#16A34A' : '#64748B' }}>
                {agent.hasVacuumExtractor ? 'Equipped & Verified' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry & Dispatch Availability */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: '#10B981' }} />
            Live Dispatch &amp; Telemetry
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Online Connectivity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: agent.isOnline ? '#10B981' : '#94A3B8',
                  }}
                />
                <span style={{ fontWeight: 700, color: agent.isOnline ? '#065F46' : '#64748B' }}>
                  {agent.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Job Acceptance State</span>
              <span style={{ fontWeight: 700, color: agent.available ? '#16A34A' : '#64748B' }}>
                {agent.available ? 'Ready for Dispatches' : 'Unavailable'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Last GPS Ping</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                {agent.locationUpdatedAt
                  ? new Date(agent.locationUpdatedAt).toLocaleTimeString('en-IN')
                  : 'No coordinates logged'}
              </span>
            </div>
          </div>
        </div>

        {/* Quality & Ratings */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={18} style={{ color: '#F59E0B' }} />
            Quality &amp; Wash History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Average Customer Rating</span>
              <span style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                {agent.averageRating ? agent.averageRating.toFixed(1) : '5.0'} / 5.0
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#64748B' }}>Total Customer Reviews</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                {agent.totalReviewsCount || 0} reviews
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Completed Wash Jobs</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                {agent.totalCompletedWashes || 0} jobs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Verification Documents Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Submitted KYC Documents</h2>
            <p style={{ fontSize: '13px', color: '#64748B' }}>
              Inspect and verify all compliance proofs prior to partner activation.
            </p>
          </div>
        </div>

        {docsLoading ? (
          <p style={{ fontSize: '14px', color: '#64748B' }}>Loading documents...</p>
        ) : documents && documents.length > 0 ? (
          <div className="table-container" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>ID Number</th>
                  <th>File Name</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: '#3B82F6' }} />
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          {doc.documentType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                      {doc.documentNumber || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.fileName}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={doc.verificationStatus} />
                      {doc.rejectionReason && (
                        <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>
                          {doc.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleDownloadDoc(doc)}
                          disabled={downloadingDocId === doc.id}
                          className="btn btn-secondary btn-sm"
                          title="Download & View"
                        >
                          {downloadingDocId === doc.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>Download</span>
                        </button>

                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => openDocDecision(doc, 'VERIFIED')}
                            className="btn btn-success btn-sm"
                            title="Verify"
                          >
                            <Check size={13} />
                            <span>Verify</span>
                          </button>
                        )}

                        {doc.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => openDocDecision(doc, 'REJECTED')}
                            className="btn btn-danger btn-sm"
                            title="Reject"
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
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
            <FileBadge size={32} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
            <p style={{ fontWeight: 600 }}>No KYC documents submitted yet.</p>
          </div>
        )}
      </div>

      {/* Agent Review Status Modal */}
      {decisionModalOpen && decisionType && (
        <Modal
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          title={`Confirm ${decisionType}: ${agent.displayName}`}
          description={`Partner Code: ${agent.agentCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {decisionType === 'APPROVED' ? (
              <>
                {!allDocsVerified && (
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
                      Notice: Not all documents are verified yet. Backend policy may require all KYC documents to be verified before approving.
                    </span>
                  </div>
                )}
                <p style={{ fontSize: '14px', color: '#334155' }}>
                  Are you sure you want to approve this partner for active mobile detailing dispatch operations?
                </p>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  Reason for {decisionType} <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Provide an explanation that will be stored in audit records and shared with the partner."
                  className="form-textarea"
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDecisionModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAgentDecisionSubmit}
                disabled={agentReviewMutation.isPending}
                className={`btn ${decisionType === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
              >
                {agentReviewMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm {decisionType}</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Review Modal */}
      {docModalOpen && selectedDoc && docDecision && (
        <Modal
          isOpen={docModalOpen}
          onClose={() => setDocModalOpen(false)}
          title={`${docDecision === 'VERIFIED' ? 'Verify' : 'Reject'}: ${selectedDoc.documentType.replace(/_/g, ' ')}`}
          description={`File: ${selectedDoc.fileName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {docDecision === 'VERIFIED' ? (
              <p style={{ fontSize: '14px', color: '#334155' }}>
                Confirm that you have reviewed the contents of this document and verified its authenticity.
              </p>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  Rejection Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={docRejectReason}
                  onChange={(e) => setDocRejectReason(e.target.value)}
                  placeholder="e.g. Expired document, unreadable scan, name mismatch."
                  className="form-textarea"
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setDocModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDocDecisionSubmit}
                disabled={docReviewMutation.isPending}
                className={`btn ${docDecision === 'VERIFIED' ? 'btn-success' : 'btn-danger'}`}
              >
                {docReviewMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm {docDecision}</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
