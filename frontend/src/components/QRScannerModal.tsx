import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { CheckInResponse } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: CheckInResponse) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCameraError(null);
      setManualCode('');

      // Initialize Html5QrcodeScanner
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            'reader-element',
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              rememberLastUsedCamera: true,
              aspectRatio: 1.0,
            },
            /* verbose= */ false
          );

          scanner.render(
            async (decodedText) => {
              // On scan success: Pause scanner and perform checkin
              try {
                setIsSubmitting(true);
                scanner.pause();
                const res = await api.checkIn({ qr_token: decodedText });
                scanner.clear();
                onSuccess(res);
                onClose();
              } catch (err: any) {
                setErrorMessage(err.message);
                setTimeout(() => {
                  try {
                    scanner.resume();
                  } catch {}
                }, 2000);
              } finally {
                setIsSubmitting(false);
              }
            },
            (error) => {
              // Scanner frame-level warnings can be ignored
            }
          );

          scannerRef.current = scanner;
        } catch (e: any) {
          setCameraError(
            'Camera initialization failed or permission denied. Please use the manual code lookup below.'
          );
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
          scannerRef.current = null;
        }
      };
    }
  }, [isOpen, onClose, onSuccess]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.checkIn({ lookup_code: manualCode.trim() });
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Staff QR Check-In Scanner" maxWidth="md">
      <div className="flex flex-col space-y-4">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Camera Scanner Box */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
            <Camera className="w-4 h-4 text-brand-600" /> Live Optical Camera Scanner
          </div>

          <div
            id="reader-element"
            className="w-full max-w-[280px] overflow-hidden rounded-lg bg-black/5"
          />

          {cameraError && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 text-center">
              {cameraError}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
            Or Manual Lookup
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Manual Lookup Form */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              8-Character Booking Code
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input
                type="text"
                placeholder="e.g. SS-APEX01 or SS-4X8K9M"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono tracking-wider uppercase focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                maxLength={16}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !manualCode.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Validating check-in...</span>
            ) : (
              <>
                <Search className="w-4 h-4" /> Verify & Complete Check-In
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};
