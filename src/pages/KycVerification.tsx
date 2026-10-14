import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileBadge,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
  AlertTriangle,
  Clock,
  Check,
  X,
  FileText,
  Shield,
  Loader2,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { AgentDocument, DocumentVerificationStatus, DocumentType } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const KycVerification: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<DocumentVerificationStatus | ''>('PENDING');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const [pageNumber, setPageNumber] = useState(0);

  const [selectedDoc, setSelectedDoc] = useState<AgentDocument | null>(null);
  const [decisionType, setDecisionType] = useState<DocumentVerificationStatus | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: page, isLoading, isFetching } = useQuery({
    queryKey: ['admin-kyc-documents', statusFilter, typeFilter, pageNumber],
    queryFn: () =>
      api.documents.listAll({
        status: statusFilter,
        documentType: typeFilter,
        page: pageNumber,
        size: 15,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ docId, status, reason }: { docId: string; status: DocumentVerificationStatus; reason?: string }) =>
      api.documents.review(docId, status, reason),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agent-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-operations-badge'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agent-docs'] });

      success(`Document marked as ${updatedDoc.verificationStatus}.`);
      closeModal();
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to submit document decision.');
    },
  });

  const handleDownload = async (doc: AgentDocument) => {
    try {
      setDownloadingId(doc.id);
      const blob = await api.documents.download(doc.id);
      const blobUrl = URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = doc.fileName || `${doc.documentType}_${doc.id}`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(blobUrl);
      success(`Downloaded ${doc.fileName}`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to securely download document.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openDecisionModal = (doc: AgentDocument, status: DocumentVerificationStatus) => {
    setSelectedDoc(doc);
    setDecisionType(status);
    setRejectReason('');
  };

  const closeModal = () => {
    setSelectedDoc(null);
    setDecisionType(null);
    setRejectReason('');
  };

  const handleDecisionSubmit = () => {
    if (!selectedDoc || !decisionType) return;

    if (decisionType === 'REJECTED' && !rejectReason.trim()) {
      toastError('Please provide a specific rejection reason.');
      return;
    }

    reviewMutation.mutate({
      docId: selectedDoc.id,
      status: decisionType,
      reason: decisionType === 'REJECTED' ? rejectReason.trim() : undefined,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>KYC Document Verification</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Inspect legal identity, driving licenses, vehicle registrations, and insurance proofs for partner compliance.
        </p>
      </div>

      {/* Filter Bar */}
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
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: 'PENDING', label: 'Pending Verification' },
            { value: 'VERIFIED', label: 'Verified' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: '', label: 'All Documents' },
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

        {/* Document Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: '#64748B' }} />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setPageNumber(0);
            }}
            className="form-select"
            style={{ width: '200px', height: '36px', fontSize: '13px', padding: '6px 10px' }}
          >
            <option value="">All Document Types</option>
            <option value="GOVERNMENT_ID">Government ID</option>
            <option value="DRIVING_LICENSE">Driving License</option>
            <option value="VEHICLE_REGISTRATION">Vehicle Registration</option>
            <option value="POLICE_CLEARANCE">Police Clearance</option>
            <option value="INSURANCE">Insurance Proof</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : page?.content && page.content.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Type &amp; Number</th>
                  <th>Partner Identity</th>
                  <th>File Details</th>
                  <th>Status</th>
                  <th>Upload Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>
                            {doc.documentType.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                            {doc.documentNumber || 'No ID Number provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>
                          {doc.agentName || 'Agent'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace' }}>{doc.agentCode}</span>
                          {doc.agentPhone && <span>&bull; {doc.agentPhone}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        <div style={{ fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
                          {doc.fileName}
                        </div>
                        <div style={{ color: '#94A3B8' }}>
                          {formatFileSize(doc.fileSize)} &bull; {doc.contentType}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <StatusBadge status={doc.verificationStatus} />
                        {doc.rejectionReason && (
                          <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', maxWidth: '200px' }}>
                            {doc.rejectionReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
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
                          title="Download & View Document"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span>Download</span>
                        </button>

                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => openDecisionModal(doc, 'VERIFIED')}
                            className="btn btn-success btn-sm"
                            title="Verify Document"
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
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No Documents Found</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No KYC records found with the selected filter criteria.
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
              Showing Page {page.number + 1} of {page.totalPages} ({page.totalElements} total documents)
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

      {/* Verification Decision Modal */}
      {selectedDoc && decisionType && (
        <Modal
          isOpen={!!selectedDoc}
          onClose={closeModal}
          title={
            decisionType === 'VERIFIED'
              ? `Confirm Verification: ${selectedDoc.documentType.replace(/_/g, ' ')}`
              : `Reject Document: ${selectedDoc.documentType.replace(/_/g, ' ')}`
          }
          description={`Agent: ${selectedDoc.agentName || selectedDoc.agentCode} • File: ${selectedDoc.fileName}`}
        >
          {decisionType === 'VERIFIED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  color: '#065F46',
                }}
              >
                Are you sure you want to mark this document as <strong>VERIFIED</strong>? This confirms that you have inspected the file and verified its validity.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleDecisionSubmit}
                  disabled={reviewMutation.isPending}
                  className="btn btn-success"
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Decision...</span>
                    </>
                  ) : (
                    <span>Confirm Verification</span>
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
                Please provide an explicit rejection reason. The partner will see this explanation in their Android application so they can re-upload an updated, clear document.
              </div>

              <div className="form-group">
                <label className="form-label">
                  Rejection Reason (Mandatory) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Image is blurry, document expired on 2024, or details do not match profile."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={closeModal} className="btn btn-secondary">
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
