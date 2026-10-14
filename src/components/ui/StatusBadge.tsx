import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase().trim();

  let badgeClass = 'badge-suspended';
  let label = norm.replace(/_/g, ' ');

  switch (norm) {
    case 'APPROVED':
    case 'VERIFIED':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'CAPTURED':
      badgeClass = 'badge-approved';
      break;

    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'DRAFT':
    case 'CREATED':
      badgeClass = 'badge-pending';
      break;

    case 'UNDER_REVIEW':
    case 'IN_PROGRESS':
    case 'CONFIRMED':
    case 'ASSIGNED':
    case 'EN_ROUTE':
    case 'ARRIVED':
      badgeClass = 'badge-review';
      break;

    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED':
    case 'NO_SHOW':
      badgeClass = 'badge-rejected';
      break;

    case 'SUSPENDED':
    case 'INACTIVE':
      badgeClass = 'badge-suspended';
      break;

    default:
      badgeClass = 'badge-suspended';
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
};
