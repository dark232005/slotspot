import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Badge } from './Badge';
import {
  CalendarDays,
  Bell,
  LogOut,
  UserCheck,
  CheckCircle,
  QrCode,
  ShieldAlert,
  BarChart3,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & College Name */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:bg-brand-700 transition-colors">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  SlotSpot
                  <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-sm">
                    SaaS
                  </span>
                </span>
                <span className="text-[11px] font-medium text-slate-400 block -mt-0.5">
                  {user.college_name || 'Campus Resource Booking'}
                </span>
              </div>
            </button>
          </div>

          {/* Center Navigation Links based on Role */}
          <nav className="hidden md:flex items-center space-x-1">
            {user.role === 'STUDENT' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'dashboard'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate('catalog')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'catalog'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Browse Resources
                </button>
                <button
                  onClick={() => onNavigate('my-bookings')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'my-bookings'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Bookings
                </button>
              </>
            )}

            {user.role === 'RESOURCE_MANAGER' && (
              <>
                <button
                  onClick={() => onNavigate('manager-dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'manager-dashboard'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => onNavigate('manager-scanner')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentTab === 'manager-scanner'
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-brand-600" />
                  QR Check-in
                </button>
                <button
                  onClick={() => onNavigate('manager-equipment')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'manager-equipment'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Equipment Issue/Return
                </button>
                <button
                  onClick={() => onNavigate('manager-maintenance')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'manager-maintenance'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Maintenance
                </button>
              </>
            )}

            {user.role === 'COLLEGE_ADMIN' && (
              <>
                <button
                  onClick={() => onNavigate('admin-dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin-dashboard'
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-brand-600" />
                  Analytics
                </button>
                <button
                  onClick={() => onNavigate('admin-resources')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-resources'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Resources
                </button>
                <button
                  onClick={() => onNavigate('admin-users')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-users'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => onNavigate('admin-settings')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-settings'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Policies
                </button>
                <button
                  onClick={() => onNavigate('admin-audit')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-audit'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Audit Log
                </button>
              </>
            )}
          </nav>

          {/* Right: Notifications, Demo Switcher, User Menu */}
          <div className="flex items-center space-x-3">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
                title="Switch demo persona for testing"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Demo Persona</span>
                <ChevronDown className="w-3 h-3 text-amber-600" />
              </button>

              {showDemoMenu && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-slate-100 z-50 p-1 animate-in fade-in duration-100"
                  onClick={() => setShowDemoMenu(false)}
                >
                  <div className="p-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      College A: Apex Tech
                    </p>
                    <button
                      onClick={() => switchDemoUser('student@apex.edu')}
                      className="w-full text-left mt-1 px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Aarav Sharma</span>
                      <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-1.5 py-0.5 rounded">
                        Student
                      </span>
                    </button>
                    <button
                      onClick={() => switchDemoUser('manager@apex.edu')}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Prof. Sunita Mehta</span>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        Room Mgr
                      </span>
                    </button>
                    <button
                      onClick={() => switchDemoUser('equipment@apex.edu')}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Karan Verma</span>
                      <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                        Equip Mgr
                      </span>
                    </button>
                    <button
                      onClick={() => switchDemoUser('admin@apex.edu')}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Dr. Vikram Rao</span>
                      <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    </button>
                  </div>

                  <div className="p-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      College B: Metro Eng (Isolation Test)
                    </p>
                    <button
                      onClick={() => switchDemoUser('student@metro.edu')}
                      className="w-full text-left mt-1 px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Rohan Verma</span>
                      <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-1.5 py-0.5 rounded">
                        Metro Student
                      </span>
                    </button>
                    <button
                      onClick={() => switchDemoUser('admin@metro.edu')}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Dean H. Walker</span>
                      <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                        Metro Admin
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-2xl shadow-xl bg-white border border-slate-200 z-50 p-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Notifications ({unreadCount})
                    </h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAllRead => markAllAsRead()}
                        className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && markAsRead(n.id)}
                          className={`p-3 text-left transition-colors cursor-pointer rounded-lg ${
                            n.is_read ? 'opacity-60 bg-transparent' : 'bg-brand-50/50 hover:bg-brand-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill and Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {user.full_name}
                </span>
                <span className="mt-0.5 inline-block">
                  <Badge status={user.role} size="sm" />
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
