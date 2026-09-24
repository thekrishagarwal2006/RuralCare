import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commandCenterApi, ambulanceApi } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { DemoControlPanel } from '../../components/DemoControlPanel';
import { LiveMap } from '../../components/LiveMap';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { Activity, ShieldAlert, Truck, Building2, MapPin, Radio, Clock, AlertTriangle } from 'lucide-react';

export const CommandCenterDashboard: React.FC = () => {
  const { lastEvent } = useWebSocketContext();
  const [data, setData] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await commandCenterApi.getOverview();
      setData(res);

      try {
        const routeRes = await ambulanceApi.getRoute('amb-1001');
        if (routeRes && routeRes.polyline) {
          setActiveRoute(routeRes.polyline);
        }
      } catch (e) {
        console.error("Failed to fetch active route for command center", e);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      fetchOverview();
    }
  }, [lastEvent]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Central Emergency Command Centre...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Central Command Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Live Regional Emergency Feed
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-2">Central Command Centre</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time Referral Network Monitoring • Pune District Healthcare Grid
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/command/map"
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition"
          >
            Expand Full GIS Map
          </Link>
          <Link
            to="/command/audit"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition"
          >
            View Event Logs
          </Link>
        </div>
      </div>

      {/* Network Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospitals Monitored</p>
          <p className="text-3xl font-extrabold text-slate-900">{data?.hospitals_count || 3}</p>
          <p className="text-[11px] text-slate-500">Tertiary & Super Speciality</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Available ICU Beds</p>
          <p className="text-3xl font-extrabold text-emerald-600">{data?.metrics?.total_icu_available} / {data?.metrics?.total_icu_total}</p>
          <p className="text-[11px] text-slate-500">Network-wide Capacity</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Ambulances</p>
          <p className="text-3xl font-extrabold text-amber-500">{data?.ambulances_count || 3}</p>
          <p className="text-[11px] text-slate-500">GPS Tracked Vehicles</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Referrals</p>
          <p className="text-3xl font-extrabold text-rose-600">{data?.active_referrals_count || 1}</p>
          <p className="text-[11px] text-slate-500">In Transit & At Risk</p>
        </div>

      </div>

      {/* LIVE SIMULATION CONTROLS PANEL */}
      <DemoControlPanel onEventTriggered={fetchOverview} />

      {/* Main Grid: GIS Live Map & Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GIS Map */}
        <div className="lg:col-span-2 h-[500px]">
          <LiveMap
            phcs={data?.phcs || []}
            hospitals={data?.hospitals || []}
            ambulances={data?.ambulances || []}
            activeRoute={activeRoute}
            center={[18.6500, 73.9500]}
            zoom={10}
          />
        </div>

        {/* Real-time Audit Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 max-h-[500px] overflow-y-auto">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" /> Live Audit Event Log
          </h3>

          <div className="space-y-3">
            {data?.recent_events?.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No events logged yet.</p>
            ) : (
              data?.recent_events?.map((ev: any) => (
                <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between items-center font-semibold text-slate-800">
                    <span>{ev.event_type}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600 leading-normal">{ev.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
