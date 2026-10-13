import React from 'react';
import clsx from 'clsx';
import { AttendanceStatus } from '../../types';

interface ClayBadgeProps {
  status: AttendanceStatus | 'draft' | 'finalized' | 'posted' | 'active' | 'inactive';
  label?: string;
  className?: string;
}

export const ClayBadge: React.FC<ClayBadgeProps> = ({ status, label, className = '' }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'present':
        return 'clay-badge-present';
      case 'half_day':
        return 'clay-badge-half-day';
      case 'absent':
        return 'clay-badge-absent';
      case 'leave':
        return 'clay-badge-leave';
      case 'holiday':
        return 'clay-badge-holiday';
      case 'finalized':
      case 'active':
        return 'clay-badge-finalized';
      case 'draft':
      case 'inactive':
      default:
        return 'clay-badge-draft';
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (status) {
      case 'present':
        return 'Present (1.0)';
      case 'half_day':
        return 'Half Day (0.5)';
      case 'absent':
        return 'Absent (0.0)';
      case 'leave':
        return 'Leave';
      case 'holiday':
        return 'Holiday (Paid)';
      default:
        return status.toUpperCase();
    }
  };

  return <span className={clsx('clay-badge', getBadgeClass(), className)}>{getLabel()}</span>;
};
