import React from 'react';

export default function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
          S
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">SIH-2026 Portal</h1>
          <p className="text-xs text-slate-400">Skill-Gap Assessment System</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 bg-blue-950/60 border border-blue-500/30 px-3 py-1.5 rounded-full text-xs text-blue-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-medium">Prototype v1.0</span>
      </div>
    </header>
  );
}