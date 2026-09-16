import React, { useState } from 'react';
import { Users, BookOpen, Award, Activity, ShieldCheck, Bell, CheckCircle2, UserCheck } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Alex Johnson', email: 'alex@example.com', role: 'trainee', status: 'Active' },
    { id: 2, name: 'Sarah Miller', email: 'sarah@example.com', role: 'trainer', status: 'Active' },
    { id: 3, name: 'David Chen', email: 'david@example.com', role: 'trainee', status: 'Pending Approval' }
  ]);

  const handleApprove = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'Active' } : u));
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-white">Admin Management & Audit Portal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor system enrollments, manage user roles, and inspect capacity building certificates.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
            ● System Health: Operational
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Users</span>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> 148
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Active Courses</span>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> 3
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Quiz Attempts</span>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" /> 312
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Certificates Issued</span>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" /> 89
            </div>
          </div>
        </div>
      </div>

      {/* User & Role Approvals Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-400" /> User Approvals & Role Management
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-700">
              <tr>
                <th className="p-3">User Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-700/30">
                  <td className="p-3 font-semibold text-white">{u.name}</td>
                  <td className="p-3 font-mono text-slate-400">{u.email}</td>
                  <td className="p-3 uppercase font-bold text-blue-400 text-[10px]">{u.role}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {u.status === 'Pending Approval' ? (
                      <button
                        onClick={() => handleApprove(u.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-md transition-all"
                      >
                        Approve User
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
