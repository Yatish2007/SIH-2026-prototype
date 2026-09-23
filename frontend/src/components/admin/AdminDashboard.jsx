import React, { useState, useEffect } from 'react';
import {
  Users, BookOpen, Award, Activity, ShieldCheck, Bell, CheckCircle2, UserCheck,
  Loader2, RefreshCw, Server, BarChart3, GraduationCap, Cpu, Trash2, ArrowUpDown
} from 'lucide-react';
import { adminService } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUsers()
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setFeedback({ type: 'success', message: `User role updated to ${newRole.toUpperCase()} successfully.` });
      // Refresh stats in background
      adminService.getDashboardStats().then(setStats);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.response?.data?.detail || 'Failed to update user role.' });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    setUpdatingId(userId);
    try {
      await adminService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setFeedback({ type: 'success', message: `User "${userName}" deleted successfully.` });
      adminService.getDashboardStats().then(setStats);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.response?.data?.detail || 'Failed to delete user.' });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading Admin Dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users ?? 0,
      icon: <Users className="w-5 h-5 text-blue-400" />,
      sub: `${stats?.trainee_count ?? 0} trainees · ${stats?.trainer_count ?? 0} trainers`,
      color: 'blue'
    },
    {
      label: 'Active Courses',
      value: stats?.active_courses ?? 0,
      icon: <BookOpen className="w-5 h-5 text-indigo-400" />,
      sub: 'Published course catalog',
      color: 'indigo'
    },
    {
      label: 'Quiz Attempts',
      value: stats?.total_quiz_attempts ?? 0,
      icon: <Activity className="w-5 h-5 text-amber-400" />,
      sub: 'Total skill assessments taken',
      color: 'amber'
    },
    {
      label: 'Certificates Issued',
      value: stats?.issued_certificates ?? 0,
      icon: <Award className="w-5 h-5 text-emerald-400" />,
      sub: 'Verified completion certificates',
      color: 'emerald'
    },
    {
      label: 'Active Sessions',
      value: stats?.active_learning_sessions ?? 0,
      icon: <Cpu className="w-5 h-5 text-purple-400" />,
      sub: 'Live learning activity',
      color: 'purple'
    },
    {
      label: 'System Status',
      value: stats?.system_status ?? 'N/A',
      icon: <Server className="w-5 h-5 text-emerald-400" />,
      sub: 'Backend API health',
      color: 'emerald',
      isText: true
    }
  ];

  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-950/20',
    indigo: 'border-indigo-500/20 bg-indigo-950/20',
    amber: 'border-amber-500/20 bg-amber-950/20',
    emerald: 'border-emerald-500/20 bg-emerald-950/20',
    purple: 'border-purple-500/20 bg-purple-950/20',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/90 via-indigo-900/20 to-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Admin Management & Audit Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitor enrollments, manage roles, inspect certificates, and review system health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${
            stats?.system_status === 'Operational'
              ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30'
              : 'text-amber-400 bg-amber-950/80 border-amber-500/30'
          }`}>
            ● {stats?.system_status ?? 'Checking...'}
          </span>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-slate-900/80 border ${colorMap[card.color] || 'border-slate-700/50'} rounded-xl p-4 space-y-1 hover:scale-[1.02] transition-all`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-2xl font-black text-white">{card.value}</div>
            <div className="text-[10px] text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      {stats?.notifications?.length > 0 && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-md space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            System Notifications
          </h3>
          <div className="space-y-2">
            {stats.notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">{n.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{n.message}</div>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            User Management & Role Permissions
            <span className="text-[10px] text-slate-500 font-normal ml-1">({users.length} users)</span>
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            {stats?.trainee_count ?? '—'} trainees &nbsp;·&nbsp;
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            {stats?.trainer_count ?? '—'} trainers
          </div>
        </div>

        {feedback && (
          <div className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="overflow-x-auto p-5">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-700">
              <tr>
                <th className="p-3">User Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No users found. Register users through the auth endpoints.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-3 font-semibold text-white">{u.name}</td>
                    <td className="p-3 font-mono text-slate-400">{u.email}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          disabled={updatingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          aria-label={`Change role for ${u.name}`}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="trainee">TRAINEE</option>
                          <option value="trainer">TRAINER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                        {updatingId === u.id && (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}>
                        {u.status ?? 'Active'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        disabled={updatingId === u.id}
                        title="Delete user"
                        className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
