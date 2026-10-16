import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ResourceCatalogPage } from './pages/ResourceCatalogPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { ManagerCheckinPage } from './pages/ManagerCheckinPage';
import { ManagerEquipmentPage } from './pages/ManagerEquipmentPage';
import { ManagerMaintenancePage } from './pages/ManagerMaintenancePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminResourcesPage } from './pages/AdminResourcesPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminAuditLogPage } from './pages/AdminAuditLogPage';

import { Resource } from './types';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<'landing' | 'login'>('landing');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedResourceForBooking, setSelectedResourceForBooking] = useState<Resource | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'STUDENT') {
        setCurrentTab('dashboard');
      } else if (user.role === 'RESOURCE_MANAGER') {
        setCurrentTab('manager-dashboard');
      } else if (user.role === 'COLLEGE_ADMIN') {
        setCurrentTab('admin-dashboard');
      }
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500">Initializing SlotSpot...</p>
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    if (view === 'landing') {
      return <LandingPage onGetStarted={() => setView('login')} />;
    }
    return <LoginPage onBackToLanding={() => setView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-brand-500 selection:text-white">
      <Navbar currentTab={currentTab} onNavigate={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Routes */}
        {user.role === 'STUDENT' && (
          <>
            {currentTab === 'dashboard' && (
              <StudentDashboard
                onNavigate={setCurrentTab}
                onSelectResourceForBooking={(r) => {
                  setSelectedResourceForBooking(r);
                  setCurrentTab('catalog');
                }}
              />
            )}
            {currentTab === 'catalog' && (
              <ResourceCatalogPage
                initialSelectedResource={selectedResourceForBooking}
                onClearInitialResource={() => setSelectedResourceForBooking(null)}
              />
            )}
            {currentTab === 'my-bookings' && <MyBookingsPage />}
          </>
        )}

        {/* Manager Routes */}
        {user.role === 'RESOURCE_MANAGER' && (
          <>
            {currentTab === 'manager-dashboard' && (
              <ManagerDashboard onNavigate={setCurrentTab} />
            )}
            {currentTab === 'manager-scanner' && <ManagerCheckinPage />}
            {currentTab === 'manager-equipment' && <ManagerEquipmentPage />}
            {currentTab === 'manager-maintenance' && <ManagerMaintenancePage />}
          </>
        )}

        {/* Admin Routes */}
        {user.role === 'COLLEGE_ADMIN' && (
          <>
            {currentTab === 'admin-dashboard' && <AdminDashboard />}
            {currentTab === 'admin-resources' && <AdminResourcesPage />}
            {currentTab === 'admin-users' && <AdminUsersPage />}
            {currentTab === 'admin-settings' && <AdminSettingsPage />}
            {currentTab === 'admin-audit' && <AdminAuditLogPage />}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <span>SlotSpot Campus Resource Booking SaaS • Built with zero-cost open source architecture</span>
        <span className="font-medium text-slate-600">Created and Developed by <strong className="text-brand-600 font-semibold">Shaurya Raghuvanshi</strong></span>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <MainAppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
