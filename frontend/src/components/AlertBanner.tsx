import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Props {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const AlertBanner: React.FC<Props> = ({ type, title, message, actionText, onAction }) => {
  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-900',
          icon: <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5" />,
          btn: 'bg-rose-600 hover:bg-rose-700 text-white'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          icon: <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />,
          btn: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          icon: <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />,
          btn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      default:
        return {
          bg: 'bg-sky-50 border-sky-200 text-sky-900',
          icon: <Info className="h-5 w-5 text-sky-600 mt-0.5" />,
          btn: 'bg-sky-600 hover:bg-sky-700 text-white'
        };
    }
  };

  const style = getStyles();

  return (
    <div className={`p-4 rounded-xl border shadow-sm ${style.bg} transition-all`}>
      <div className="flex items-start space-x-3">
        {style.icon}
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{message}</p>
        </div>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${style.btn}`}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};
