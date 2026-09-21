import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, Lock, User as UserIcon, Shield, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('phc_doctor1');
  const [password, setPassword] = useState('doctor123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      // Redirect based on role
      switch (user.role) {
        case 'PHC_DOCTOR':
          navigate('/phc');
          break;
        case 'HOSPITAL_STAFF':
          navigate('/hospital');
          break;
        case 'AMBULANCE_OPERATOR':
          navigate('/ambulance');
          break;
        case 'COMMAND_CENTER':
        case 'ADMIN':
        default:
          navigate('/command');
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-rose-600 rounded-2xl shadow-xl shadow-rose-600/30">
            <Activity className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-100">
          RuralCare
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          AI-Powered Predictive Rural Hospital Referral System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          
          {error && (
            <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Username
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Preset Accounts for Midsem Evaluation */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Mid-Sem Preset Actor Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('phc_doctor1', 'doctor123')}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left text-slate-300 border border-slate-700/60"
              >
                <div className="font-semibold text-white">PHC Doctor</div>
                <div className="text-[10px] text-slate-400">Dr. Anil (Shirur)</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('hosp_admin1', 'hosp123')}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left text-slate-300 border border-slate-700/60"
              >
                <div className="font-semibold text-white">Hospital A Admin</div>
                <div className="text-[10px] text-slate-400">Sassoon Hospital</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('driver1', 'driver123')}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left text-slate-300 border border-slate-700/60"
              >
                <div className="font-semibold text-white">Ambulance Driver</div>
                <div className="text-[10px] text-slate-400">MH-12-AM-1001</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('command1', 'command123')}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left text-slate-300 border border-slate-700/60"
              >
                <div className="font-semibold text-white">Command Centre</div>
                <div className="text-[10px] text-slate-400">Network Overview</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
