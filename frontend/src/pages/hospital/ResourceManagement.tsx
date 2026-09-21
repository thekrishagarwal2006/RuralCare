import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hospitalApi } from '../../services/api';
import { HospitalResource } from '../../types';
import { Activity, Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export const ResourceManagement: React.FC = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<HospitalResource | null>(null);
  const [icuOccupied, setIcuOccupied] = useState(9);
  const [generalOccupied, setGeneralOccupied] = useState(40);
  const [ventOccupied, setVentOccupied] = useState(4);
  const [oxygenAvailable, setOxygenAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const hospitalId = user?.associated_entity_id || 'hosp-sassoon-01';

  const fetchResources = async () => {
    try {
      const data = await hospitalApi.getResources(hospitalId);
      setResources(data);
      setIcuOccupied(data.icu_occupied);
      setGeneralOccupied(data.general_beds_occupied);
      setVentOccupied(data.ventilators_occupied);
      setOxygenAvailable(data.oxygen_available);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const updated = await hospitalApi.updateResources(hospitalId, {
        icu_occupied: icuOccupied,
        general_beds_occupied: generalOccupied,
        ventilators_occupied: ventOccupied,
        oxygen_available: oxygenAvailable
      });
      setResources(updated);
      setSuccessMsg('⚡ Resource inventory updated successfully! WebSocket event published.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to update hospital resources');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Hospital Inventory...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Resource Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time updates trigger Redis events & WebSocket broadcasts to active ambulances.
          </p>
        </div>

        <button
          onClick={fetchResources}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        
        {/* ICU Beds Inventory */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">ICU Beds Inventory</h3>
              <p className="text-xs text-slate-500">Total Capacity: {resources?.icu_total} Beds</p>
            </div>
            <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${
              (resources?.icu_total || 10) - icuOccupied > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 animate-pulse"
            }`}>
              Available: {Math.max(0, (resources?.icu_total || 10) - icuOccupied)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Occupied ICU Beds</label>
              <input
                type="number"
                min={0}
                max={resources?.icu_total || 10}
                value={icuOccupied}
                onChange={(e) => setIcuOccupied(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setIcuOccupied(resources?.icu_total || 10)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow transition"
              >
                Simulate 100% Depletion (1 → 0 ICU)
              </button>
            </div>
          </div>
        </div>

        {/* Ventilators Inventory */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Ventilators Inventory</h3>
              <p className="text-xs text-slate-500">Total Capacity: {resources?.ventilators_total} Units</p>
            </div>
            <span className="text-sm font-extrabold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              Available: {Math.max(0, (resources?.ventilators_total || 5) - ventOccupied)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Occupied Ventilators</label>
            <input
              type="number"
              min={0}
              max={resources?.ventilators_total || 5}
              value={ventOccupied}
              onChange={(e) => setVentOccupied(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Oxygen Availability Toggle */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Oxygen Supply Status</h3>
            <p className="text-xs text-slate-500">Emergency bulk oxygen manifold state</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={oxygenAvailable}
              onChange={(e) => setOxygenAvailable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Broadcasting Update...' : 'Broadcast Inventory Update'}
          </button>
        </div>

      </form>
    </div>
  );
};
