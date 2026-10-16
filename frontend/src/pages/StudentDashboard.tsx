import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Booking, BookingWithQR, Resource } from '../types';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  QrCode,
  ArrowRight,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
  onSelectResourceForBooking: (resource: Resource) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate,
  onSelectResourceForBooking,
}) => {
  const { user } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedQRBooking, setSelectedQRBooking] = useState<BookingWithQR | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsData, resourcesData] = await Promise.all([
        api.getBookings({ scope: 'upcoming' }),
        api.getResources({ status: 'ACTIVE' }),
      ]);
      setUpcomingBookings(bookingsData);
      setResources(resourcesData.slice(0, 4));
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowQR = async (bookingId: string) => {
    try {
      const detail = await api.getBooking(bookingId);
      setSelectedQRBooking(detail);
    } catch {}
  };

  const nextBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-200 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>Welcome back, {user?.full_name}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Resource Booking Dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Reserve project suites, discussion rooms, and equipment items with zero double-booking. Check in
            via digital QR pass or manual lookup code.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => onNavigate('catalog')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <span>Explore Available Resources</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('my-bookings')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition-colors"
            >
              My Bookings
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Active Reservations"
          value={upcomingBookings.length}
          subtitle="Confirmed bookings upcoming"
          icon={<CalendarDays className="w-5 h-5 text-brand-600" />}
        />
        <StatCard
          title="Available Resources"
          value={resources.length}
          subtitle="In your college workspace"
          icon={<Layers className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          title="Check-In Window"
          value="10 Mins"
          subtitle="Automatic release grace period"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Next Upcoming Booking Alert Card */}
      {nextBooking && (
        <div className="bg-white rounded-2xl border-2 border-brand-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                  Next Upcoming Reservation
                </span>
                <Badge status={nextBooking.status} size="sm" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {nextBooking.resource_name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(nextBooking.start_time).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  •{' '}
                  {new Date(nextBooking.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  –{' '}
                  {new Date(nextBooking.end_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {nextBooking.resource_location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {nextBooking.resource_location}
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  Code: {nextBooking.qr_lookup_code}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => handleShowQR(nextBooking.id)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <QrCode className="w-4 h-4" /> View QR Pass
            </button>
          </div>
        </div>
      )}

      {/* Featured Resources for Fast Booking */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Featured Campus Resources</h3>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {resources.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge status={res.type} size="sm" />
                  <span className="text-xs text-slate-400 font-medium">
                    {res.operating_start_time} – {res.operating_end_time}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900">{res.name}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {res.location || 'Campus Center'}
                  </span>
                  {res.capacity && <span>• Capacity: {res.capacity} people</span>}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Max: {res.max_booking_duration_minutes} mins
                </span>
                <button
                  onClick={() => onSelectResourceForBooking(res)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  <span>Check Availability</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Pass Modal */}
      <QRCodeModal
        isOpen={Boolean(selectedQRBooking)}
        onClose={() => setSelectedQRBooking(null)}
        booking={selectedQRBooking}
      />
    </div>
  );
};
