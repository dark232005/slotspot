import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Booking, BookingWithQR } from '../types';
import { Badge } from '../components/Badge';
import { QRCodeModal } from '../components/QRCodeModal';
import { useNotifications } from '../context/NotificationContext';
import {
  CalendarDays,
  Clock,
  MapPin,
  QrCode,
  XCircle,
  Hash,
  AlertTriangle,
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<string>('all');
  const [selectedQRBooking, setSelectedQRBooking] = useState<BookingWithQR | null>(null);

  // Cancellation state
  const [cancelTargetBookingId, setCancelTargetBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (err: any) {
      showToast(`Failed to load bookings: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowQR = async (bookingId: string) => {
    try {
      const detail = await api.getBooking(bookingId);
      setSelectedQRBooking(detail);
    } catch (err: any) {
      showToast(`Failed to fetch QR pass: ${err.message}`, 'error');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetBookingId) return;
    setIsCancelling(true);
    try {
      await api.cancelBooking(cancelTargetBookingId, cancelReason || 'Cancelled by student');
      showToast('Reservation cancelled and slot released.', 'info');
      setCancelTargetBookingId(null);
      setCancelReason('');
      loadBookings();
    } catch (err: any) {
      showToast(`Cancellation failed: ${err.message}`, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'upcoming') return b.status === 'CONFIRMED';
    if (filterTab === 'checked_in') return b.status === 'CHECKED_IN';
    if (filterTab === 'completed') return b.status === 'COMPLETED';
    if (filterTab === 'cancelled') return b.status === 'CANCELLED';
    if (filterTab === 'no_show') return b.status === 'NO_SHOW' || b.status === 'EXPIRED';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">My Reservations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your campus bookings, view check-in QR codes, and cancel reservations.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'all', label: 'All Bookings' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'checked_in', label: 'Active Check-Ins' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'no_show', label: 'No-Shows / Released' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === tab.id
                ? 'bg-brand-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No bookings found in this category.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <Badge status={b.status} size="sm" />
                  {b.resource_type && <Badge status={b.resource_type} size="sm" />}
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {b.qr_lookup_code}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{b.resource_name}</h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(b.start_time).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(b.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(b.end_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {b.resource_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {b.resource_location}
                    </span>
                  )}
                </div>

                {b.notes && <p className="text-xs text-slate-600 italic">Notes: {b.notes}</p>}

                {b.cancellation_reason && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-block">
                    Cancellation reason: {b.cancellation_reason}
                  </p>
                )}

                {b.no_show_time && (
                  <p className="text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 inline-block">
                    Released due to no-show at{' '}
                    {new Date(b.no_show_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center gap-2">
                {b.status === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => handleShowQR(b.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View QR Code</span>
                    </button>
                    <button
                      onClick={() => setCancelTargetBookingId(b.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-medium rounded-xl text-xs transition-colors border border-slate-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}

                {b.status === 'CHECKED_IN' && (
                  <button
                    onClick={() => handleShowQR(b.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View Pass</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {cancelTargetBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Cancel Reservation?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to cancel this booking? The time slot will immediately be released for other students to reserve.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Rescheduled project meeting"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTargetBookingId(null)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Pass Modal */}
      <QRCodeModal
        isOpen={Boolean(selectedQRBooking)}
        onClose={() => setSelectedQRBooking(null)}
        booking={selectedQRBooking}
      />
    </div>
  );
};
