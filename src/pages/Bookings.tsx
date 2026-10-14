import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  Search,
  Filter,
  Car,
  Clock,
  MapPin,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  User,
} from 'lucide-react';
import { api } from '../api/client';
import { BookingResponse, BookingStatus } from '../api/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export const Bookings: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [searchRef, setSearchRef] = useState('');
  const [pageNumber, setPageNumber] = useState(0);

  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: page, isLoading } = useQuery({
    queryKey: ['admin-bookings-list', statusFilter, searchRef, pageNumber],
    queryFn: () =>
      api.bookings.list({
        status: statusFilter,
        bookingReference: searchRef.trim() || undefined,
        page: pageNumber,
        size: 15,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.bookings.cancel(id, reason),
    onSuccess: (b) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-operations'] });
      success(`Booking ${b.bookingReference} has been cancelled.`);
      setCancelModalOpen(false);
      setSelectedBooking(null);
      setCancelReason('');
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to cancel booking.');
    },
  });

  const handleCancelSubmit = () => {
    if (!selectedBooking) return;
    if (!cancelReason.trim()) {
      toastError('Please specify a cancellation reason.');
      return;
    }
    cancelMutation.mutate({
      id: selectedBooking.id,
      reason: cancelReason.trim(),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>Bookings Management</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>
          Real-time oversight of customer detailing requests, assigned partner dispatches, and appointment lifecycles.
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
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: '', label: 'All Bookings' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'ASSIGNED', label: 'Assigned' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
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

        {/* Reference Search */}
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
            placeholder="Search booking ref (e.g. BK-...)"
            value={searchRef}
            onChange={(e) => {
              setSearchRef(e.target.value);
              setPageNumber(0);
            }}
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          >
          </input>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : page?.content && page.content.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Ref / Service</th>
                  <th>Customer &amp; Vehicle</th>
                  <th>Scheduled Time</th>
                  <th>Assigned Agent</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0F172A', fontSize: '13px' }}>
                          {b.bookingReference}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {b.serviceName || 'Mobile Wash'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>
                          {b.customerName || 'Customer'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Car size={12} />
                          <span>
                            {b.vehicleMake} {b.vehicleModel} ({b.vehiclePlate || 'No Plate'})
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', color: '#334155' }}>
                        {new Date(b.scheduledStartTime).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {b.city && (
                        <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {b.city}
                        </div>
                      )}
                    </td>

                    <td>
                      {b.agentName ? (
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {b.agentName}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                        ₹{b.servicePrice}
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={b.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setCancelReason('');
                            setCancelModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#DC2626' }}
                          title="Admin Cancel Booking"
                        >
                          <X size={13} />
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
            <CalendarCheck2 size={40} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No Bookings Found</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No appointments match the given filter criteria.
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
              Showing Page {page.number + 1} of {page.totalPages} ({page.totalElements} total bookings)
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

      {/* Admin Cancel Modal */}
      {selectedBooking && cancelModalOpen && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title={`Cancel Booking: ${selectedBooking.bookingReference}`}
          description={`Customer: ${selectedBooking.customerName || 'Customer'} • Service: ${selectedBooking.serviceName || 'Wash'}`}
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
              Administrative cancellation will terminate this appointment. Any assigned agent will be released and payment
              refund handling will be triggered according to cancellation policy.
            </div>

            <div className="form-group">
              <label className="form-label">
                Cancellation Reason (Mandatory) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer requested phone cancellation, agent emergency, service area restriction."
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setCancelModalOpen(false)} className="btn btn-secondary">
                Keep Booking
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                className="btn btn-danger"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
