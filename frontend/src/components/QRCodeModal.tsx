import React from 'react';
import { Modal } from './Modal';
import { BookingWithQR } from '../types';
import { Badge } from './Badge';
import { Download, Calendar, MapPin, Hash } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithQR | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, booking }) => {
  if (!booking) return null;

  const downloadQR = () => {
    if (!booking.qr_code_image_base64) return;
    const a = document.createElement('a');
    a.href = booking.qr_code_image_base64;
    a.download = `SlotSpot_Pass_${booking.qr_lookup_code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Check-in Pass" maxWidth="sm">
      <div className="flex flex-col items-center text-center">
        {/* Status Pill */}
        <div className="mb-3">
          <Badge status={booking.status} />
        </div>

        {/* Resource Details */}
        <h4 className="text-xl font-bold text-slate-900">{booking.resource_name}</h4>
        
        <div className="mt-2 flex flex-col space-y-1 text-xs text-slate-500 w-full bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Time</span>
            <span className="font-semibold text-slate-700">
              {formatDate(booking.start_time)}, {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
            </span>
          </div>
          {booking.resource_location && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Location</span>
              <span className="font-medium text-slate-700">{booking.resource_location}</span>
            </div>
          )}
        </div>

        {/* QR Code Container */}
        <div className="mt-5 p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm inline-block">
          {booking.qr_code_image_base64 ? (
            <img
              src={booking.qr_code_image_base64}
              alt="Booking QR Code"
              className="w-48 h-48 rounded-lg object-contain mx-auto"
            />
          ) : (
            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-xs text-slate-400 rounded-lg">
              QR Code unavailable
            </div>
          )}
        </div>

        {/* Manual Lookup Code */}
        <div className="mt-4 flex flex-col items-center">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3" /> Manual Booking Code
          </span>
          <span className="text-2xl font-mono font-extrabold text-brand-700 tracking-wider mt-0.5">
            {booking.qr_lookup_code}
          </span>
        </div>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed px-4">
          Show this QR code to staff at check-in. If camera is unavailable, provide the 8-character booking code above.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3 w-full">
          <button
            onClick={downloadQR}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Save Pass
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
