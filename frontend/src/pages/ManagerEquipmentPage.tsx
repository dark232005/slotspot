import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Booking } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useNotifications } from '../context/NotificationContext';
import {
  Laptop,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarDays,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const ManagerEquipmentPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [equipmentBookings, setEquipmentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal action state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<'ISSUE' | 'RETURN'>('ISSUE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEquipmentBookings();
  }, []);

  const loadEquipmentBookings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBookings();
      // Filter for equipment type
      const equipOnly = data.filter((b) => b.resource_type === 'EQUIPMENT');
      setEquipmentBookings(equipOnly);
    } catch (err: any) {
      showToast(`Error loading equipment bookings: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAction = (booking: Booking, type: 'ISSUE' | 'RETURN') => {
    setActiveBooking(booking);
    setActionType(type);
    setNotes('');
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;

    setIsSubmitting(true);
    try {
      await api.equipmentAction(activeBooking.id, actionType, notes);
      showToast(
        `Equipment successfully marked as ${actionType === 'ISSUE' ? 'issued' : 'returned'}.`,
        'success'
      );
      setActiveBooking(null);
      loadEquipmentBookings();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Equipment Issue & Return Station</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Track checkouts and returns for hardware, cameras, dev laptops, and portable 4K projectors.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : equipmentBookings.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No equipment bookings on record.
        </div>
      ) : (
        <div className="space-y-3.5">
          {equipmentBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge status={b.status} size="sm" />
                  <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {b.qr_lookup_code}
                  </span>
                  {b.equipment_issued_at && !b.equipment_returned_at && (
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Currently In Use
                    </span>
                  )}
                  {b.equipment_returned_at && (
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Returned
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-400" />
                  {b.resource_name}
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {b.student_name} ({b.student_email})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(b.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                    • {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {b.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {b.notes}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="shrink-0 flex items-center gap-2">
                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleOpenAction(b, 'ISSUE')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Issue to Student</span>
                  </button>
                )}

                {b.status === 'CHECKED_IN' && (
                  <button
                    onClick={() => handleOpenAction(b, 'RETURN')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Process Return</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {activeBooking && (
        <Modal
          isOpen={Boolean(activeBooking)}
          onClose={() => setActiveBooking(null)}
          title={actionType === 'ISSUE' ? 'Issue Equipment' : 'Receive Equipment Return'}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitAction} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Item:</strong> {activeBooking.resource_name}
              </p>
              <p>
                <strong>Student:</strong> {activeBooking.student_name}
              </p>
              <p>
                <strong>Booking Code:</strong> {activeBooking.qr_lookup_code}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {actionType === 'ISSUE'
                  ? 'Condition & Accessories Notes (e.g. Cables, Bag, Battery %)'
                  : 'Return Inspection Notes (e.g. Verified functional, no damage)'}
              </label>
              <textarea
                rows={3}
                required
                placeholder={
                  actionType === 'ISSUE'
                    ? 'All cables, charger, and protective sleeve handed over in good condition.'
                    : 'Checked item: lens clean, charger returned, all tests passed.'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:ring-1 focus:ring-brand-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-white font-semibold rounded-xl text-xs transition-colors ${
                  actionType === 'ISSUE'
                    ? 'bg-brand-600 hover:bg-brand-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmitting
                  ? 'Saving...'
                  : actionType === 'ISSUE'
                  ? 'Confirm Equipment Handover'
                  : 'Confirm Safe Return'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
