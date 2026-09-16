import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { authService } from '../services/api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('admin');
  const [role, setRole] = useState('trainee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter a valid email or username.');
      return;
    }

    setLoading(true);
    const result = await authService.login(email, password);
    setLoading(false);

    onLogin({
      username: email.split('@')[0] || email,
      email: email,
      role: role || result.user?.role || 'trainee',
      token: result.access_token
    });
  };

  const handleDemoShortcut = (demoRole) => {
    setRole(demoRole);
    setEmail(`${demoRole}_user@capacityconnect.org`);
    setPassword('admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl mb-1 shadow-lg shadow-blue-500/30 text-white font-black text-2xl">
            C
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">CAPACITY CONNECT</h1>
          <p className="text-xs text-slate-400">Digital Capacity Building & AI Learning Portal</p>
        </div>

        {/* Demo Quick Selector */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-center">
            Quick Demo Role Shortcuts
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoShortcut('trainee')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border ${
                role === 'trainee'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              Trainee
            </button>
            <button
              type="button"
              onClick={() => handleDemoShortcut('trainer')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border ${
                role === 'trainer'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              Trainer
            </button>
            <button
              type="button"
              onClick={() => handleDemoShortcut('admin')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border ${
                role === 'admin'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Email / Username
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. trainee@capacityconnect.org"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">Demo Password: <code className="text-blue-400 font-mono">admin</code></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 text-xs flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
            ) : (
              <>Access Capacity Portal <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}