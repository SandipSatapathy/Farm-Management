import React, { useState, useEffect } from 'react';
import { Labourer, AttendanceStatus, MonthlyAttendanceSummary, AttendanceRecord } from '../../types';
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
  ArrowRight
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
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 1-indexed, 10 = October
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-13');
  const [data, setData] = useState<{
    records: Record<string, AttendanceRecord>;
    summary: MonthlyAttendanceSummary;
  } | null>(null);

  const todayStr = '2026-10-13';

  const loadMonthData = () => {
    if (!labourer) return;
    const res = dataService.getLabourerMonthlyAttendance(labourer.id, currentYear, currentMonth);
    setData(res);
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
    setCurrentYear(2026);
    setCurrentMonth(10);
    setSelectedDate(todayStr);
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
        {/* Header Profile Ribbon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: '2px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '3px 3px 8px rgba(166, 184, 170, 0.3)',
                border: '2px solid #86efac'
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
                <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#143823' }}>
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
                  marginTop: 4,
                  fontSize: '0.85rem',
                  color: '#4b6354',
                  flexWrap: 'wrap'
                }}
              >
                <span>{labourer.work_category}</span>
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
            style={{ width: 38, height: 38, flexShrink: 0 }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

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
            {(currentYear !== 2026 || currentMonth !== 10) && (
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
        <div className="cal-numbers-container">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#15803d" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#143823' }}>
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

          {/* Financial Calculation Summary Ribbon */}
          <div className="cal-finance-ribbon">
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
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
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#143823',
                  fontFamily: 'Outfit',
                  marginTop: 2
                }}
              >
                ₹{data.summary.grossEarned.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#4b6354' }}>
                {data.summary.effectiveDays} days × ₹{data.summary.dailyRate}/day
              </span>
            </div>

            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#b45309',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Active Advance Deducted
              </span>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: data.summary.advanceOutstanding > 0 ? '#b45309' : '#143823',
                  fontFamily: 'Outfit',
                  marginTop: 2
                }}
              >
                {data.summary.advanceOutstanding > 0 ? '-' : ''}₹
                {data.summary.advanceOutstanding.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#78350f' }}>
                {data.summary.advanceOutstanding > 0
                  ? 'Outstanding in Advance Khata'
                  : 'Zero advance taken'}
              </span>
            </div>

            <div
              style={{
                borderLeft: '2px dashed rgba(21, 128, 61, 0.3)',
                paddingLeft: 16
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#15803d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Net Payable Balance
              </span>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: '#15803d',
                  fontFamily: 'Outfit',
                  marginTop: 2
                }}
              >
                ₹{data.summary.netPayable.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>
                Gross Earned − Advance Khata
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1.5px solid rgba(226, 232, 240, 0.8)',
            flexWrap: 'wrap'
          }}
        >
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
