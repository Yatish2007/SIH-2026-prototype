import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Fixed demo credentials
  const DEMO_PASSWORD = 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a valid username.');
      return;
    }
    if (password !== DEMO_PASSWORD) {
      setError('Invalid password. Use "admin" for demo.');
      return;
    }

    // Pass user info back up to unlock the main application
    onLogin({ username, role: 'Trainer' });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3 font-bold text-white text-xl shadow-lg shadow-blue-500/30">
            S
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SIH-2026 Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Digital Capacity & Skill-Gap Assessment System</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Username / ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. trainer_01"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter demo password"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">Demo Password: <code className="text-blue-400 font-mono">admin</code></p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 text-sm active:scale-[0.98]"
          >
            Access Portal
          </button>
        </form>
      </div>
    </div>
  );
}