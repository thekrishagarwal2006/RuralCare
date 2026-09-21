import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PHCCenter, Hospital, Ambulance } from '../types';

// Fix default marker icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const phcIcon = L.divIcon({
  className: 'custom-map-icon phc-icon',
  html: `<div style="background-color: #0284c7; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">PHC</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const hospitalIcon = L.divIcon({
  className: 'custom-map-icon hospital-icon',
  html: `<div style="background-color: #e11d48; color: white; border-radius: 6px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏥</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const ambulanceIcon = L.divIcon({
  className: 'custom-map-icon ambulance-icon',
  html: `<div style="background-color: #f59e0b; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">🚑</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

interface Props {
  phcs?: PHCCenter[];
  hospitals?: Hospital[];
  ambulances?: Ambulance[];
  activeRoute?: [number, number][];
  oldRoute?: [number, number][];
  center?: [number, number];
  zoom?: number;
}

const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const LiveMap: React.FC<Props> = ({
  phcs = [],
  hospitals = [],
  ambulances = [],
  activeRoute = [],
  oldRoute = [],
  center = [18.6500, 73.9500],
  zoom = 10
}) => {
  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <ChangeMapView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* PHCs */}
        {phcs.map((phc) => (
          <Marker key={`phc-${phc.id}`} position={[phc.latitude, phc.longitude]} icon={phcIcon}>
            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-slate-900 text-sm">{phc.name}</h4>
                <p className="text-xs text-slate-600">District: {phc.district}</p>
                <p className="text-xs text-sky-600 font-semibold mt-1">📞 {phc.contact_number}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Hospitals */}
        {hospitals.map((hosp) => (
          <Marker key={`hosp-${hosp.id}`} position={[hosp.latitude, hosp.longitude]} icon={hospitalIcon}>
            <Popup>
              <div className="p-1 min-w-[180px]">
                <h4 className="font-bold text-slate-900 text-sm">{hosp.name}</h4>
                <p className="text-xs text-slate-500 mb-2">{hosp.tier}</p>
                {hosp.resources && (
                  <div className="text-xs space-y-1 bg-slate-50 p-2 rounded border">
                    <p className="flex justify-between">
                      <span>ICU Beds:</span>
                      <strong className={hosp.resources.icu_available > 0 ? "text-emerald-600" : "text-rose-600"}>
                        {hosp.resources.icu_available} / {hosp.resources.icu_total}
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Ventilators:</span>
                      <strong className={hosp.resources.ventilators_available > 0 ? "text-emerald-600" : "text-amber-600"}>
                        {hosp.resources.ventilators_available} / {hosp.resources.ventilators_total}
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Oxygen:</span>
                      <strong className={hosp.resources.oxygen_available ? "text-emerald-600" : "text-rose-600"}>
                        {hosp.resources.oxygen_available ? "Available" : "Depleted"}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ambulances */}
        {ambulances.map((amb) => (
          <Marker key={`amb-${amb.id}`} position={[amb.current_latitude, amb.current_longitude]} icon={ambulanceIcon}>
            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-slate-900 text-sm">Ambulance {amb.vehicle_number}</h4>
                <p className="text-xs text-slate-600">Driver: {amb.driver_name}</p>
                <p className="text-xs text-amber-700 font-semibold mt-1">📞 {amb.driver_phone}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Old Deprecated Route (Dotted Red) */}
        {oldRoute.length > 1 && (
          <Polyline
            positions={oldRoute}
            pathOptions={{ color: '#e11d48', weight: 4, dashArray: '6, 8', opacity: 0.7 }}
          />
        )}

        {/* Active Route (Solid Blue) */}
        {activeRoute.length > 1 && (
          <Polyline
            positions={activeRoute}
            pathOptions={{ color: '#0284c7', weight: 6, opacity: 0.9 }}
          />
        )}
      </MapContainer>
    </div>
  );
};
