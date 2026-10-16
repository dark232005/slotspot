import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { ShieldAlert, RefreshCw, Clock, User, Layers } from 'lucide-react';

export const AdminAuditLogPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(100);
      setLogs(data);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatActionBadge = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (action.includes('CANCELLED')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (action.includes('RELEASED') || action.includes('NO_SHOW'))
      return 'bg-rose-50 text-rose-800 border-rose-200';
    if (action.includes('CHECK_IN')) return 'bg-blue-50 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">System Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of reservation creations, check-ins, automatic no-show releases, and policy updates.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
          No audit events recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border ${formatActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      Target: {log.target_type} ({log.target_id.slice(0, 8)}...)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Actor: <strong className="text-slate-700">{log.user_name || 'System Process'}</strong>
                  </span>
                </div>

                {log.details && (
                  <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap">
                    {log.details}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
