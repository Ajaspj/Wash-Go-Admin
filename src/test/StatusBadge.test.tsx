import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders APPROVED status with green badge class', () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(container.querySelector('.badge-approved')).toBeInTheDocument();
  });

  it('renders UNDER_REVIEW status with review badge class', () => {
    const { container } = render(<StatusBadge status="UNDER_REVIEW" />);
    expect(screen.getByText('UNDER REVIEW')).toBeInTheDocument();
    expect(container.querySelector('.badge-review')).toBeInTheDocument();
  });

  it('renders REJECTED status with danger badge class', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
    expect(container.querySelector('.badge-rejected')).toBeInTheDocument();
  });

  it('renders PENDING_VERIFICATION with pending badge class', () => {
    const { container } = render(<StatusBadge status="PENDING_VERIFICATION" />);
    expect(screen.getByText('PENDING VERIFICATION')).toBeInTheDocument();
    expect(container.querySelector('.badge-pending')).toBeInTheDocument();
  });
});
