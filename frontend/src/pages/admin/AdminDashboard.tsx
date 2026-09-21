import React from 'react';
import { DemoControlPanel } from '../../components/DemoControlPanel';
import { Shield, Settings, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500" /> Admin & System Simulation Control Panel
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Facilitates live system demonstration testing by triggering actual database/backend resource updates and GPS simulation ticks.
        </p>
      </div>

      <DemoControlPanel />

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">System Simulation Walkthrough Instructions</h3>
        <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 leading-relaxed">
          <li>Log in as <strong>PHC Doctor</strong> (`phc_doctor1`) and create a referral for 54yo Acute Respiratory Distress (SpO2 82%).</li>
          <li>Select <strong>Sassoon General Hospital (Hospital A)</strong> based on recommendation score and confirm referral.</li>
          <li>Switch to <strong>Ambulance Operator HUD</strong> (`driver1`) or <strong>Command Centre</strong> and click <strong>Start Simulation Trip</strong>.</li>
          <li>Click <strong>Deplete ICU (1 → 0)</strong> on Sassoon Hospital in the control panel above.</li>
          <li>Observe sub-second WebSocket alert: <code>DESTINATION RESOURCE AT RISK</code> on Ambulance and Command Centre dashboards.</li>
          <li>Verify automatic dynamic reroute recommendation to <strong>Sahyadri Hospital (Hospital B)</strong> with recalculated ETA and rationale.</li>
        </ol>
      </div>
    </div>
  );
};
