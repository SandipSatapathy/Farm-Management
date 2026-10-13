import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Labourer, AttendanceStatus, TractorRentalLog } from '../types';
import { LabourAttendanceCalendarModal } from '../components/common/LabourAttendanceCalendarModal';
import confetti from 'canvas-confetti';
import {
  CalendarCheck,
  Wallet,
  CheckCircle2,
  Tractor,
  Plus,
  Users,
  X,
  CreditCard,
  UserPlus,
  Trash2,
  Phone,
  AlertTriangle,
  Clock,
  Filter,
  Calendar,
  IndianRupee,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type RoutineSection = 'attendance' | 'advance' | 'payday' | 'tractor' | 'labours';

export const SimpleFarmViewPage: React.FC = () => {
  const { farm } = useAuth();
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const today = '2026-10-13';

  // Active section state
  const [activeSection, setActiveSection] = useState<RoutineSection>('attendance');

  // Selected labourer for monthly calendar modal view
  const [selectedLabourerForCalendar, setSelectedLabourerForCalendar] = useState<Labourer | null>(null);

  // Attendance View Mode: 'list' (current daily sheet) | 'calendar' (monthly interactive calendar)
  const [attendanceViewMode, setAttendanceViewMode] = useState<'list' | 'calendar'>('list');
  const [attendanceDate, setAttendanceDate] = useState('2026-10-13');

  // Calendar View states
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(10);
  const [calWorkerId, setCalWorkerId] = useState<string>('all');
  const [calSelectedDate, setCalSelectedDate] = useState<string>('2026-10-13');
  const [calDayAttendance, setCalDayAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [calSavedMsg, setCalSavedMsg] = useState('');
  const [calMonthRecords, setCalMonthRecords] = useState<any[]>([]);

  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [attSaved, setAttSaved] = useState(false);

  // Advance state
  const [advLabId, setAdvLabId] = useState('');
  const [advAmount, setAdvAmount] = useState<number>(500);
  const [advSuccess, setAdvSuccess] = useState(false);

  // Settlement state
  const [settledLabId, setSettledLabId] = useState<string | null>(null);

  // Hired Tractor Rental State (Purely Hired / Rented — Zero Owned Tractors)
  const [tractorRentals, setTractorRentals] = useState<TractorRentalLog[]>([]);
  const [tractorDateFilter, setTractorDateFilter] = useState<string>('all');
  const [isNewRentalOpen, setIsNewRentalOpen] = useState(false);
  const [rentalDate, setRentalDate] = useState('2026-10-13');
  const [rentalTractorName, setRentalTractorName] = useState('Mahindra 575 DI (Hired)');
  const [rentalVendorName, setRentalVendorName] = useState('Patil Agri Rentals');
  const [rentalHours, setRentalHours] = useState<number>(4.0);
  const [rentalRate, setRentalRate] = useState<number>(900);
  const [rentalAdvance, setRentalAdvance] = useState<number>(1000);
  const [rentalTask, setRentalTask] = useState('Deep Plowing & Bed Preparation');
  const [rentalNotes, setRentalNotes] = useState('');
  const [tractorSuccessMsg, setTractorSuccessMsg] = useState('');

  // Labourer Management state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmLab, setDeleteConfirmLab] = useState<Labourer | null>(null);
  const [newLabName, setNewLabName] = useState('');
  const [newLabRate, setNewLabRate] = useState<number>(450);
  const [newLabPhone, setNewLabPhone] = useState('');
  const [newLabNotes, setNewLabNotes] = useState('');
  const [labSuccessMsg, setLabSuccessMsg] = useState('');

  const refreshCalMonthRecords = () => {
    const monthStr = `${calYear}-${String(calMonth).padStart(2, '0')}`;
    const days = new Date(calYear, calMonth, 0).getDate();
    const recs = dataService.getAttendanceBetween(`${monthStr}-01`, `${monthStr}-${String(days).padStart(2, '0')}`);
    setCalMonthRecords(recs);
  };

  const loadData = () => {
    const labs = dataService.getLabourers(true);
    setLabourers(labs);
    if (labs.length > 0 && (!advLabId || !labs.some(l => l.id === advLabId))) {
      setAdvLabId(labs[0].id);
    }

    const currentAtt = dataService.getAttendanceForDate(attendanceDate);
    const map: Record<string, AttendanceStatus> = {};
    labs.forEach((l) => {
      const rec = currentAtt.find((a) => a.labourer_id === l.id);
      map[l.id] = rec ? rec.status : 'present';
    });
    setAttendance(map);

    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
    refreshCalMonthRecords();
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    refreshCalMonthRecords();
  }, [calYear, calMonth]);

  useEffect(() => {
    const recs = dataService.getAttendanceForDate(calSelectedDate);
    const map: Record<string, AttendanceStatus> = {};
    labourers.forEach((l) => {
      const r = recs.find((rec) => rec.labourer_id === l.id);
      map[l.id] = r ? r.status : 'present';
    });
    setCalDayAttendance(map);
  }, [calSelectedDate, labourers]);

  useEffect(() => {
    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
  }, [tractorDateFilter]);

  // Attendance Handlers
  const handleToggleStatus = (labId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [labId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const map: Record<string, AttendanceStatus> = {};
    labourers.forEach((l) => {
      map[l.id] = 'present';
    });
    setAttendance(map);
  };

  const handleSaveAttendance = () => {
    const records = labourers.map((l) => {
      const st = attendance[l.id] || 'present';
      const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
      return {
        labourer_id: l.id,
        work_date: attendanceDate,
        shift_code: 'regular',
        status: st,
        payable_units: units,
        hours_worked: units * 8,
        task_name: 'Farm Operations',
      };
    });

    dataService.recordAttendance(records, 'Farm Team');
    setAttSaved(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
    setTimeout(() => setAttSaved(false), 2500);
    refreshCalMonthRecords();
  };

  // Calendar Attendance Handlers
  const handleCalPrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleCalNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleCalToday = () => {
    setCalYear(2026);
    setCalMonth(10);
    setCalSelectedDate(today);
  };

  const handleCalMarkAllPresent = () => {
    const map: Record<string, AttendanceStatus> = {};
    labourers.forEach((l) => {
      map[l.id] = 'present';
    });
    setCalDayAttendance(map);
  };

  const handleSaveCalDayAttendance = () => {
    const records = labourers.map((l) => {
      const st = calDayAttendance[l.id] || 'present';
      const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
      return {
        labourer_id: l.id,
        work_date: calSelectedDate,
        shift_code: 'regular',
        status: st,
        payable_units: units,
        hours_worked: units * 8,
        task_name: 'Farm Operations',
      };
    });

    dataService.recordAttendance(records, 'Field Supervisor');
    setCalSavedMsg(`Attendance saved for ${calSelectedDate}!`);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.8 }
    });
    setTimeout(() => setCalSavedMsg(''), 2500);
    refreshCalMonthRecords();
    if (calSelectedDate === attendanceDate) {
      setAttendance(calDayAttendance);
    }
  };

  const handleSwitchToListForDate = (dateStr: string) => {
    setAttendanceDate(dateStr);
    setAttendanceViewMode('list');
    const dayAtt = dataService.getAttendanceForDate(dateStr);
    const map: Record<string, AttendanceStatus> = {};
    labourers.forEach((l) => {
      const rec = dayAtt.find((a) => a.labourer_id === l.id);
      map[l.id] = rec ? rec.status : 'present';
    });
    setAttendance(map);
  };

  const formatFullDate = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  // Advance Handlers
  const handleGiveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (advAmount <= 0) return;

    dataService.issueAdvance({
      labourer_id: advLabId,
      amount: advAmount,
      payment_method: 'cash',
      purpose: 'Field work cash advance',
    });

    setAdvSuccess(true);
    setAdvAmount(500);
    setTimeout(() => setAdvSuccess(false), 3000);
    loadData();
  };

  // Salary Settlement Handlers
  const handleSettleSalary = (lab: Labourer, netPay: number) => {
    setSettledLabId(lab.id);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.8 }
    });
    setTimeout(() => setSettledLabId(null), 3000);
  };

  // Tractor Handlers
  const handleSaveTractorRental = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = round2(rentalHours * rentalRate);
    const rest = round2(Math.max(0, gross - rentalAdvance));

    const newLog = dataService.saveTractorRental({
      work_date: rentalDate,
      vendor_name: rentalVendorName,
      tractor_name: rentalTractorName,
      hours_worked: rentalHours,
      hourly_rate: rentalRate,
      advance_amount: rentalAdvance,
      task_name: rentalTask,
      notes: rentalNotes,
    });

    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
    setTractorSuccessMsg(`Hired tractor session logged: ${newLog.tractor_name} (Rest Due: ₹${rest})`);
    setIsNewRentalOpen(false);
    setTimeout(() => setTractorSuccessMsg(''), 3500);
  };

  const handleSettleRental = (rentalId: string) => {
    dataService.settleTractorRental(rentalId);
    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
    setTractorSuccessMsg('Tractor rental balance settled in full.');
    setTimeout(() => setTractorSuccessMsg(''), 3000);
  };

  const handleDeleteRental = (rentalId: string) => {
    if (confirm('Delete this hired tractor rental log?')) {
      dataService.deleteTractorRental(rentalId);
      setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
    }
  };

  // Labour Management Handlers
  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;

    try {
      const added = dataService.saveLabourer({
        full_name: newLabName.trim(),
        base_rate: newLabRate,
        phone: newLabPhone.trim() || undefined,
        notes: newLabNotes.trim() || undefined,
      });

      setIsAddModalOpen(false);
      setNewLabName('');
      setNewLabPhone('');
      setNewLabNotes('');
      loadData();
      setLabSuccessMsg(`Labourer ${added.full_name} (${added.labour_code}) registered successfully.`);
      setTimeout(() => setLabSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Error registering labourer');
    }
  };

  const handleConfirmRemoveLabour = (labId: string) => {
    try {
      dataService.removeLabourer(labId);
      setDeleteConfirmLab(null);
      loadData();
      setLabSuccessMsg('Labourer removed from active farm crew.');
      setTimeout(() => setLabSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error removing labourer');
    }
  };

  // Attendance Counts
  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const halfDayCount = Object.values(attendance).filter((s) => s === 'half_day').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent' || s === 'leave').length;
  const totalPayableUnits = round2(presentCount + halfDayCount * 0.5);

  // Calendar View Derived Calculations
  const monthName = new Date(calYear, calMonth - 1, 1).toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay(); // 0 = Sun
  const leadingBlanks = (firstDayOfWeek + 6) % 7; // Monday start index 0..6
  const monthPrefix = `${calYear}-${String(calMonth).padStart(2, '0')}`;

  const activeDaysCount = new Set(calMonthRecords.map((r) => r.work_date)).size;
  const monthTotalPresent = calMonthRecords.filter((r) => r.status === 'present').length;
  const monthTotalHalf = calMonthRecords.filter((r) => r.status === 'half_day').length;
  const monthTotalAbsent = calMonthRecords.filter((r) => r.status === 'absent' || r.status === 'leave').length;
  const monthTotalWages = round2(
    calMonthRecords.reduce((sum, r) => {
      const l = labourers.find((lab) => lab.id === r.labourer_id);
      return sum + r.payable_units * (l ? l.base_rate : 450);
    }, 0)
  );

  const singleWorkerData = calWorkerId !== 'all' ? dataService.getLabourerMonthlyAttendance(calWorkerId, calYear, calMonth) : null;
  const singleWorkerSummary = singleWorkerData?.summary || {
    presentDays: 0,
    halfDays: 0,
    absentDays: 0,
    weeklyOffDays: 0,
    unmarkedDays: 0,
    effectiveDays: 0,
    dailyRate: 450,
    grossEarned: 0,
    advanceOutstanding: 0,
    netPayable: 0
  };
  const singleWorkerRecords = singleWorkerData?.records || {};

  return (
    <div className="ledger-container">
      {/* Top Application Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '4px 4px 12px rgba(21, 128, 61, 0.35), inset 1px 1px 2px rgba(255, 255, 255, 0.5)',
            border: '2px solid rgba(255, 255, 255, 0.7)',
            flexShrink: 0
          }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#143823', letterSpacing: '-0.02em', fontFamily: 'Outfit, Plus Jakarta Sans, sans-serif' }}>
                Farm Operations & Daily Khata
              </h1>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 8, border: '1px solid #86efac' }}>
                {farm.name}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#4b6354', fontWeight: 600 }}>
              Daily attendance, cash advances, salary settlements & hired tractor accounts
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1.5px solid #86efac', padding: '6px 12px', borderRadius: 12, boxShadow: '2px 2px 6px rgba(22, 163, 74, 0.15)' }}>
            Today • 13 Oct 2026
          </span>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="ledger-action-btn ledger-action-btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <UserPlus size={15} />
            <span>+ Add Labour</span>
          </button>
        </div>
      </div>

      {/* Desktop Enterprise Tab Strip */}
      <div className="desktop-ledger-tabs">
        <button
          type="button"
          className={`desktop-ledger-tab-btn ${activeSection === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveSection('attendance')}
        >
          <CalendarCheck size={16} />
          <span>Attendance</span>
          <span style={{ fontSize: '0.7rem', background: activeSection === 'attendance' ? 'rgba(255,255,255,0.25)' : '#dcfce7', color: activeSection === 'attendance' ? '#ffffff' : '#15803d', padding: '1px 6px', borderRadius: 9999, fontWeight: 800 }}>
            {presentCount}/{labourers.length}
          </span>
        </button>

        <button
          type="button"
          className={`desktop-ledger-tab-btn ${activeSection === 'advance' ? 'active' : ''}`}
          onClick={() => setActiveSection('advance')}
        >
          <Wallet size={16} />
          <span>Advance Khata</span>
        </button>

        <button
          type="button"
          className={`desktop-ledger-tab-btn ${activeSection === 'payday' ? 'active' : ''}`}
          onClick={() => setActiveSection('payday')}
        >
          <CreditCard size={16} />
          <span>Payday Slips</span>
        </button>

        <button
          type="button"
          className={`desktop-ledger-tab-btn ${activeSection === 'tractor' ? 'active' : ''}`}
          onClick={() => setActiveSection('tractor')}
        >
          <Tractor size={16} />
          <span>Hired Tractors</span>
          {tractorRentals.filter(r => r.rest_amount > 0).length > 0 && (
            <span style={{ fontSize: '0.7rem', background: activeSection === 'tractor' ? 'rgba(255,255,255,0.25)' : '#fef3c7', color: activeSection === 'tractor' ? '#ffffff' : '#92400e', padding: '1px 6px', borderRadius: 9999, fontWeight: 800 }}>
              {tractorRentals.filter(r => r.rest_amount > 0).length} Due
            </span>
          )}
        </button>

        <button
          type="button"
          className={`desktop-ledger-tab-btn ${activeSection === 'labours' ? 'active' : ''}`}
          onClick={() => setActiveSection('labours')}
        >
          <Users size={16} />
          <span>Worker Roster</span>
          <span style={{ fontSize: '0.7rem', background: activeSection === 'labours' ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: activeSection === 'labours' ? '#ffffff' : '#475569', padding: '1px 6px', borderRadius: 9999, fontWeight: 800 }}>
            {labourers.length}
          </span>
        </button>
      </div>

      {/* Global Success Banner */}
      {attSaved && (
        <div style={{ background: '#dcfce7', border: '2px solid #86efac', color: '#14532d', padding: '12px 16px', borderRadius: 14, marginBottom: 16, fontSize: '0.86rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '3px 3px 10px rgba(22, 163, 74, 0.15)' }}>
          <CheckCircle2 size={18} color="#16a34a" />
          <span>Attendance saved successfully for today (13 Oct 2026).</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: ATTENDANCE LEDGER
          ========================================================================= */}
      {activeSection === 'attendance' && (
        <div>
          {/* Tactile Clay KPI Metrics Strip */}
          <div className="ledger-kpi-grid">
            <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
              <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Present Crew</div>
              <div className="ledger-kpi-value" style={{ color: '#15803d' }}>{presentCount}</div>
              <div className="ledger-kpi-sub">Full shift (8 hrs)</div>
            </div>

            <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fffbeb 100%)', borderColor: '#fde68a' }}>
              <div className="ledger-kpi-title" style={{ color: '#d97706' }}>Half-Day Crew</div>
              <div className="ledger-kpi-value" style={{ color: '#b45309' }}>{halfDayCount}</div>
              <div className="ledger-kpi-sub">Half shift (4 hrs)</div>
            </div>

            <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fef2f2 100%)', borderColor: '#fecaca' }}>
              <div className="ledger-kpi-title" style={{ color: '#dc2626' }}>Absent Crew</div>
              <div className="ledger-kpi-value" style={{ color: '#b91c1c' }}>{absentCount}</div>
              <div className="ledger-kpi-sub">Unpaid leave</div>
            </div>

            <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0f9ff 100%)', borderColor: '#bae6fd' }}>
              <div className="ledger-kpi-title" style={{ color: '#0284c7' }}>Effective Paid Days</div>
              <div className="ledger-kpi-value" style={{ color: '#0369a1' }}>{totalPayableUnits}</div>
              <div className="ledger-kpi-sub">Total crew days payable</div>
            </div>
          </div>

          {/* Tactile Action Toolbar & View Mode Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '2px solid rgba(220, 235, 224, 0.85)',
            borderRadius: 16,
            padding: '10px 16px',
            marginBottom: 16,
            boxShadow: '4px 4px 12px rgba(166, 184, 170, 0.2), inset 1px 1px 2px #ffffff',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Left: View Mode Segmented Switcher & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div className="ledger-view-switcher">
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('list')}
                  className={`ledger-view-btn ${attendanceViewMode === 'list' ? 'active' : ''}`}
                >
                  <List size={16} />
                  <span>List View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('calendar')}
                  className={`ledger-view-btn ${attendanceViewMode === 'calendar' ? 'active' : ''}`}
                >
                  <Calendar size={16} />
                  <span>Calendar View</span>
                </button>
              </div>

              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#143823', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarCheck size={16} color="#16a34a" />
                <span>
                  {attendanceViewMode === 'list'
                    ? `Daily Attendance Sheet • ${labourers.length} Registered Labourers`
                    : `Monthly Operations Calendar (${monthName} ${calYear})`
                  }
                </span>
                {attendanceViewMode === 'list' && attendanceDate !== today && (
                  <span style={{ fontSize: '0.74rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontWeight: 700, marginLeft: 6 }}>
                    Date: {attendanceDate}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions depending on view mode */}
            {attendanceViewMode === 'list' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {attendanceDate !== today && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceDate(today);
                      const dayAtt = dataService.getAttendanceForDate(today);
                      const map: Record<string, AttendanceStatus> = {};
                      labourers.forEach((l) => {
                        const rec = dayAtt.find((a) => a.labourer_id === l.id);
                        map[l.id] = rec ? rec.status : 'present';
                      });
                      setAttendance(map);
                    }}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Reset to Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="ledger-action-btn ledger-action-btn-secondary"
                >
                  ✓ Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="ledger-action-btn ledger-action-btn-primary"
                >
                  <CheckCircle2 size={15} />
                  <span>Save Attendance</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCalToday}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Jump to Today (13 Oct)
                </button>
              </div>
            )}
          </div>

          {/* =========================================================================
              VIEW 1: LIST VIEW (CURRENT DAILY ROSTER)
              ========================================================================= */}
          {attendanceViewMode === 'list' && (
            <>
              {/* Desktop Table View */}
              <div className="ledger-desktop-only">
                <div className="ledger-table-wrap">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th className="ledger-th">Labourer</th>
                        <th className="ledger-th">Daily Wage Rate</th>
                        <th className="ledger-th">Advance Khata</th>
                        <th className="ledger-th" style={{ textAlign: 'center' }}>Today Attendance Status</th>
                        <th className="ledger-th">Today Earned</th>
                        <th className="ledger-th" style={{ textAlign: 'right' }}>Monthly Audit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labourers.map((lab) => {
                        const st = attendance[lab.id] || 'present';
                        const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
                        const earned = round2(units * lab.base_rate);
                        const bal = dataService.getLabourerAdvanceBalance(lab.id);

                        return (
                          <tr key={lab.id} className="ledger-tr">
                            <td className="ledger-td">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 12,
                                  background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                  color: '#15803d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.92rem',
                                  boxShadow: '2px 2px 5px rgba(166, 184, 170, 0.25), inset 1px 1px 2px #ffffff',
                                  border: '1.5px solid #86efac',
                                  flexShrink: 0
                                }}>
                                  {lab.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#143823', fontSize: '0.92rem' }}>{lab.full_name}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{lab.labour_code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                              ₹{lab.base_rate} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>/day</span>
                            </td>
                            <td className="ledger-td">
                              {bal.outstanding > 0 ? (
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                                  Due: ₹{bal.outstanding}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                  Clear
                                </span>
                              )}
                            </td>
                            <td className="ledger-td" style={{ textAlign: 'center' }}>
                              <div className="ledger-seg-control">
                                <button
                                  type="button"
                                  className={`ledger-seg-btn ${st === 'present' ? 'active-present' : ''}`}
                                  onClick={() => handleToggleStatus(lab.id, 'present')}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`ledger-seg-btn ${st === 'half_day' ? 'active-half' : ''}`}
                                  onClick={() => handleToggleStatus(lab.id, 'half_day')}
                                >
                                  Half-Day
                                </button>
                                <button
                                  type="button"
                                  className={`ledger-seg-btn ${st === 'absent' || st === 'leave' ? 'active-absent' : ''}`}
                                  onClick={() => handleToggleStatus(lab.id, 'absent')}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td className="ledger-td">
                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: earned > 0 ? '#15803d' : '#64748b' }}>
                                ₹{earned}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 4, fontWeight: 600 }}>
                                ({units} day)
                              </span>
                            </td>
                            <td className="ledger-td" style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedLabourerForCalendar(lab)}
                                className="ledger-action-btn ledger-action-btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                              >
                                <Calendar size={13} color="#15803d" />
                                <span>Monthly Calendar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile High-Density Rows View */}
              <div className="ledger-mobile-only">
                {labourers.map((lab) => {
                  const st = attendance[lab.id] || 'present';
                  const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
                  const earned = round2(units * lab.base_rate);
                  const bal = dataService.getLabourerAdvanceBalance(lab.id);

                  return (
                    <div key={lab.id} className="ledger-mobile-row">
                      {/* Row Top: Avatar, Name, Rate, Khata */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            boxShadow: '2px 2px 5px rgba(166, 184, 170, 0.25), inset 1px 1px 2px #ffffff',
                            border: '1.5px solid #86efac',
                            flexShrink: 0
                          }}>
                            {lab.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#143823' }}>
                                {lab.full_name}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#475569', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                {lab.labour_code}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#4b6354', fontWeight: 600 }}>
                              ₹{lab.base_rate}/day
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {bal.outstanding > 0 ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: 6, border: '1px solid #fde68a' }}>
                              Due: ₹{bal.outstanding}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '2px 6px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                              Clear
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1-Tap Segmented Control */}
                      <div className="ledger-seg-control" style={{ marginBottom: 10 }}>
                        <button
                          type="button"
                          className={`ledger-seg-btn ${st === 'present' ? 'active-present' : ''}`}
                          onClick={() => handleToggleStatus(lab.id, 'present')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`ledger-seg-btn ${st === 'half_day' ? 'active-half' : ''}`}
                          onClick={() => handleToggleStatus(lab.id, 'half_day')}
                        >
                          Half-Day
                        </button>
                        <button
                          type="button"
                          className={`ledger-seg-btn ${st === 'absent' || st === 'leave' ? 'active-absent' : ''}`}
                          onClick={() => handleToggleStatus(lab.id, 'absent')}
                        >
                          Absent
                        </button>
                      </div>

                      {/* Row Bottom: Summary and Calendar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #dcfce7' }}>
                        <div style={{ fontSize: '0.8rem', color: '#143823' }}>
                          Today: <strong>{units} Day</strong> • <strong style={{ color: earned > 0 ? '#15803d' : '#64748b' }}>₹{earned}</strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedLabourerForCalendar(lab)}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            color: '#15803d',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: 8,
                          }}
                        >
                          <Calendar size={13} />
                          <span>Monthly Calendar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile Save Button */}
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    className="ledger-action-btn ledger-action-btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '0.92rem', borderRadius: 16 }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Save Today's Attendance ({totalPayableUnits} Days)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              VIEW 2: CALENDAR VIEW (MONTHLY OPERATIONS CALENDAR)
              ========================================================================= */}
          {attendanceViewMode === 'calendar' && (
            <div>
              {/* Monthly Calendar View Card */}
              <div className="cal-view-card">
                {/* Calendar Toolbar: Month Nav & Labourer Filter */}
                <div className="cal-view-toolbar">
                  {/* Month Navigation */}
                  <div className="cal-view-nav">
                    <button
                      type="button"
                      onClick={handleCalPrevMonth}
                      className="cal-nav-btn"
                      title="Previous Month"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="cal-month-title">
                      {monthName} {calYear}
                    </div>
                    <button
                      type="button"
                      onClick={handleCalNextMonth}
                      className="cal-nav-btn"
                      title="Next Month"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCalToday}
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        marginLeft: 6
                      }}
                    >
                      Today
                    </button>
                  </div>

                  {/* Worker Filter Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4b6354' }}>Filter View:</label>
                    <select
                      value={calWorkerId}
                      onChange={(e) => setCalWorkerId(e.target.value)}
                      className="cal-worker-select"
                    >
                      <option value="all">👥 All Crew (Combined Farm Turnout)</option>
                      {labourers.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          👤 {lab.full_name} (₹{lab.base_rate}/day)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Monthly Metrics KPI Strip */}
                {calWorkerId === 'all' ? (
                  <div className="ledger-kpi-grid" style={{ marginBottom: 18 }}>
                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
                      <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Recorded Days</div>
                      <div className="ledger-kpi-value" style={{ color: '#15803d' }}>{activeDaysCount}</div>
                      <div className="ledger-kpi-sub">Active field work days</div>
                    </div>

                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
                      <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Present Shifts</div>
                      <div className="ledger-kpi-value" style={{ color: '#15803d' }}>{monthTotalPresent}</div>
                      <div className="ledger-kpi-sub">Full 8-hour crew shifts</div>
                    </div>

                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fffbeb 100%)', borderColor: '#fde68a' }}>
                      <div className="ledger-kpi-title" style={{ color: '#d97706' }}>Half-Day Shifts</div>
                      <div className="ledger-kpi-value" style={{ color: '#b45309' }}>{monthTotalHalf}</div>
                      <div className="ledger-kpi-sub">4-hour half shifts</div>
                    </div>

                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0f9ff 100%)', borderColor: '#bae6fd' }}>
                      <div className="ledger-kpi-title" style={{ color: '#0284c7' }}>Monthly Wages</div>
                      <div className="ledger-kpi-value" style={{ color: '#0369a1' }}>₹{monthTotalWages}</div>
                      <div className="ledger-kpi-sub">Total crew earnings in {monthName}</div>
                    </div>
                  </div>
                ) : (
                  <div className="ledger-kpi-grid" style={{ marginBottom: 18 }}>
                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
                      <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Present Days</div>
                      <div className="ledger-kpi-value" style={{ color: '#15803d' }}>{singleWorkerSummary.presentDays}</div>
                      <div className="ledger-kpi-sub">Full shift days</div>
                    </div>

                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fffbeb 100%)', borderColor: '#fde68a' }}>
                      <div className="ledger-kpi-title" style={{ color: '#d97706' }}>Half / Absent</div>
                      <div className="ledger-kpi-value" style={{ color: '#b45309' }}>
                        {singleWorkerSummary.halfDays} <span style={{ fontSize: '0.82rem', color: '#64748b' }}>H</span> / {singleWorkerSummary.absentDays} <span style={{ fontSize: '0.82rem', color: '#64748b' }}>A</span>
                      </div>
                      <div className="ledger-kpi-sub">{singleWorkerSummary.effectiveDays} effective days</div>
                    </div>

                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fef3c7 100%)', borderColor: '#fcd34d' }}>
                      <div className="ledger-kpi-title" style={{ color: '#b45309' }}>Advance Due</div>
                      <div className="ledger-kpi-value" style={{ color: '#92400e' }}>₹{singleWorkerSummary.advanceOutstanding}</div>
                      <div className="ledger-kpi-sub">Khata advance balance</div>
                    </div>

                    <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0f9ff 100%)', borderColor: '#bae6fd' }}>
                      <div className="ledger-kpi-title" style={{ color: '#0284c7' }}>Net Payable</div>
                      <div className="ledger-kpi-value" style={{ color: '#0369a1' }}>₹{singleWorkerSummary.netPayable}</div>
                      <div className="ledger-kpi-sub">Gross: ₹{singleWorkerSummary.grossEarned}</div>
                    </div>
                  </div>
                )}

                {/* Calendar Weekdays Label */}
                <div className="cal-weekdays-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <div
                      key={day}
                      className="cal-weekday-label"
                      style={{ color: idx === 6 ? '#e11d48' : undefined }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="cal-days-grid">
                  {/* Leading blanks */}
                  {Array.from({ length: leadingBlanks }).map((_, idx) => (
                    <div
                      key={`blank-${idx}`}
                      className="cal-day-cell"
                      style={{ opacity: 0.25, cursor: 'default', background: '#f8fafc', borderStyle: 'dashed' }}
                    />
                  ))}

                  {/* Month day cells */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = dateStr === calSelectedDate;
                    const isTodayDate = dateStr === today;
                    const dayOfWeek = new Date(calYear, calMonth - 1, dayNum).getDay();
                    const isSunday = dayOfWeek === 0;
                    const isFuture = dateStr > today;

                    if (calWorkerId === 'all') {
                      const dayRecs = calMonthRecords.filter((r) => r.work_date === dateStr);
                      const pCount = dayRecs.filter((r) => r.status === 'present').length;
                      const hCount = dayRecs.filter((r) => r.status === 'half_day').length;
                      const aCount = dayRecs.filter((r) => r.status === 'absent' || r.status === 'leave').length;
                      const dayWages = round2(
                        dayRecs.reduce((sum, r) => {
                          const l = labourers.find((lab) => lab.id === r.labourer_id);
                          return sum + r.payable_units * (l ? l.base_rate : 450);
                        }, 0)
                      );

                      let statusClass = '';
                      if (dayRecs.length > 0) {
                        if (aCount === dayRecs.length) statusClass = 'status-absent';
                        else if (hCount > 0 || aCount > 0) statusClass = 'status-half_day';
                        else statusClass = 'status-present';
                      } else if (isSunday) {
                        statusClass = 'status-sunday';
                      } else if (isFuture) {
                        statusClass = 'future';
                      }

                      return (
                        <div
                          key={dateStr}
                          onClick={() => setCalSelectedDate(dateStr)}
                          className={`cal-day-cell ${statusClass} ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span className="cal-day-num">{dayNum}</span>
                            {isTodayDate && (
                              <span style={{ fontSize: '0.6rem', background: '#16a34a', color: '#ffffff', padding: '1px 4px', borderRadius: 4, fontWeight: 900 }}>
                                TODAY
                              </span>
                            )}
                          </div>

                          <div style={{ width: '100%', textAlign: 'center', marginTop: 2 }}>
                            {dayRecs.length > 0 ? (
                              <div>
                                <span className={`cal-day-status-badge ${aCount === dayRecs.length ? 'cal-status-a' : (hCount > 0 || aCount > 0 ? 'cal-status-hd' : 'cal-status-p')}`}>
                                  <span className="cal-badge-desktop">
                                    {pCount > 0 ? `${pCount} Present` : `${aCount} Absent`}
                                  </span>
                                  <span className="cal-badge-mobile">
                                    {pCount}P{hCount > 0 ? ` ${hCount}H` : ''}
                                  </span>
                                </span>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', marginTop: 2 }}>
                                  ₹{dayWages}
                                </div>
                              </div>
                            ) : isSunday ? (
                              <span className="cal-day-status-badge cal-status-off">Off</span>
                            ) : isFuture ? (
                              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>—</span>
                            ) : (
                              <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Unmarked</span>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      // Single worker cell
                      const wRec = singleWorkerRecords[dateStr];
                      const labObj = labourers.find((l) => l.id === calWorkerId);
                      const rate = labObj ? labObj.base_rate : 450;

                      let statusClass = '';
                      let label = '';
                      let wage = 0;

                      if (wRec) {
                        if (wRec.status === 'present') {
                          statusClass = 'status-present';
                          label = 'Present';
                          wage = rate;
                        } else if (wRec.status === 'half_day') {
                          statusClass = 'status-half_day';
                          label = 'Half-Day';
                          wage = round2(rate * 0.5);
                        } else {
                          statusClass = 'status-absent';
                          label = 'Absent';
                          wage = 0;
                        }
                      } else if (isSunday) {
                        statusClass = 'status-sunday';
                        label = 'Off';
                      } else if (isFuture) {
                        statusClass = 'future';
                        label = '—';
                      } else {
                        label = 'Unmarked';
                      }

                      return (
                        <div
                          key={dateStr}
                          onClick={() => setCalSelectedDate(dateStr)}
                          className={`cal-day-cell ${statusClass} ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span className="cal-day-num">{dayNum}</span>
                            {isTodayDate && (
                              <span style={{ fontSize: '0.6rem', background: '#16a34a', color: '#ffffff', padding: '1px 4px', borderRadius: 4, fontWeight: 900 }}>
                                TODAY
                              </span>
                            )}
                          </div>

                          <div style={{ width: '100%', textAlign: 'center', marginTop: 2 }}>
                            {wRec ? (
                              <div>
                                <span className={`cal-day-status-badge ${wRec.status === 'present' ? 'cal-status-p' : wRec.status === 'half_day' ? 'cal-status-hd' : 'cal-status-a'}`}>
                                  {label}
                                </span>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', marginTop: 2 }}>
                                  ₹{wage}
                                </div>
                              </div>
                            ) : isSunday ? (
                              <span className="cal-day-status-badge cal-status-off">Off</span>
                            ) : isFuture ? (
                              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>—</span>
                            ) : (
                              <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Unmarked</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Color Legend Bar */}
                <div className="cal-legend-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: '#86efac', border: '1px solid #16a34a', display: 'inline-block' }} />
                    <span>Present (Full Day)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: '#fde047', border: '1px solid #ca8a04', display: 'inline-block' }} />
                    <span>Half-Day (0.5 Day)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: '#fca5a5', border: '1px solid #dc2626', display: 'inline-block' }} />
                    <span>Absent</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: '#e2e8f0', border: '1px dashed #94a3b8', display: 'inline-block' }} />
                    <span>Weekly Off (Sunday)</span>
                  </div>
                </div>
              </div>

              {/* Selected Date Quick Attendance Editor Panel */}
              <div className="cal-day-detail-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#143823', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <CalendarCheck size={18} color="#15803d" />
                      <span>Daily Attendance: {formatFullDate(calSelectedDate)}</span>
                      {calSelectedDate === today && (
                        <span style={{ background: '#16a34a', color: '#ffffff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, fontWeight: 800 }}>
                          Today
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                      Inspect and update crew attendance for this specific date.
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleCalMarkAllPresent}
                      className="ledger-action-btn ledger-action-btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      ✓ Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCalDayAttendance}
                      className="ledger-action-btn ledger-action-btn-primary"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Save for {calSelectedDate}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchToListForDate(calSelectedDate)}
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        color: '#334155',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        borderRadius: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer'
                      }}
                    >
                      <List size={14} />
                      <span>Open in Daily List View</span>
                    </button>
                  </div>
                </div>

                {calSavedMsg && (
                  <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', color: '#14532d', padding: '8px 14px', borderRadius: 10, marginBottom: 12, fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span>{calSavedMsg}</span>
                  </div>
                )}

                {/* Desktop Crew Table for Selected Date */}
                <div className="ledger-desktop-only" style={{ background: '#ffffff', borderRadius: 16, border: '1.5px solid #dcebe0', overflow: 'hidden' }}>
                  <table className="ledger-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th className="ledger-th">Labourer</th>
                        <th className="ledger-th">Wage Rate</th>
                        <th className="ledger-th" style={{ textAlign: 'center' }}>Attendance Status</th>
                        <th className="ledger-th">Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labourers.map((lab) => {
                        const st = calDayAttendance[lab.id] || 'present';
                        const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
                        const earned = round2(units * lab.base_rate);

                        return (
                          <tr key={lab.id} className="ledger-tr">
                            <td className="ledger-td">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.85rem'
                                }}>
                                  {lab.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#143823', fontSize: '0.88rem' }}>{lab.full_name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{lab.labour_code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="ledger-td" style={{ fontWeight: 700, color: '#143823' }}>
                              ₹{lab.base_rate}/day
                            </td>
                            <td className="ledger-td" style={{ textAlign: 'center' }}>
                              <div className="ledger-seg-control" style={{ display: 'inline-flex' }}>
                                <button
                                  type="button"
                                  className={`ledger-seg-btn ${st === 'present' ? 'active-present' : ''}`}
                                  onClick={() => setCalDayAttendance((prev) => ({ ...prev, [lab.id]: 'present' }))}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`ledger-seg-btn ${st === 'half_day' ? 'active-half' : ''}`}
                                  onClick={() => setCalDayAttendance((prev) => ({ ...prev, [lab.id]: 'half_day' }))}
                                >
                                  Half-Day
                                </button>
                                <button
                                  type="button"
                                  className={`ledger-seg-btn ${st === 'absent' || st === 'leave' ? 'active-absent' : ''}`}
                                  onClick={() => setCalDayAttendance((prev) => ({ ...prev, [lab.id]: 'absent' }))}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                            <td className="ledger-td">
                              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: earned > 0 ? '#15803d' : '#64748b' }}>
                                ₹{earned}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 4 }}>
                                ({units} day)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Crew Cards for Selected Date */}
                <div className="ledger-mobile-only">
                  {labourers.map((lab) => {
                    const st = calDayAttendance[lab.id] || 'present';
                    const units = st === 'present' ? 1.0 : (st === 'half_day' ? 0.5 : 0.0);
                    const earned = round2(units * lab.base_rate);

                    return (
                      <div key={lab.id} style={{ background: '#ffffff', borderRadius: 14, padding: '10px 12px', border: '1.5px solid #dcebe0', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                              {lab.full_name.charAt(0)}
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#143823' }}>{lab.full_name}</div>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 800 }}>
                            ₹{earned} ({units}d)
                          </div>
                        </div>

                        <div className="ledger-seg-control">
                          <button
                            type="button"
                            className={`ledger-seg-btn ${st === 'present' ? 'active-present' : ''}`}
                            onClick={() => setCalDayAttendance((prev) => ({ ...prev, [lab.id]: 'present' }))}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`ledger-seg-btn ${st === 'half_day' ? 'active-half' : ''}`}
                            onClick={() => setCalDayAttendance((prev) => ({ ...prev, [lab.id]: 'half_day' }))}
                          >
                            Half-Day
                          </button>
                          <button
                            type="button"
                            className={`ledger-seg-btn ${st === 'absent' || st === 'leave' ? 'active-absent' : ''}`}
                            onClick={() => setCalDayAttendance((prev) => ({ ...prev, [lab.id]: 'absent' }))}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: CASH ADVANCE KHATA
          ========================================================================= */}
      {activeSection === 'advance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 360px) 1fr', gap: 16 }} className="farm-desktop-split">
          {/* Issue Advance Form */}
          <div className="ledger-card">
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800 }}>
              Issue Cash Advance
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 14px 0' }}>
              Cash advance issued is added to worker's balance and deducted on settlement.
            </p>

            {advSuccess && (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#14532d', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#16a34a" />
                <span>Advance recorded and updated in Khata.</span>
              </div>
            )}

            <form onSubmit={handleGiveAdvance}>
              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Select Worker</label>
                <select
                  value={advLabId}
                  onChange={(e) => setAdvLabId(e.target.value)}
                  className="ledger-input"
                >
                  {labourers.map((l) => {
                    const bal = dataService.getLabourerAdvanceBalance(l.id);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.full_name} ({bal.outstanding > 0 ? `Due: ₹${bal.outstanding}` : 'Clear'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Cash Amount (₹)</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(Number(e.target.value))}
                  className="ledger-input"
                  style={{ fontSize: '1.15rem', fontWeight: 800, textAlign: 'center' }}
                  required
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {[200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdvAmount(amt)}
                    style={{
                      padding: '8px 0',
                      borderRadius: 10,
                      border: '2px solid',
                      borderColor: advAmount === amt ? '#16a34a' : '#cbd5e1',
                      background: advAmount === amt ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#ffffff',
                      color: advAmount === amt ? '#15803d' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: advAmount === amt ? '2px 2px 6px rgba(22, 163, 74, 0.25), inset 1px 1px 2px #ffffff' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="ledger-action-btn ledger-action-btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem', borderRadius: 14 }}
              >
                Record Cash Advance
              </button>
            </form>
          </div>

          {/* Running Khata Balances Table */}
          <div className="ledger-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#143823' }}>
                  Worker Advance Balances (Khata)
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#4b6354', fontWeight: 600 }}>
                  Cumulative advances issued, recovered, and currently outstanding
                </div>
              </div>
            </div>

            {/* Desktop Khata Table */}
            <div className="ledger-desktop-only">
              <div className="ledger-table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th className="ledger-th">Worker</th>
                      <th className="ledger-th">Total Given</th>
                      <th className="ledger-th">Total Repaid</th>
                      <th className="ledger-th">Current Due</th>
                      <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labourers.map((l) => {
                      const bal = dataService.getLabourerAdvanceBalance(l.id);

                      return (
                        <tr key={l.id} className="ledger-tr">
                          <td className="ledger-td">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                color: '#15803d',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                boxShadow: '2px 2px 5px rgba(166, 184, 170, 0.25)',
                                border: '1.5px solid #86efac',
                                flexShrink: 0
                              }}>
                                {l.full_name.charAt(0)}
                              </div>
                              <div>
                                <span style={{ fontWeight: 800, color: '#143823' }}>{l.full_name}</span>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.labour_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="ledger-td" style={{ color: '#475569', fontWeight: 600 }}>
                            ₹{bal.totalIssued}
                          </td>
                          <td className="ledger-td" style={{ color: '#15803d', fontWeight: 700 }}>
                            ₹{bal.totalRecovered}
                          </td>
                          <td className="ledger-td">
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: bal.outstanding > 0 ? '#fef3c7' : '#f0fdf4',
                              color: bal.outstanding > 0 ? '#b45309' : '#15803d',
                              border: `1px solid ${bal.outstanding > 0 ? '#fde68a' : '#bbf7d0'}`,
                            }}>
                              {bal.outstanding > 0 ? `Due: ₹${bal.outstanding}` : 'Clear'}
                            </span>
                          </td>
                          <td className="ledger-td" style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedLabourerForCalendar(l)}
                              className="ledger-action-btn ledger-action-btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                            >
                              <Calendar size={13} color="#15803d" />
                              <span>Calendar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Khata Rows */}
            <div className="ledger-mobile-only">
              {labourers.map((l) => {
                const bal = dataService.getLabourerAdvanceBalance(l.id);

                return (
                  <div key={l.id} className="ledger-mobile-row">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          border: '1.5px solid #86efac',
                          flexShrink: 0
                        }}>
                          {l.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#143823' }}>{l.full_name}</div>
                        </div>
                      </div>

                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: bal.outstanding > 0 ? '#fef3c7' : '#f0fdf4',
                        color: bal.outstanding > 0 ? '#b45309' : '#15803d',
                        border: `1px solid ${bal.outstanding > 0 ? '#fde68a' : '#bbf7d0'}`,
                      }}>
                        {bal.outstanding > 0 ? `Due: ₹${bal.outstanding}` : 'Clear'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', paddingTop: 8, borderTop: '1px dashed #dcfce7' }}>
                      <span>Given: ₹{bal.totalIssued} • Repaid: ₹{bal.totalRecovered}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLabourerForCalendar(l)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#15803d',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          padding: '3px 8px',
                          borderRadius: 6
                        }}
                      >
                        Calendar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: PAYDAY SETTLEMENT SLIPS
          ========================================================================= */}
      {activeSection === 'payday' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.3rem', margin: '0 0 4px 0', color: '#143823', fontWeight: 800 }}>
              Daily Payday Slips & Settlements
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#4b6354', fontWeight: 600 }}>
              Formula: <strong>Gross Wage (Days × Rate) − Khata Advance Deducted = Take-Home Pay</strong>
            </div>
          </div>

          {/* Desktop Settlement Table */}
          <div className="ledger-desktop-only">
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-th">Worker</th>
                    <th className="ledger-th">Daily Rate</th>
                    <th className="ledger-th">Days Worked Today</th>
                    <th className="ledger-th">Gross Wage</th>
                    <th className="ledger-th">Khata Deducted</th>
                    <th className="ledger-th">Net Take-Home Pay</th>
                    <th className="ledger-th" style={{ textAlign: 'right' }}>Payment Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labourers.map((lab) => {
                    const att = attendance[lab.id] || 'present';
                    const daysWorked = att === 'present' ? 1.0 : (att === 'half_day' ? 0.5 : 0.0);
                    const gross = round2(daysWorked * lab.base_rate);
                    const bal = dataService.getLabourerAdvanceBalance(lab.id);
                    const advanceDeducted = round2(Math.min(bal.outstanding, gross));
                    const netPay = round2(Math.max(0, gross - advanceDeducted));
                    const isSettled = settledLabId === lab.id;

                    return (
                      <tr key={lab.id} className="ledger-tr">
                        <td className="ledger-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                              color: '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              border: '1.5px solid #86efac',
                              flexShrink: 0
                            }}>
                              {lab.full_name.charAt(0)}
                            </div>
                            <div>
                              <span style={{ fontWeight: 800, color: '#143823' }}>{lab.full_name}</span>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{lab.labour_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="ledger-td" style={{ color: '#475569', fontWeight: 600 }}>
                          ₹{lab.base_rate}/day
                        </td>
                        <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                          {daysWorked} Day
                        </td>
                        <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                          ₹{gross}
                        </td>
                        <td className="ledger-td" style={{ color: advanceDeducted > 0 ? '#b45309' : '#64748b', fontWeight: advanceDeducted > 0 ? 800 : 500 }}>
                          {advanceDeducted > 0 ? `− ₹${advanceDeducted}` : '₹0'}
                        </td>
                        <td className="ledger-td">
                          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#15803d', fontFamily: 'Outfit, Plus Jakarta Sans, sans-serif' }}>
                            ₹{netPay.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="ledger-td" style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isSettled}
                            onClick={() => handleSettleSalary(lab, netPay)}
                            className={`ledger-action-btn ${isSettled ? 'ledger-action-btn-secondary' : 'ledger-action-btn-primary'}`}
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                          >
                            {isSettled ? '✓ Paid / Settled' : 'Pay Cash / UPI'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Settlement Cards */}
          <div className="ledger-mobile-only">
            {labourers.map((lab) => {
              const att = attendance[lab.id] || 'present';
              const daysWorked = att === 'present' ? 1.0 : (att === 'half_day' ? 0.5 : 0.0);
              const gross = round2(daysWorked * lab.base_rate);
              const bal = dataService.getLabourerAdvanceBalance(lab.id);
              const advanceDeducted = round2(Math.min(bal.outstanding, gross));
              const netPay = round2(Math.max(0, gross - advanceDeducted));
              const isSettled = settledLabId === lab.id;

              return (
                <div key={lab.id} className="ledger-mobile-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        border: '1.5px solid #86efac',
                        flexShrink: 0
                      }}>
                        {lab.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#143823' }}>{lab.full_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#4b6354', fontWeight: 600 }}>₹{lab.base_rate}/day • {daysWorked} Day Worked</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Take-Home</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', fontFamily: 'Outfit, sans-serif' }}>
                        ₹{netPay.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8faf8', border: '1px solid rgba(220, 235, 224, 0.8)', padding: '8px 12px', borderRadius: 10, fontSize: '0.78rem', color: '#334e3e', marginBottom: 10 }}>
                    <span>Gross: <strong>₹{gross}</strong></span>
                    {advanceDeducted > 0 && <span style={{ color: '#b45309', marginLeft: 10 }}>Less Advance: <strong>−₹{advanceDeducted}</strong></span>}
                  </div>

                  <button
                    type="button"
                    disabled={isSettled}
                    onClick={() => handleSettleSalary(lab, netPay)}
                    className={`ledger-action-btn ${isSettled ? 'ledger-action-btn-secondary' : 'ledger-action-btn-primary'}`}
                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: 12 }}
                  >
                    {isSettled ? '✓ Paid & Settled' : `Pay Cash / UPI (₹${netPay})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: HIRED TRACTOR RENTAL & OPERATIONS KHATA (ZERO OWNED TRACTORS)
          ========================================================================= */}
      {activeSection === 'tractor' && (() => {
        const totals = dataService.getTractorRentalTotals(tractorDateFilter);

        return (
          <div>
            {/* Header Strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: '0 0 3px 0', color: '#143823', fontWeight: 800 }}>
                  Hired Tractor Rental Logs & Balance Khata
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#4b6354', fontWeight: 600 }}>
                  Track hired tractor hours, rental rates, advance paid & balance due (Zero owned tractors)
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewRentalOpen(!isNewRentalOpen)}
                className="ledger-action-btn ledger-action-btn-primary"
                style={{ padding: '8px 14px' }}
              >
                <Plus size={15} />
                <span>{isNewRentalOpen ? 'Close Form' : '+ Log Hired Tractor'}</span>
              </button>
            </div>

            {tractorSuccessMsg && (
              <div style={{ background: '#dcfce7', border: '2px solid #86efac', color: '#14532d', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>{tractorSuccessMsg}</span>
              </div>
            )}

            {/* Tactile Clay KPI Boxes */}
            <div className="ledger-kpi-grid">
              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0f9ff 100%)', borderColor: '#bae6fd' }}>
                <div className="ledger-kpi-title" style={{ color: '#0284c7' }}>Hired Hours Worked</div>
                <div className="ledger-kpi-value" style={{ color: '#0369a1' }}>{totals.totalHours} hrs</div>
                <div className="ledger-kpi-sub">{totals.count} tractor runs recorded</div>
              </div>

              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f8fafc 100%)', borderColor: '#cbd5e1' }}>
                <div className="ledger-kpi-title">Gross Rental Bill</div>
                <div className="ledger-kpi-value">₹{totals.totalGross.toLocaleString('en-IN')}</div>
                <div className="ledger-kpi-sub">Hours × Hourly rate</div>
              </div>

              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #eff6ff 100%)', borderColor: '#bfdbfe' }}>
                <div className="ledger-kpi-title" style={{ color: '#2563eb' }}>Advance Paid</div>
                <div className="ledger-kpi-value" style={{ color: '#2563eb' }}>₹{totals.totalAdvance.toLocaleString('en-IN')}</div>
                <div className="ledger-kpi-sub">Prepaid to vendor</div>
              </div>

              <div className="ledger-kpi-box" style={{ background: totals.totalRest > 0 ? 'linear-gradient(135deg, #ffffff 60%, #fffbeb 100%)' : 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: totals.totalRest > 0 ? '#fde68a' : '#86efac' }}>
                <div className="ledger-kpi-title" style={{ color: totals.totalRest > 0 ? '#b45309' : '#15803d' }}>Rest Balance Due</div>
                <div className="ledger-kpi-value" style={{ color: totals.totalRest > 0 ? '#b45309' : '#15803d' }}>
                  ₹{totals.totalRest.toLocaleString('en-IN')}
                </div>
                <div className="ledger-kpi-sub">{totals.totalRest > 0 ? 'Pending payment' : 'Fully settled'}</div>
              </div>
            </div>

            {/* Date Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', marginBottom: 14, flexWrap: 'wrap' }}>
              <Filter size={14} color="#64748b" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Filter Date:</span>

              {['all', '2026-10-13', '2026-10-12', '2026-10-11'].map((d) => {
                const label = d === 'all' ? 'All Dates' : (d === '2026-10-13' ? 'Today (13 Oct)' : (d === '2026-10-12' ? '12 Oct' : '11 Oct'));
                const isActive = tractorDateFilter === d;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTractorDateFilter(d)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: isActive ? '#16a34a' : '#cbd5e1',
                      background: isActive ? '#dcfce7' : '#ffffff',
                      color: isActive ? '#15803d' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}

              <input
                type="date"
                value={tractorDateFilter === 'all' ? '' : tractorDateFilter}
                onChange={(e) => setTractorDateFilter(e.target.value || 'all')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  marginLeft: 'auto',
                }}
              />
            </div>

            {/* Log Hired Run Collapsible Form */}
            {isNewRentalOpen && (
              <div className="ledger-card" style={{ marginBottom: 16, border: '1px solid #86efac', background: '#fbfdfb' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Log Hired Tractor Run
                </h3>

                <form onSubmit={handleSaveTractorRental}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="ledger-label">Work Date *</label>
                      <input
                        type="date"
                        value={rentalDate}
                        onChange={(e) => setRentalDate(e.target.value)}
                        className="ledger-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="ledger-label">Vendor / Rental Owner *</label>
                      <input
                        type="text"
                        placeholder="e.g. Patil Agri Rentals"
                        value={rentalVendorName}
                        onChange={(e) => setRentalVendorName(e.target.value)}
                        className="ledger-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="ledger-label">Hired Tractor Model *</label>
                      <input
                        type="text"
                        placeholder="e.g. Mahindra 575 DI (Hired)"
                        value={rentalTractorName}
                        onChange={(e) => setRentalTractorName(e.target.value)}
                        className="ledger-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="ledger-label">Hours Worked *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={rentalHours}
                        onChange={(e) => setRentalHours(Number(e.target.value))}
                        className="ledger-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="ledger-label">Hourly Rate (₹/hr) *</label>
                      <input
                        type="number"
                        min="100"
                        step="25"
                        value={rentalRate}
                        onChange={(e) => setRentalRate(Number(e.target.value))}
                        className="ledger-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="ledger-label">Advance Paid (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={rentalAdvance}
                        onChange={(e) => setRentalAdvance(Number(e.target.value))}
                        className="ledger-input"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="ledger-label">Operation / Task Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Deep Plowing & Bed Preparation"
                      value={rentalTask}
                      onChange={(e) => setRentalTask(e.target.value)}
                      className="ledger-input"
                    />
                  </div>

                  {/* Calculation summary */}
                  {(() => {
                    const gross = round2(rentalHours * rentalRate);
                    const rest = round2(Math.max(0, gross - rentalAdvance));

                    return (
                      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, fontSize: '0.82rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Gross Bill: <strong>₹{gross}</strong> • Advance: <strong>−₹{rentalAdvance}</strong></span>
                        <span style={{ fontWeight: 800, color: rest > 0 ? '#b45309' : '#16a34a' }}>
                          Rest Balance Due: ₹{rest}
                        </span>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsNewRentalOpen(false)}
                      className="ledger-action-btn ledger-action-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="ledger-action-btn ledger-action-btn-primary"
                    >
                      Save Hired Run
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tractor Runs Table */}
            {tractorRentals.length === 0 ? (
              <div className="ledger-card" style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                <Tractor size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>No Hired Tractor Runs Found</div>
                <div style={{ fontSize: '0.8rem' }}>Click "+ Log Hired Tractor" to record your first run.</div>
              </div>
            ) : (
              <div>
                {/* Desktop Tractor Table */}
                <div className="ledger-desktop-only">
                  <div className="ledger-table-wrap">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th className="ledger-th">Date</th>
                          <th className="ledger-th">Vendor & Tractor</th>
                          <th className="ledger-th">Task</th>
                          <th className="ledger-th">Hours</th>
                          <th className="ledger-th">Rate</th>
                          <th className="ledger-th">Gross Bill</th>
                          <th className="ledger-th">Advance Paid</th>
                          <th className="ledger-th">Balance Due</th>
                          <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tractorRentals.map((log) => {
                          const isSettled = log.status === 'settled';

                          return (
                            <tr key={log.id} className="ledger-tr">
                              <td className="ledger-td" style={{ fontSize: '0.82rem', color: '#475569' }}>
                                {log.work_date}
                              </td>
                              <td className="ledger-td">
                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{log.tractor_name}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{log.vendor_name}</div>
                              </td>
                              <td className="ledger-td" style={{ fontSize: '0.8rem', color: '#475569' }}>
                                {log.task_name}
                              </td>
                              <td className="ledger-td" style={{ fontWeight: 700 }}>
                                {log.hours_worked} hrs
                              </td>
                              <td className="ledger-td" style={{ color: '#475569' }}>
                                ₹{log.hourly_rate}/hr
                              </td>
                              <td className="ledger-td" style={{ fontWeight: 800 }}>
                                ₹{log.gross_amount}
                              </td>
                              <td className="ledger-td" style={{ color: '#2563eb' }}>
                                ₹{log.advance_amount}
                              </td>
                              <td className="ledger-td">
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  background: isSettled ? '#dcfce7' : '#fef3c7',
                                  color: isSettled ? '#16a34a' : '#b45309',
                                  border: `1px solid ${isSettled ? '#86efac' : '#fde68a'}`,
                                }}>
                                  {isSettled ? '✓ Settled' : `Due: ₹${log.rest_amount}`}
                                </span>
                              </td>
                              <td className="ledger-td" style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  {!isSettled && log.rest_amount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleSettleRental(log.id)}
                                      className="ledger-action-btn ledger-action-btn-primary"
                                      style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                    >
                                      Settle Due
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRental(log.id)}
                                    className="ledger-action-btn ledger-action-btn-danger"
                                    style={{ padding: '4px 6px' }}
                                    title="Delete Log"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Tractor Rows */}
                <div className="ledger-mobile-only">
                  {tractorRentals.map((log) => {
                    const isSettled = log.status === 'settled';

                    return (
                      <div key={log.id} className="ledger-mobile-row">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{log.tractor_name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{log.work_date} • {log.vendor_name}</div>
                          </div>

                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: isSettled ? '#dcfce7' : '#fef3c7',
                            color: isSettled ? '#16a34a' : '#b45309',
                            border: `1px solid ${isSettled ? '#86efac' : '#fde68a'}`,
                          }}>
                            {isSettled ? 'Settled' : `Due: ₹${log.rest_amount}`}
                          </span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6, fontSize: '0.76rem', color: '#475569', marginBottom: 8 }}>
                          <div>{log.hours_worked} hrs @ ₹{log.hourly_rate}/hr = <strong>₹{log.gross_amount} Gross</strong></div>
                          <div>Advance Paid: ₹{log.advance_amount} • Task: {log.task_name}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {!isSettled && log.rest_amount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSettleRental(log.id)}
                              className="ledger-action-btn ledger-action-btn-primary"
                              style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                            >
                              Settle (₹{log.rest_amount})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteRental(log.id)}
                            className="ledger-action-btn ledger-action-btn-danger"
                            style={{ padding: '6px 8px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* =========================================================================
          SECTION 5: WORKER ROSTER
          ========================================================================= */}
      {activeSection === 'labours' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', margin: '0 0 3px 0', color: '#143823', fontWeight: 800 }}>
                Farm Crew Directory ({labourers.length} Labourers)
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#4b6354', fontWeight: 600 }}>
                Manage registered labourers, wage rates & view monthly attendance records
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="ledger-action-btn ledger-action-btn-primary"
              style={{ padding: '8px 14px' }}
            >
              <UserPlus size={15} />
              <span>+ Add New Labour</span>
            </button>
          </div>

          {labSuccessMsg && (
            <div style={{ background: '#dcfce7', border: '2px solid #86efac', color: '#14532d', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>{labSuccessMsg}</span>
            </div>
          )}

          {/* Desktop Labourers Table */}
          <div className="ledger-desktop-only">
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-th">Code</th>
                    <th className="ledger-th">Full Name</th>
                    <th className="ledger-th">Daily Wage</th>
                    <th className="ledger-th">Phone</th>
                    <th className="ledger-th">Khata Due</th>
                    <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labourers.map((lab) => {
                    const bal = dataService.getLabourerAdvanceBalance(lab.id);

                    return (
                      <tr key={lab.id} className="ledger-tr">
                        <td className="ledger-td" style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800 }}>
                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                            {lab.labour_code}
                          </span>
                        </td>
                        <td className="ledger-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                              color: '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              border: '1.5px solid #86efac',
                              flexShrink: 0
                            }}>
                              {lab.full_name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 800, color: '#143823' }}>{lab.full_name}</span>
                          </div>
                        </td>
                        <td className="ledger-td" style={{ fontWeight: 800, color: '#15803d' }}>
                          ₹{lab.base_rate}/day
                        </td>
                        <td className="ledger-td" style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                          {lab.phone || '—'}
                        </td>
                        <td className="ledger-td">
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: bal.outstanding > 0 ? '#fef3c7' : '#f0fdf4',
                            color: bal.outstanding > 0 ? '#b45309' : '#15803d',
                            border: `1px solid ${bal.outstanding > 0 ? '#fde68a' : '#bbf7d0'}`
                          }}>
                            {bal.outstanding > 0 ? `₹${bal.outstanding}` : 'Clear'}
                          </span>
                        </td>
                        <td className="ledger-td" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedLabourerForCalendar(lab)}
                              className="ledger-action-btn ledger-action-btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                            >
                              <Calendar size={13} color="#15803d" />
                              <span>Monthly Calendar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmLab(lab)}
                              className="ledger-action-btn ledger-action-btn-danger"
                              style={{ padding: '5px 8px' }}
                              title="Remove Worker"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Labourers Rows */}
          <div className="ledger-mobile-only">
            {labourers.map((lab) => {
              const bal = dataService.getLabourerAdvanceBalance(lab.id);

              return (
                <div key={lab.id} className="ledger-mobile-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        border: '1.5px solid #86efac',
                        flexShrink: 0
                      }}>
                        {lab.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#143823' }}>{lab.full_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#4b6354', fontWeight: 600 }}>
                          {lab.labour_code} • ₹{lab.base_rate}/day
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: bal.outstanding > 0 ? '#fef3c7' : '#f0fdf4',
                      color: bal.outstanding > 0 ? '#b45309' : '#15803d',
                      border: `1px solid ${bal.outstanding > 0 ? '#fde68a' : '#bbf7d0'}`
                    }}>
                      {bal.outstanding > 0 ? `Due: ₹${bal.outstanding}` : 'Clear'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #dcfce7' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedLabourerForCalendar(lab)}
                      className="ledger-action-btn ledger-action-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                    >
                      <Calendar size={13} color="#15803d" />
                      <span>Monthly Calendar & Numbers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmLab(lab)}
                      className="ledger-action-btn ledger-action-btn-danger"
                      style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          NATIVE MOBILE FIXED BOTTOM NAVIGATION BAR
          ========================================================================= */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeSection === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveSection('attendance')}
        >
          <CalendarCheck size={18} />
          <span>Attendance</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeSection === 'advance' ? 'active' : ''}`}
          onClick={() => setActiveSection('advance')}
        >
          <Wallet size={18} />
          <span>Advance</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeSection === 'payday' ? 'active' : ''}`}
          onClick={() => setActiveSection('payday')}
        >
          <CreditCard size={18} />
          <span>Payday</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeSection === 'tractor' ? 'active' : ''}`}
          onClick={() => setActiveSection('tractor')}
        >
          <Tractor size={18} />
          <span>Tractor</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-nav-item ${activeSection === 'labours' ? 'active' : ''}`}
          onClick={() => setActiveSection('labours')}
        >
          <Users size={18} />
          <span>Workers</span>
        </button>
      </nav>

      {/* =========================================================================
          ADD LABOUR MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="ledger-card"
            style={{ maxWidth: 440, width: '100%', padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>Add New Labourer</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLabour}>
              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Patil"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="ledger-input"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Daily Wage Rate (₹/day) *</label>
                <input
                  type="number"
                  step="10"
                  min="50"
                  placeholder="e.g. 450"
                  value={newLabRate}
                  onChange={(e) => setNewLabRate(Number(e.target.value))}
                  className="ledger-input"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newLabPhone}
                  onChange={(e) => setNewLabPhone(e.target.value)}
                  className="ledger-input"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="ledger-label">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vineyard specialist"
                  value={newLabNotes}
                  onChange={(e) => setNewLabNotes(e.target.value)}
                  className="ledger-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ledger-action-btn ledger-action-btn-primary"
                  style={{ flex: 2, padding: '10px' }}
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          REMOVE LABOUR CONFIRMATION MODAL
          ========================================================================= */}
      {deleteConfirmLab && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setDeleteConfirmLab(null)}
        >
          <div
            className="ledger-card"
            style={{ maxWidth: 380, width: '100%', padding: 20, textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#991b1b', fontWeight: 800 }}>
              Remove Labourer?
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.84rem' }}>
              Are you sure you want to remove <strong>{deleteConfirmLab.full_name}</strong> ({deleteConfirmLab.labour_code}) from the active farm crew?
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmLab(null)}
                className="ledger-action-btn ledger-action-btn-secondary"
                style={{ flex: 1, padding: '9px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRemoveLabour(deleteConfirmLab.id)}
                className="ledger-action-btn ledger-action-btn-danger"
                style={{ flex: 1, padding: '9px' }}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Attendance Calendar & Numbers Modal */}
      <LabourAttendanceCalendarModal
        isOpen={!!selectedLabourerForCalendar}
        onClose={() => setSelectedLabourerForCalendar(null)}
        labourer={selectedLabourerForCalendar}
        onAdvanceClick={(labId) => {
          setAdvLabId(labId);
          setActiveSection('advance');
        }}
        onAttendanceUpdated={() => {
          loadData();
        }}
      />
    </div>
  );
};

export default SimpleFarmViewPage;
