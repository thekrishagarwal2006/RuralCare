import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, ShieldAlert, Truck, Building2, User as UserIcon, LogOut, Radio, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const getNavLinks = () => {
    switch (user.role) {
      case 'PHC_DOCTOR':
        return [
          { label: 'PHC Dashboard', path: '/phc' },
          { label: 'Create Referral', path: '/phc/create-referral' },
        ];
      case 'HOSPITAL_STAFF':
        return [
          { label: 'Hospital Dashboard', path: '/hospital' },
          { label: 'Resource Management', path: '/hospital/resources' },
          { label: 'Incoming Referrals', path: '/hospital/referrals' },
        ];
      case 'AMBULANCE_OPERATOR':
        return [
          { label: 'Ambulance HUD', path: '/ambulance' },
        ];
      case 'COMMAND_CENTER':
      case 'ADMIN':
      default:
        return [
          { label: 'Command Centre', path: '/command' },
          { label: 'Live GIS Map', path: '/command/map' },
          { label: 'Audit Log', path: '/command/audit' },
          { label: 'Demo Simulator', path: '/admin' },
        ];
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600 rounded-xl shadow-sm">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                RuralCare
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  40% Mid-Sem Prototype
                </span>
              </Link>
              <p className="text-[11px] text-slate-400 hidden sm:block">AI-Powered Predictive Referral & Routing</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 border border-sky-400/40 shadow-inner'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <div className="text-xs text-left">
                <p className="font-semibold text-slate-200">{user.full_name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-xs font-bold ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-sky-400/30'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
