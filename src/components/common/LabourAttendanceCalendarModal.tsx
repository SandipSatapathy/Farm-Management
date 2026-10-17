import React, { useState, useEffect } from 'react';
import { Labourer, AttendanceStatus, MonthlyAttendanceSummary, AttendanceRecord, SalarySettlement } from '../../types';
import { dataService, round2 } from '../../lib/dataService';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Coffee,
  Wallet,
  DollarSign,
  ArrowRight,
  Receipt,
  CreditCard,
  Check
} from 'lucide-react';

interface LabourAttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  labourer: Labourer | null;
  onAdvanceClick?: (labourerId: string) => void;
  onAttendanceUpdated?: () => void;
}

export const LabourAttendanceCalendarModal: React.FC<LabourAttendanceCalendarModalProps> = ({
  isOpen,
  onClose,
  labourer,
  onAdvanceClick,
  onAttendanceUpdated
}) => {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-indexed
  const todayStr = now.toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [data, setData] = useState<{
    records: Record<string, AttendanceRecord>;
    summary: MonthlyAttendanceSummary;
  } | null>(null);
  const [settlements, setSettlements] = useState<SalarySettlement[]>([]);
  const [advanceBal, setAdvanceBal] = useState<{ totalIssued: number; totalRecovered: number; outstanding: number }>({
    totalIssued: 0,
    totalRecovered: 0,
    outstanding: 0
  });

  const loadMonthData = () => {
    if (!labourer) return;
    const res = dataService.getLabourerMonthlyAttendance(labourer.id, currentYear, currentMonth);
    setData(res);
    setSettlements(dataService.getSalarySettlements());
    setAdvanceBal(dataService.getLabourerAdvanceBalance(labourer.id));
  };

  useEffect(() => {
    if (isOpen && labourer) {
      loadMonthData();
      setSelectedDate(todayStr);
    }
  }, [isOpen, labourer, currentYear, currentMonth]);

  if (!isOpen || !labourer || !data) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleResetToCurrent = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth() + 1);
    setSelectedDate(n.toLocaleDateString('en-CA'));
  };

  // Month metadata
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', {
    month: 'long'
  });
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun, 1 = Mon
  const leadingBlanks = (firstDayOfWeek + 6) % 7; // Monday start index 0..6

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Toggle or update status for selected date
  const handleStatusChange = (status: AttendanceStatus) => {
    if (!selectedDate) return;
    dataService.updateSingleDayAttendance(labourer.id, selectedDate, status);
    loadMonthData();
    onAttendanceUpdated?.();
  };

  const selectedRec = selectedDate ? data.records[selectedDate] : undefined;
  const isSelectedSunday = selectedDate ? new Date(selectedDate).getDay() === 0 : false;
  const isSelectedFuture = selectedDate ? selectedDate > todayStr : false;

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div
        className="clay-modal clay-modal-calendar"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Pinned Header Profile Ribbon */}
        <div className="clay-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                boxShadow: '2px 2px 6px rgba(166, 184, 170, 0.3)',
                border: '2px solid #86efac',
                flexShrink: 0
              }}
            >
              {labourer.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#143823', fontWeight: 800 }}>
                  {labourer.full_name}
                </h2>
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {labourer.labour_code}
                </span>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  ₹{labourer.base_rate}/day
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 3,
                  fontSize: '0.82rem',
                  color: '#4b6354',
                  flexWrap: 'wrap'
                }}
              >
                {labourer.work_category && <span>{labourer.work_category}</span>}
                {labourer.phone && (
                  <a
                    href={`tel:${labourer.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#15803d',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    <Phone size={13} /> {labourer.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="clay-btn clay-btn-secondary clay-btn-sm clay-btn-icon"
            style={{ width: 36, height: 36, flexShrink: 0 }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="clay-modal-scroll-body">
        {/* Month Navigation Bar */}
        <div className="cal-header-bar">
          <button
            onClick={handlePrevMonth}
            className="clay-btn clay-btn-secondary clay-btn-sm"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={18} color="#15803d" />
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#143823' }}>
              {monthName} {currentYear}
            </span>
            {(currentYear !== new Date().getFullYear() || currentMonth !== (new Date().getMonth() + 1)) && (
              <button
                onClick={handleResetToCurrent}
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  border: 'none',
                  borderRadius: 12,
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="clay-btn clay-btn-secondary clay-btn-sm"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        {/* Legend Bar */}
        <div className="cal-legend-bar">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#15803d'
              }}
            />
            Present (P)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#d97706'
              }}
            />
            Half-Day (HD)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#dc2626'
              }}
            />
            Absent / Leave (A)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#64748b'
              }}
            />
            Weekly Off (Sunday)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#cbd5e1'
              }}
            />
            Future / Unmarked
          </span>
        </div>

        {/* Calendar Weekday Headers */}
        <div className="cal-weekdays-grid">
          {weekdays.map((wd, i) => (
            <div
              key={wd}
              className="cal-weekday-label"
              style={{ color: i === 6 ? '#b91c1c' : undefined }}
            >
              <span className="cal-badge-desktop">{wd}</span>
              <span className="cal-badge-mobile">{wd.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="cal-days-grid">
          {/* Leading blank tiles */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div
              key={`blank-${i}`}
              style={{ minHeight: 44, background: 'transparent' }}
            />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;
            const dayOfWeek = new Date(currentYear, currentMonth - 1, dayNum).getDay();
            const isSunday = dayOfWeek === 0;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const isSelected = selectedDate === dateStr;

            const rec = data.records[dateStr];
            let cellStatusClass = 'cal-day-cell';
            let badgeTextDesktop = '—';
            let badgeTextMobile = '—';
            let badgeClass = 'cal-day-status-badge';

            if (isToday) cellStatusClass += ' today';
            if (isSelected) cellStatusClass += ' selected';

            if (rec) {
              if (rec.status === 'present') {
                cellStatusClass += ' status-present';
                badgeTextDesktop = 'P (8h)';
                badgeTextMobile = 'P';
                badgeClass += ' cal-status-p';
              } else if (rec.status === 'half_day') {
                cellStatusClass += ' status-half_day';
                badgeTextDesktop = 'HD (4h)';
                badgeTextMobile = 'HD';
                badgeClass += ' cal-status-hd';
              } else if (rec.status === 'leave' || rec.status === 'absent') {
                if (isSunday || rec.task_name?.includes('Sunday')) {
                  cellStatusClass += ' status-sunday';
                  badgeTextDesktop = 'Off';
                  badgeTextMobile = 'Off';
                  badgeClass += ' cal-status-off';
                } else {
                  cellStatusClass += ' status-absent';
                  badgeTextDesktop = 'A (0h)';
                  badgeTextMobile = 'A';
                  badgeClass += ' cal-status-a';
                }
              }
            } else if (isSunday) {
              cellStatusClass += ' status-sunday';
              badgeTextDesktop = 'Off';
              badgeTextMobile = 'Off';
              badgeClass += ' cal-status-off';
            } else if (isFuture) {
              cellStatusClass += ' future';
              badgeTextDesktop = '—';
              badgeTextMobile = '—';
              badgeClass += ' cal-status-none';
            } else {
              badgeTextDesktop = '—';
              badgeTextMobile = '—';
              badgeClass += ' cal-status-none';
            }

            return (
              <div
                key={dateStr}
                className={cellStatusClass}
                onClick={() => setSelectedDate(dateStr)}
                title={`${dateStr}: ${badgeTextDesktop}`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0 2px'
                  }}
                >
                  <span
                    className="cal-day-num"
                    style={{
                      color: isSunday ? '#dc2626' : undefined,
                      fontWeight: isToday ? 900 : 700
                    }}
                  >
                    {dayNum}
                  </span>
                  {isToday && (
                    <span
                      style={{
                        background: '#15803d',
                        color: '#ffffff',
                        fontSize: '0.55rem',
                        fontWeight: 900,
                        padding: '1px 3px',
                        borderRadius: 3
                      }}
                    >
                      NOW
                    </span>
                  )}
                </div>

                <div className={badgeClass}>
                  <span className="cal-badge-desktop">{badgeTextDesktop}</span>
                  <span className="cal-badge-mobile">{badgeTextMobile}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Quick Inspector & Adjustment */}
        {selectedDate && (
          <div
            style={{
              background: '#f8faf8',
              borderRadius: 16,
              padding: '12px 16px',
              border: '1.5px solid rgba(226, 232, 240, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#143823' }}>
                📅 {new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#4b6354', marginTop: 2 }}>
                {selectedRec ? (
                  <span>
                    Status:{' '}
                    <strong>
                      {selectedRec.status === 'present'
                        ? 'Present (8 hrs Full Shift)'
                        : selectedRec.status === 'half_day'
                        ? 'Half-Day (4 hrs Shift)'
                        : isSelectedSunday
                        ? 'Sunday (Weekly Rest)'
                        : 'Absent / Leave'}
                    </strong>
                    {selectedRec.field_name && ` • ${selectedRec.field_name}`}
                  </span>
                ) : isSelectedSunday ? (
                  <span>Weekly Sunday Off</span>
                ) : isSelectedFuture ? (
                  <span style={{ color: '#94a3b8' }}>Future date — no attendance recorded yet</span>
                ) : (
                  <span style={{ color: '#d97706' }}>Not marked yet</span>
                )}
              </div>
            </div>

            {/* Quick 1-tap toggles for this day */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleStatusChange('present')}
                className={`clay-btn clay-btn-sm ${
                  selectedRec?.status === 'present' ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
              >
                Present
              </button>
              <button
                onClick={() => handleStatusChange('half_day')}
                className={`clay-btn clay-btn-sm ${
                  selectedRec?.status === 'half_day' ? 'clay-btn-warning' : 'clay-btn-secondary'
                }`}
                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
              >
                Half-Day
              </button>
              <button
                onClick={() => handleStatusChange('leave')}
                className={`clay-btn clay-btn-sm ${
                  selectedRec?.status === 'leave' || selectedRec?.status === 'absent'
                    ? 'clay-btn-danger'
                    : 'clay-btn-secondary'
                }`}
                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
              >
                Absent
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            THE NUMBERS SECTION BELOW THE CALENDAR (User's Exact Requirement)
            ================================================================ */}
        {/* ================================================================
            THE NUMBERS SECTION BELOW THE CALENDAR (User's Exact Requirement)
            ================================================================ */}
        {(() => {
          const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
          const daysInMonthCount = new Date(currentYear, currentMonth, 0).getDate();
          const monthStartDate = `${monthPrefix}-01`;
          const monthEndDate = `${monthPrefix}-${String(daysInMonthCount).padStart(2, '0')}`;

          const workerMonthSettlements = settlements.filter((s) => {
            if (s.labourer_id !== labourer.id) return false;
            if ((s as any).status === 'cancelled') return false;
            const sStart = s.start_date || `${s.year}-${String(s.month).padStart(2, '0')}-01`;
            const sEnd = s.end_date || `${s.year}-${String(s.month).padStart(2, '0')}-31`;
            const overlaps = sStart <= monthEndDate && sEnd >= monthStartDate;
            const isThisMonth = s.year === currentYear && s.month === currentMonth;
            return overlaps || isThisMonth;
          });

          const effectiveDays = data.summary.effectiveDays;
          const dailyRate = labourer.base_rate;
          const grossEarned = round2(effectiveDays * dailyRate);

          const advanceDeductedInSettlements = round2(
            workerMonthSettlements.reduce((sum, s) => sum + (Number(s.advance_deducted) || 0), 0)
          );
          const totalPaidInMonth = round2(
            workerMonthSettlements.reduce((sum, s) => sum + (Number(s.paid_amount) || 0), 0)
          );
          const settledDaysCount = round2(
            workerMonthSettlements.reduce((sum, s) => sum + (Number(s.days_worked) || 0), 0)
          );
          const settledGrossAmount = round2(
            workerMonthSettlements.reduce((sum, s) => sum + (Number(s.gross_wage) || 0), 0)
          );

          const advanceKhataOutstanding = advanceBal.outstanding;
          const unsettledGross = round2(Math.max(0, grossEarned - settledGrossAmount));
          const applicableAdvOnUnsettled = round2(Math.min(unsettledGross, advanceKhataOutstanding));

          let remainingNetDue = 0;
          if (effectiveDays > 0) {
            if (settledDaysCount >= effectiveDays) {
              remainingNetDue = 0;
            } else if (workerMonthSettlements.length === 0) {
              remainingNetDue = round2(Math.max(0, grossEarned - Math.min(grossEarned, advanceKhataOutstanding)));
            } else {
              remainingNetDue = round2(Math.max(0, unsettledGross - applicableAdvOnUnsettled));
            }
          }

          const isMonthSettled = effectiveDays > 0 && remainingNetDue === 0 && (totalPaidInMonth > 0 || advanceDeductedInSettlements >= grossEarned);

          return (
            <div className="cal-numbers-container">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="#15803d" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#143823', fontWeight: 800 }}>
                    Attendance & Wage Numbers for {monthName} {currentYear}
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#4b6354',
                    fontWeight: 600
                  }}
                >
                  Calculated till today ({todayStr})
                </span>
              </div>

              {/* 4 Attendance Counters Grid */}
              <div className="cal-numbers-grid">
                <div className="cal-stat-card present">
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#15803d',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Total Present
                  </span>
                  <div className="cal-stat-val" style={{ color: '#15803d' }}>
                    {data.summary.presentDays}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Days</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#166534', marginTop: 2 }}>
                    {data.summary.presentDays * 8} full working hours
                  </span>
                </div>

                <div className="cal-stat-card half-day">
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#b45309',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Half-Days
                  </span>
                  <div className="cal-stat-val" style={{ color: '#b45309' }}>
                    {data.summary.halfDays}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Days</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#92400e', marginTop: 2 }}>
                    = {data.summary.halfDays * 0.5} effective pay days
                  </span>
                </div>

                <div className="cal-stat-card absent">
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#b91c1c',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Total Absent / Leave
                  </span>
                  <div className="cal-stat-val" style={{ color: '#b91c1c' }}>
                    {data.summary.absentDays}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Days</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: 2 }}>
                    Unpaid leave taken
                  </span>
                </div>

                <div className="cal-stat-card effective">
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#047857',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Effective Paid Days
                  </span>
                  <div className="cal-stat-val" style={{ color: '#047857' }}>
                    {data.summary.effectiveDays}{' '}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Days</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#065f46', marginTop: 2 }}>
                    {data.summary.presentDays} + ({data.summary.halfDays} × 0.5)
                  </span>
                </div>
              </div>

              {/* Financial Calculation Summary Ribbon (4 Columns) */}
              <div className="cal-finance-ribbon" style={{ marginBottom: 16 }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#166534',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Gross Earned This Month
                  </span>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: '#143823',
                      fontFamily: 'Outfit',
                      marginTop: 2
                    }}
                  >
                    ₹{grossEarned.toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#4b6354' }}>
                    {effectiveDays} shifts × ₹{dailyRate}/day
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#b45309',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Advance Deducted
                  </span>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: advanceDeductedInSettlements > 0 ? '#b45309' : '#143823',
                      fontFamily: 'Outfit',
                      marginTop: 2
                    }}
                  >
                    ₹{advanceDeductedInSettlements.toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#78350f' }}>
                    Deducted in {monthName} payouts • Khata Due: ₹{advanceKhataOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Already Disbursed
                  </span>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: totalPaidInMonth > 0 ? '#1d4ed8' : '#64748b',
                      fontFamily: 'Outfit',
                      marginTop: 2
                    }}
                  >
                    ₹{totalPaidInMonth.toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#1e40af' }}>
                    {workerMonthSettlements.length > 0 ? `Paid in ${workerMonthSettlements.length} settlement${workerMonthSettlements.length > 1 ? 's' : ''}` : 'No payouts disbursed yet'}
                  </span>
                </div>

                <div
                  style={{
                    borderLeft: '2px dashed rgba(21, 128, 61, 0.3)',
                    paddingLeft: 14
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: isMonthSettled ? '#15803d' : (remainingNetDue > 0 ? '#b45309' : '#143823'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Remaining Due
                  </span>
                  <div
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 900,
                      color: isMonthSettled ? '#15803d' : (remainingNetDue > 0 ? '#d97706' : '#15803d'),
                      fontFamily: 'Outfit',
                      marginTop: 2
                    }}
                  >
                    ₹{remainingNetDue.toLocaleString('en-IN')}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: isMonthSettled ? '#166534' : '#64748b', fontWeight: 700 }}>
                    {isMonthSettled ? '✓ Fully Settled (₹0 Due)' : (remainingNetDue === 0 ? 'All Clear' : 'Gross − Adv Ded − Paid')}
                  </span>
                </div>
              </div>

              {/* Settlement History Slip for this Worker in this Month */}
              <div style={{ marginTop: 14, background: '#ffffff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Receipt size={16} color="#15803d" />
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#143823' }}>
                      Settlement & Payout Slips for {monthName} {currentYear}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    {workerMonthSettlements.length} payout record{workerMonthSettlements.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {workerMonthSettlements.length === 0 ? (
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} color="#94a3b8" />
                    <span>
                      No salary payouts disbursed yet for {monthName} {currentYear}.{' '}
                      {effectiveDays > 0 ? `Current pending take-home: ₹${remainingNetDue.toLocaleString('en-IN')}` : 'No shifts recorded.'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {workerMonthSettlements.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                              🗓️ {s.period_type === 'weekly' ? 'Weekly Settlement' : (s.period_type === 'monthly' ? 'Monthly Settlement' : 'Custom Settlement')} ({s.start_date} to {s.end_date})
                            </span>
                            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem', fontWeight: 800, padding: '1px 6px', borderRadius: 6 }}>
                              ✓ Paid ₹{s.paid_amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 3 }}>
                            Shifts: <strong>{s.days_worked} days</strong> • Gross: <strong>₹{s.gross_wage?.toLocaleString('en-IN')}</strong> • Adv Ded: <strong>₹{s.advance_deducted?.toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                            Given By: <strong>👤 {s.given_by || 'Supervisor'}</strong> • Mode: <strong>{(s.payment_method || 'cash').toUpperCase()}</strong> • Date: {s.payment_date || new Date(s.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Worker Advance Khata Summary */}
              <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={16} color="#b45309" />
                  <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700 }}>
                    Advance Khata:
                  </span>
                  <span style={{ fontSize: '0.78rem', color: advanceKhataOutstanding > 0 ? '#b45309' : '#15803d', fontWeight: 800 }}>
                    {advanceKhataOutstanding > 0 ? `₹${advanceKhataOutstanding.toLocaleString('en-IN')} Outstanding Due` : '✓ Clear (₹0 Due)'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Total Issued: ₹{advanceBal.totalIssued.toLocaleString('en-IN')} • Repaid / Deducted: ₹{advanceBal.totalRecovered.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          );
        })()}

        </div>
        {/* End of Scrollable Body Container */}

        {/* Pinned Modal Action Footer */}
        <div className="clay-modal-footer">
          <div style={{ display: 'flex', gap: 10 }}>
            {onAdvanceClick && (
              <button
                onClick={() => {
                  onClose();
                  onAdvanceClick(labourer.id);
                }}
                className="clay-btn clay-btn-secondary clay-btn-sm"
              >
                <Wallet size={15} /> Issue Advance
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="clay-btn clay-btn-primary clay-btn-sm"
            style={{ padding: '8px 24px' }}
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};
