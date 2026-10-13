import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sprout,
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  Wallet,
  Tractor,
  Clock,
  Receipt,
  FileSpreadsheet,
  Lock,
  Share2,
  History,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export type ActiveTab =
  | 'simple-view'
  | 'dashboard'
  | 'labourers'
  | 'attendance'
  | 'payroll'
  | 'advances'
  | 'machinery'
  | 'usage'
  | 'expenses'
  | 'reports'
  | 'fy-close'
  | 'sheets'
  | 'audit'
  | 'qa-test'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { currentRole } = useAuth();

  const navItems = [
    { id: 'simple-view', label: 'Simple Farm Routine', icon: Sprout, roles: ['owner', 'admin'] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer', 'tractor_operator'] },
    { id: 'labourers', label: 'Labour Directory', icon: Users, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer'] },
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer'] },
    { id: 'payroll', label: 'Payroll & Wages', icon: CreditCard, roles: ['owner', 'admin', 'payroll', 'partner_viewer'] },
    { id: 'advances', label: 'Advances Ledger', icon: Wallet, roles: ['owner', 'admin', 'payroll', 'partner_viewer'] },
    { id: 'machinery', label: 'Machinery Register', icon: Tractor, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer', 'tractor_operator'] },
    { id: 'usage', label: 'Tractor Usage Logs', icon: Clock, roles: ['owner', 'admin', 'supervisor', 'partner_viewer', 'tractor_operator'] },
    { id: 'expenses', label: 'Machinery Expenses', icon: Receipt, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer', 'tractor_operator'] },
    { id: 'reports', label: 'Reports & PDF', icon: FileSpreadsheet, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer'] },
    { id: 'fy-close', label: 'Financial Year Close', icon: Lock, roles: ['owner', 'admin', 'partner_viewer'] },
    { id: 'sheets', label: 'Google Sheets Sync', icon: Share2, roles: ['owner', 'admin'] },
    { id: 'audit', label: 'Audit Trail', icon: History, roles: ['owner', 'admin'] },
    { id: 'qa-test', label: 'QA Verification', icon: CheckCircle2, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer'] },
    { id: 'settings', label: 'Farm Settings', icon: Sliders, roles: ['owner', 'admin'] },
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <aside
      style={{
        width: 260,
        background: '#ffffff',
        borderRight: '2px solid rgba(220, 235, 224, 0.8)',
        padding: '20px 14px',
        display: 'none',
        flexDirection: 'column',
        gap: 6,
        boxShadow: '4px 0 16px rgba(166, 184, 170, 0.1)',
        overflowY: 'auto',
      }}
      className="desktop-sidebar"
    >
      <div style={{ padding: '0 8px 12px 8px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Main Navigation
      </div>

      {visibleItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id as ActiveTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 16,
              border: isActive ? '2px solid #bbf7d0' : '2px solid transparent',
              background: isActive
                ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)'
                : 'transparent',
              color: isActive ? '#14532d' : 'var(--color-text-muted)',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: isActive ? 700 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '4px 4px 10px rgba(166, 184, 170, 0.25), inset 1px 1px 2px #ffffff' : 'none',
            }}
          >
            <Icon size={19} color={isActive ? '#15803d' : '#4b6354'} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};
