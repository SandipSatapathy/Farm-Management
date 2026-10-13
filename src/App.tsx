import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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

  if (!isAuthenticated) {
    return <LoginPage />;
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
