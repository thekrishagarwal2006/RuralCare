import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ambulanceApi, hospitalApi, reroutingApi, referralApi } from '../../services/api';
import { Ambulance, Hospital, RerouteEvaluationResult, Referral } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { AlertBanner } from '../../components/AlertBanner';
import { LiveMap } from '../../components/LiveMap';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { Truck, Navigation, AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, ArrowRight, Clock } from 'lucide-react';

export const AmbulanceDashboard: React.FC = () => {
  const { user } = useAuth();
  const { lastEvent } = useWebSocketContext();

  const [allAmbulances, setAllAmbulances] = useState<Ambulance[]>([]);
  const defaultAmbId = user?.associated_entity_id || 'amb-1001';
  const [selectedAmbId, setSelectedAmbId] = useState<string>(defaultAmbId);

  const [ambulance, setAmbulance] = useState<Ambulance | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [activeReferral, setActiveReferral] = useState<Referral | null>(null);
  const [rerouteRecommendation, setRerouteRecommendation] = useState<RerouteEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingReroute, setAcceptingReroute] = useState(false);

  const [isMoving, setIsMoving] = useState(false);
  const [movingTimer, setMovingTimer] = useState<any>(null);

  const loadData = async (aId: string = selectedAmbId) => {
    try {
      const ambList = await ambulanceApi.getAmbulances();
      setAllAmbulances(ambList);

      const ambData = await ambulanceApi.getAmbulance(aId);
      setAmbulance(ambData);

      const hospData = await hospitalApi.getHospitals();
      setHospitals(hospData);

      // Fetch active referral assigned to this ambulance
      const refData = await referralApi.getReferral('ref-1001').catch(() => null);
      if (refData) setActiveReferral(refData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedAmbId);
  }, [user, selectedAmbId]);

  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.event_type === 'DESTINATION_RESOURCE_RISK' || lastEvent.event_type === 'REROUTE_RECOMMENDED') {
        if (lastEvent.data.decision === 'REROUTE') {
          setRerouteRecommendation(lastEvent.data);
        }
      }
      loadData();
    }
  }, [lastEvent]);

  // Handle GPS Movement interval (1s continuous smooth stepping)
  useEffect(() => {
    if (isMoving && ambulance) {
      const targetHosp = hospitals.find(h => h.id === activeReferral?.assigned_hospital_id) || hospitals[0];
      const targetLat = targetHosp.latitude;
      const targetLon = targetHosp.longitude;

      const interval = setInterval(async () => {
        setAmbulance((prevAmb) => {
          if (!prevAmb) return prevAmb;
          const latDiff = (targetLat - prevAmb.current_latitude) * 0.025;
          const lonDiff = (targetLon - prevAmb.current_longitude) * 0.025;

          const newLat = prevAmb.current_latitude + latDiff;
          const newLon = prevAmb.current_longitude + lonDiff;

          // Push location update every second
          ambulanceApi.updateLocation(prevAmb.id, newLat, newLon, 55, 90).catch(console.error);

          return {
            ...prevAmb,
            current_latitude: newLat,
            current_longitude: newLon
          };
        });
      }, 1000);

      setMovingTimer(interval);
      return () => clearInterval(interval);
    } else if (!isMoving && movingTimer) {
      clearInterval(movingTimer);
    }
  }, [isMoving]);

  const handleStartTrip = async () => {
    if (!ambulance) return;
    const nextState = !isMoving;
    setIsMoving(nextState);

    // Initial trigger to update status to IN_TRANSIT
    try {
      await ambulanceApi.updateLocation(
        ambulance.id,
        ambulance.current_latitude,
        ambulance.current_longitude,
        55,
        90
      );
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptReroute = async () => {
    if (!rerouteRecommendation || !rerouteRecommendation.recommended_hospital_id) return;
    setAcceptingReroute(true);
    try {
      await reroutingApi.accept(
        rerouteRecommendation.referral_id,
        rerouteRecommendation.recommended_hospital_id
      );
      setRerouteRecommendation(null);
      loadData();
    } catch (err: any) {
      alert('Failed to accept reroute recommendation');
    } finally {
      setAcceptingReroute(false);
    }
  };

  if (loading || !ambulance) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading Ambulance HUD & telemetry...
      </div>
    );
  }

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const destinationHosp = hospitals.find(h => h.id === activeReferral?.assigned_hospital_id) || hospitals[0];

  const distanceKm = (ambulance && destinationHosp)
    ? getDistanceKm(ambulance.current_latitude, ambulance.current_longitude, destinationHosp.latitude, destinationHosp.longitude)
    : 0;

  const etaMinutes = distanceKm < 0.2 ? 0 : Math.max(1, Math.round((distanceKm / 55) * 60));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Ambulance HUD Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Ambulance HUD Driver Portal
            </span>
            {activeReferral && <StatusBadge status={activeReferral.status} />}
            {isMoving && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" /> LIVE TRANSIT ACTIVE
              </span>
            )}
            <span className="text-xs font-extrabold text-sky-300 bg-sky-900/60 px-3 py-1 rounded-full border border-sky-500/40 flex items-center gap-1">
              ⏱️ ETA: {etaMinutes === 0 ? 'ARRIVED AT ER' : `${etaMinutes} mins (${distanceKm.toFixed(1)} km remaining)`}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-2">Vehicle: {ambulance.vehicle_number}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Driver: {ambulance.driver_name} • Active Destination: {destinationHosp?.name || 'Assigned Hospital'}
          </p>
        </div>

        {/* Ambulance Selector Dropdown & Start Trip Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 hidden sm:inline">Vehicle:</span>
            <select
              value={selectedAmbId}
              onChange={(e) => setSelectedAmbId(e.target.value)}
              className="bg-slate-800 text-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-amber-500 cursor-pointer shadow"
            >
              {allAmbulances.map((amb) => (
                <option key={amb.id} value={amb.id}>
                  🚑 {amb.vehicle_number} ({amb.driver_name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStartTrip}
            className={`font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 ${
              isMoving
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Navigation className={`h-4 w-4 ${isMoving ? 'animate-spin text-amber-200' : ''}`} />
            {isMoving ? '⏸ Pause Trip Simulation' : '🚀 Start Trip & GPS Transit'}
          </button>
        </div>
      </div>

      {/* REROUTE ALERT & RECOMMENDATION BANNER */}
      {rerouteRecommendation && (
        <div className="bg-rose-950/90 border-2 border-rose-500 text-white p-6 rounded-2xl shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-8 w-8 text-rose-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-extrabold text-rose-200">
                  ⚡ DYNAMIC REROUTE RECOMMENDED BY TIME-AWARE ENGINE
                </h3>
                <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                  {rerouteRecommendation.reason}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-xl border border-rose-500/40 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase">Current Destination (Depleted)</p>
              <p className="text-sm font-extrabold text-rose-400">{rerouteRecommendation.current_hospital_name}</p>
              <p className="text-slate-400 mt-1">ETA: {rerouteRecommendation.current_hospital_eta} mins</p>
            </div>
            <div>
              <p className="text-emerald-400 font-bold uppercase">Recommended New Destination</p>
              <p className="text-sm font-extrabold text-emerald-300">{rerouteRecommendation.recommended_hospital_name}</p>
              <p className="text-slate-300 mt-1">New ETA: {rerouteRecommendation.recommended_hospital_eta} mins</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAcceptReroute}
              disabled={acceptingReroute}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
            >
              <CheckCircle className="h-5 w-5" />
              {acceptingReroute ? 'Rerouting...' : 'Accept Reroute & Update Navigation'}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Ambulance Metrics & Live GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="space-y-4">
          {/* Trip Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Ambulance Transit Control</h3>
              {isMoving ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">IN MOTION</span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">READY</span>
              )}
            </div>
            <button
              onClick={handleStartTrip}
              className={`w-full font-bold text-xs py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 ${
                isMoving
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Navigation className="h-4 w-4" />
              {isMoving ? 'Pause Live Movement Simulation' : '🚀 Start Trip & Live GPS Movement'}
            </button>
          </div>

          {/* Dynamic Live ETA Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md space-y-3 border border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wider">Live ETA Countdown</h3>
              <Clock className="h-4 w-4 text-sky-400" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-extrabold text-white">
                {etaMinutes === 0 ? '0 mins' : `${etaMinutes} mins`}
              </p>
              <p className="text-xs text-slate-300">
                {etaMinutes === 0
                  ? '🎉 Ambulance has arrived at ER Trauma Center'
                  : `Distance remaining: ${distanceKm.toFixed(1)} km to ${destinationHosp?.name || 'Hospital'}`}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Destination Resource Health</h3>
            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800">{destinationHosp?.name || 'Assigned Hospital'}</p>
              <div className="flex justify-between bg-slate-50 p-2.5 rounded-lg border">
                <span>ICU Beds:</span>
                <strong className={destinationHosp?.resources?.icu_available ? "text-emerald-600" : "text-rose-600 font-extrabold"}>
                  {destinationHosp?.resources?.icu_available || 0} Available
                </strong>
              </div>
              <div className="flex justify-between bg-slate-50 p-2.5 rounded-lg border">
                <span>Ventilators:</span>
                <strong className="text-emerald-600 font-bold">
                  {destinationHosp?.resources?.ventilators_available || 0} Available
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Current GPS Location</h3>
            <div className="text-xs space-y-1 text-slate-700">
              <p><strong>Latitude:</strong> {ambulance.current_latitude.toFixed(4)}</p>
              <p><strong>Longitude:</strong> {ambulance.current_longitude.toFixed(4)}</p>
              <p><strong>Estimated speed:</strong> {isMoving ? '55 km/h (Moving)' : '0 km/h (Stationary)'}</p>
            </div>
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
