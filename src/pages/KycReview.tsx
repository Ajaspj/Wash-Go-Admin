import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileBadge,
  Filter,
  Download,
  Check,
  X,
  FileText,
  User,
  ShieldAlert,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { DocumentType, DocumentVerificationStatus, AgentDocument } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const KycReview: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<DocumentVerificationStatus | ''>('PENDING');
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | ''>('');
  const [page, setPage] = useState(0);

  const [selectedDoc, setSelectedDoc] = useState<AgentDocument | null>(null);
  const [decisionAction, setDecisionAction] = useState<DocumentVerificationStatus | null>(null);
  const [reason, setReason] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc-queue', statusFilter, docTypeFilter, page],
    queryFn: () =>
      api.documents.listAll({
        status: statusFilter,
        documentType: docTypeFilter,
        page,
        size: 15,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ docId, status, reason }: { docId: string; status: DocumentVerificationStatus; reason?: string }) =>
      api.documents.review(docId, status, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-operations-badge'] });
      success(`Document marked as ${updated.verificationStatus}.`);
      closeModal();
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to record document decision.');
    },
  });

  const handleDownload = async (doc: AgentDocument) => {
    try {
      setDownloadingId(doc.id);
      const blob = await api.documents.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `kyc-${doc.documentType}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success(`Downloaded ${doc.fileName}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const openDecisionModal = (doc: AgentDocument, action: DocumentVerificationStatus) => {
    setSelectedDoc(doc);
    setDecisionAction(action);
    setReason('');
  };

  const closeModal = () => {
    setSelectedDoc(null);
    setDecisionAction(null);
    setReason('');
  };

  const handleSubmitDecision = () => {
    if (!selectedDoc || !decisionAction) return;

    if (decisionAction === 'REJECTED' && !reason.trim()) {
      toastError('Rejection reason is required.');
      return;
    }

    reviewMutation.mutate({
      docId: selectedDoc.id,
      status: decisionAction,
      reason: decisionAction === 'REJECTED' ? reason.trim() : undefined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>KYC Verification Queue</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Inspect submitted identification, driver credentials, and vehicle registration documents.
        </p>
      </div>

      {/* Filters Toolbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { value: 'PENDING', label: 'Pending Verification' },
              { value: 'VERIFIED', label: 'Verified' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: '', label: 'All Records' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value as any);
                  setPage(0);
                }}
                className={`btn btn-sm ${statusFilter === tab.value ? 'btn-primary' : 'btn-secondary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Document Type Dropdown */}
          <select
            value={docTypeFilter}
            onChange={(e) => {
              setDocTypeFilter(e.target.value as any);
              setPage(0);
            }}
            className="form-select"
            style={{ width: '220px', height: '38px', fontSize: '13px' }}
          >
            <option value="">All Document Types</option>
            <option value="GOVERNMENT_ID">Government ID / Aadhaar</option>
            <option value="DRIVING_LICENSE">Driving License</option>
            <option value="VEHICLE_REGISTRATION">Vehicle Registration (RC)</option>
            <option value="INSURANCE">Insurance Policy</option>
            <option value="POLICE_CLEARANCE">Police Clearance</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : data?.content && data.content.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Partner</th>
                  <th>Document Type</th>
                  <th>Document Number</th>
                  <th>File Details</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          {doc.agentName || 'Agent Partner'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {doc.agentPhone || doc.agentCode || doc.agentId}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <FileText size={15} style={{ color: '#F59E0B' }} />
                        <span>{doc.documentType.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {doc.documentNumber || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#0F172A' }}>{doc.fileName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : ''} &bull; {doc.contentType}
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
                          disabled={downloadingId === doc.id}
                          className="btn btn-secondary btn-sm"
                          title="Secure Download"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>View</span>
                        </button>

                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => openDecisionModal(doc, 'VERIFIED')}
                            className="btn btn-success btn-sm"
                            title="Approve / Verify"
                          >
                            <Check size={13} />
                            <span>Verify</span>
                          </button>
                        )}

                        {doc.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => openDecisionModal(doc, 'REJECTED')}
                            className="btn btn-danger btn-sm"
                            title="Reject Document"
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </button>
                        )}

                        {doc.agentId && (
                          <Link
                            to={`/agents/${doc.agentId}`}
                            className="btn btn-ghost btn-sm"
                            title="Open Agent Profile"
                          >
                            <ExternalLink size={14} />
                          </Link>
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
            <FileBadge size={40} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No Documents in Queue</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              All KYC documents for status "{statusFilter || 'ALL'}" have been processed.
            </p>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedDoc && decisionAction && (
        <Modal
          isOpen={!!selectedDoc}
          onClose={closeModal}
          title={
            decisionAction === 'VERIFIED'
              ? `Confirm Verification: ${selectedDoc.documentType}`
              : `Reject Document: ${selectedDoc.documentType}`
          }
          description={`Partner: ${selectedDoc.agentName || 'Agent'} • File: ${selectedDoc.fileName}`}
        >
          {decisionAction === 'VERIFIED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#334155' }}>
                Confirm that you have reviewed the document and verified its authenticity.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDecision}
                  disabled={reviewMutation.isPending}
                  className="btn btn-success"
                >
                  {reviewMutation.isPending ? 'Saving...' : 'Confirm Verified'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Rejection Reason (Required) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Specify why this document is rejected (e.g. illegible photo, expired validity, mismatch with applicant name)."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDecision}
                  disabled={!reason.trim() || reviewMutation.isPending}
                  className="btn btn-danger"
                >
                  {reviewMutation.isPending ? 'Rejecting...' : 'Confirm Reject Document'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
