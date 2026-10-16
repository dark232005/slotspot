import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsReport } from '../types';
import { StatCard } from '../components/StatCard';
import { useNotifications } from '../context/NotificationContext';
import {
  BarChart3,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  TrendingUp,
  Percent,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { showToast } = useNotifications();
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAnalytics(14);
      setReport(data);
    } catch (err: any) {
      showToast(`Failed to load analytics: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.downloadCsvReport();
      showToast('Bookings CSV exported successfully.', 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !report) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const { overview, daily_utilization, top_resources, peak_periods } = report;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 tracking-tight">College Analytics & Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real metrics derived directly from database transactions. Zero artificial statistics.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Exporting...' : 'Export Bookings as CSV'}</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Resources"
          value={`${overview.active_resources} / ${overview.total_resources}`}
          subtitle="Available in college catalog"
          icon={<Layers className="w-5 h-5 text-brand-600" />}
        />
        <StatCard
          title="Today's Bookings"
          value={overview.today_bookings}
          subtitle="Scheduled for today"
          icon={<Calendar className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Cancellation Rate"
          value={`${overview.cancellation_rate_percentage}%`}
          subtitle="Student-cancelled bookings"
          icon={<XCircle className="w-5 h-5 text-amber-600" />}
          trend={`${overview.cancellation_rate_percentage}%`}
          trendPositive={overview.cancellation_rate_percentage <= 15}
        />
        <StatCard
          title="No-Show Rate"
          value={`${overview.no_show_rate_percentage}%`}
          subtitle="Released automatically after grace"
          icon={<Percent className="w-5 h-5 text-rose-600" />}
          trend={`${overview.no_show_rate_percentage}%`}
          trendPositive={overview.no_show_rate_percentage <= 10}
        />
      </div>

      {/* Daily Utilization Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              14-Day Resource Utilization Rate
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated as: (Total reserved minutes ÷ Available operating minutes) × 100
            </p>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="mt-4 flex items-end gap-2 h-44 pt-6 pb-2 border-b border-slate-100">
          {daily_utilization.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                {item.date_str}: {item.utilization_percentage}% ({item.reserved_minutes} mins)
              </div>
              <div
                style={{ height: `${Math.max(item.utilization_percentage, 4)}%` }}
                className={`w-full max-w-[32px] rounded-t-md transition-all ${
                  item.utilization_percentage > 50
                    ? 'bg-brand-600'
                    : item.utilization_percentage > 20
                    ? 'bg-brand-400'
                    : 'bg-slate-200'
                }`}
              />
              <span className="text-[10px] font-mono text-slate-400 truncate w-full text-center">
                {item.date_str.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Breakdown: Most Popular Resources & Peak Booking Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Popular Resources */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Most Booked Resources</h3>
          <div className="space-y-3">
            {top_resources.length === 0 ? (
              <p className="text-xs text-slate-400">No booking records yet.</p>
            ) : (
              top_resources.map((res, i) => (
                <div key={res.resource_id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{res.resource_name}</span>
                      <span className="text-[10px] text-slate-400">{res.resource_type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900">{res.booking_count} bookings</span>
                    <span className="text-[10px] text-slate-400 block">{res.total_reserved_minutes} total mins</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Peak Booking Hours */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Peak Operating Hours (8:00 - 20:00)</h3>
          <div className="space-y-2">
            {peak_periods.map((p) => {
              const maxCount = Math.max(...peak_periods.map((x) => x.booking_count), 1);
              const barWidth = Math.round((p.booking_count / maxCount) * 100);
              return (
                <div key={p.hour} className="flex items-center text-xs gap-3">
                  <span className="w-12 font-mono text-slate-500 font-medium text-[11px]">{p.hour_label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="bg-brand-500 h-full rounded-full transition-all"
                    />
                  </div>
                  <span className="w-8 text-right font-semibold text-slate-700 text-[11px]">
                    {p.booking_count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
