import React from 'react';
import { BookingStatus, ResourceStatus, ResourceType, UserRole } from '../types';

interface BadgeProps {
  status: BookingStatus | ResourceStatus | ResourceType | UserRole | string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const getStyle = () => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CHECKED_IN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'CANCELLED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NO_SHOW':
      case 'EXPIRED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MAINTENANCE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'DISCUSSION_ROOM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PROJECT_ROOM':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'EQUIPMENT':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'STUDENT':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'RESOURCE_MANAGER':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'COLLEGE_ADMIN':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${getStyle()} ${sizeClasses}`}>
      {formatText(status)}
    </span>
  );
};
