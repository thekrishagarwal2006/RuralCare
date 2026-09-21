import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

import { Navbar } from './components/Navbar';
import { Login } from './pages/auth/Login';

import { PHCDashboard } from './pages/phc/PHCDashboard';
import { CreateReferral } from './pages/phc/CreateReferral';
import { Recommendations } from './pages/phc/Recommendations';
import { TrackReferral } from './pages/phc/TrackReferral';

import { HospitalDashboard } from './pages/hospital/HospitalDashboard';
import { ResourceManagement } from './pages/hospital/ResourceManagement';
import { IncomingReferrals } from './pages/hospital/IncomingReferrals';

import { AmbulanceDashboard } from './pages/ambulance/AmbulanceDashboard';

import { CommandCenterDashboard } from './pages/command/CommandCenterDashboard';
import { LiveMapPage } from './pages/command/LiveMapPage';
import { AuditLogPage } from './pages/command/AuditLogPage';

import { AdminDashboard } from './pages/admin/AdminDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              {user?.role === 'PHC_DOCTOR' ? <Navigate to="/phc" replace /> :
               user?.role === 'HOSPITAL_STAFF' ? <Navigate to="/hospital" replace /> :
               user?.role === 'AMBULANCE_OPERATOR' ? <Navigate to="/ambulance" replace /> :
               <Navigate to="/command" replace />}
            </ProtectedRoute>
          } />

          {/* PHC Routes */}
          <Route path="/phc" element={<ProtectedRoute><PHCDashboard /></ProtectedRoute>} />
          <Route path="/phc/create-referral" element={<ProtectedRoute><CreateReferral /></ProtectedRoute>} />
          <Route path="/phc/recommendations/:id" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
          <Route path="/phc/track/:id" element={<ProtectedRoute><TrackReferral /></ProtectedRoute>} />

          {/* Hospital Routes */}
          <Route path="/hospital" element={<ProtectedRoute><HospitalDashboard /></ProtectedRoute>} />
          <Route path="/hospital/resources" element={<ProtectedRoute><ResourceManagement /></ProtectedRoute>} />
          <Route path="/hospital/referrals" element={<ProtectedRoute><IncomingReferrals /></ProtectedRoute>} />
          <Route path="/hospital/incoming" element={<ProtectedRoute><IncomingReferrals /></ProtectedRoute>} />

          {/* Ambulance Routes */}
          <Route path="/ambulance" element={<ProtectedRoute><AmbulanceDashboard /></ProtectedRoute>} />

          {/* Command Centre Routes */}
          <Route path="/command" element={<ProtectedRoute><CommandCenterDashboard /></ProtectedRoute>} />
          <Route path="/command-center" element={<ProtectedRoute><CommandCenterDashboard /></ProtectedRoute>} />
          <Route path="/command/map" element={<ProtectedRoute><LiveMapPage /></ProtectedRoute>} />
          <Route path="/live-map" element={<ProtectedRoute><LiveMapPage /></ProtectedRoute>} />
          <Route path="/command/audit" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />

          {/* Admin / Demo Simulator Route */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App;
