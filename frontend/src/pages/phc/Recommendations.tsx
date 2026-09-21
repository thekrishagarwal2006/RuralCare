import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { referralApi } from '../../services/api';
import { HospitalCandidate, Referral } from '../../types';
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Activity, MapPin, Clock } from 'lucide-react';

export const Recommendations: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [candidates, setCandidates] = useState<HospitalCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const refData = await referralApi.getReferral(id);
        setReferral(refData);

        const candData = await referralApi.getRecommendations(id);
        setCandidates(candData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleConfirmHospital = async (hospitalId: string) => {
    if (!id) return;
    setConfirming(hospitalId);
    try {
      await referralApi.acceptHospital(id, hospitalId);
      navigate(`/phc/track/${id}`);
    } catch (err: any) {
      alert('Failed to confirm hospital referral.');
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Calculating Time-Aware Hospital Suitability Scores...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* Referral Info Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
              {referral?.referral_code} • {referral?.priority}
            </span>
            <h1 className="text-2xl font-bold mt-2">Patient: {referral?.patient_id ? 'Rajesh Kumar (54 M)' : 'Patient'}</h1>
            <p className="text-xs text-slate-300 mt-1">Emergency: {referral?.emergency_type} • SpO2: {referral?.spo2}% • HR: {referral?.heart_rate} bpm</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400">Decision Algorithm</span>
            <p className="text-xs text-sky-400 font-mono">v1.0 Time-Aware Score</p>
          </div>
        </div>
      </div>

      {/* Ranked Candidate Hospitals */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-rose-600" />
          Recommended Hospitals (Ranked by Suitability Score)
        </h2>

        {candidates.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            No active candidate hospitals available for evaluation.
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((cand, idx) => {
              const hospId = cand.hospital_id || cand.hospital?.id;
              const hospName = cand.hospital_name || cand.hospital?.name;
              return (
                <div
                  key={hospId}
                  className={`bg-white rounded-2xl p-6 border transition shadow-sm ${
                    idx === 0 ? 'border-2 border-emerald-500 shadow-emerald-500/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    
                    {/* Left Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        {idx === 0 && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                            Highest Recommended Match
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-slate-900">{hospName}</h3>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{cand.recommendation_reason}</p>

                      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" /> {cand.distance_km} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-sky-500" /> ~{cand.eta_minutes} mins travel
                        </span>
                        <span className={`px-2 py-0.5 rounded ${cand.icu_available > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          ICU: {cand.icu_available} Available
                        </span>
                        <span className={`px-2 py-0.5 rounded ${cand.ventilators_available > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          Ventilators: {cand.ventilators_available} Available
                        </span>
                      </div>
                    </div>

                    {/* Right Score & Action */}
                    <div className="flex flex-col items-end space-y-3 min-w-[160px]">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Decision Score</span>
                        <p className="text-2xl font-extrabold text-slate-900">{cand.score} <span className="text-xs text-slate-400 font-normal">/ 100</span></p>
                      </div>

                      <button
                        onClick={() => handleConfirmHospital(hospId)}
                        disabled={confirming === hospId}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5 ${
                          idx === 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {confirming === hospId ? 'Confirming...' : 'Select & Dispatch'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
