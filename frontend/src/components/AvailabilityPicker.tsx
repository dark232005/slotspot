import React, { useState, useEffect } from 'react';
import { Resource, SlotAvailability, BookingWithQR } from '../types';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Calendar, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface AvailabilityPickerProps {
  resource: Resource;
  onBookingSuccess: (booking: BookingWithQR) => void;
}

export const AvailabilityPicker: React.FC<AvailabilityPickerProps> = ({
  resource,
  onBookingSuccess,
}) => {
  const { showToast } = useNotifications();

  // Date selection
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Slots state
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Selected slot state
  const [selectedStartSlot, setSelectedStartSlot] = useState<SlotAvailability | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(resource.slot_granularity_minutes);
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchSlots();
    setSelectedStartSlot(null);
  }, [resource.id, selectedDate]);

  const fetchSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const data = await api.getAvailability(resource.id, selectedDate);
      setSlots(data);
    } catch (err: any) {
      showToast(`Failed to load slots: ${err.message}`, 'error');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const formatSlotTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Generate allowed duration choices in multiples of slot_granularity_minutes up to max_booking_duration_minutes
  const durationOptions = [];
  for (
    let m = resource.slot_granularity_minutes;
    m <= resource.max_booking_duration_minutes;
    m += resource.slot_granularity_minutes
  ) {
    durationOptions.push(m);
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStartSlot) return;

    const startDate = new Date(selectedStartSlot.start_time);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    setIsSubmitting(true);
    try {
      const booking = await api.createBooking({
        resource_id: resource.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        notes: bookingNotes.trim() || undefined,
      });

      showToast('Reservation confirmed successfully!', 'success');
      onBookingSuccess(booking);
      // Refresh slots
      fetchSlots();
      setSelectedStartSlot(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-semibold text-slate-800">Select Reservation Date:</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          min={todayStr}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Availability Status Key */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-300"></span>
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400"></span>
          <span>Maintenance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-200"></span>
          <span>Past Slot</span>
        </div>
      </div>

      {/* Slot Grid */}
      {isLoadingSlots ? (
        <div className="py-12 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
          No operating slots found for this date.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {slots.map((slot, idx) => {
            const isSelected = selectedStartSlot?.start_time === slot.start_time;
            const timeLabel = `${formatSlotTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`;

            if (slot.is_available) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedStartSlot(slot)}
                  className={`p-2.5 rounded-xl text-center text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm scale-105'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                  }`}
                >
                  {timeLabel}
                </button>
              );
            }

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl text-center text-xs font-medium border select-none ${
                  slot.status_label === 'RESERVED'
                    ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                    : slot.status_label === 'MAINTENANCE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}
                title={slot.status_label}
              >
                {timeLabel}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Form drawer when slot selected */}
      {selectedStartSlot && (
        <form
          onSubmit={handleBookingSubmit}
          className="mt-6 bg-brand-50/60 border border-brand-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-brand-100">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-brand-600" /> Confirm Time & Details
            </h4>
            <span className="text-xs font-medium text-brand-800 bg-brand-100 px-2.5 py-1 rounded-full">
              Starts at {formatSlotTime(selectedStartSlot.start_time)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Booking Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {durationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} minutes ({opt / 60 >= 1 ? `${opt / 60} hr${opt / 60 > 1 ? 's' : ''}` : `${opt} min`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purpose / Project Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Capstone project team discussion"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedStartSlot(null)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <span>Reserving with DB Lock...</span>
              ) : (
                <>
                  <span>Confirm Reservation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
