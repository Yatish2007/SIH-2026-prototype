import React from 'react';

export default function RoleSwitcher({ activeRole, setActiveRole }) {
  return (
    <div className="bg-slate-800/60 border-b border-slate-700/80 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700/50">
        <button
          onClick={() => setActiveRole('trainer')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            activeRole === 'trainer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Trainer Portal (SOP & Quiz)
        </button>
        <button
          onClick={() => setActiveRole('trainee')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            activeRole === 'trainee'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Trainee Portal (Assessment)
        </button>
        <button
          onClick={() => setActiveRole('admin')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            activeRole === 'admin'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Admin Portal (Audit & Users)
        </button>
      </div>

      <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
        <span>Active Role:</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
          activeRole === 'admin'
            ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
            : activeRole === 'trainer'
            ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
        }`}>
          {activeRole}
        </span>
      </div>
    </div>
  );
}