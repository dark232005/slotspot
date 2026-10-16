import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Resource, Booking, CheckInResponse } from '../types';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { QRScannerModal } from '../components/QRScannerModal';
import { useNotifications } from '../context/NotificationContext';
import {
  CalendarDays,
  QrCode,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Camera,
  Play,
  RotateCcw,
} from 'lucide-react';

interface ManagerDashboardProps {
  onNavigate: (tab: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();
  const [assignedResources, setAssignedResources] = useState<Resource[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastCheckInResult, setLastCheckInResult] = useState<CheckInResponse | null>(null);
  const [isTestingRelease, setIsTestingRelease] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resData, bookingsData] = await Promise.all([
        api.getResources({ assigned_to_me: true }),
        api.getBookings({ scope: 'today' }),
      ]);
      setAssignedResources(resData);
      setTodayBookings(bookingsData);
    } catch (err: any) {
      showToast(`Error loading data: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanSuccess = (result: CheckInResponse) => {
    setLastCheckInResult(result);
    showToast(result.message, 'success');
    loadData();
  };

  const handleTriggerTestRelease = async () => {
    setIsTestingRelease(true);
    try {
      const res = await api.triggerManualNoShowRelease(1); // 1-minute test grace period
      showToast(`No-show worker scan complete: Released ${res.released_count} expired booking(s).`, 'info');
      loadData();
    } catch (err: any) {
      showToast(`Worker trigger failed: ${err.message}`, 'error');
    } finally {
      setIsTestingRelease(false);
    }
  };

  const pendingCheckins = todayBookings.filter((b) => b.status === 'CONFIRMED');
  const completedToday = todayBookings.filter((b) => b.status === 'CHECKED_IN' || b.status === 'COMPLETED');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Resource Manager Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor assigned campus facilities, verify QR check-ins, and manage equipment workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Launch QR Scanner</span>
          </button>

          <button
            onClick={handleTriggerTestRelease}
            disabled={isTestingRelease}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-xl text-xs transition-colors border border-amber-200"
            title="Forces the background no-show worker to evaluate expired reservations immediately for demonstration"
          >
            <Play className="w-3.5 h-3.5 text-amber-700" />
            <span>{isTestingRelease ? 'Scanning...' : 'Test No-Show Release'}</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Assigned Resources"
          value={assignedResources.length}
          subtitle="Facilities under your supervision"
          icon={<ShieldCheck className="w-5 h-5 text-brand-600" />}
        />
        <StatCard
          title="Pending Check-Ins Today"
          value={pendingCheckins.length}
          subtitle="Waiting for student arrival"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Completed / Checked In"
          value={completedToday.length}
          subtitle="Validated reservations today"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Success Notification Box after Check-in */}
      {lastCheckInResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">Check-in Verified Successfully</p>
              <p className="text-xs text-emerald-700">{lastCheckInResult.message}</p>
            </div>
          </div>
          <button
            onClick={() => setLastCheckInResult(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Today's Reservations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Today's Scheduled Reservations</h3>
          <span className="text-xs font-medium text-slate-400">Live Database Feed</span>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center items-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600"></div>
          </div>
        ) : todayBookings.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No bookings scheduled for today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Time Slot</th>
                  <th className="px-5 py-3 font-semibold">Booking Code</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Badge status={b.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{b.resource_name}</td>
                    <td className="px-5 py-3.5">
                      <span className="block font-medium text-slate-800">{b.student_name}</span>
                      <span className="text-[10px] text-slate-400">{b.student_email}</span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {new Date(b.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      –{' '}
                      {new Date(b.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-700">
                      {b.qr_lookup_code}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => setIsScannerOpen(true)}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg text-xs"
                        >
                          Check In
                        </button>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <span className="text-[11px] text-emerald-700 font-semibold">Checked In</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optical QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleScanSuccess}
      />
    </div>
  );
};
