import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Resource, MaintenanceBlock } from '../types';
import { Modal } from '../components/Modal';
import { useNotifications } from '../context/NotificationContext';
import {
  Wrench,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const ManagerMaintenancePage: React.FC = () => {
  const { showToast } = useNotifications();
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New maintenance modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetResourceId, setTargetResourceId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [blocks, resList] = await Promise.all([
        api.getMaintenanceBlocks(),
        api.getResources(),
      ]);
      setMaintenanceBlocks(blocks);
      setResources(resList);
      if (resList.length > 0 && !targetResourceId) {
        setTargetResourceId(resList[0].id);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResourceId || !reason.trim()) return;

    const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${startDate}T${endTime}:00`).toISOString();

    setIsSubmitting(true);
    try {
      await api.createMaintenanceBlock({
        resource_id: targetResourceId,
        start_time: startDateTime,
        end_time: endDateTime,
        reason: reason.trim(),
      });
      showToast('Maintenance scheduled. Resource will be blocked for bookings.', 'success');
      setIsCreateModalOpen(false);
      setReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await api.deleteMaintenanceBlock(blockId);
      showToast('Maintenance block removed. Resource is now open.', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Facility Maintenance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Block resources for routine servicing, hardware calibration, or deep cleaning.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Maintenance Block</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : maintenanceBlocks.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No active or upcoming maintenance blocks scheduled.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {maintenanceBlocks.map((mb) => (
            <div
              key={mb.id}
              className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-700" /> Maintenance Scheduled
                  </span>
                  <button
                    onClick={() => handleDeleteBlock(mb.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Remove block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-1">{mb.resource_name}</h3>
                <p className="text-xs text-slate-600 mt-1.5">Reason: {mb.reason}</p>

                <div className="mt-3 space-y-1 text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(mb.start_time).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(mb.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      – {new Date(mb.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Maintenance Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Facility Maintenance"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Target Resource
            </label>
            <select
              value={targetResourceId}
              onChange={(e) => setTargetResourceId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={startDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Work Order Notes
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Projector bulb calibration & filter replacement"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Block Time Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
