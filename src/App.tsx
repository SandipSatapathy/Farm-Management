import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { dataService } from './lib/dataService';
import { Navbar } from './components/common/Navbar';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { SimpleFarmViewPage } from './pages/SimpleFarmViewPage';
import { DashboardPage } from './pages/DashboardPage';
import { LabourersPage } from './pages/LabourersPage';
import { AttendancePage } from './pages/AttendancePage';
import { PayrollPage } from './pages/PayrollPage';
import { AdvancesPage } from './pages/AdvancesPage';
import { MachineryPage } from './pages/MachineryPage';
import { MachineryUsagePage } from './pages/MachineryUsagePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { FinancialYearClosePage } from './pages/FinancialYearClosePage';
import { GoogleSheetsPage } from './pages/GoogleSheetsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { QAVerificationPage } from './pages/QAVerificationPage';
import { SettingsPage } from './pages/SettingsPage';

export const AppContent: React.FC = () => {
  const { isAuthenticated, viewAccess } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [, setSyncTick] = useState(0);

  useEffect(() => {
    let isMounted = true;
    dataService.initDatabaseSync().finally(() => {
      if (isMounted) setIsInitialLoading(false);
    });

    const unsubscribeRealtime = dataService.initRealtimeSync();

    const handleDataUpdated = () => {
      setSyncTick(t => t + 1);
    };

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        dataService.fetchLiveAll();
      }
    }, 3000);

    window.addEventListener('farmlog-data-updated', handleDataUpdated);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('farmlog-data-updated', handleDataUpdated);
      if (typeof unsubscribeRealtime === 'function') {
        unsubscribeRealtime();
      }
    };
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isInitialLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg, #f8fafc)',
        padding: 24,
        textAlign: 'center'
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '4px solid #bbf7d0',
          borderTopColor: '#16a34a',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 16
        }} />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', margin: '0 0 6px 0' }}>
          Connecting to Cloud Server...
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
          Synchronizing live farm records from Supabase
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 1. Simpler View User: strictly sees ONLY the Simple Farm Routine
  if (viewAccess === 'simple') {
    return (
      <div className="app-container" style={{ display: 'block', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <Navbar />
        <main style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          <SimpleFarmViewPage />
        </main>
      </div>
    );
  }

  // 2. Advanced View User: sees the full management suite + can also view simple routine
  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 65px)' }}>
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        <main className="main-content">
          {activeTab === 'simple-view' && <SimpleFarmViewPage />}
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'labourers' && <LabourersPage />}
          {activeTab === 'attendance' && <AttendancePage />}
          {activeTab === 'payroll' && <PayrollPage />}
          {activeTab === 'advances' && <AdvancesPage />}
          {activeTab === 'machinery' && <MachineryPage />}
          {activeTab === 'usage' && <MachineryUsagePage />}
          {activeTab === 'expenses' && <ExpensesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'fy-close' && <FinancialYearClosePage />}
          {activeTab === 'sheets' && <GoogleSheetsPage />}
          {activeTab === 'audit' && <AuditLogPage />}
          {activeTab === 'qa-test' && <QAVerificationPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
      {activeTab !== 'simple-view' && <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
