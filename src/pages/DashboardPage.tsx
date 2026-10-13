import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayBadge } from '../components/common/ClayBadge';
import {
  Users,
  CalendarCheck,
  CreditCard,
  Wallet,
  Tractor,
  Receipt,
  ArrowUpRight,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { ActiveTab } from '../components/common/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { farm, isReadOnlyPartner, canMutateOperations } = useAuth();
  const [stats, setStats] = useState({
    totalLabourers: 0,
    presentToday: 0,
    halfDayToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    totalOutstandingAdvances: 0,
    totalTractorHours: 0,
    totalMachineryExpenses: 0,
    currentWageEstimate: 0,
    unpaidPayrollBalance: 0
  });

  const today = '2026-10-13'; // Standard mock reference date

  useEffect(() => {
    const labourers = dataService.getLabourers(true);
    const todayAtt = dataService.getAttendanceForDate(today);

    const present = todayAtt.filter(a => a.status === 'present').length;
    const halfDay = todayAtt.filter(a => a.status === 'half_day').length;
    const absent = todayAtt.filter(a => a.status === 'absent').length;

    const advances = dataService.getAdvances();
    let totalAdvancesOutstanding = 0;
    labourers.forEach(l => {
      totalAdvancesOutstanding += dataService.getLabourerAdvanceBalance(l.id).outstanding;
    });

    const usage = dataService.getMachineryUsage();
    const totalMinutes = usage.reduce((s, u) => s + (u.duration_minutes || 0), 0);

    const expenses = dataService.getExpenses();
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);

    // Preview for current month
    const preview = dataService.previewPayroll('2026-10-01', '2026-10-31');

    // Unpaid payroll balance from periods
    const periods = dataService.getPayrollPeriods();
    let unpaid = 0;
    periods.forEach(p => {
      const lines = dataService.getPayrollLinesForPeriod(p.id);
      lines.forEach(l => {
        unpaid += (l.net_payable - l.paid_amount);
      });
    });

    setStats({
      totalLabourers: labourers.length,
      presentToday: present,
      halfDayToday: halfDay,
      absentToday: absent,
      attendanceRate: labourers.length > 0 ? Math.round(((present + halfDay * 0.5) / labourers.length) * 100) : 0,
      totalOutstandingAdvances: round2(totalAdvancesOutstanding),
      totalTractorHours: round2(totalMinutes / 60),
      totalMachineryExpenses: round2(totalExp),
      currentWageEstimate: round2(preview.totals.totalGross),
      unpaidPayrollBalance: round2(unpaid)
    });
  }, []);

  return (
    <div className="page-wrapper">
      {/* Top Banner */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', marginBottom: 6 }}>
              Namaste, Farm Operations Overview
            </h1>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.95rem' }}>
              Real-time summary of crew attendance, wage liabilities, tractor usage, and financial health for <strong>{farm.name}</strong>.
            </p>
          </div>

          {!isReadOnlyPartner && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <ClayButton
                variant="primary"
                icon={<CalendarCheck size={18} />}
                onClick={() => onNavigate('attendance')}
              >
                Mark Attendance
              </ClayButton>
              <ClayButton
                variant="secondary"
                icon={<CreditCard size={18} />}
                onClick={() => onNavigate('payroll')}
              >
                Payroll Preview
              </ClayButton>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-cols-4" style={{ marginBottom: 28 }}>
        {/* KPI 1: Attendance Today */}
        <div className="clay-kpi" onClick={() => onNavigate('attendance')} style={{ cursor: 'pointer' }}>
          <div className="clay-kpi-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Present Today
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'Outfit, sans-serif' }}>
              {stats.presentToday} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>/ {stats.totalLabourers}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
              {stats.attendanceRate}% turnout today
            </div>
          </div>
        </div>

        {/* KPI 2: Estimated Month Wages */}
        <div className="clay-kpi" onClick={() => onNavigate('payroll')} style={{ cursor: 'pointer' }}>
          <div className="clay-kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <CreditCard size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Gross Wage Liability
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'Outfit, sans-serif' }}>
              ₹{stats.currentWageEstimate.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
              October 2026 estimate
            </div>
          </div>
        </div>

        {/* KPI 3: Outstanding Advances */}
        <div className="clay-kpi" onClick={() => onNavigate('advances')} style={{ cursor: 'pointer' }}>
          <div className="clay-kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Wallet size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Outstanding Advances
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'Outfit, sans-serif' }}>
              ₹{stats.totalOutstandingAdvances.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, marginTop: 2 }}>
              Recoverable via payroll
            </div>
          </div>
        </div>

        {/* KPI 4: Tractor Hours & Expenses */}
        <div className="clay-kpi" onClick={() => onNavigate('machinery')} style={{ cursor: 'pointer' }}>
          <div className="clay-kpi-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <Tractor size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Machinery Operations
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'Outfit, sans-serif' }}>
              {stats.totalTractorHours} hrs
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: 600, marginTop: 2 }}>
              ₹{stats.totalMachineryExpenses.toLocaleString('en-IN')} operating expenses
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Operations Breakdown & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Today's Attendance Snapshot */}
        <ClayCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Today's Crew Breakdown ({today})</h3>
            <ClayButton variant="secondary" size="sm" onClick={() => onNavigate('attendance')}>
              View Register
            </ClayButton>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: 14, background: '#f4fbf5', borderRadius: 16, border: '1px solid #d1fae5', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{stats.presentToday}</div>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Present (1.0)</div>
            </div>
            <div style={{ flex: 1, padding: 14, background: '#fffbeb', borderRadius: 16, border: '1px solid #fef3c7', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{stats.halfDayToday}</div>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>Half Day (0.5)</div>
            </div>
            <div style={{ flex: 1, padding: 14, background: '#fef2f2', borderRadius: 16, border: '1px solid #fee2e2', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b91c1c' }}>{stats.absentToday}</div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Absent / Leave</div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Attendance records prevent duplicate entries per shift and enforce supervisor correction reasons for audits.
          </div>
        </ClayCard>

        {/* Machinery Operations Spotlight */}
        <ClayCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Machinery & Fuel Status</h3>
            <ClayButton variant="secondary" size="sm" onClick={() => onNavigate('usage')}>
              Usage Logs
            </ClayButton>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8faf8', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tractor size={18} color="#15803d" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mahindra 575 DI (TRC-01)</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#14532d' }}>1,285.2 hrs</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8faf8', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tractor size={18} color="#15803d" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>John Deere 5050D (TRC-02)</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#14532d' }}>852.5 hrs</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8faf8', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Receipt size={18} color="#d97706" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Diesel Refuels (October)</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#b45309' }}>₹3,600 (40L)</span>
            </div>
          </div>
        </ClayCard>
      </div>

      {/* Financial Year Archiving & Compliance Bar */}
      <ClayCard style={{ background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', border: '2px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#14532d' }}>
                Financial Year Compliance (FY 2026–27)
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b6354' }}>
                All records adhere to Indian statutory period (1 Apr 2026 – 31 Mar 2027). Year-end close locks records with zero hard deletion.
              </p>
            </div>
          </div>

          <ClayButton
            variant="accent"
            size="sm"
            onClick={() => onNavigate('fy-close')}
          >
            Review FY Status
          </ClayButton>
        </div>
      </ClayCard>
    </div>
  );
};
