import React, { useState } from 'react';
import { api } from '../services/api';
import { CheckInResponse } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { QRScannerModal } from '../components/QRScannerModal';
import { Badge } from '../components/Badge';
import {
  QrCode,
  Search,
  Camera,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';

export const ManagerCheckinPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [lookupCode, setLookupCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [recentCheckin, setRecentCheckin] = useState<CheckInResponse | null>(null);

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.checkIn({ lookup_code: lookupCode.trim() });
      setRecentCheckin(res);
      showToast(res.message, 'success');
      setLookupCode('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanSuccess = (result: CheckInResponse) => {
    setRecentCheckin(result);
    showToast(result.message, 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mb-3 border border-brand-100">
          <QrCode className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Staff Check-In Station</h2>
        <p className="text-xs text-slate-500 mt-1">
          Scan student digital QR passes using your webcam or enter the 8-character booking lookup code.
        </p>
      </div>

      {/* Primary Input Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            <Camera className="w-5 h-5" />
            <span>Open Optical Camera Scanner</span>
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
            Or Type Lookup Code
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleManualLookup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Booking Lookup Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SS-APEX01"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-base font-mono font-bold tracking-wider uppercase focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                maxLength={16}
              />
              <button
                type="submit"
                disabled={isSubmitting || !lookupCode.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Verify</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Verified Result Card */}
      {recentCheckin && recentCheckin.booking && (
        <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-6 shadow-xs animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-emerald-200">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Check-In Confirmed & Validated
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {recentCheckin.booking.resource_name}
              </h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Student:</strong> {recentCheckin.booking.student_name} (
                {recentCheckin.booking.student_email})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Time Window:</strong>{' '}
                {new Date(recentCheckin.booking.start_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                –{' '}
                {new Date(recentCheckin.booking.end_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Status:</strong> <Badge status={recentCheckin.booking.status} size="sm" />
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Checked in at:</strong>{' '}
                {new Date(recentCheckin.booking.check_in_time || '').toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Optical QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleScanSuccess}
      />
    </div>
  );
};
