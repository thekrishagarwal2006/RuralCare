import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { phcApi, hospitalApi } from '../../services/api';
import { PHCCenter, Hospital } from '../../types';
import { Plus, Hospital as HospIcon, Activity, MapPin, Phone, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

export const PHCDashboard: React.FC = () => {
  const { user } = useAuth();
  const [phc, setPhc] = useState<PHCCenter | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.associated_entity_id) {
          const phcData = await phcApi.getCenter(user.associated_entity_id);
          setPhc(phcData);
        } else {
          const phcs = await phcApi.getCenters();
          if (phcs.length > 0) setPhc(phcs[0]);
        }

        const hospData = await hospitalApi.getHospitals();
        setHospitals(hospData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading PHC Portal...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* PHC Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-sky-400 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-400/30">
            Primary Health Centre Portal
          </span>
          <h1 className="text-2xl font-bold mt-2">{phc?.name || 'Shirur Primary Health Centre'}</h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
            <span><MapPin className="inline h-3.5 w-3.5 text-rose-400 mr-1" /> District: {phc?.district || 'Pune'}</span>
            <span>📞 Contact: {phc?.contact_number || '+91 2138 222100'}</span>
          </p>
        </div>

        <Link
          to="/phc/create-referral"
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-rose-600/30 transition flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Emergency Referral
        </Link>
      </div>

      {/* Network Hospitals Overview Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HospIcon className="h-5 w-5 text-rose-600" />
            Nearby Emergency Hospital Capabilities
          </h2>
          <span className="text-xs font-semibold text-slate-500">Live Resource Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hospitals.map((hosp) => (
            <div key={hosp.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{hosp.name}</h3>
                  <p className="text-xs text-slate-500">{hosp.tier}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                  OPERATIONAL
                </span>
              </div>

              {hosp.resources && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-500">ICU Available</p>
                    <p className={`text-lg font-bold ${hosp.resources.icu_available > 0 ? "text-emerald-600" : "text-rose-600 font-extrabold"}`}>
                      {hosp.resources.icu_available} / {hosp.resources.icu_total}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-500">Ventilators</p>
                    <p className={`text-lg font-bold ${hosp.resources.ventilators_available > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {hosp.resources.ventilators_available} / {hosp.resources.ventilators_total}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 text-xs text-slate-600 space-y-1">
                <p>📍 Distance: ~{hosp.name.includes('Sassoon') ? '38 km' : hosp.name.includes('Sahyadri') ? '42 km' : '44 km'}</p>
                <p>⏱️ Travel Time: ~{hosp.name.includes('Sassoon') ? '18 min' : hosp.name.includes('Sahyadri') ? '22 min' : '25 min'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
