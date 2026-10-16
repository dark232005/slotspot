import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CollegeSettings } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { Settings, Save, Clock, ShieldAlert, Calendar } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [settings, setSettings] = useState<CollegeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [graceMinutes, setGraceMinutes] = useState(10);
  const [operatingStart, setOperatingStart] = useState('08:00');
  const [operatingEnd, setOperatingEnd] = useState('20:00');
  const [maxDuration, setMaxDuration] = useState(180);
  const [advanceDays, setAdvanceDays] = useState(7);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCollegeSettings();
      setSettings(data);
      setGraceMinutes(data.no_show_grace_minutes);
      setOperatingStart(data.operating_start_time);
      setOperatingEnd(data.operating_end_time);
      setMaxDuration(data.max_booking_duration_minutes);
      setAdvanceDays(data.max_advance_booking_days);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.updateCollegeSettings({
        no_show_grace_minutes: graceMinutes,
        operating_start_time: operatingStart,
        operating_end_time: operatingEnd,
        max_booking_duration_minutes: maxDuration,
        max_advance_booking_days: advanceDays,
      });
      setSettings(updated);
      showToast('College booking policies saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-bold text-navy-900 tracking-tight">College Workspace Policies</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure grace periods, duration ceilings, and scheduling rules enforced across your college.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* No-show Grace Period */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>Automatic No-Show Release Grace Period</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            If a student does not complete QR check-in within this grace period after their reservation start time,
            the background worker will automatically transition the booking to NO_SHOW and release the slot.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={120}
              required
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(Number(e.target.value))}
              className="w-24 rounded-xl border border-amber-300 px-3 py-1.5 text-sm font-bold bg-white text-center focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-xs font-semibold text-amber-900">minutes after start time</span>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
            Default Operating Hours
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs text-slate-500 mb-1">Campus Opens</span>
              <input
                type="time"
                required
                value={operatingStart}
                onChange={(e) => setOperatingStart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <span className="block text-xs text-slate-500 mb-1">Campus Closes</span>
              <input
                type="time"
                required
                value={operatingEnd}
                onChange={(e) => setOperatingEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
        </div>

        {/* Duration Ceilings */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Booking Duration (Minutes)
            </label>
            <input
              type="number"
              min={15}
              max={720}
              required
              value={maxDuration}
              onChange={(e) => setMaxDuration(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Advance Window (Days)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              required
              value={advanceDays}
              onChange={(e) => setAdvanceDays(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Policies'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
