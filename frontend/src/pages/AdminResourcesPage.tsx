import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Resource, UserSummary, ManagerAssignment } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useNotifications } from '../context/NotificationContext';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  MapPin,
  Clock,
  X,
} from 'lucide-react';

export const AdminResourcesPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [resources, setResources] = useState<Resource[]>([]);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'PROJECT_ROOM' | 'DISCUSSION_ROOM' | 'EQUIPMENT'>('DISCUSSION_ROOM');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState<number | undefined>(8);
  const [operatingStart, setOperatingStart] = useState('08:00');
  const [operatingEnd, setOperatingEnd] = useState('20:00');
  const [maxDuration, setMaxDuration] = useState(180);
  const [granularity, setGranularity] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Manager modal
  const [assignModalResource, setAssignModalResource] = useState<Resource | null>(null);
  const [assignedManagersList, setAssignedManagersList] = useState<ManagerAssignment[]>([]);
  const [selectedManagerIdToAssign, setSelectedManagerIdToAssign] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resList, userList] = await Promise.all([
        api.getResources(),
        api.getUsers('RESOURCE_MANAGER'),
      ]);
      setResources(resList);
      setManagers(userList);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingResource(null);
    setName('');
    setType('DISCUSSION_ROOM');
    setDescription('');
    setLocation('');
    setCapacity(8);
    setOperatingStart('08:00');
    setOperatingEnd('20:00');
    setMaxDuration(180);
    setGranularity(30);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Resource) => {
    setEditingResource(r);
    setName(r.name);
    setType(r.type);
    setDescription(r.description);
    setLocation(r.location);
    setCapacity(r.capacity);
    setOperatingStart(r.operating_start_time);
    setOperatingEnd(r.operating_end_time);
    setMaxDuration(r.max_booking_duration_minutes);
    setGranularity(r.slot_granularity_minutes);
    setIsModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      type,
      description: description.trim(),
      location: location.trim(),
      capacity: type === 'EQUIPMENT' ? undefined : capacity,
      operating_start_time: operatingStart,
      operating_end_time: operatingEnd,
      max_booking_duration_minutes: maxDuration,
      slot_granularity_minutes: granularity,
      status: 'ACTIVE' as const,
    };

    try {
      if (editingResource) {
        await api.updateResource(editingResource.id, payload);
        showToast('Resource updated successfully.', 'success');
      } else {
        await api.createResource(payload);
        showToast('Resource created successfully.', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, resourceName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${resourceName}"?`)) return;
    try {
      await api.deleteResource(id);
      showToast('Resource deactivated.', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openAssignModal = async (resource: Resource) => {
    setAssignModalResource(resource);
    try {
      const assigned = await api.getResourceManagers(resource.id);
      setAssignedManagersList(assigned);
      if (managers.length > 0) {
        setSelectedManagerIdToAssign(managers[0].id);
      }
    } catch {}
  };

  const handleAssignManager = async () => {
    if (!assignModalResource || !selectedManagerIdToAssign) return;
    try {
      await api.assignResourceManager(assignModalResource.id, selectedManagerIdToAssign);
      showToast('Manager assigned.', 'success');
      const updated = await api.getResourceManagers(assignModalResource.id);
      setAssignedManagersList(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    if (!assignModalResource) return;
    try {
      await api.removeResourceManager(assignModalResource.id, userId);
      showToast('Manager unassigned.', 'info');
      setAssignedManagersList((prev) => prev.filter((a) => a.user_id !== userId));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Manage College Resources</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add facilities, set operating constraints, and delegate resource managers.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Resource</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No resources found. Click "Add New Resource" to create one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 font-semibold">Name & Type</th>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold">Operating Hours</th>
                <th className="px-5 py-3 font-semibold">Max Duration</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-900 block">{r.name}</span>
                    <Badge status={r.type} size="sm" />
                  </td>
                  <td className="px-5 py-3.5 font-medium">{r.location}</td>
                  <td className="px-5 py-3.5 font-mono text-[11px]">
                    {r.operating_start_time} - {r.operating_end_time}
                  </td>
                  <td className="px-5 py-3.5">{r.max_booking_duration_minutes} mins</td>
                  <td className="px-5 py-3.5">
                    <Badge status={r.status} size="sm" />
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => openAssignModal(r)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
                      title="Assign Managers"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(r)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeactivate(r.id, r.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Deactivate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Resource Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResource ? 'Edit Resource' : 'Add New Campus Resource'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveResource} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Innovation Lab - Suite 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="DISCUSSION_ROOM">Discussion Room</option>
                <option value="PROJECT_ROOM">Project & Innovation Room</option>
                <option value="EQUIPMENT">Equipment Item</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Building & Location</label>
              <input
                type="text"
                required
                placeholder="e.g. Turing Block, 3rd Floor"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Features, equipment installed, Wi-Fi details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Start</label>
              <input
                type="time"
                value={operatingStart}
                onChange={(e) => setOperatingStart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operating End</label>
              <input
                type="time"
                value={operatingEnd}
                onChange={(e) => setOperatingEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Duration (mins)</label>
              <input
                type="number"
                min={15}
                max={480}
                value={maxDuration}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingResource ? 'Update Resource' : 'Create Resource'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manager Assignment Modal */}
      {assignModalResource && (
        <Modal
          isOpen={Boolean(assignModalResource)}
          onClose={() => setAssignModalResource(null)}
          title={`Assign Managers: ${assignModalResource.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign New Resource Manager
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedManagerIdToAssign}
                  onChange={(e) => setSelectedManagerIdToAssign(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500"
                >
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignManager}
                  className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Currently Assigned Managers</h4>
              {assignedManagersList.length === 0 ? (
                <p className="text-xs text-slate-400">No managers assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignedManagersList.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 block">{a.user_name}</span>
                        <span className="text-[11px] text-slate-500">{a.user_email}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignment(a.user_id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Unassign"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
