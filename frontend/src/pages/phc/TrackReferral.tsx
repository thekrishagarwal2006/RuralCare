import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { referralApi, ambulanceApi, hospitalApi } from '../../services/api';
import { Referral, Ambulance, Hospital } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { AlertBanner } from '../../components/AlertBanner';
import { LiveMap } from '../../components/LiveMap';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { Activity, ShieldAlert, Truck, Building2, MapPin } from 'lucide-react';

export const TrackReferral: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { lastEvent } = useWebSocketContext();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [ambulance, setAmbulance] = useState<Ambulance | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerouteAlert, setRerouteAlert] = useState<any>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      const refData = await referralApi.getReferral(id);
      setReferral(refData);

      if (refData.assigned_ambulance_id) {
        const ambData = await ambulanceApi.getAmbulance(refData.assigned_ambulance_id);
        setAmbulance(ambData);
      }

      const hospData = await hospitalApi.getHospitals();
      setHospitals(hospData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.event_type === 'DESTINATION_RESOURCE_RISK' || lastEvent.event_type === 'REROUTE_RECOMMENDED') {
        setRerouteAlert(lastEvent.data);
      }
      loadData();
    }
  }, [lastEvent]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading live referral tracking...</div>;
  }

  const destinationHospital = hospitals.find(h => h.id === referral?.assigned_hospital_id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Info */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-sky-400 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-400/30">
              Live Referral Tracker
            </span>
            <StatusBadge status={referral?.status || 'ACCEPTED'} />
          </div>
          <h1 className="text-2xl font-bold mt-2">Ticket: {referral?.referral_code}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Patient: Rajesh Kumar • Destination: {destinationHospital?.name || 'Sassoon Hospital'}
          </p>
        </div>
      </div>

      {/* Reroute Alert Banner */}
      {rerouteAlert && (
        <AlertBanner
          type="error"
          title="⚡ Real-Time Resource Event Detected!"
          message={rerouteAlert.reason || `Destination hospital ICU became unavailable. Time-aware algorithm evaluating reroute.`}
        />
      )}

      {/* Grid Layout: Left Stats, Right Live GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Ambulance HUD */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-500" /> Assigned Ambulance
            </h3>
            {ambulance ? (
              <div className="text-xs space-y-1.5 text-slate-700">
                <p><strong>Vehicle:</strong> {ambulance.vehicle_number}</p>
                <p><strong>Driver:</strong> {ambulance.driver_name}</p>
                <p><strong>Phone:</strong> {ambulance.driver_phone}</p>
                <p><strong>GPS Coordinates:</strong> [{ambulance.current_latitude.toFixed(4)}, {ambulance.current_longitude.toFixed(4)}]</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Assigning nearest emergency ambulance...</p>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-rose-600" /> Destination Hospital State
            </h3>
            {destinationHospital && destinationHospital.resources ? (
              <div className="text-xs space-y-2">
                <p className="font-bold text-slate-900">{destinationHospital.name}</p>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                  <span>Available ICU Beds:</span>
                  <strong className={destinationHospital.resources.icu_available > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-extrabold"}>
                    {destinationHospital.resources.icu_available} / {destinationHospital.resources.icu_total}
                  </strong>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                  <span>Available Ventilators:</span>
                  <strong className="text-emerald-600 font-bold">
                    {destinationHospital.resources.ventilators_available} / {destinationHospital.resources.ventilators_total}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Loading hospital resource state...</p>
            )}
          </div>
        </div>

        {/* Right Column: GIS Live Map */}
        <div className="lg:col-span-2 h-[500px]">
          <LiveMap
            hospitals={hospitals}
            ambulances={ambulance ? [ambulance] : []}
            center={ambulance ? [ambulance.current_latitude, ambulance.current_longitude] : [18.6500, 73.9500]}
            zoom={11}
          />
        </div>

      </div>

    </div>
  );
};
