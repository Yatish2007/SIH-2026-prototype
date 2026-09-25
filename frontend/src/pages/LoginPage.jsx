import React, { useState } from 'react';
import {
  KeyRound, Lock, User as UserIcon, Mail, ArrowRight, ArrowLeft,
  Loader2, UserPlus, LogIn, GraduationCap, Presentation, ShieldCheck
} from 'lucide-react';
import { authService } from '../services/api';

// Portal metadata used across the entry-point cards and the auth forms.
const PORTALS = {
  trainee: {
    title: 'TRAINEE',
    subtitle: 'Learner / Training Participant',
    icon: GraduationCap,
    iconBg: 'from-blue-600 to-indigo-500',
    description: 'Access courses, track progress and earn certificates.'
  },
  trainer: {
    title: 'TRAINER',
    subtitle: 'Course & Learning Manager',
    icon: Presentation,
    iconBg: 'from-indigo-500 to-violet-600',
    description: 'Create courses, upload materials and manage assessments.'
  },
  admin: {
    title: 'ADMIN',
    subtitle: 'Platform Administrator',
    icon: ShieldCheck,
    iconBg: 'from-slate-600 to-slate-500',
    description: 'Manage users, roles and platform-wide analytics.'
  }
};

export default function LoginPage({ onLogin }) {
  const [portal, setPortal] = useState(null);       // 'trainee' | 'trainer' | 'admin' | null
  const [mode, setMode] = useState('login');         // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Returns null when the authenticated role is allowed for the selected
  // portal, otherwise a human-readable denial message. The backend role
  // always wins over the UI entry point that was clicked.
  const roleAccessError = (role) => {
    const r = (role || '').toLowerCase();

    if (portal === 'trainee') {
      if (r === 'trainer') return 'This account is registered as a Trainer account. Please use the Trainer portal.';
      if (r === 'admin') return 'This account has administrator access. Please use the Admin portal.';
      if (r === 'trainee') return null;
      return 'This account does not have Trainee access.';
    }

    if (portal === 'trainer') {
      if (r === 'trainee') return 'This account is registered as a Trainee account. Please use the Trainee portal.';
      if (r === 'admin') return 'This account has administrator access. Please use the Admin portal.';
      if (r === 'trainer') return null;
      return 'This account is not registered as a Trainer account.';
    }

    if (portal === 'admin') {
      if (r === 'admin') return null;
      return 'This account does not have administrator access.';
    }

    return null;
  };

  const selectPortal = (selectedPortal, selectedMode) => {
    setPortal(selectedPortal);
    setMode(selectedMode);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const goBackToPortals = () => {
    setPortal(null);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(email, password);
      const denied = roleAccessError(result?.user?.role);
      if (denied) {
        // Access blocked for this portal: do not keep a usable session token.
        authService.logout();
        setError(denied);
        return;
      }
      onLogin({
        ...result.user,
        token: result.access_token
      });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (portal === 'admin') return; // No admin registration is exposed.

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const role = portal === 'trainer' ? 'trainer' : 'trainee';

    setLoading(true);
    try {
      await authService.register(name, email, password, role);
      const result = await authService.login(email, password);
      const denied = roleAccessError(result?.user?.role);
      if (denied) {
        authService.logout();
        setError(denied);
        return;
      }
      onLogin({
        ...result.user,
        token: result.access_token
      });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBranding = () => (
    <div className="text-center space-y-2">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl mb-1 shadow-lg shadow-blue-500/30 text-white font-black text-2xl">
        C
      </div>
      <h1 className="text-2xl font-black text-white tracking-wide">CAPACITY CONNECT</h1>
      <p className="text-xs text-slate-400">Digital Capacity Building Learning Portal</p>
    </div>
  );

  const renderPortalSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-black text-white tracking-wide">Select Your Portal</h2>
        <p className="text-xs text-slate-400">
          Choose the entry point that matches your registered account role.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.keys(PORTALS).map((key) => {
          const p = PORTALS[key];
          const PortalIcon = p.icon;
          const isAdmin = key === 'admin';
          return (
            <div
              key={key}
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center hover:border-blue-500/60 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${p.iconBg} flex items-center justify-center text-white shadow-lg mb-3`}>
                <PortalIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-white tracking-wide">{p.title}</h3>
              <p className="text-[11px] text-slate-400 mb-1">{p.subtitle}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-4">{p.description}</p>

              <div className="w-full space-y-2 mt-auto">
                <button
                  type="button"
                  onClick={() => selectPortal(key, 'login')}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 text-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {isAdmin ? 'Admin Sign In' : 'Sign In'}
                </button>

                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => selectPortal(key, 'register')}
                    className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-bold py-2.5 px-3 rounded-xl transition-all duration-200 text-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {key === 'trainer' ? 'Register as Trainer' : 'Create Trainee Account'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        Admin accounts are created and assigned only by the platform administrator.
      </p>
    </div>
  );

  const renderForm = () => {
    const p = PORTALS[portal];
    const PortalIcon = p.icon;
    const isRegister = mode === 'register';

    const heading = isRegister
      ? (portal === 'trainer' ? 'Register as Trainer' : 'Create Trainee Account')
      : `${p.title.charAt(0) + p.title.slice(1).toLowerCase()} Sign In`;

    const submitLabel = loading
      ? (isRegister
        ? (portal === 'trainer' ? 'Creating trainer account...' : 'Creating trainee account...')
        : 'Signing in...')
      : isRegister
        ? (portal === 'trainer' ? 'Register as Trainer' : 'Create Trainee Account')
        : (portal === 'admin' ? 'Admin Sign In' : `${p.title.charAt(0) + p.title.slice(1).toLowerCase()} Sign In`);

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={goBackToPortals}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Portals
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.iconBg} flex items-center justify-center text-white shadow-lg`}>
            <PortalIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">{heading}</h2>
            <p className="text-[11px] text-slate-400">{p.subtitle}</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={isRegister ? handleRegisterSubmit : handleLoginSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Minimum 6 characters' : 'Password'}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 text-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {submitLabel}</>
            ) : (
              <>{submitLabel} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {portal === 'admin' && (
            <p className="text-[10px] text-slate-500 text-center">
              Admin accounts are provisioned only by the platform administrator.
            </p>
          )}
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-3xl w-full shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        {renderBranding()}

        {portal === null ? renderPortalSelection() : renderForm()}
      </div>
    </div>
  );
}