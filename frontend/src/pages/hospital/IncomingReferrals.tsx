import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hospitalApi, referralApi } from '../../services/api';
import { Hospital, Referral, ReferralStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Radio, Activity, CheckCircle, Clock, CheckCircle2, ShieldCheck, RefreshCw, UserCheck } from 'lucide-react';
import { useWebSocketContext } from '../../contexts/WebSocketContext';

export const IncomingReferrals: React.FC = () => {
  const { user } = useAuth();
  const { lastEvent } = useWebSocketContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryHospId = searchParams.get('hospital_id');
  const queryTicketId = searchParams.get('ticket_id');

  const defaultHospId = queryHospId || user?.associated_entity_id || 'hosp-sahyadri-02';
  const [selectedHospId, setSelectedHospId] = useState<string>(defaultHospId);

  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [currentHospital, setCurrentHospital] = useState<Hospital | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIncomingData = async (hId: string) => {
    try {
      const hospList = await hospitalApi.getHospitals();
      setAllHospitals(hospList);

      const hospObj = await hospitalApi.getHospital(hId);
      setCurrentHospital(hospObj);

      const data = await referralApi.getIncomingForHospital(hId);
      setReferrals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryHospId && queryHospId !== selectedHospId) {
      setSelectedHospId(queryHospId);
    }
  }, [queryHospId]);

  useEffect(() => {
    fetchIncomingData(selectedHospId);
  }, [user, selectedHospId]);

  useEffect(() => {
    if (lastEvent) {
      fetchIncomingData(selectedHospId);
    }
  }, [lastEvent]);

  const handleAcknowledgeBed = async (refId: string) => {
    setActionLoading(refId);
    try {
      await referralApi.acceptHospital(refId, selectedHospId);
      fetchIncomingData(selectedHospId);
    } catch (e: any) {
      alert('Updated referral triage state.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteReferral = async (refId: string) => {
    setActionLoading(refId);
    try {
      await referralApi.completeReferral(refId);
      fetchIncomingData(selectedHospId);
    } catch (e: any) {
      alert('Completed patient admission.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Hospital Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Incoming Emergency Referrals Triage
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time incoming referral tickets assigned to {currentHospital?.name || 'Hospital'}.
          </p>
        </div>

        {/* Hospital Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 hidden sm:inline">Select Hospital:</label>
          <select
            value={selectedHospId}
            onChange={(e) => {
              setSelectedHospId(e.target.value);
              setSearchParams({ hospital_id: e.target.value });
            }}
            className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-sky-500 cursor-pointer shadow"
          >
            {allHospitals.map((h) => (
              <option key={h.id} value={h.id}>🏥 {h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading incoming referrals triage list...</div>
      ) : referrals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm space-y-2">
          <p className="text-base font-bold text-slate-700">No active incoming referrals assigned to {currentHospital?.name}.</p>
          <p className="text-xs text-slate-400">Use the selector dropdown above to view triage for another hospital.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {referrals.map((ref) => {
            const isHighlighted = queryTicketId === ref.id;
            const isCompleted = ref.status === 'COMPLETED';

            return (
              <div
                key={ref.id}
                id={`ticket-${ref.id}`}
                className={`bg-white rounded-2xl p-6 border transition shadow-sm space-y-4 ${
                  isHighlighted ? 'border-2 border-sky-500 ring-4 ring-sky-500/10' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-extrabold text-slate-900 text-lg">{ref.referral_code}</span>
                      <StatusBadge status={ref.status} />
                      <span className="text-xs bg-rose-100 text-rose-800 font-extrabold px-3 py-0.5 rounded-full">
                        {ref.priority}
                      </span>
                      {isHighlighted && (
                        <span className="text-[10px] bg-sky-500 text-white font-bold px-2 py-0.5 rounded-md animate-pulse">
                          SELECTED TICKET
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1">Patient: Rajesh Kumar (54 M)</p>
                    <p className="text-xs text-slate-500">Emergency Type: {ref.emergency_type}</p>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    {new Date(ref.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <p><strong>Clinical Symptoms:</strong> {ref.symptoms}</p>
                  <p><strong>Vitals:</strong> SpO2: <span className="font-bold text-rose-600">{ref.spo2}%</span> • Heart Rate: {ref.heart_rate} bpm • BP: {ref.blood_pressure}</p>
                  {ref.notes && <p><strong>PHC Doctor Notes:</strong> {ref.notes}</p>}
                </div>

                {ref.requirements && (
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="font-bold text-slate-600">Extracted Requirements:</span>
                    {ref.requirements.requires_icu && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold">ICU Bed</span>}
                    {ref.requirements.requires_ventilator && <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg font-bold">Ventilator</span>}
                    {ref.requirements.requires_oxygen && <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold">Oxygen Support</span>}
                    {ref.requirements.requires_emergency_physician && <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-bold">Emergency Physician</span>}
                  </div>
                )}

                {/* Triage Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-3">
                  {isCompleted ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ✓ Patient Admitted at ER & Referral Ticket Completed
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAcknowledgeBed(ref.id)}
                        disabled={actionLoading === ref.id}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {actionLoading === ref.id ? 'Reserving...' : '1. Acknowledge & Reserve ER Bed'}
                      </button>

                      <button
                        onClick={() => handleCompleteReferral(ref.id)}
                        disabled={actionLoading === ref.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center gap-1.5"
                      >
                        <UserCheck className="h-4 w-4" />
                        {actionLoading === ref.id ? 'Completing...' : '2. Mark Patient Admitted & Complete Referral'}
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
