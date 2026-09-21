import React, { useEffect, useState } from 'react';
import { commandCenterApi } from '../../services/api';
import { LiveMap } from '../../components/LiveMap';

export const LiveMapPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    commandCenterApi.getOverview().then(res => {
      setData(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading GIS Map...</div>;
  }

  return (
    <div className="p-4 space-y-4 h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
        <h1 className="text-lg font-bold">Pune District Emergency Health Network GIS Map</h1>
        <p className="text-xs text-slate-300">Live position tracking for PHCs, Hospitals, and Ambulances</p>
      </div>

      <div className="h-[calc(100%-60px)]">
        <LiveMap
          phcs={data?.phcs || []}
          hospitals={data?.hospitals || []}
          ambulances={data?.ambulances || []}
          center={[18.6500, 73.9500]}
          zoom={10}
        />
      </div>
    </div>
  );
};
