import React, { useEffect, useState } from 'react';
import { commandCenterApi } from '../../services/api';
import { Clock, ShieldCheck } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    commandCenterApi.getOverview().then(res => {
      setEvents(res.recent_events || []);
      setLoading(false);
    }).catch(console.error);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-6 w-6 text-sky-600" /> System Audit & Event History
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Immutable audit trails of referrals, resource updates, alerts, and rerouting decisions.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading audit history...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm">
          No audit events recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {events.map((ev) => (
            <div key={ev.id} className="p-4 flex justify-between items-start text-xs hover:bg-slate-50 transition">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                  {ev.event_type}
                </span>
                <p className="text-slate-700 text-sm mt-1">{ev.description}</p>
                <p className="text-slate-400 text-[10px]">Referral ID: {ev.referral_id}</p>
              </div>
              <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
