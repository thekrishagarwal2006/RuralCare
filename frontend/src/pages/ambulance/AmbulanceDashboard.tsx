import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ambulanceApi, hospitalApi, reroutingApi, referralApi } from '../../services/api';
import { Ambulance, Hospital, RerouteEvaluationResult, Referral } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import {
  calculateCumulativeDistances,
  interpolatePolylinePosition,
  haversineDistanceKm
} from '../../utils/geo';
import { Truck, Navigation, CheckCircle, ShieldAlert, Clock, Gauge, Zap } from 'lucide-react';

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

  // Simulation Controls & Polyline Routing State
  const [isMoving, setIsMoving] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(5); // Default 5x speed
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [cumDistances, setCumDistances] = useState<number[]>([]);
  const [oldRoutePolyline, setOldRoutePolyline] = useState<[number, number][]>([]);
  const [completedPolyline, setCompletedPolyline] = useState<[number, number][]>([]);
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);

  const [osrmSource, setOsrmSource] = useState<string>('osrm');
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  const [totalEtaMin, setTotalEtaMin] = useState<number>(0);

  // Counter to push backend REST updates every 1 second (10 x 100ms ticks)
  const tickCountRef = useRef<number>(0);
  const ambulanceRef = useRef<Ambulance | null>(null);
  ambulanceRef.current = ambulance;

  const loadRouteForAmbulance = async (aId: string, sLat?: number, sLon?: number, eLat?: number, eLon?: number) => {
    try {
      const params = (sLat !== undefined && sLon !== undefined && eLat !== undefined && eLon !== undefined)
        ? { start_lat: sLat, start_lon: sLon, end_lat: eLat, end_lon: eLon }
        : undefined;

      const routeRes = await ambulanceApi.getRoute(aId, params);
      if (routeRes && routeRes.polyline && routeRes.polyline.length > 0) {
        setRoutePolyline(routeRes.polyline);
        const cumD = calculateCumulativeDistances(routeRes.polyline);
        setCumDistances(cumD);
        setTotalDistanceKm(routeRes.distance_km);
        setTotalEtaMin(routeRes.eta_minutes);
        setOsrmSource(routeRes.source || 'osrm');
        setDistanceTraveled(0);
        setCompletedPolyline([routeRes.polyline[0]]);
      }
    } catch (err) {
      console.error('[AmbulanceHUD] Error loading OSRM route:', err);
    }
  };

  const loadData = async (aId: string = selectedAmbId) => {
    try {
      const ambList = await ambulanceApi.getAmbulances();
      setAllAmbulances(ambList);

      const ambData = await ambulanceApi.getAmbulance(aId);
      setAmbulance(ambData);

      const hospData = await hospitalApi.getHospitals();
      setHospitals(hospData);

      // Fetch active referral assigned to this ambulance
      const refData = await referralApi.getActiveForAmbulance(aId).catch(() => null);
      if (refData) {
        setActiveReferral(refData);

        try {
          const evalRes = await reroutingApi.evaluate(refData.id);
          if (evalRes && evalRes.decision === 'REROUTE') {
            setRerouteRecommendation(evalRes);
          } else {
            setRerouteRecommendation(null);
          }
        } catch (e) {
          console.error('[AmbulanceHUD] Reroute evaluation error:', e);
        }

        const destHosp = hospData.find(h => h.id === refData.assigned_hospital_id);
        if (destHosp && refData.phc) {
          const sLat = ambData.current_latitude || refData.phc.latitude;
          const sLon = ambData.current_longitude || refData.phc.longitude;
          await loadRouteForAmbulance(aId, sLat, sLon, destHosp.latitude, destHosp.longitude);
        } else {
          await loadRouteForAmbulance(aId);
        }
      } else {
        await loadRouteForAmbulance(aId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMoving(false);
    setOldRoutePolyline([]);
    loadData(selectedAmbId);
  }, [user, selectedAmbId]);

  useEffect(() => {
    if (lastEvent) {
      if (
        lastEvent.event_type === 'DESTINATION_RESOURCE_RISK' ||
        lastEvent.event_type === 'REROUTE_RECOMMENDED' ||
        lastEvent.event_type === 'REFERRAL_ACCEPTED' ||
        lastEvent.event_type === 'REFERRAL_CREATED'
      ) {
        if (lastEvent.data && lastEvent.data.decision === 'REROUTE') {
          setRerouteRecommendation(lastEvent.data);
        } else if (activeReferral) {
          reroutingApi.evaluate(activeReferral.id).then((evalRes) => {
            if (evalRes && evalRes.decision === 'REROUTE') {
              setRerouteRecommendation(evalRes);
            }
          }).catch(console.error);
        }
      }
      loadData(selectedAmbId);
    }
  }, [lastEvent]);

  // High-Frequency Smooth Interpolation Loop (100ms ticks)
  useEffect(() => {
    if (!isMoving || routePolyline.length === 0 || cumDistances.length === 0) return;

    const intervalMs = 100;
    const baseSpeedMetersPerSec = 12.5; // ~45 km/h base speed

    const timer = setInterval(() => {
      setDistanceTraveled((prevDist) => {
        const totalDist = cumDistances[cumDistances.length - 1] || 0;
        const stepIncrement = baseSpeedMetersPerSec * simulationSpeed * (intervalMs / 1000);
        const nextDist = prevDist + stepIncrement;

        const interp = interpolatePolylinePosition(routePolyline, cumDistances, nextDist);

        setAmbulance((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_latitude: interp.latitude,
            current_longitude: interp.longitude,
            heading: interp.heading,
            speed: Math.round(45 * simulationSpeed)
          };
        });

        setCompletedPolyline(interp.completedPath);

        // Push REST GPS location update to backend every 1 second (10 ticks)
        tickCountRef.current += 1;
        if (tickCountRef.current % 10 === 0 && ambulanceRef.current) {
          ambulanceApi.updateLocation(
            ambulanceRef.current.id,
            interp.latitude,
            interp.longitude,
            Math.round(45 * simulationSpeed),
            Math.round(interp.heading)
          ).catch(console.error);
        }

        if (interp.isFinished) {
          setIsMoving(false);
        }

        return nextDist;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isMoving, routePolyline, cumDistances, simulationSpeed]);

  const handleStartTrip = async () => {
    if (!ambulance) return;
    const nextState = !isMoving;
    setIsMoving(nextState);

    try {
      await ambulanceApi.updateLocation(
        ambulance.id,
        ambulance.current_latitude,
        ambulance.current_longitude,
        nextState ? Math.round(45 * simulationSpeed) : 0,
        ambulance.heading || 0
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptReroute = async () => {
    if (!rerouteRecommendation || !rerouteRecommendation.recommended_hospital_id || !ambulance) return;
    setAcceptingReroute(true);
    try {
      await reroutingApi.accept(
        rerouteRecommendation.referral_id,
        rerouteRecommendation.recommended_hospital_id
      );

      // Save current route as old deprecated route (dashed red)
      setOldRoutePolyline(routePolyline);

      // Find new target hospital coordinates
      const newHosp = hospitals.find(h => h.id === rerouteRecommendation.recommended_hospital_id);
      if (newHosp) {
        // Fetch new OSRM route from CURRENT ambulance position to new hospital
        await loadRouteForAmbulance(
          selectedAmbId,
          ambulance.current_latitude,
          ambulance.current_longitude,
          newHosp.latitude,
          newHosp.longitude
        );
      }

      setRerouteRecommendation(null);
      await loadData(selectedAmbId);
    } catch (err: any) {
      alert('Failed to accept reroute recommendation');
    } finally {
      setAcceptingReroute(false);
    }
  };

  if (loading || !ambulance) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading Ambulance HUD & OSRM Telemetry...
      </div>
    );
  }

  const destinationHosp = hospitals.find(h => h.id === activeReferral?.assigned_hospital_id) || hospitals[0];

  const totalMeters = cumDistances[cumDistances.length - 1] || (totalDistanceKm * 1000);
  const remainingMeters = Math.max(0, totalMeters - distanceTraveled);
  const remainingKm = remainingMeters / 1000;
  const currentSpeedKmh = isMoving ? Math.round(45 * simulationSpeed) : 0;
  const dynamicEtaMinutes = remainingMeters <= 50 ? 0 : Math.max(1, Math.ceil((remainingKm / (currentSpeedKmh || 45)) * 60));

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
                <Navigation className="h-3.5 w-3.5" /> OSRM NAV ACTIVE ({simulationSpeed}x)
              </span>
            )}
            <span className="text-xs font-extrabold text-sky-300 bg-sky-900/60 px-3 py-1 rounded-full border border-sky-500/40 flex items-center gap-1">
              ⏱️ ETA: {dynamicEtaMinutes === 0 ? 'ARRIVED AT ER' : `${dynamicEtaMinutes} mins (${remainingKm.toFixed(1)} km remaining)`}
            </span>
            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
              {osrmSource === 'osrm' ? '🛣️ OSRM Road Geometry' : '📐 Straight-line Fallback'}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-2">Vehicle: {ambulance.vehicle_number}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Driver: {ambulance.driver_name} • Active Destination: <strong>{destinationHosp?.name || 'Assigned Hospital'}</strong>
          </p>
        </div>

        {/* Ambulance Selector Dropdown & Start Trip Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <select
              value={selectedAmbId}
              onChange={(e) => setSelectedAmbId(e.target.value)}
              className="w-full md:w-auto bg-slate-800 text-amber-300 font-extrabold text-sm px-4 py-3 rounded-xl border-2 border-slate-700 focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-lg"
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
            className={`flex-1 md:flex-initial font-extrabold text-sm px-6 py-3.5 rounded-xl shadow-xl transition flex items-center justify-center gap-2.5 active:scale-95 ${
              isMoving
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-4 ring-amber-400/40'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/20'
            }`}
          >
            <Navigation className={`h-5 w-5 ${isMoving ? 'animate-spin text-slate-950' : ''}`} />
            {isMoving ? '⏸ PAUSE NAVIGATION' : '🚀 START OSRM ROAD NAVIGATION'}
          </button>
        </div>
      </div>

      {/* REROUTE ALERT & RECOMMENDATION BANNER */}
      {rerouteRecommendation && (
        <div className="bg-rose-950 border-4 border-rose-500 text-white p-6 rounded-2xl shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-10 w-10 text-rose-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-extrabold text-rose-200 tracking-tight">
                  ⚡ DYNAMIC REROUTE RECOMMENDED BY TIME-AWARE ENGINE
                </h3>
                <p className="text-sm text-rose-100 mt-1 leading-relaxed font-medium">
                  {rerouteRecommendation.reason}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-rose-500/50 text-sm">
            <div>
              <p className="text-slate-400 font-bold uppercase text-xs">Current Destination (Depleted)</p>
              <p className="text-base font-extrabold text-rose-400">{rerouteRecommendation.current_hospital_name}</p>
              <p className="text-slate-300 text-xs mt-1">ETA: {rerouteRecommendation.current_hospital_eta} mins</p>
            </div>
            <div>
              <p className="text-emerald-400 font-bold uppercase text-xs">Recommended New Destination</p>
              <p className="text-base font-extrabold text-emerald-300">{rerouteRecommendation.recommended_hospital_name}</p>
              <p className="text-slate-200 text-xs mt-1">New OSRM ETA: {rerouteRecommendation.recommended_hospital_eta} mins</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAcceptReroute}
              disabled={acceptingReroute}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold py-4 px-10 rounded-xl shadow-2xl transition flex items-center justify-center gap-3 text-base border-2 border-emerald-400"
            >
              <CheckCircle className="h-6 w-6" />
              {acceptingReroute ? 'Re-calculating OSRM Road Route...' : 'ACCEPT REROUTE & UPDATE OSRM NAVIGATION'}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Ambulance Metrics & Live GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="space-y-4">
          
          {/* Simulation Speed Control */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-amber-500" /> Simulation Speed Multiplier
              </h3>
              <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                {simulationSpeed}x Speed
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 20].map((spd) => (
                <button
                  key={`spd-${spd}`}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`py-2 text-xs font-extrabold rounded-lg transition border ${
                    simulationSpeed === spd
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Live ETA Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md space-y-3 border border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wider">Live Road Navigation ETA</h3>
              <Clock className="h-4 w-4 text-sky-400" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-extrabold text-white">
                {dynamicEtaMinutes === 0 ? '0 mins' : `${dynamicEtaMinutes} mins`}
              </p>
              <p className="text-xs text-slate-300">
                {dynamicEtaMinutes === 0
                  ? '🎉 Ambulance has arrived at ER Trauma Center'
                  : `Distance remaining: ${remainingKm.toFixed(1)} km to ${destinationHosp?.name || 'Hospital'}`}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Destination Resource Capacity</h3>
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
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Live GPS & Bearing Telemetry</h3>
            <div className="text-xs space-y-1 text-slate-700">
              <p><strong>Latitude:</strong> {ambulance.current_latitude.toFixed(5)}</p>
              <p><strong>Longitude:</strong> {ambulance.current_longitude.toFixed(5)}</p>
              <p><strong>Bearing:</strong> {Math.round(ambulance.heading || 0)}°</p>
              <p><strong>Speed:</strong> {currentSpeedKmh} km/h</p>
            </div>
          </div>
        </div>

        {/* Right Column: GIS Live Map */}
        <div className="lg:col-span-2 h-[550px]">
          <LiveMap
            hospitals={hospitals}
            ambulances={ambulance ? [ambulance] : []}
            activeRoute={routePolyline}
            oldRoute={oldRoutePolyline}
            completedRoute={completedPolyline}
            center={ambulance ? [ambulance.current_latitude, ambulance.current_longitude] : [18.6500, 73.9500]}
            zoom={12}
          />
        </div>

      </div>

    </div>
  );
};
