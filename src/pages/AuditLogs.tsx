import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileClock,
  Search,
  Filter,
  Shield,
  Activity,
  Globe,
  User,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../api/types';
import { TableSkeleton } from '../components/ui/Skeleton';

export const AuditLogs: React.FC = () => {
  const [actionFilter, setActionFilter] = useState('');
  const [pageNumber, setPageNumber] = useState(0);

  const { data: page, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', actionFilter, pageNumber],
    queryFn: () =>
      api.audit.list({
        action: actionFilter.trim() || undefined,
        page: pageNumber,
        size: 20,
      }),
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('REJECT') || action.includes('CANCEL') || action.includes('FAIL')) {
      return { bg: '#FEE2E2', text: '#991B1B' };
    }
    if (action.includes('APPROV') || action.includes('VERIF') || action.includes('COMPLET') || action.includes('CAPTUR')) {
      return { bg: '#DCFCE7', text: '#166534' };
    }
    if (action.includes('REVIEW') || action.includes('STATUS') || action.includes('CHANGE')) {
      return { bg: '#DBEAFE', text: '#1E40AF' };
    }
    return { bg: '#F1F5F9', text: '#475569' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Security &amp; Operations Audit Trail</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Immutable log of all administrative reviews, status changes, document decisions, and payment events.
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: '#64748B' }} />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPageNumber(0);
            }}
            className="form-select"
            style={{ width: '260px', height: '38px', fontSize: '13px' }}
          >
            <option value="">All Actions</option>
            <option value="AGENT_STATUS_CHANGED">Agent Status Changed</option>
            <option value="AGENT_DOCUMENT_REVIEWED">Agent Document Reviewed</option>
            <option value="AGENT_DOCUMENT_UPLOADED">Agent Document Uploaded</option>
            <option value="AGENT_REGISTERED">Agent Registered</option>
            <option value="BOOKING_STATUS_CHANGED">Booking Status Changed</option>
            <option value="PAYMENT_CAPTURED">Payment Captured</option>
            <option value="USER_STATUS_CHANGED">User Status Changed</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} style={{ color: '#10B981' }} />
          <span>Audit Logging Active &bull; Non-Repudiation Verified</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : page?.content && page.content.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity Reference</th>
                  <th>Details / Decision</th>
                  <th style={{ textAlign: 'right' }}>IP Origin</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((log) => {
                  const style = getActionBadgeColor(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: style.bg,
                            color: style.text,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {log.actorEmail || 'System Process'}
                        </div>
                        {log.actorRole && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            ROLE_{log.actorRole}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '12px', color: '#334155' }}>
                          <span style={{ fontWeight: 600 }}>{log.entityType}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          {log.entityId}
                        </div>
                      </td>

                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ fontSize: '12px', color: '#475569', wordBreak: 'break-word' }}>
                          {log.details || '—'}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                        {log.ipAddress || 'internal'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
            <FileClock size={40} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No Audit Logs Found</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No operations events match the current filter.
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
              Showing Page {page.number + 1} of {page.totalPages} ({page.totalElements} records)
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
    </div>
  );
};
