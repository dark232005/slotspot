import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Resource, BookingWithQR } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { AvailabilityPicker } from '../components/AvailabilityPicker';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ResourceCatalogPageProps {
  initialSelectedResource?: Resource | null;
  onClearInitialResource?: () => void;
}

export const ResourceCatalogPage: React.FC<ResourceCatalogPageProps> = ({
  initialSelectedResource,
  onClearInitialResource,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Booking modal state
  const [activeBookingResource, setActiveBookingResource] = useState<Resource | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingWithQR | null>(null);

  useEffect(() => {
    loadResources();
  }, [selectedType]);

  useEffect(() => {
    if (initialSelectedResource) {
      setActiveBookingResource(initialSelectedResource);
      if (onClearInitialResource) onClearInitialResource();
    }
  }, [initialSelectedResource, onClearInitialResource]);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const data = await api.getResources({
        type: selectedType || undefined,
        status: 'ACTIVE',
      });
      setResources(data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResources = resources.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  const handleBookingSuccess = (booking: BookingWithQR) => {
    setActiveBookingResource(null);
    setConfirmedBooking(booking);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Campus Resource Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse available project suites, discussion rooms, and equipment in your college.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search resources, rooms, tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSelectedType('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedType === ''
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Resources
        </button>
        <button
          onClick={() => setSelectedType('DISCUSSION_ROOM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedType === 'DISCUSSION_ROOM'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Discussion Rooms
        </button>
        <button
          onClick={() => setSelectedType('PROJECT_ROOM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedType === 'PROJECT_ROOM'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Project & Innovation Labs
        </button>
        <button
          onClick={() => setSelectedType('EQUIPMENT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedType === 'EQUIPMENT'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Equipment & Hardware
        </button>
      </div>

      {/* Resource Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No resources found matching the criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge status={res.type} size="sm" />
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {res.operating_start_time} - {res.operating_end_time}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-1">{res.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                  {res.description}
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{res.location || 'Campus Center'}</span>
                  </div>
                  {res.capacity && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Capacity: up to {res.capacity} people</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Max booking: {res.max_booking_duration_minutes} mins • Slots: {res.slot_granularity_minutes}m
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveBookingResource(res)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>View Slots & Reserve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Drawer Modal */}
      {activeBookingResource && (
        <Modal
          isOpen={Boolean(activeBookingResource)}
          onClose={() => setActiveBookingResource(null)}
          title={`Reserve: ${activeBookingResource.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900">{activeBookingResource.name}</span>
                <span className="mx-2">•</span>
                <span>{activeBookingResource.location}</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                Operating: {activeBookingResource.operating_start_time} - {activeBookingResource.operating_end_time}
              </span>
            </div>

            <AvailabilityPicker
              resource={activeBookingResource}
              onBookingSuccess={handleBookingSuccess}
            />
          </div>
        </Modal>
      )}

      {/* QR Code Pass Viewer when Confirmed */}
      <QRCodeModal
        isOpen={Boolean(confirmedBooking)}
        onClose={() => setConfirmedBooking(null)}
        booking={confirmedBooking}
      />
    </div>
  );
};
