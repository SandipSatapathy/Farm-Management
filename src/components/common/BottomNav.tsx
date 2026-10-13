import React, { useState } from 'react';
import { ActiveTab } from './Sidebar';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Tractor,
  Menu,
  X,
  CreditCard,
  Wallet,
  Receipt,
  FileSpreadsheet,
  Lock,
  Share2,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { currentRole } = useAuth();

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    setIsMoreOpen(false);
  };

  const moreItems = [
    { id: 'payroll', label: 'Payroll & Wages', icon: CreditCard, roles: ['owner', 'admin', 'payroll', 'partner_viewer'] },
    { id: 'advances', label: 'Advances Ledger', icon: Wallet, roles: ['owner', 'admin', 'payroll', 'partner_viewer'] },
    { id: 'usage', label: 'Usage Logs', icon: Tractor, roles: ['owner', 'admin', 'supervisor', 'partner_viewer', 'tractor_operator'] },
    { id: 'expenses', label: 'Machinery Expenses', icon: Receipt, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer', 'tractor_operator'] },
    { id: 'reports', label: 'Reports & PDF', icon: FileSpreadsheet, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer'] },
    { id: 'fy-close', label: 'Financial Year Close', icon: Lock, roles: ['owner', 'admin', 'partner_viewer'] },
    { id: 'sheets', label: 'Google Sheets Sync', icon: Share2, roles: ['owner', 'admin'] },
    { id: 'qa-test', label: 'QA Verification', icon: CheckCircle2, roles: ['owner', 'admin', 'payroll', 'supervisor', 'partner_viewer'] },
    { id: 'settings', label: 'Farm Settings', icon: Sliders, roles: ['owner', 'admin'] },
  ].filter(i => i.roles.includes(currentRole));

  return (
    <>
      {/* Mobile Drawer Modal for "More" */}
      {isMoreOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 22, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 150,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: '24px 20px 40px 20px',
              boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.15)',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>
                All Modules
              </span>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="clay-btn clay-btn-secondary clay-btn-sm clay-btn-icon"
                style={{ width: 36, height: 36 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {moreItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id as ActiveTab)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '16px 10px',
                      borderRadius: 18,
                      border: isActive ? '2px solid #15803d' : '1px solid #e2ebe4',
                      background: isActive ? '#dcfce7' : '#f8faf8',
                      color: isActive ? '#14532d' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={22} color={isActive ? '#15803d' : '#4b6354'} />
                    <span style={{ textAlign: 'center' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <nav
        style={{
          position: 'fixed',
          bottom: 12,
          left: 12,
          right: 12,
          background: '#ffffff',
          borderRadius: 28,
          boxShadow: '0 8px 24px rgba(166, 184, 170, 0.4), inset 1px 1px 2px #ffffff',
          border: '2px solid rgba(220, 235, 224, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '8px 12px',
          zIndex: 100,
        }}
        className="mobile-bottom-nav"
      >
        <button
          onClick={() => handleSelect('dashboard')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'dashboard' ? '#15803d' : '#64748b',
            fontWeight: activeTab === 'dashboard' ? 700 : 500,
            fontSize: '0.72rem',
          }}
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleSelect('attendance')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'attendance' ? '#15803d' : '#64748b',
            fontWeight: activeTab === 'attendance' ? 700 : 500,
            fontSize: '0.72rem',
          }}
        >
          <CalendarCheck size={20} />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => handleSelect('labourers')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'labourers' ? '#15803d' : '#64748b',
            fontWeight: activeTab === 'labourers' ? 700 : 500,
            fontSize: '0.72rem',
          }}
        >
          <Users size={20} />
          <span>Labourers</span>
        </button>

        <button
          onClick={() => handleSelect('machinery')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'machinery' ? '#15803d' : '#64748b',
            fontWeight: activeTab === 'machinery' ? 700 : 500,
            fontSize: '0.72rem',
          }}
        >
          <Tractor size={20} />
          <span>Machinery</span>
        </button>

        <button
          onClick={() => setIsMoreOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: '#64748b',
            fontWeight: 500,
            fontSize: '0.72rem',
          }}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
