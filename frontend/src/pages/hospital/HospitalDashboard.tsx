import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hospitalApi, referralApi } from '../../services/api';
import { Hospital, HospitalResource, Referral } from '../../types';
import { Building2, Activity, BedDouble, AlertOctagon, UserCheck, ArrowRight, Radio, BellRing, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { AlertBanner } from '../../components/AlertBanner';
import { useWebSocketContext } from '../../contexts/WebSocketContext';

export const HospitalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { lastEvent } = useWebSocketContext();

  const defaultHospId = user?.associated_entity_id || 'hosp-sassoon-01';
  const [selectedHospId, setSelectedHospId] = useState<string>(defaultHospId);

  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [resources, setResources] = useState<HospitalResource | null>(null);
  const [incoming, setIncoming] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const loadHospitalData = async (hId: string) => {
    try {
      const hospitalsList = await hospitalApi.getHospitals();
      setAllHospitals(hospitalsList);

      const hospData = await hospitalApi.getHospital(hId);
      setHospital(hospData);

      const resData = await hospitalApi.getResources(hId);
      setResources(resData);

      const incData = await referralApi.getIncomingForHospital(hId);
      setIncoming(incData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalData(selectedHospId);
  }, [user, selectedHospId]);

  useEffect(() => {
    if (lastEvent) {
      const eventType = lastEvent.event_type;
      const data = lastEvent.data;

      if (eventType === 'REFERRAL_ACCEPTED' || eventType === 'REROUTED_REFERRAL_INCOMING' || eventType === 'REFERRAL_CREATED') {
        const targetHospName = data.hospital_name || 'Hospital';
        setNotification(`🚨 REFERRAL DISPATCHED: Ticket ${data.referral_code || 'REF-2026'} assigned to ${targetHospName}!`);
        setTimeout(() => setNotification(null), 8000);

        if (data.hospital_id && data.hospital_id !== selectedHospId) {
          setSelectedHospId(data.hospital_id);
        }
      }
      loadHospitalData(selectedHospId);
    }
  }, [lastEvent]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Hospital Portal...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toast Notification for New Incoming Referral */}
      {notification && (
        <AlertBanner
          type="success"
          title="⚡ REAL-TIME HOSPITAL DISPATCH NOTIFICATION"
          message={notification}
        />
      )}

      {/* Hospital Portal Header & Selector */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-widest text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
              Hospital Management Portal
            </span>

            {/* Hospital Selector Toggle */}
            <select
              value={selectedHospId}
              onChange={(e) => setSelectedHospId(e.target.value)}
              className="bg-slate-800 text-xs text-sky-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {allHospitals.map(h => (
                <option key={h.id} value={h.id}>🏥 Switch View: {h.name}</option>
              ))}
            </select>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{hospital?.name || 'Sassoon General Hospital'}</h1>
          <p className="text-xs text-slate-300">
            District: {hospital?.district} • Tier: {hospital?.tier} • Sub-second WebSocket Live Feed Connected
          </p>
        </div>

        <Link
          to="/hospital/resources"
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-rose-600/30 transition flex items-center gap-2 whitespace-nowrap"
        >
          <Activity className="h-5 w-5" />
          Update Resource Inventory
        </Link>
      </div>

      {/* Live Resources Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ICU Beds</p>
          <div className="flex justify-between items-baseline">
            <span className={`text-3xl font-extrabold ${resources && resources.icu_available > 0 ? "text-emerald-600" : "text-rose-600 font-extrabold"}`}>
              {resources?.icu_available}
            </span>
            <span className="text-xs text-slate-400">Total: {resources?.icu_total}</span>
          </div>
          <p className="text-[11px] text-slate-500">Occupied: {resources?.icu_occupied}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventilators</p>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold text-emerald-600">
              {resources?.ventilators_available}
            </span>
            <span className="text-xs text-slate-400">Total: {resources?.ventilators_total}</span>
          </div>
          <p className="text-[11px] text-slate-500">Occupied: {resources?.ventilators_occupied}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Oxygen Status</p>
          <div className="flex justify-between items-baseline">
            <span className={`text-2xl font-extrabold ${resources?.oxygen_available ? "text-emerald-600" : "text-rose-600"}`}>
              {resources?.oxygen_available ? "AVAILABLE" : "DEPLETED"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Sub-Second WS Broadcast</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Doctors</p>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold text-sky-600">
              {resources?.emergency_doctors_available}
            </span>
            <span className="text-xs text-slate-400">On Duty</span>
          </div>
          <p className="text-[11px] text-slate-500">Specialists: {resources?.specialists_available}</p>
        </div>

      </div>

      {/* Incoming Referrals Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-600 animate-pulse" />
            Incoming Emergency Referral Tickets for {hospital?.name}
          </h2>
          <Link
            to={`/hospital/referrals?hospital_id=${selectedHospId}`}
            className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
          >
            View All Referrals →
          </Link>
        </div>

        {incoming.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 italic text-center">No active incoming referrals assigned to {hospital?.name}.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {incoming.map((ref) => (
              <div key={ref.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{ref.referral_code}</span>
                    <StatusBadge status={ref.status} />
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Emergency: {ref.emergency_type} • SpO2: {ref.spo2}%</p>
                </div>
                <Link
                  to={`/hospital/referrals?hospital_id=${selectedHospId}&ticket_id=${ref.id}`}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-sm"
                >
                  Manage Ticket
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
