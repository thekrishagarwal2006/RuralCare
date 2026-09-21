import React from 'react';
import { ReferralStatus } from '../types';

interface Props {
  status: ReferralStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'IN_TRANSIT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'AT_RISK':
        return 'bg-rose-100 text-rose-800 border-rose-400 animate-pulse font-bold';
      case 'REROUTING':
        return 'bg-purple-100 text-purple-800 border-purple-400 font-bold';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
