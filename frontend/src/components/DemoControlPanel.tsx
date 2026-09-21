import React, { useState } from 'react';
import { demoApi, ambulanceApi } from '../services/api';
import { Play, Pause, RefreshCw, AlertOctagon, Navigation, ShieldAlert } from 'lucide-react';

interface Props {
  hospitalId?: string;
  referralId?: string;
  ambulanceId?: string;
  onEventTriggered?: () => void;
}

export const DemoControlPanel: React.FC<Props> = ({
  hospitalId = "hosp-sassoon-01",
  referralId,
  ambulanceId = "amb-1001",
  onEventTriggered
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simInterval, setSimInterval] = useState<any>(null);
  const [simStep, setSimStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Predefined simulated route coordinates (Shirur PHC -> Sassoon Hospital, Pune)
  const routeWaypoints: [number, number][] = [
    [18.8286, 74.3789], // Shirur PHC
    [18.8000, 74.2500],
    [18.7500, 74.1000],
    [18.6800, 73.9800],
    [18.6000, 73.9200],
    [18.5500, 73.8900],
    [18.5250, 73.8710]  // Sassoon Hospital
  ];

  const handleTriggerIcuDepletion = async () => {
    setLoading(true);
    try {
      addLog(`Triggering Hospital ICU depletion: Available 1 -> 0...`);
      await demoApi.triggerIcuDepletion(hospitalId);
      addLog(`⚡ Event emitted! WebSocket broadcasted resource failure to all subscribers.`);
      if (onEventTriggered) onEventTriggered();
    } catch (e: any) {
      addLog(`Error triggering depletion: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreResources = async () => {
    setLoading(true);
    try {
      addLog(`Restoring Hospital ICU beds...`);
      await demoApi.restoreResources(hospitalId);
      addLog(`Resources restored.`);
      if (onEventTriggered) onEventTriggered();
    } catch (e: any) {
      addLog(`Error restoring resources: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStep = async () => {
    const nextStep = (simStep + 1) % routeWaypoints.length;
    const [lat, lon] = routeWaypoints[nextStep];
    setSimStep(nextStep);

    try {
      addLog(`Pushed Ambulance GPS Tick #${nextStep + 1}: [${lat.toFixed(4)}, ${lon.toFixed(4)}]`);
      await ambulanceApi.updateLocation(ambulanceId, lat, lon, 55, 240);
      if (onEventTriggered) onEventTriggered();
    } catch (e: any) {
      console.error(e);
    }
  };

  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simInterval);
      setSimInterval(null);
      setIsSimulating(false);
      addLog("GPS Simulation paused.");
    } else {
      setIsSimulating(true);
      addLog("Starting continuous Ambulance GPS trip simulation...");
      const interval = setInterval(() => {
        handleSimulateStep();
      }, 3000);
      setSimInterval(interval);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold text-base tracking-tight text-slate-100">
            Mid-Sem Demo Control Panel
          </h3>
        </div>
        <span className="text-xs bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
          Faculty Evaluator Controls
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Controls Column 1: Hospital Resource Failure */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertOctagon className="h-4 w-4 text-rose-400" />
            Resource Failure Simulation
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instantly set Sassoon Hospital ICU available count from <strong className="text-emerald-400">1 to 0</strong> while ambulance is in transit.
          </p>

          <div className="flex space-x-2">
            <button
              onClick={handleTriggerIcuDepletion}
              disabled={loading}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow transition flex items-center justify-center gap-1.5"
            >
              <AlertOctagon className="h-4 w-4" />
              Deplete ICU (1 → 0)
            </button>
            <button
              onClick={handleRestoreResources}
              disabled={loading}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 px-3 rounded-lg transition"
              title="Restore ICU"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Controls Column 2: Ambulance GPS Simulation */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-sky-400" />
            Ambulance GPS Simulation
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Simulate live movement along Pune route coordinates to update ETA and trigger rerouting.
          </p>

          <div className="flex space-x-2">
            <button
              onClick={toggleSimulation}
              className={`flex-1 font-semibold text-xs py-2 px-3 rounded-lg shadow transition flex items-center justify-center gap-1.5 ${
                isSimulating ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isSimulating ? 'Pause Trip' : 'Start Simulation Trip'}
            </button>
            <button
              onClick={handleSimulateStep}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 px-3 rounded-lg transition"
            >
              Step Tick
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Event Console */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto">
        <div className="text-slate-500 font-semibold mb-1 text-[10px] uppercase">Live Simulation Log Console:</div>
        {log.length === 0 ? (
          <div className="text-slate-600 italic">No events triggered yet. Use controls above.</div>
        ) : (
          log.map((line, idx) => <div key={idx}>{line}</div>)
        )}
      </div>
    </div>
  );
};
