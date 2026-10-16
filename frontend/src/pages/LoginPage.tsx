import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays,
  Lock,
  Mail,
  UserCheck,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface LoginPageProps {
  onBackToLanding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding }) => {
  const { login, switchDemoUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await switchDemoUser(demoEmail);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-md mb-3">
          <CalendarDays className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">SlotSpot Portal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to your campus resource management account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign in to SlotSpot'}
            </button>
          </form>

          {/* Quick 1-Click Demo Personas */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                1-Click Demo Evaluation Personas
              </span>
              <span className="text-[10px] text-slate-400 font-mono">pw: password123</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('student@apex.edu')}
                className="w-full p-2.5 text-left rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-brand-700">
                    Aarav Sharma
                  </p>
                  <p className="text-[11px] text-slate-500">Apex Institute of Technology • Student</p>
                </div>
                <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                  Student
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('manager@apex.edu')}
                className="w-full p-2.5 text-left rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                    Prof. Sunita Mehta
                  </p>
                  <p className="text-[11px] text-slate-500">Apex Institute of Technology • Room Manager</p>
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Room Mgr
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('equipment@apex.edu')}
                className="w-full p-2.5 text-left rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                    Karan Verma
                  </p>
                  <p className="text-[11px] text-slate-500">Apex Institute of Technology • Lab & Equipment Mgr</p>
                </div>
                <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Equip Mgr
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@apex.edu')}
                className="w-full p-2.5 text-left rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-rose-800">
                    Dr. Vikram Rao
                  </p>
                  <p className="text-[11px] text-slate-500">Apex Institute of Technology • College Administrator</p>
                </div>
                <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('student@metro.edu')}
                className="w-full p-2.5 text-left rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-purple-800">
                    Rohan Verma (Metro Eng)
                  </p>
                  <p className="text-[11px] text-slate-500">Different College (Tests Tenant Isolation)</p>
                </div>
                <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  College B
                </span>
              </button>
            </div>
          </div>

          {onBackToLanding && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onBackToLanding}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                ← Return to Project Overview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
