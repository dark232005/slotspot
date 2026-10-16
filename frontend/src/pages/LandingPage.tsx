import React from 'react';
import {
  CalendarDays,
  ShieldCheck,
  QrCode,
  Clock,
  Building2,
  TrendingUp,
  Cpu,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Next-Gen Campus Resource Booking SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-900 tracking-tight leading-tight">
            Smart Campus Booking with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
              Zero Double-Bookings
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SlotSpot eliminates manual register logbooks and ghost reservations. Reserve discussion rooms,
            innovation lab suites, and shared AV equipment with database-enforced concurrency, cryptographic QR check-in,
            and automatic no-show release.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-base shadow-md hover:shadow-lg transition-all"
            >
              <span>Launch Application</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Database-Level Conflict Prevention</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Serialized transactions and row locking guarantee that simultaneous requests for overlapping times
              can never double-book a resource.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Zero-Cost Optical QR Check-In</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Browser-based camera optical scanning with hashed unguessable tokens. Staff can verify check-ins in
              seconds with manual lookup code fallback.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Automatic No-Show Release</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Background scheduler continuously checks grace periods (e.g. 10 minutes). Unused slots are automatically
              freed up for fellow students.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Multi-College Data Isolation</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Multi-tenant architecture isolates colleges completely. College A users and admins cannot view, reserve,
              or modify College B records.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Real Database Analytics & CSV</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Zero fake statistics. Utilization percentages calculated from actual reserved minutes versus eligible operating
              hours, with real CSV export.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">100% Zero-Cost Execution</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              No credit card, no external subscriptions, no paid LLMs, no paid notification APIs. Runs completely on your
              local development machine.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SlotSpot — Campus Resource Booking SaaS • Built with FastAPI, React, TypeScript, and PostgreSQL</span>
          <span className="font-medium text-slate-600">Created and Developed by <strong className="text-brand-600 font-semibold">Shaurya Raghuvanshi</strong></span>
        </div>
      </footer>
    </div>
  );
};
