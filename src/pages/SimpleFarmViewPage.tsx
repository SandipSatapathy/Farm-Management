import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { dataService, round2 } from '../lib/dataService';
import { Labourer, AttendanceStatus, TractorRentalLog, Advance, SalarySettlement, PaymentMethod, SalaryPeriodType, PayFrequency } from '../types';
import { LabourAttendanceCalendarModal } from '../components/common/LabourAttendanceCalendarModal';
import { generateReportPDF, PDFGenerationResult } from '../lib/pdfGenerator';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
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
  ChevronRight,
  RefreshCw,
  FileDown,
  Download,
  Sliders,
  UserCog,
  Edit2,
  RotateCcw,
  FileText,
  Share2,
  ExternalLink
} from 'lucide-react';
import { UserSettingsPage } from './UserSettingsPage';

type RoutineSection = 'attendance' | 'advance' | 'payday' | 'tractor' | 'labours' | 'settings';

export const SimpleFarmViewPage: React.FC = () => {
  const { farm, currentUser } = useAuth();
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const [allLabourers, setAllLabourers] = useState<Labourer[]>([]);
  const [crewFilter, setCrewFilter] = useState<'active' | 'deactivated' | 'all'>('all');
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');
  // Dynamic Real-Time Date Engine
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = now.toLocaleDateString('en-CA');

  // Active section state
  const [activeSection, setActiveSection] = useState<RoutineSection>('attendance');

  // Selected labourer for monthly calendar modal view
  const [selectedLabourerForCalendar, setSelectedLabourerForCalendar] = useState<Labourer | null>(null);

  // Attendance View Mode: 'list' (current daily sheet) | 'calendar' (monthly interactive calendar)
  const [attendanceViewMode, setAttendanceViewMode] = useState<'list' | 'calendar'>('list');
  const [attendanceDate, setAttendanceDate] = useState(today);

  // Calendar View states
  const [calYear, setCalYear] = useState<number>(currentYear);
  const [calMonth, setCalMonth] = useState<number>(currentMonth);
  const [calWorkerId, setCalWorkerId] = useState<string>('all');
  const [calSelectedDate, setCalSelectedDate] = useState<string>(today);
  const [calDayAttendance, setCalDayAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [calSavedMsg, setCalSavedMsg] = useState('');
  const [calMonthRecords, setCalMonthRecords] = useState<any[]>([]);

  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [attSaved, setAttSaved] = useState(false);

  // Advance state
  const [advLabId, setAdvLabId] = useState('');
  const [advAmount, setAdvAmount] = useState<number>(500);
  const [advDate, setAdvDate] = useState<string>(today);
  const [advGivenBy, setAdvGivenBy] = useState<string>(currentUser?.name || '');
  const [advSuccess, setAdvSuccess] = useState(false);
  const [recentAdvances, setRecentAdvances] = useState<Advance[]>([]);
  const [advFilterYear, setAdvFilterYear] = useState<number>(currentYear);
  const [advFilterMonth, setAdvFilterMonth] = useState<number | 'all'>(currentMonth);

  // Edit Advance state
  const [editingAdv, setEditingAdv] = useState<Advance | null>(null);
  const [editAdvLabId, setEditAdvLabId] = useState('');
  const [editAdvAmount, setEditAdvAmount] = useState<number>(500);
  const [editAdvDate, setEditAdvDate] = useState<string>(today);
  const [editAdvGivenBy, setEditAdvGivenBy] = useState<string>(currentUser?.name || '');
  const [editAdvPurpose, setEditAdvPurpose] = useState<string>('Field work cash advance');
  const [editAdvMethod, setEditAdvMethod] = useState<PaymentMethod>('cash');
  const [editAdvRef, setEditAdvRef] = useState<string>('');

  // Settlement state
  const [settledLabId, setSettledLabId] = useState<string | null>(null);
  const [salaryPeriodType, setSalaryPeriodType] = useState<SalaryPeriodType>('monthly');
  const [salaryWorkerFilter, setSalaryWorkerFilter] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [salaryYear, setSalaryYear] = useState<number>(currentYear);
  const [salaryMonth, setSalaryMonth] = useState<number>(currentMonth);

  // Helper date functions for Weekly & Range Payouts
  const getMondayDateStr = (dateObj: Date): string => {
    const d = new Date(dateObj);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toLocaleDateString('en-CA');
  };
  const addDaysToDateStr = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-CA');
  };

  const [salaryWeekStart, setSalaryWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toLocaleDateString('en-CA');
  });
  const [salaryCustomStart, setSalaryCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toLocaleDateString('en-CA');
  });
  const [salaryCustomEnd, setSalaryCustomEnd] = useState<string>(today);
  const [salaryGivenBy, setSalaryGivenBy] = useState<string>(currentUser?.name || '');
  const [salarySettlements, setSalarySettlements] = useState<SalarySettlement[]>([]);
  const [salarySettledSuccessMsg, setSalarySettledSuccessMsg] = useState('');

  // Settle Salary Modal state
  const [settleModalLab, setSettleModalLab] = useState<{
    lab: Labourer;
    periodType: SalaryPeriodType;
    startDate: string;
    endDate: string;
    periodLabel: string;
    netPay: number;
    grossWage: number;
    advanceDue: number;
    advanceDeducted: number;
    daysWorked: number;
    dailyRate: number;
  } | null>(null);
  const [settleAdvanceDeduct, setSettleAdvanceDeduct] = useState<number>(0);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleGivenBy, setSettleGivenBy] = useState<string>(currentUser?.name || '');
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('cash');
  const [settleDate, setSettleDate] = useState<string>(today);
  const [settleNotes, setSettleNotes] = useState<string>('');

  // Edit Salary Settlement Modal state
  const [editingSalarySettlement, setEditingSalarySettlement] = useState<SalarySettlement | null>(null);
  const [editSalaryAmount, setEditSalaryAmount] = useState<number>(0);
  const [editSalaryGivenBy, setEditSalaryGivenBy] = useState<string>(currentUser?.name || '');
  const [editSalaryMethod, setEditSalaryMethod] = useState<PaymentMethod>('cash');
  const [editSalaryDate, setEditSalaryDate] = useState<string>(today);
  const [editSalaryNotes, setEditSalaryNotes] = useState<string>('');

  // Hired Tractor Rental State (Purely Hired / Rented — Zero Owned Tractors)
  const [tractorRentals, setTractorRentals] = useState<TractorRentalLog[]>([]);
  const [tractorDateFilter, setTractorDateFilter] = useState<string>('all');
  const [isNewRentalOpen, setIsNewRentalOpen] = useState(false);
  const [rentalDate, setRentalDate] = useState(today);
  const [rentalTractorName, setRentalTractorName] = useState('');
  const [rentalVendorName, setRentalVendorName] = useState('');
  const [rentalHours, setRentalHours] = useState<number>(4.0);
  const [rentalRate, setRentalRate] = useState<number>(900);
  const [rentalAdvance, setRentalAdvance] = useState<number>(0);
  const [rentalTask, setRentalTask] = useState('');
  const [rentalNotes, setRentalNotes] = useState('');
  const [tractorSuccessMsg, setTractorSuccessMsg] = useState('');

  // Labourer Management state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLabourer, setEditingLabourer] = useState<Labourer | null>(null);
  const [editLabName, setEditLabName] = useState('');
  const [editLabCode, setEditLabCode] = useState('');
  const [editLabRate, setEditLabRate] = useState<number>(450);
  const [editLabPhone, setEditLabPhone] = useState('');
  const [editLabNotes, setEditLabNotes] = useState('');
  const [editLabActive, setEditLabActive] = useState<boolean>(true);
  const [deleteConfirmLab, setDeleteConfirmLab] = useState<Labourer | null>(null);
  const [newLabName, setNewLabName] = useState('');
  const [newLabRate, setNewLabRate] = useState<number>(450);
  const [newLabPhone, setNewLabPhone] = useState('');
  const [newLabNotes, setNewLabNotes] = useState('');
  const [labSuccessMsg, setLabSuccessMsg] = useState('');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState('');
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [pdfSuccessMsg, setPdfSuccessMsg] = useState('');
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PDFGenerationResult | null>(null);

  // Modal navigation lock: when ANY popup, modal or card is opened, the user cannot move to different tabs or navigation
  const isAnyModalOpen = Boolean(
    isAddModalOpen ||
    isNewRentalOpen ||
    isPdfExportModalOpen ||
    settleModalLab ||
    editingAdv ||
    editingSalarySettlement ||
    editingLabourer ||
    deleteConfirmLab ||
    selectedLabourerForCalendar ||
    pdfPreviewResult
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  const handleManualSyncSheets = async () => {
    setIsSyncingSheets(true);
    try {
      const res = await dataService.triggerSync();
      setSheetsSyncMsg(res.message || 'Synced to Google Sheets!');
      setTimeout(() => setSheetsSyncMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Google Sheets sync failed');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const refreshCalMonthRecords = () => {
    const monthStr = `${calYear}-${String(calMonth).padStart(2, '0')}`;
    const days = new Date(calYear, calMonth, 0).getDate();
    const recs = dataService.getAttendanceBetween(`${monthStr}-01`, `${monthStr}-${String(days).padStart(2, '0')}`);
    setCalMonthRecords(recs);
  };

  const loadData = () => {
    const activeLabs = dataService.getLabourers(true);
    const allLabs = dataService.getLabourers(false);
    setLabourers(activeLabs);
    setAllLabourers(allLabs);

    if (activeLabs.length > 0 && (!advLabId || !activeLabs.some(l => l.id === advLabId))) {
      setAdvLabId(activeLabs[0].id);
    } else if (activeLabs.length === 0 && allLabs.length > 0 && (!advLabId || !allLabs.some(l => l.id === advLabId))) {
      setAdvLabId(allLabs[0].id);
    }

    const currentAtt = dataService.getAttendanceForDate(attendanceDate);
    const map: Record<string, AttendanceStatus> = {};
    activeLabs.forEach((l) => {
      const rec = currentAtt.find((a) => a.labourer_id === l.id);
      map[l.id] = rec ? rec.status : 'present';
    });
    setAttendance(map);

    setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
    setRecentAdvances(dataService.getAdvances());
    setSalarySettlements(dataService.getSalarySettlements());
    refreshCalMonthRecords();
  };

  const handleLiveSync = async (silent = false) => {
    if (!silent) setIsSyncingLive(true);
    try {
      await dataService.fetchLiveAll();
      loadData();
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      if (!silent) setIsSyncingLive(false);
    }
  };

  useEffect(() => {
    loadData();
    handleLiveSync(true);

    const handleDataUpdated = () => {
      loadData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleLiveSync(true);
      }
    };

    // Fast live background polling (every 3 seconds) so changes on web/app reflect near instantly
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleLiveSync(true);
      }
    }, 3000);

    window.addEventListener('farmlog-data-updated', handleDataUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('farmlog-data-updated', handleDataUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
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

  useEffect(() => {
    setSalarySettlements(dataService.getSalarySettlements());
  }, [salaryYear, salaryMonth, salaryPeriodType, salaryWeekStart, salaryCustomStart, salaryCustomEnd]);

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

  const handleSaveAttendance = async () => {
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

    try {
      await dataService.recordAttendance(records, currentUser?.name || 'Farm Team');
      setAttSaved(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
      setTimeout(() => setAttSaved(false), 2500);
      refreshCalMonthRecords();
    } catch (err: any) {
      alert(err.message || 'Error saving attendance');
    }
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
    const n = new Date();
    setCalYear(n.getFullYear());
    setCalMonth(n.getMonth() + 1);
    setCalSelectedDate(n.toLocaleDateString('en-CA'));
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
  const advMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleAdvPrevMonth = () => {
    if (advFilterMonth === 'all') {
      setAdvFilterMonth(10);
      return;
    }
    if (advFilterMonth === 1) {
      setAdvFilterMonth(12);
      setAdvFilterYear((y) => y - 1);
    } else {
      setAdvFilterMonth((m) => (m as number) - 1);
    }
  };

  const handleAdvNextMonth = () => {
    if (advFilterMonth === 'all') {
      setAdvFilterMonth(10);
      return;
    }
    if (advFilterMonth === 12) {
      setAdvFilterMonth(1);
      setAdvFilterYear((y) => y + 1);
    } else {
      setAdvFilterMonth((m) => (m as number) + 1);
    }
  };

  const handleGiveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (advAmount <= 0) return;

    const person = advGivenBy.trim() || currentUser?.name || 'Owner';

    try {
      await dataService.issueAdvance({
        labourer_id: advLabId,
        amount: advAmount,
        payment_method: 'cash',
        purpose: 'Field work cash advance',
        issued_by: person,
        issued_at: advDate ? `${advDate}T12:00:00.000Z` : new Date().toISOString()
      });

      setAdvSuccess(true);
      setAdvAmount(500);
      loadData();
      setTimeout(() => setAdvSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error recording advance');
    }
  };

  const handleDeleteAdvance = async (advId: string) => {
    if (!window.confirm('Delete this advance record? This will restore the worker balance.')) return;
    try {
      await dataService.deleteAdvance(advId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting advance');
    }
  };

  const handleOpenEditAdvance = (adv: Advance) => {
    setEditingAdv(adv);
    setEditAdvLabId(adv.labourer_id);
    setEditAdvAmount(adv.amount);
    setEditAdvDate(adv.issued_at ? adv.issued_at.slice(0, 10) : today);
    setEditAdvGivenBy(adv.issued_by || advGivenBy || currentUser?.name || '');
    setEditAdvPurpose(adv.purpose || 'Field work cash advance');
    setEditAdvMethod(adv.payment_method || 'cash');
    setEditAdvRef(adv.payment_reference || '');
  };

  const handleSaveEditAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdv) return;
    if (editAdvAmount <= 0) {
      alert('Advance amount must be greater than zero');
      return;
    }

    try {
      await dataService.updateAdvance(editingAdv.id, {
        labourer_id: editAdvLabId,
        amount: editAdvAmount,
        issued_at: editAdvDate ? `${editAdvDate}T12:00:00.000Z` : undefined,
        issued_by: editAdvGivenBy.trim() || currentUser?.name || 'Owner',
        purpose: editAdvPurpose,
        payment_method: editAdvMethod,
        payment_reference: editAdvRef
      });
      setEditingAdv(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating advance');
    }
  };

  const formatWeekLabel = (startDateStr: string, endDateStr: string): string => {
    try {
      const d1 = new Date(startDateStr + 'T00:00:00');
      const d2 = new Date(endDateStr + 'T00:00:00');
      const s1 = d1.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const s2 = d2.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${s1} – ${s2}`;
    } catch {
      return `${startDateStr} to ${endDateStr}`;
    }
  };

  // Salary Period & Date Range Calculations
  const salaryWeekEnd = addDaysToDateStr(salaryWeekStart, 6);
  const salaryMonthDays = new Date(salaryYear, salaryMonth, 0).getDate();
  const salaryMonthStartDate = `${salaryYear}-${String(salaryMonth).padStart(2, '0')}-01`;
  const salaryMonthEndDate = `${salaryYear}-${String(salaryMonth).padStart(2, '0')}-${String(salaryMonthDays).padStart(2, '0')}`;

  const effectiveSalaryStartDate = salaryPeriodType === 'monthly'
    ? salaryMonthStartDate
    : (salaryPeriodType === 'weekly' ? salaryWeekStart : salaryCustomStart);

  const effectiveSalaryEndDate = salaryPeriodType === 'monthly'
    ? salaryMonthEndDate
    : (salaryPeriodType === 'weekly' ? salaryWeekEnd : salaryCustomEnd);

  const salaryMonthName = new Date(salaryYear, salaryMonth - 1, 1).toLocaleString('default', { month: 'long' });

  const effectivePeriodLabel = salaryPeriodType === 'monthly'
    ? `${salaryMonthName} ${salaryYear}`
    : (salaryPeriodType === 'weekly' ? formatWeekLabel(salaryWeekStart, salaryWeekEnd) : `${salaryCustomStart} to ${salaryCustomEnd}`);

  const effectivePeriodSubtitle = salaryPeriodType === 'monthly'
    ? `Monthly Cycle: 1 ${salaryMonthName} – ${salaryMonthDays} ${salaryMonthName} ${salaryYear}`
    : (salaryPeriodType === 'weekly' ? `Weekly Cycle: ${effectivePeriodLabel}` : `Custom Range: ${effectivePeriodLabel}`);

  // Salary Settlement Handlers
  const handleSalaryPrevMonth = () => {
    if (salaryMonth === 1) {
      setSalaryMonth(12);
      setSalaryYear((y) => y - 1);
    } else {
      setSalaryMonth((m) => m - 1);
    }
  };

  const handleSalaryNextMonth = () => {
    if (salaryMonth === 12) {
      setSalaryMonth(1);
      setSalaryYear((y) => y + 1);
    } else {
      setSalaryMonth((m) => m + 1);
    }
  };

  const handleSalaryCurrentMonth = () => {
    const n = new Date();
    setSalaryYear(n.getFullYear());
    setSalaryMonth(n.getMonth() + 1);
  };

  const handleSalaryPrevWeek = () => {
    setSalaryWeekStart((prev) => addDaysToDateStr(prev, -7));
  };

  const handleSalaryNextWeek = () => {
    setSalaryWeekStart((prev) => addDaysToDateStr(prev, 7));
  };

  const handleSalaryCurrentWeek = () => {
    setSalaryWeekStart(getMondayDateStr(new Date()));
  };

  const handleSalaryLastWeek = () => {
    const curMon = getMondayDateStr(new Date());
    setSalaryWeekStart(addDaysToDateStr(curMon, -7));
  };

  const handleOpenSettleModal = (row: any) => {
    setSettleModalLab({
      lab: row.labourer,
      periodType: salaryPeriodType,
      startDate: effectiveSalaryStartDate,
      endDate: effectiveSalaryEndDate,
      periodLabel: effectivePeriodLabel,
      netPay: row.netTakeHome,
      grossWage: row.grossWage,
      advanceDue: row.advanceDue,
      advanceDeducted: row.advanceDeducted,
      daysWorked: row.daysWorked,
      dailyRate: row.dailyRate
    });
    setSettleAdvanceDeduct(row.advanceDeducted);
    setSettleAmount(row.netTakeHome);
    setSettleGivenBy(salaryGivenBy || currentUser?.name || '');
    setSettleMethod('cash');
    setSettleDate(today);
    setSettleNotes('');
  };

  const handleConfirmSettleSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalLab) return;
    if (settleAmount < 0) {
      alert('Payout amount cannot be negative');
      return;
    }

    try {
      const payer = settleGivenBy.trim() || salaryGivenBy || currentUser?.name || 'Owner';
      await dataService.settleSalary({
        labourer_id: settleModalLab.lab.id,
        period_type: settleModalLab.periodType,
        start_date: settleModalLab.startDate,
        end_date: settleModalLab.endDate,
        year: salaryYear,
        month: salaryMonth,
        days_worked: settleModalLab.daysWorked,
        daily_rate: settleModalLab.dailyRate,
        gross_wage: settleModalLab.grossWage,
        advance_deducted: settleAdvanceDeduct,
        net_payable: settleAmount,
        paid_amount: settleAmount,
        given_by: payer,
        payment_method: settleMethod,
        payment_date: settleDate,
        notes: settleNotes
      });

      setSettledLabId(settleModalLab.lab.id);
      setSalarySettledSuccessMsg(`Payout of ₹${settleAmount.toLocaleString('en-IN')} marked as paid for ${settleModalLab.lab.full_name} (${settleModalLab.periodLabel}) — Given by: ${payer}`);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
      setSettleModalLab(null);
      loadData();
      setTimeout(() => {
        setSettledLabId(null);
        setSalarySettledSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Error recording salary payout');
    }
  };

  const handleOpenEditSalary = (settlement: SalarySettlement) => {
    setEditingSalarySettlement(settlement);
    setEditSalaryAmount(settlement.paid_amount);
    setEditSalaryGivenBy(settlement.given_by || salaryGivenBy || currentUser?.name || '');
    setEditSalaryMethod(settlement.payment_method || 'cash');
    setEditSalaryDate(settlement.payment_date || today);
    setEditSalaryNotes(settlement.notes || '');
  };

  const handleUpdateSalarySettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalarySettlement) return;
    if (editSalaryAmount < 0) {
      alert('Payout amount cannot be negative');
      return;
    }

    try {
      await dataService.updateSalarySettlement(editingSalarySettlement.id, {
        paid_amount: editSalaryAmount,
        given_by: editSalaryGivenBy.trim() || currentUser?.name || 'Owner',
        payment_method: editSalaryMethod,
        payment_date: editSalaryDate,
        notes: editSalaryNotes
      });
      setEditingSalarySettlement(null);
      loadData();
      setSalarySettledSuccessMsg(`Updated salary settlement for ${editingSalarySettlement.labourer_name}`);
      setTimeout(() => setSalarySettledSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating salary settlement');
    }
  };

  const handleDeleteSalarySettlement = async (settlementId: string) => {
    if (!window.confirm('Revert this salary payout to Unpaid? This will reopen the payment for this worker.')) return;
    try {
      await dataService.deleteSalarySettlement(settlementId);
      if (editingSalarySettlement?.id === settlementId) {
        setEditingSalarySettlement(null);
      }
      loadData();
      setSalarySettledSuccessMsg('Salary settlement reverted to Unpaid.');
      setTimeout(() => setSalarySettledSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error deleting salary settlement');
    }
  };

  // Tractor Handlers
  const handleSaveTractorRental = async (e: React.FormEvent) => {
    e.preventDefault();
    const gross = round2(rentalHours * rentalRate);
    const rest = round2(Math.max(0, gross - rentalAdvance));

    try {
      const newLog = await dataService.saveTractorRental({
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
    } catch (err: any) {
      alert(err.message || 'Error saving tractor rental');
    }
  };

  const handleSettleRental = async (rentalId: string) => {
    try {
      await dataService.settleTractorRental(rentalId);
      setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
      setTractorSuccessMsg('Tractor rental balance settled in full.');
      setTimeout(() => setTractorSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error settling tractor rental');
    }
  };

  const handleDeleteRental = async (rentalId: string) => {
    if (confirm('Delete this hired tractor rental log?')) {
      try {
        await dataService.deleteTractorRental(rentalId);
        setTractorRentals(dataService.getTractorRentals(tractorDateFilter));
      } catch (err: any) {
        alert(err.message || 'Error deleting tractor rental');
      }
    }
  };

  // Labour Management Handlers
  const handleAddLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;

    try {
      const added = await dataService.saveLabourer({
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

  const handleOpenEditLabourer = (lab: Labourer) => {
    setEditingLabourer(lab);
    setEditLabName(lab.full_name);
    setEditLabCode(lab.labour_code);
    setEditLabRate(lab.base_rate);
    setEditLabPhone(lab.phone || '');
    setEditLabNotes(lab.notes || '');
    setEditLabActive(lab.is_active);
  };

  const handleUpdateLabourer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabourer || !editLabName.trim()) return;

    if (editLabRate <= 0) {
      alert('Daily wage rate must be greater than zero.');
      return;
    }

    try {
      const updated = await dataService.saveLabourer({
        id: editingLabourer.id,
        labour_code: editLabCode.trim().toUpperCase() || editingLabourer.labour_code,
        full_name: editLabName.trim(),
        base_rate: Number(editLabRate),
        phone: editLabPhone.trim() || undefined,
        notes: editLabNotes.trim() || undefined,
        is_active: editLabActive,
      });

      setEditingLabourer(null);
      loadData();
      setLabSuccessMsg(`Labourer ${updated.full_name} (${updated.labour_code}) updated successfully.`);
      setTimeout(() => setLabSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'Error updating labourer details');
    }
  };

  const handleToggleLabourActive = async (labId: string) => {
    try {
      const updated = await dataService.toggleLabourerActive(labId);
      loadData();
      setLabSuccessMsg(`Labourer ${updated.full_name} is now ${updated.is_active ? 'Active' : 'Deactivated'}.`);
      setTimeout(() => setLabSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating labourer status');
    }
  };

  const handleConfirmRemoveLabour = async (labId: string) => {
    try {
      await dataService.removeLabourer(labId);
      setDeleteConfirmLab(null);
      loadData();
      setLabSuccessMsg('Labourer deleted permanently.');
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

  // Salary Calculations (Option 1: View-Level Cycle Toggle - Weekly, Monthly, or Custom Range)
  const eligibleSalaryLabourers = allLabourers.filter((lab) => {
    if (lab.is_active) return true;
    const { summary } = dataService.getLabourerDateRangeAttendance(lab.id, effectiveSalaryStartDate, effectiveSalaryEndDate);
    const advanceInfo = dataService.getLabourerAdvanceBalance(lab.id);
    return summary.effectiveDays > 0 || advanceInfo.outstanding > 0;
  });

  const displaySalaryLabourers = eligibleSalaryLabourers.length > 0
    ? eligibleSalaryLabourers
    : (allLabourers.length > 0 ? allLabourers : labourers);

  const salaryRows = displaySalaryLabourers.map((lab) => {
    const { summary } = dataService.getLabourerDateRangeAttendance(lab.id, effectiveSalaryStartDate, effectiveSalaryEndDate);
    const advanceInfo = dataService.getLabourerAdvanceBalance(lab.id);
    const daysWorked = summary.effectiveDays;
    const dailyRate = lab.base_rate;
    const grossWage = summary.grossEarned;
    const advanceDue = advanceInfo.outstanding;
    const advanceDeducted = round2(Math.min(advanceDue, grossWage));
    const calculatedNet = round2(Math.max(0, grossWage - advanceDeducted));

    // Match settlement by period_type and corresponding dates / month
    const settlement = salarySettlements.find((s) => {
      if (s.labourer_id !== lab.id) return false;
      if (salaryPeriodType === 'monthly') {
        return (s.period_type === 'monthly' && s.year === salaryYear && s.month === salaryMonth) ||
               (!s.period_type && s.year === salaryYear && s.month === salaryMonth) ||
               (s.start_date === effectiveSalaryStartDate && s.end_date === effectiveSalaryEndDate);
      } else if (salaryPeriodType === 'weekly') {
        return s.period_type === 'weekly' && s.start_date === effectiveSalaryStartDate && s.end_date === effectiveSalaryEndDate;
      } else {
        return s.period_type === 'custom' && s.start_date === effectiveSalaryStartDate && s.end_date === effectiveSalaryEndDate;
      }
    });

    const isSettled = Boolean(settlement);

    return {
      labourer: lab,
      dailyRate,
      daysWorked,
      grossWage,
      advanceDue,
      advanceDeducted,
      calculatedNet,
      netTakeHome: settlement ? settlement.paid_amount : calculatedNet,
      isSettled,
      settlement,
      presentDays: summary.presentDays,
      halfDays: summary.halfDays
    };
  });

  const totalCrewDaysWorked = round2(salaryRows.reduce((sum, r) => sum + r.daysWorked, 0));
  const totalGrossWages = round2(salaryRows.reduce((sum, r) => sum + r.grossWage, 0));
  const totalAdvancesDeducted = round2(salaryRows.reduce((sum, r) => sum + r.advanceDeducted, 0));
  const totalNetTakeHome = round2(salaryRows.reduce((sum, r) => sum + r.netTakeHome, 0));

  // Advance Month Calculations
  const advMonthPrefix = advFilterMonth !== 'all' ? `${advFilterYear}-${String(advFilterMonth).padStart(2, '0')}` : null;
  const filteredAdvances = recentAdvances.filter((a) => {
    if (!a.issued_at) return false;
    if (advFilterMonth === 'all') {
      return a.issued_at.startsWith(`${advFilterYear}`);
    }
    return a.issued_at.startsWith(advMonthPrefix!);
  });

  const totalAdvanceInFilteredPeriod = round2(
    filteredAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
  );

  const uniqueWorkersWithAdvance = new Set(filteredAdvances.map((a) => a.labourer_id)).size;

  const totalOverallDue = round2(
    allLabourers.reduce((sum, l) => sum + dataService.getLabourerAdvanceBalance(l.id).outstanding, 0)
  );

  // Map each worker's advance total in the selected month
  const workerMonthAdvanceMap = new Map<string, number>();
  filteredAdvances.forEach((a) => {
    const prev = workerMonthAdvanceMap.get(a.labourer_id) || 0;
    workerMonthAdvanceMap.set(a.labourer_id, round2(prev + (Number(a.amount) || 0)));
  });

  const advanceLabourers = allLabourers.filter(
    (l) => l.is_active || dataService.getLabourerAdvanceBalance(l.id).totalIssued > 0 || (workerMonthAdvanceMap.get(l.id) || 0) > 0
  );
  const displayAdvanceLabourers = advanceLabourers.length > 0 ? advanceLabourers : (allLabourers.length > 0 ? allLabourers : labourers);

  const currentAdvMonthLabel = advFilterMonth === 'all'
    ? `All Months (${advFilterYear})`
    : `${advMonthNames[(advFilterMonth as number) - 1]} ${advFilterYear}`;

  // PDF Export Handlers for Simple View
  const triggerPdfSuccess = (res: PDFGenerationResult) => {
    setPdfPreviewResult(res);
    setPdfSuccessMsg(`Exported PDF: ${res.filename}`);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => setPdfSuccessMsg(''), 4500);
  };

  const handleExportDailyAttendancePdf = async (targetDate: string = attendanceDate) => {
    const dayAtt = dataService.getAttendanceForDate(targetDate);
    let pCount = 0;
    let hCount = 0;
    let aCount = 0;
    let estWages = 0;

    const rows = labourers.map((lab, index) => {
      const rec = dayAtt.find((a) => a.labourer_id === lab.id);
      const st: AttendanceStatus = (targetDate === attendanceDate && attendance[lab.id]) ? attendance[lab.id] : (rec ? rec.status : 'present');

      let units = 0;
      let statusLabel = 'Present (Full Day)';
      if (st === 'present') {
        units = 1;
        pCount++;
      } else if (st === 'half_day') {
        units = 0.5;
        hCount++;
        statusLabel = 'Half Day';
      } else if (st === 'absent') {
        units = 0;
        aCount++;
        statusLabel = 'Absent';
      } else {
        units = 0;
        aCount++;
        statusLabel = st.toUpperCase();
      }

      const wage = round2(units * lab.base_rate);
      estWages += wage;

      return [
        index + 1,
        lab.full_name,
        lab.phone || '—',
        statusLabel,
        `Rs. ${lab.base_rate}`,
        `Rs. ${wage.toLocaleString('en-IN')}`
      ];
    });

    const res = await generateReportPDF({
      title: `Daily Labour Attendance Register`,
      subtitle: `Official Field Muster Roll & Daily Wage Distribution Estimate`,
      dateRange: targetDate,
      farm: farm || { id: 'default', name: 'My Farm Operations', address: 'Agricultural Operations Hub' },
      headers: ['#', 'Worker Name', 'Mobile', 'Status', 'Daily Base Rate', 'Estimated Wage'],
      rows,
      summaryTotals: [
        { label: 'Present Labourers (Full)', value: `${pCount} workers` },
        { label: 'Half-Day Labourers', value: `${hCount} workers` },
        { label: 'Absent / On Leave', value: `${aCount} workers` },
        { label: 'Total Payable Units', value: `${round2(pCount + hCount * 0.5)} shifts` },
        { label: 'Total Estimated Wage Payout', value: `Rs. ${round2(estWages).toLocaleString('en-IN')}` }
      ]
    });

    triggerPdfSuccess(res);
  };

  const handleExportMonthlyAttendancePdf = async (year: number = calYear, month: number = calMonth) => {
    const mName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const dInMonth = new Date(year, month, 0).getDate();
    let totalEffShifts = 0;
    let totalGrossEarned = 0;

    const rows = labourers.map((lab, index) => {
      const { summary } = dataService.getLabourerMonthlyAttendance(lab.id, year, month);
      totalEffShifts += summary.effectiveDays;
      totalGrossEarned += summary.grossEarned;

      return [
        index + 1,
        lab.full_name,
        summary.presentDays,
        summary.halfDays,
        summary.absentDays,
        summary.effectiveDays,
        `Rs. ${lab.base_rate}`,
        `Rs. ${summary.grossEarned.toLocaleString('en-IN')}`
      ];
    });

    const res = await generateReportPDF({
      title: `Monthly Labour Attendance Register — ${mName} ${year}`,
      subtitle: `Consolidated Monthly Labour Muster Roll & Accumulated Gross Earnings`,
      dateRange: `01-${month}-${year} to ${dInMonth}-${month}-${year}`,
      farm: farm || { id: 'default', name: 'My Farm Operations', address: 'Agricultural Operations Hub' },
      headers: ['#', 'Worker Name', 'Present', 'Half-Day', 'Absent', 'Effective Days', 'Daily Rate', 'Gross Earned'],
      rows,
      summaryTotals: [
        { label: 'Registered Farm Workforce', value: `${labourers.length} workers` },
        { label: 'Total Crew Shifts Worked', value: `${round2(totalEffShifts)} days` },
        { label: 'Total Gross Wages Incurred', value: `Rs. ${round2(totalGrossEarned).toLocaleString('en-IN')}` }
      ]
    });

    triggerPdfSuccess(res);
  };

  const handleExportAdvancesPdf = async () => {
    const isAll = advFilterMonth === 'all';
    const periodLabel = isAll ? `All Months (${advFilterYear})` : `${advMonthNames[(advFilterMonth as number) - 1]} ${advFilterYear}`;

    const rows = labourers.map((lab, index) => {
      const bal = dataService.getLabourerAdvanceBalance(lab.id);
      const advInPeriod = workerMonthAdvanceMap.get(lab.id) || 0;

      return [
        index + 1,
        lab.full_name,
        lab.phone || '—',
        `Rs. ${advInPeriod.toLocaleString('en-IN')}`,
        `Rs. ${bal.totalRecovered.toLocaleString('en-IN')}`,
        `Rs. ${bal.outstanding.toLocaleString('en-IN')}`,
        bal.outstanding > 0 ? 'DUE' : 'CLEAR'
      ];
    });

    const res = await generateReportPDF({
      title: `Worker Advances & Khata Ledger`,
      subtitle: `Wage Advances Disbursed, Deductions Settled & Current Outstanding Dues`,
      dateRange: periodLabel,
      farm: farm || { id: 'default', name: 'My Farm Operations', address: 'Agricultural Operations Hub' },
      headers: ['#', 'Worker Name', 'Mobile', `Advances (${periodLabel})`, 'Total Repaid', 'Current Due', 'Status'],
      rows,
      summaryTotals: [
        { label: `Advances Disbursed (${periodLabel})`, value: `Rs. ${totalAdvanceInFilteredPeriod.toLocaleString('en-IN')}` },
        { label: 'Cumulative Outstanding Due (All Workers)', value: `Rs. ${totalOverallDue.toLocaleString('en-IN')}` },
        { label: 'Workers With Outstanding Balance', value: `${labourers.filter((l) => dataService.getLabourerAdvanceBalance(l.id).outstanding > 0).length} workers` }
      ]
    });

    triggerPdfSuccess(res);
  };

  const handleExportSalaryPdf = async () => {
    let sumDays = 0;
    let sumGross = 0;
    let sumAdvDeducted = 0;
    let sumNet = 0;

    const rows = salaryRows.map((r, index) => {
      sumDays += r.daysWorked;
      sumGross += r.grossWage;
      sumAdvDeducted += r.advanceDeducted;
      sumNet += r.netTakeHome;

      return [
        index + 1,
        r.labourer.full_name,
        `${r.daysWorked} days`,
        `Rs. ${r.dailyRate}`,
        `Rs. ${r.grossWage.toLocaleString('en-IN')}`,
        `Rs. ${r.advanceDeducted.toLocaleString('en-IN')}`,
        `Rs. ${r.netTakeHome.toLocaleString('en-IN')}`,
        r.settlement?.given_by || '—',
        r.isSettled ? 'SETTLED' : 'PENDING'
      ];
    });

    const titlePrefix = salaryPeriodType === 'weekly'
      ? `Weekly Labour Wages Sheet (${effectivePeriodLabel})`
      : (salaryPeriodType === 'monthly' ? `Monthly Labour Payroll — ${effectivePeriodLabel}` : `Custom Labour Wage Sheet (${effectivePeriodLabel})`);

    const res = await generateReportPDF({
      title: titlePrefix,
      subtitle: `Official Wage Calculations, Advance Adjustments & Net Wages Take-Home (${effectivePeriodSubtitle})`,
      dateRange: effectivePeriodLabel,
      farm: farm || { id: 'default', name: 'My Farm Operations', address: 'Agricultural Operations Hub' },
      headers: ['#', 'Worker Name', 'Days Worked', 'Rate', 'Gross Wage', 'Advance Ded.', 'Net Payable', 'Given By', 'Status'],
      rows,
      summaryTotals: [
        { label: 'Total Crew Days Worked', value: `${round2(sumDays)} shifts` },
        { label: 'Total Gross Wages Earned', value: `Rs. ${round2(sumGross).toLocaleString('en-IN')}` },
        { label: 'Total Advances Deducted', value: `Rs. ${round2(sumAdvDeducted).toLocaleString('en-IN')}` },
        { label: 'Total Net Payout Disbursed', value: `Rs. ${round2(sumNet).toLocaleString('en-IN')}` }
      ]
    });

    triggerPdfSuccess(res);
  };

  const handleExportTractorPdf = async () => {
    const totals = dataService.getTractorRentalTotals(tractorDateFilter);
    const todayFormatted = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateLabel = tractorDateFilter === 'all' ? 'All Recorded Runs' : (tractorDateFilter === today ? `Today (${todayFormatted})` : tractorDateFilter);

    const rows = tractorRentals.map((r, index) => [
      index + 1,
      r.work_date,
      r.tractor_name,
      r.vendor_name,
      r.task_name || 'Field Operations',
      `${r.hours_worked} hrs`,
      `Rs. ${r.hourly_rate}`,
      `Rs. ${r.gross_amount.toLocaleString('en-IN')}`,
      `Rs. ${r.advance_amount.toLocaleString('en-IN')}`,
      `Rs. ${r.rest_amount.toLocaleString('en-IN')}`
    ]);

    const res = await generateReportPDF({
      title: `Hired Tractor Rentals & Vendor Dues`,
      subtitle: `Commercial Equipment Runs, Fuel/Service Hourly Billings & Vendor Outstandings`,
      dateRange: dateLabel,
      farm: farm || { id: 'default', name: 'My Farm Operations', address: 'Agricultural Operations Hub' },
      headers: ['#', 'Date', 'Tractor', 'Vendor', 'Task', 'Hours', 'Rate/Hr', 'Total Bill', 'Advance', 'Rest Due'],
      rows,
      summaryTotals: [
        { label: 'Total Equipment Hours Worked', value: `${totals.totalHours} hours` },
        { label: 'Total Gross Rental Billed', value: `Rs. ${totals.totalGross.toLocaleString('en-IN')}` },
        { label: 'Advance Paid to Vendors', value: `Rs. ${totals.totalAdvance.toLocaleString('en-IN')}` },
        { label: 'Rest Balance Due to Vendors', value: `Rs. ${totals.totalRest.toLocaleString('en-IN')}` }
      ]
    });

    triggerPdfSuccess(res);
  };

  const handleExportLabourersPdf = async () => {
    const rows = labourers.map((lab, index) => {
      const bal = dataService.getLabourerAdvanceBalance(lab.id);
      return [
        index + 1,
        lab.full_name,
        lab.phone || '—',
        `Rs. ${lab.base_rate}/day`,
        `Rs. ${bal.outstanding.toLocaleString('en-IN')}`,
        lab.notes || 'Active Crew Member'
      ];
    });

    const res = await generateReportPDF({
      title: `Master Farm Labour Crew Register`,
      subtitle: `Registered Workforce Directory, Standard Daily Rates & Outstanding Liabilities`,
      dateRange: `Active Registry — ${new Date().toLocaleDateString('en-IN')}`,
      farm: farm || { id: 'default', name: 'My Farm Operations', address: 'Agricultural Operations Hub' },
      headers: ['#', 'Worker Name', 'Mobile Number', 'Daily Base Wage', 'Advance Balance', 'Notes'],
      rows,
      summaryTotals: [
        { label: 'Registered Workforce Strength', value: `${labourers.length} workers` },
        { label: 'Cumulative Advance Balances', value: `Rs. ${totalOverallDue.toLocaleString('en-IN')}` }
      ]
    });

    triggerPdfSuccess(res);
  };

  const handleExportCurrentViewPdf = async () => {
    switch (activeSection) {
      case 'attendance':
        if (attendanceViewMode === 'calendar') {
          await handleExportMonthlyAttendancePdf();
        } else {
          await handleExportDailyAttendancePdf();
        }
        break;
      case 'advance':
        await handleExportAdvancesPdf();
        break;
      case 'payday':
        await handleExportSalaryPdf();
        break;
      case 'tractor':
        await handleExportTractorPdf();
        break;
      case 'labours':
        await handleExportLabourersPdf();
        break;
      default:
        await handleExportDailyAttendancePdf();
    }
  };

  return (
    <>
      <div className="ledger-container">
        {/* Mobile Compact Top Bar with Date & Actions */}
        <div className="mobile-ledger-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => handleLiveSync(false)}
              disabled={isSyncingLive}
              style={{
                padding: '6px 9px',
                fontSize: '0.75rem',
                fontWeight: 800,
                borderRadius: 10,
                border: '1.5px solid #86efac',
                background: '#f0fdf4',
                color: '#15803d',
                cursor: isSyncingLive ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title={lastSyncTime ? `Live cloud connected. Last updated at ${lastSyncTime}` : 'Fetch latest live data from Supabase Cloud'}
            >
              <RefreshCw size={12} className={isSyncingLive ? 'spin-anim' : ''} />
              <span>{isSyncingLive ? 'Fetching...' : 'Live Sync'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSyncSheets}
              disabled={isSyncingSheets}
              style={{
                padding: '6px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 10,
                border: '1.5px solid #86efac',
                background: '#ffffff',
                color: '#15803d',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Sync latest farm data to Google Sheets"
            >
              <RefreshCw size={12} className={isSyncingSheets ? 'spin' : ''} />
              <span>{isSyncingSheets ? 'Syncing...' : 'Sheets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfExportModalOpen(true)}
              style={{
                padding: '6px 9px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 10,
                border: '1.5px solid #15803d',
                background: '#15803d',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 4px rgba(21, 128, 61, 0.25)'
              }}
              title="Export official PDF reports"
            >
              <FileDown size={13} />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="ledger-action-btn ledger-action-btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              title="Register new worker in farm crew"
            >
              <UserPlus size={15} />
            </button>
          </div>
        </div>

        {sheetsSyncMsg && (
          <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#14532d', fontSize: '0.84rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#15803d" />
            <span>{sheetsSyncMsg}</span>
          </div>
        )}

        {pdfSuccessMsg && (
          <div style={{ background: '#ecfdf5', border: '2px solid #34d399', color: '#065f46', padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontSize: '0.86rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>{pdfSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfSuccessMsg('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Desktop Enterprise Tab Strip */}
        <div className="desktop-ledger-tabs">
          <button
            type="button"
            className={`desktop-ledger-tab-btn ${activeSection === 'attendance' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => !isAnyModalOpen && setActiveSection('attendance')}
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
            disabled={isAnyModalOpen}
            onClick={() => !isAnyModalOpen && setActiveSection('advance')}
          >
            <Wallet size={16} />
            <span>Advance</span>
          </button>

          <button
            type="button"
            className={`desktop-ledger-tab-btn ${activeSection === 'payday' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => !isAnyModalOpen && setActiveSection('payday')}
          >
            <CreditCard size={16} />
            <span>Salary</span>
          </button>

          <button
            type="button"
            className={`desktop-ledger-tab-btn ${activeSection === 'tractor' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => !isAnyModalOpen && setActiveSection('tractor')}
          >
            <Tractor size={16} />
            <span>Tractors</span>
            {tractorRentals.filter(r => r.rest_amount > 0).length > 0 && (
              <span style={{ fontSize: '0.7rem', background: activeSection === 'tractor' ? 'rgba(255,255,255,0.25)' : '#fef3c7', color: activeSection === 'tractor' ? '#ffffff' : '#92400e', padding: '1px 6px', borderRadius: 9999, fontWeight: 800 }}>
                {tractorRentals.filter(r => r.rest_amount > 0).length} Due
              </span>
            )}
          </button>

          <button
            type="button"
            className={`desktop-ledger-tab-btn ${activeSection === 'labours' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => !isAnyModalOpen && setActiveSection('labours')}
          >
            <Users size={16} />
            <span>Workers</span>
            <span style={{ fontSize: '0.7rem', background: activeSection === 'labours' ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: activeSection === 'labours' ? '#ffffff' : '#475569', padding: '1px 6px', borderRadius: 9999, fontWeight: 800 }}>
              {allLabourers.length}
            </span>
          </button>

          <button
            type="button"
            className={`desktop-ledger-tab-btn ${activeSection === 'settings' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => !isAnyModalOpen && setActiveSection('settings')}
          >
            <Sliders size={16} />
            <span>Settings</span>
          </button>

          {/* Desktop Right Quick Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleLiveSync(false)}
              disabled={isSyncingLive}
              style={{
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 800,
                borderRadius: 10,
                border: '1.5px solid #86efac',
                background: '#f0fdf4',
                color: '#15803d',
                cursor: isSyncingLive ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              title={lastSyncTime ? `Live cloud connected. Last updated at ${lastSyncTime}` : 'Fetch live updates from Supabase Cloud'}
            >
              <RefreshCw size={14} className={isSyncingLive ? 'spin-anim' : ''} />
              <span>{isSyncingLive ? 'Syncing Live...' : 'Live Sync'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSyncSheets}
              disabled={isSyncingSheets}
              style={{
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 10,
                border: '1.5px solid #86efac',
                background: '#ffffff',
                color: '#15803d',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Sync latest farm data to Google Sheets"
            >
              <RefreshCw size={14} className={isSyncingSheets ? 'spin' : ''} />
              <span>{isSyncingSheets ? 'Syncing...' : 'Sync to Sheets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfExportModalOpen(true)}
              style={{
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 10,
                border: '1.5px solid #15803d',
                background: '#15803d',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 5px rgba(21, 128, 61, 0.25)'
              }}
              title="Export official PDF reports"
            >
              <FileDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="ledger-action-btn ledger-action-btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Register new worker in farm crew"
            >
              <UserPlus size={15} />
            </button>
          </div>
        </div>

        {/* Global Success Banner */}
        {attSaved && (
          <div style={{ background: '#dcfce7', border: '2px solid #86efac', color: '#14532d', padding: '12px 16px', borderRadius: 14, marginBottom: 16, fontSize: '0.86rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '3px 3px 10px rgba(22, 163, 74, 0.15)' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>Attendance saved successfully for today.</span>
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
                    onClick={() => handleExportDailyAttendancePdf()}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title="Export Daily Attendance Register to PDF"
                  >
                    <FileDown size={14} />
                  </button>
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
                    onClick={() => handleExportMonthlyAttendancePdf()}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title="Export Monthly Attendance Muster Roll to PDF"
                  >
                    <FileDown size={14} />
                    <span>Export Month PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCalToday}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    Jump to Today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                  </button>
                </div>
              )}
            </div>

            {/* =========================================================================
              VIEW 1: LIST VIEW (CURRENT DAILY ROSTER)
              ========================================================================= */}
            {attendanceViewMode === 'list' && (
              <>
                {labourers.length === 0 ? (
                  <div style={{
                    background: '#fffbeb',
                    border: '2px solid #fde68a',
                    borderRadius: 18,
                    padding: '24px 20px',
                    textAlign: 'center',
                    margin: '16px 0',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.1)'
                  }}>
                    <AlertTriangle size={38} color="#d97706" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ margin: '0 0 6px 0', color: '#92400e', fontWeight: 800, fontSize: '1.1rem' }}>
                      {allLabourers.length > 0 ? 'All Workers Are Currently Deactivated' : 'No Workers Registered'}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', color: '#78350f', fontSize: '0.86rem', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                      {allLabourers.length > 0
                        ? `You have ${allLabourers.length} worker(s) in your farm database (${allLabourers.map(l => l.full_name).join(', ')}), but they are currently deactivated. Deactivated workers are excluded from daily attendance.`
                        : 'No farm workers have been registered in the database yet. Add a new worker to start taking attendance.'
                      }
                    </p>

                    {allLabourers.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, margin: '0 auto 16px auto' }}>
                        {allLabourers.filter(l => !l.is_active).map(deactLab => (
                          <div key={deactLab.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            padding: '10px 14px',
                            borderRadius: 12,
                            border: '1.5px solid #fde68a'
                          }}>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#143823' }}>{deactLab.full_name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>₹{deactLab.base_rate}/day • Deactivated</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleLabourActive(deactLab.id)}
                              className="ledger-action-btn ledger-action-btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                            >
                              ⚡ Reactivate
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCrewFilter('all');
                          setActiveSection('labours');
                        }}
                        className="ledger-action-btn ledger-action-btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                      >
                        <Users size={15} />
                        <span>View Farm Crew Directory</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="ledger-action-btn ledger-action-btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                      >
                        <UserPlus size={15} />
                        <span>+ Add New Worker</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="ledger-desktop-only">
                      <div className="ledger-table-wrap">
                        <table className="ledger-table">
                          <thead>
                            <tr>
                              <th className="ledger-th">Labourer</th>
                              <th className="ledger-th">Daily Wage Rate</th>
                              <th className="ledger-th">Advance</th>
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
                        <div className="ledger-kpi-sub">advance balance</div>
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                              <span className="cal-day-num">{dayNum}</span>
                              {isTodayDate && (
                                <>
                                  <span className="cal-badge-desktop" style={{ fontSize: '0.6rem', background: '#16a34a', color: '#ffffff', padding: '1px 4px', borderRadius: 4, fontWeight: 900 }}>
                                    TODAY
                                  </span>
                                  <span className="cal-badge-mobile" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                                </>
                              )}
                            </div>

                            <div style={{ width: '100%', textAlign: 'center', marginTop: 2, minWidth: 0, overflow: 'hidden' }}>
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
                                <>
                                  <span className="cal-badge-desktop" style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Unmarked</span>
                                  <span className="cal-badge-mobile" style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>—</span>
                                </>
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                              <span className="cal-day-num">{dayNum}</span>
                              {isTodayDate && (
                                <>
                                  <span className="cal-badge-desktop" style={{ fontSize: '0.6rem', background: '#16a34a', color: '#ffffff', padding: '1px 4px', borderRadius: 4, fontWeight: 900 }}>
                                    TODAY
                                  </span>
                                  <span className="cal-badge-mobile" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                                </>
                              )}
                            </div>

                            <div style={{ width: '100%', textAlign: 'center', marginTop: 2, minWidth: 0, overflow: 'hidden' }}>
                              {wRec ? (
                                <div>
                                  <span className={`cal-day-status-badge ${wRec.status === 'present' ? 'cal-status-p' : wRec.status === 'half_day' ? 'cal-status-hd' : 'cal-status-a'}`}>
                                    <span className="cal-badge-desktop">{label}</span>
                                    <span className="cal-badge-mobile">{wRec.status === 'present' ? 'P' : wRec.status === 'half_day' ? '0.5' : 'A'}</span>
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
                                <>
                                  <span className="cal-badge-desktop" style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Unmarked</span>
                                  <span className="cal-badge-mobile" style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>—</span>
                                </>
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
          <div>
            {/* Top Month Filter Bar & KPI Summary Strip */}
            <div className="ledger-card" style={{ marginBottom: 16, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={20} color="#15803d" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#143823', fontWeight: 800 }}>
                      Advance Register ({currentAdvMonthLabel})
                    </h2>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#4b6354', fontWeight: 600, marginTop: 2 }}>
                    Monthly breakdown of cash advances disbursed and outstanding balances
                  </div>
                </div>

                {/* Month Navigation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleAdvPrevMonth}
                    className="cal-nav-btn"
                    title="Previous Month"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#143823', minWidth: 130, textAlign: 'center' }}>
                    {currentAdvMonthLabel}
                  </div>

                  <button
                    type="button"
                    onClick={handleAdvNextMonth}
                    className="cal-nav-btn"
                    title="Next Month"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const n = new Date();
                      setAdvFilterYear(n.getFullYear());
                      setAdvFilterMonth(n.getMonth() + 1);
                    }}
                    style={{
                      background: advFilterMonth === (new Date().getMonth() + 1) && advFilterYear === new Date().getFullYear() ? '#15803d' : '#f0fdf4',
                      border: '1.5px solid #86efac',
                      color: advFilterMonth === (new Date().getMonth() + 1) && advFilterYear === new Date().getFullYear() ? '#ffffff' : '#15803d',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    Current Month
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvFilterMonth(advFilterMonth === 'all' ? (new Date().getMonth() + 1) : 'all')}
                    style={{
                      background: advFilterMonth === 'all' ? '#15803d' : '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      color: advFilterMonth === 'all' ? '#ffffff' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    {advFilterMonth === 'all' ? 'View By Month' : 'All Months'}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAdvancesPdf}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                    title="Export Advances & Khata Ledger to PDF"
                  >
                    <FileDown size={14} />
                  </button>
                </div>
              </div>

              {/* Monthly KPI Summary Cards */}
              <div className="ledger-kpi-grid" style={{ marginTop: 14, marginBottom: 0 }}>
                <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fef3c7 100%)', borderColor: '#fcd34d' }}>
                  <div className="ledger-kpi-title" style={{ color: '#b45309' }}>
                    {advFilterMonth === 'all' ? `Advances (${advFilterYear})` : `Advances in ${advMonthNames[(advFilterMonth as number) - 1]}`}
                  </div>
                  <div className="ledger-kpi-value" style={{ color: '#92400e' }}>
                    ₹{totalAdvanceInFilteredPeriod.toLocaleString('en-IN')}
                  </div>
                  <div className="ledger-kpi-sub">{filteredAdvances.length} transactions issued</div>
                </div>

                <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
                  <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Workers Funded</div>
                  <div className="ledger-kpi-value" style={{ color: '#15803d' }}>
                    {uniqueWorkersWithAdvance}
                  </div>
                  <div className="ledger-kpi-sub">Took advance in this period</div>
                </div>

                <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #eff6ff 100%)', borderColor: '#bfdbfe' }}>
                  <div className="ledger-kpi-title" style={{ color: '#2563eb' }}>Average Advance</div>
                  <div className="ledger-kpi-value" style={{ color: '#1d4ed8' }}>
                    ₹{filteredAdvances.length > 0 ? Math.round(totalAdvanceInFilteredPeriod / filteredAdvances.length).toLocaleString('en-IN') : '0'}
                  </div>
                  <div className="ledger-kpi-sub">Per transaction in selected month</div>
                </div>

                <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fff7ed 100%)', borderColor: '#fed7aa' }}>
                  <div className="ledger-kpi-title" style={{ color: '#ea580c' }}>Total Outstanding Due</div>
                  <div className="ledger-kpi-value" style={{ color: '#c2410c' }}>
                    ₹{totalOverallDue.toLocaleString('en-IN')}
                  </div>
                  <div className="ledger-kpi-sub">All-time cumulative balance</div>
                </div>
              </div>
            </div>

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
                    <span>Advance recorded</span>
                  </div>
                )}

                <form onSubmit={handleGiveAdvance}>
                  <div style={{ marginBottom: 12 }}>
                    <label className="ledger-label">Advance Date</label>
                    <input
                      type="date"
                      value={advDate}
                      onChange={(e) => setAdvDate(e.target.value)}
                      className="ledger-input"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="ledger-label">Select Worker</label>
                    <select
                      value={advLabId}
                      onChange={(e) => setAdvLabId(e.target.value)}
                      className="ledger-input"
                    >
                      {(labourers.length > 0 ? labourers : allLabourers).map((l) => {
                        const bal = dataService.getLabourerAdvanceBalance(l.id);
                        return (
                          <option key={l.id} value={l.id}>
                            {l.full_name} {!l.is_active ? '(Deactivated)' : ''} ({bal.outstanding > 0 ? `Due: ₹${bal.outstanding}` : 'Clear'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="ledger-label" style={{ margin: 0 }}>Given By</label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Who gave cash advance</span>
                    </div>
                    <input
                      type="text"
                      value={advGivenBy}
                      onChange={(e) => setAdvGivenBy(e.target.value)}
                      placeholder="Enter name"
                      className="ledger-input"
                      style={{ fontWeight: 700 }}
                      required
                    />
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

              {/* Running Balances Table */}
              <div className="ledger-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#143823' }}>
                      Worker Advance Balances
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#4b6354', fontWeight: 600 }}>
                      Advances in {currentAdvMonthLabel} and overall balances
                    </div>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="ledger-desktop-only">
                  <div className="ledger-table-wrap">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th className="ledger-th">Worker</th>
                          <th className="ledger-th">In {advFilterMonth === 'all' ? advFilterYear : advMonthNames[(advFilterMonth as number) - 1]}</th>
                          <th className="ledger-th">Total Given</th>
                          <th className="ledger-th">Total Repaid</th>
                          <th className="ledger-th">Current Due</th>
                          <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayAdvanceLabourers.map((l) => {
                          const bal = dataService.getLabourerAdvanceBalance(l.id);
                          const monthAmt = workerMonthAdvanceMap.get(l.id) || 0;

                          return (
                            <tr key={l.id} className="ledger-tr" style={{ opacity: l.is_active ? 1 : 0.85 }}>
                              <td className="ledger-td">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    background: l.is_active ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#e2e8f0',
                                    color: l.is_active ? '#15803d' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
                                    boxShadow: '2px 2px 5px rgba(166, 184, 170, 0.25)',
                                    border: l.is_active ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                                    flexShrink: 0
                                  }}>
                                    {l.full_name.charAt(0)}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontWeight: 800, color: l.is_active ? '#143823' : '#475569' }}>{l.full_name}</span>
                                      {!l.is_active && (
                                        <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                                          Deactivated
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.labour_code}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="ledger-td">
                                {monthAmt > 0 ? (
                                  <span style={{
                                    fontWeight: 800,
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    border: '1.5px solid #fde68a',
                                    padding: '3px 9px',
                                    borderRadius: 8,
                                    fontSize: '0.86rem'
                                  }}>
                                    ₹{monthAmt.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>₹0</span>
                                )}
                              </td>
                              <td className="ledger-td" style={{ color: '#475569', fontWeight: 600 }}>
                                ₹{bal.totalIssued.toLocaleString('en-IN')}
                              </td>
                              <td className="ledger-td" style={{ color: '#15803d', fontWeight: 700 }}>
                                ₹{bal.totalRecovered.toLocaleString('en-IN')}
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
                                  {bal.outstanding > 0 ? `Due: ₹${bal.outstanding.toLocaleString('en-IN')}` : 'Clear'}
                                </span>
                              </td>
                              <td className="ledger-td" style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                  {(() => {
                                    const workerAdvances = recentAdvances.filter((a) => a.labourer_id === l.id);
                                    return (
                                      <>
                                        {workerAdvances.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditAdvance(workerAdvances[0])}
                                            className="ledger-action-btn ledger-action-btn-secondary"
                                            style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            title={`Edit latest advance for ${l.full_name}`}
                                          >
                                            <Edit2 size={13} color="#0284c7" />
                                            <span>Edit Adv</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setSelectedLabourerForCalendar(l)}
                                          className="ledger-action-btn ledger-action-btn-secondary"
                                          style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                                        >
                                          <Calendar size={13} color="#15803d" />
                                          <span>Calendar</span>
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Rows */}
                <div className="ledger-mobile-only">
                  {displayAdvanceLabourers.map((l) => {
                    const bal = dataService.getLabourerAdvanceBalance(l.id);
                    const monthAmt = workerMonthAdvanceMap.get(l.id) || 0;
                    const workerAdvances = recentAdvances.filter((a) => a.labourer_id === l.id);

                    return (
                      <div key={l.id} className="ledger-mobile-row" style={{ opacity: l.is_active ? 1 : 0.85 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              background: l.is_active ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#e2e8f0',
                              color: l.is_active ? '#15803d' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              border: l.is_active ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                              flexShrink: 0
                            }}>
                              {l.full_name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: l.is_active ? '#143823' : '#475569' }}>{l.full_name}</div>
                                {!l.is_active && (
                                  <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                                    Deactivated
                                  </span>
                                )}
                              </div>
                              {monthAmt > 0 && (
                                <div style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 800 }}>
                                  In {advFilterMonth === 'all' ? advFilterYear : advMonthNames[(advFilterMonth as number) - 1]}: ₹{monthAmt.toLocaleString('en-IN')}
                                </div>
                              )}
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

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', paddingTop: 8, borderTop: '1px dashed #dcfce7', flexWrap: 'wrap', gap: 6 }}>
                          <span>Given: ₹{bal.totalIssued} • Repaid: ₹{bal.totalRecovered}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {workerAdvances.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditAdvance(workerAdvances[0])}
                                style={{
                                  background: '#f0f9ff',
                                  border: '1.5px solid #7dd3fc',
                                  color: '#0284c7',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Edit2 size={12} />
                                <span>Edit Adv</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedLabourerForCalendar(l)}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #86efac',
                                color: '#15803d',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                padding: '5px 10px',
                                borderRadius: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Calendar size={12} />
                              <span>Calendar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cash Advances Filtered History */}
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '2px solid rgba(220, 235, 224, 0.7)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#143823' }}>
                        Advances Issued ({currentAdvMonthLabel})
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: '#4b6354', fontWeight: 600 }}>
                        History of advances disbursed in {currentAdvMonthLabel}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 8, border: '1px solid #fde68a' }}>
                        Total: ₹{totalAdvanceInFilteredPeriod.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        {filteredAdvances.length} Records
                      </span>
                    </div>
                  </div>

                  {filteredAdvances.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.86rem', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                      <div style={{ marginBottom: recentAdvances.length > 0 && advFilterMonth !== 'all' ? 10 : 0 }}>
                        No cash advances recorded in {currentAdvMonthLabel}.
                      </div>
                      {recentAdvances.length > 0 && advFilterMonth !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setAdvFilterMonth('all')}
                          style={{
                            background: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            color: '#15803d',
                            fontWeight: 800,
                            padding: '6px 14px',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          Show All Recorded Advances ({recentAdvances.length})
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="ledger-desktop-only">
                        <div className="ledger-table-wrap">
                          <table className="ledger-table">
                            <thead>
                              <tr>
                                <th className="ledger-th">Date</th>
                                <th className="ledger-th">Worker</th>
                                <th className="ledger-th">Amount</th>
                                <th className="ledger-th">Given By</th>
                                <th className="ledger-th">Purpose</th>
                                <th className="ledger-th">Status</th>
                                <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAdvances.map((adv) => (
                                <tr key={adv.id} className="ledger-tr">
                                  <td className="ledger-td" style={{ fontSize: '0.82rem', color: '#475569' }}>
                                    {new Date(adv.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                                    {adv.labourer_name || labourers.find(l => l.id === adv.labourer_id)?.full_name || 'Worker'}
                                  </td>
                                  <td className="ledger-td" style={{ fontWeight: 800, color: '#b45309', fontSize: '0.95rem' }}>
                                    ₹{adv.amount.toLocaleString('en-IN')}
                                  </td>
                                  <td className="ledger-td">
                                    <span style={{
                                      background: '#f0fdf4',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      padding: '3px 8px',
                                      borderRadius: 8,
                                      fontWeight: 800,
                                      fontSize: '0.78rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      👤 {adv.issued_by || 'Owner/Manager'}
                                    </span>
                                  </td>
                                  <td className="ledger-td" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    {adv.purpose || 'Cash advance'}
                                  </td>
                                  <td className="ledger-td">
                                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                      Posted
                                    </span>
                                  </td>
                                  <td className="ledger-td" style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditAdvance(adv)}
                                        className="ledger-action-btn ledger-action-btn-secondary"
                                        style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.76rem' }}
                                        title="Edit advance record"
                                      >
                                        <Edit2 size={12} />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAdvance(adv.id)}
                                        className="ledger-action-btn ledger-action-btn-danger"
                                        style={{ padding: '4px 7px' }}
                                        title="Delete advance record"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="ledger-mobile-only">
                        {filteredAdvances.map((adv) => (
                          <div key={adv.id} className="ledger-mobile-row" style={{ padding: '12px 14px', marginBottom: 10, border: '1.5px solid rgba(220, 235, 224, 0.9)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#143823' }}>
                                {adv.labourer_name || labourers.find(l => l.id === adv.labourer_id)?.full_name || 'Worker'}
                              </span>
                              <span style={{
                                fontWeight: 900,
                                color: '#b45309',
                                fontSize: '1.05rem',
                                background: '#fef3c7',
                                border: '1px solid #fde68a',
                                padding: '2px 8px',
                                borderRadius: 6
                              }}>
                                ₹{adv.amount.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', marginBottom: 8, background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                              <span>Given By: <strong style={{ color: '#15803d' }}>{adv.issued_by || 'Owner/Manager'}</strong></span>
                              <span>{new Date(adv.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>

                            {adv.purpose && (
                              <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: 8, background: '#f0fdf4', padding: '4px 8px', borderRadius: 6, border: '1px solid #dcfce7' }}>
                                Reason: <strong>{adv.purpose}</strong>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed #dcfce7', paddingTop: 10 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAdvance(adv)}
                                style={{
                                  flex: 1,
                                  padding: '9px 12px',
                                  borderRadius: 8,
                                  border: '1.5px solid #0284c7',
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  fontWeight: 800,
                                  fontSize: '0.84rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                }}
                              >
                                <Edit2 size={14} />
                                <span>Edit Advance</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdvance(adv.id)}
                                style={{
                                  padding: '9px 14px',
                                  borderRadius: 8,
                                  border: '1px solid #fed7aa',
                                  background: '#fff7ed',
                                  color: '#c2410c',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Delete advance record"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
          SECTION 3: MONTHLY SALARY SETTLEMENTS
          ========================================================================= */}
        {activeSection === 'payday' && (
          <div>
            {/* Header & Period Switcher Toolbar */}
            <div style={{
              background: '#ffffff',
              border: '2px solid rgba(220, 235, 224, 0.85)',
              borderRadius: 16,
              padding: '14px 18px',
              marginBottom: 16,
              boxShadow: '4px 4px 12px rgba(166, 184, 170, 0.2), inset 1px 1px 2px #ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              {/* Row 1: Title and 3-Way Period Routine Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={20} color="#15803d" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#143823', fontWeight: 800 }}>
                      {salaryPeriodType === 'monthly'
                        ? `Monthly Salary Settlements (${effectivePeriodLabel})`
                        : (salaryPeriodType === 'weekly' ? `Weekly Wage Settlements (${effectivePeriodLabel})` : `Custom Wage Settlements (${effectivePeriodLabel})`)}
                    </h2>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#4b6354', fontWeight: 600, marginTop: 2 }}>
                    Formula: <strong>Gross Wage (Days Worked × Daily Rate) − Advance Deducted = Net Take-Home Pay</strong>
                  </div>
                </div>

                {/* 3-Way Routine Switcher: Monthly vs Weekly vs Custom */}
                <div style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  padding: 4,
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  gap: 4
                }}>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriodType('monthly')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 9,
                      border: 'none',
                      background: salaryPeriodType === 'monthly' ? '#15803d' : 'transparent',
                      color: salaryPeriodType === 'monthly' ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: salaryPeriodType === 'monthly' ? '0 2px 6px rgba(21, 128, 61, 0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    📅 Monthly Routine
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriodType('weekly')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 9,
                      border: 'none',
                      background: salaryPeriodType === 'weekly' ? '#1d4ed8' : 'transparent',
                      color: salaryPeriodType === 'weekly' ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: salaryPeriodType === 'weekly' ? '0 2px 6px rgba(29, 78, 216, 0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    🗓️ Weekly Routine
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriodType('custom')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 9,
                      border: 'none',
                      background: salaryPeriodType === 'custom' ? '#475569' : 'transparent',
                      color: salaryPeriodType === 'custom' ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: salaryPeriodType === 'custom' ? '0 2px 6px rgba(71, 85, 105, 0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    ⏳ Custom Range
                  </button>
                </div>
              </div>

              {/* Row 2: Dynamic Navigation Controls by Mode */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTop: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: 10
              }}>
                {/* Period Controls */}
                {salaryPeriodType === 'monthly' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSalaryPrevMonth}
                      className="cal-nav-btn"
                      title="Previous Month"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#143823', minWidth: 130, textAlign: 'center' }}>
                      {salaryMonthName} {salaryYear}
                    </div>
                    <button
                      type="button"
                      onClick={handleSalaryNextMonth}
                      className="cal-nav-btn"
                      title="Next Month"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleSalaryCurrentMonth}
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: 10,
                        cursor: 'pointer'
                      }}
                    >
                      Current Month
                    </button>
                  </div>
                )}

                {salaryPeriodType === 'weekly' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSalaryPrevWeek}
                      className="cal-nav-btn"
                      title="Previous Week"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#1d4ed8', minWidth: 160, textAlign: 'center' }}>
                      🗓️ {formatWeekLabel(salaryWeekStart, salaryWeekEnd)}
                    </div>
                    <button
                      type="button"
                      onClick={handleSalaryNextWeek}
                      className="cal-nav-btn"
                      title="Next Week"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleSalaryCurrentWeek}
                      style={{
                        background: '#eff6ff',
                        border: '1.5px solid #93c5fd',
                        color: '#1d4ed8',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: 10,
                        cursor: 'pointer'
                      }}
                    >
                      This Week
                    </button>
                    <button
                      type="button"
                      onClick={handleSalaryLastWeek}
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        color: '#475569',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: 10,
                        cursor: 'pointer'
                      }}
                    >
                      Last Week
                    </button>
                  </div>
                )}

                {salaryPeriodType === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>From:</span>
                    <input
                      type="date"
                      value={salaryCustomStart}
                      onChange={(e) => setSalaryCustomStart(e.target.value)}
                      className="ledger-input"
                      style={{ padding: '5px 8px', fontSize: '0.8rem', width: 135 }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>To:</span>
                    <input
                      type="date"
                      value={salaryCustomEnd}
                      onChange={(e) => setSalaryCustomEnd(e.target.value)}
                      className="ledger-input"
                      style={{ padding: '5px 8px', fontSize: '0.8rem', width: 135 }}
                    />
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSalaryCustomStart(addDaysToDateStr(today, -6));
                          setSalaryCustomEnd(today);
                        }}
                        style={{ padding: '4px 8px', fontSize: '0.74rem', fontWeight: 800, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                      >
                        Last 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSalaryCustomStart(addDaysToDateStr(today, -14));
                          setSalaryCustomEnd(today);
                        }}
                        style={{ padding: '4px 8px', fontSize: '0.74rem', fontWeight: 800, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                      >
                        Last 15 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSalaryCustomStart(salaryMonthStartDate);
                          setSalaryCustomEnd(today);
                        }}
                        style={{ padding: '4px 8px', fontSize: '0.74rem', fontWeight: 800, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                      >
                        Month to Date
                      </button>
                    </div>
                  </div>
                )}

                {/* PDF Export Action */}
                <button
                  type="button"
                  onClick={() => handleExportSalaryPdf()}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '6px 14px',
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Export Current Salary / Wage Settlement Sheet to PDF"
                >
                  <FileDown size={15} />
                  <span>Export Wage Sheet PDF</span>
                </button>
              </div>
            </div>


            {/* KPI Summary Cards Strip */}
            <div className="ledger-kpi-grid" style={{ marginBottom: 16 }}>
              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
                <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Crew Days Worked</div>
                <div className="ledger-kpi-value" style={{ color: '#15803d' }}>{totalCrewDaysWorked}</div>
                <div className="ledger-kpi-sub">Payable shifts in {effectivePeriodLabel}</div>
              </div>

              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0fdf4 100%)', borderColor: '#86efac' }}>
                <div className="ledger-kpi-title" style={{ color: '#16a34a' }}>Gross Wages</div>
                <div className="ledger-kpi-value" style={{ color: '#15803d' }}>₹{totalGrossWages.toLocaleString('en-IN')}</div>
                <div className="ledger-kpi-sub">Before deductions</div>
              </div>

              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #fef3c7 100%)', borderColor: '#fcd34d' }}>
                <div className="ledger-kpi-title" style={{ color: '#b45309' }}>Advance Deductions</div>
                <div className="ledger-kpi-value" style={{ color: '#92400e' }}>₹{totalAdvancesDeducted.toLocaleString('en-IN')}</div>
                <div className="ledger-kpi-sub">Recovered</div>
              </div>

              <div className="ledger-kpi-box" style={{ background: 'linear-gradient(135deg, #ffffff 60%, #f0f9ff 100%)', borderColor: '#bae6fd' }}>
                <div className="ledger-kpi-title" style={{ color: '#0284c7' }}>Net Take-Home Pay</div>
                <div className="ledger-kpi-value" style={{ color: '#0369a1' }}>₹{totalNetTakeHome.toLocaleString('en-IN')}</div>
                <div className="ledger-kpi-sub">Total crew take-home payout</div>
              </div>
            </div>

            {salarySettledSuccessMsg && (
              <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', color: '#14532d', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>{salarySettledSuccessMsg}</span>
              </div>
            )}

            {/* Desktop Settlement Table */}
            <div className="ledger-desktop-only">
              <div className="ledger-table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th className="ledger-th">Worker</th>
                      <th className="ledger-th">Daily Rate</th>
                      <th className="ledger-th">Days Worked</th>
                      <th className="ledger-th">Gross Wage</th>
                      <th className="ledger-th">Advance</th>
                      <th className="ledger-th">Net Take-Home Pay</th>
                      <th className="ledger-th">Given By</th>
                      <th className="ledger-th" style={{ textAlign: 'right' }}>Payment Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                          <CreditCard size={32} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                          <div style={{ fontWeight: 800, color: '#334155' }}>No Workers or Shifts Recorded for {effectivePeriodLabel}</div>
                          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add or reactivate crew members to generate settlement sheets.</div>
                        </td>
                      </tr>
                    ) : (
                      salaryRows.map((row) => {
                        const { labourer: lab, dailyRate, daysWorked, grossWage, advanceDue, netTakeHome, isSettled, settlement } = row;

                        return (
                          <tr key={lab.id} className="ledger-tr" style={{ opacity: lab.is_active ? 1 : 0.85 }}>
                            <td className="ledger-td">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 12,
                                  background: lab.is_active ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#e2e8f0',
                                  color: lab.is_active ? '#15803d' : '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.9rem',
                                  border: lab.is_active ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                                  flexShrink: 0
                                }}>
                                  {lab.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 800, color: lab.is_active ? '#143823' : '#475569' }}>{lab.full_name}</span>
                                    {!lab.is_active && (
                                      <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                                        Deactivated
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{lab.labour_code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="ledger-td" style={{ color: '#475569', fontWeight: 700 }}>
                              ₹{dailyRate}/day
                            </td>
                            <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                              {daysWorked} Days
                            </td>
                            <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                              ₹{grossWage.toLocaleString('en-IN')}
                            </td>
                            <td className="ledger-td">
                              {advanceDue > 0 ? (
                                <span style={{ color: '#b45309', fontWeight: 800, background: '#fef3c7', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a', fontSize: '0.8rem' }}>
                                  ₹{advanceDue.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span style={{ color: '#15803d', fontWeight: 700, background: '#f0fdf4', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0', fontSize: '0.78rem' }}>
                                  ₹0
                                </span>
                              )}
                            </td>
                            <td className="ledger-td">
                              <span style={{ fontSize: '1.18rem', fontWeight: 900, color: '#15803d', fontFamily: 'Outfit, Plus Jakarta Sans, sans-serif' }}>
                                ₹{netTakeHome.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="ledger-td">
                              {isSettled ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #86efac',
                                  fontSize: '0.78rem'
                                }}>
                                  👤 {settlement?.given_by || salaryGivenBy || currentUser?.name || 'Owner'}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                            <td className="ledger-td" style={{ textAlign: 'right' }}>
                              {isSettled && settlement ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#dcfce7',
                                    color: '#14532d',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    padding: '5px 9px',
                                    borderRadius: 8,
                                    border: '1px solid #86efac'
                                  }}>
                                    ✓ Paid ₹{settlement.paid_amount.toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSalary(settlement)}
                                    className="ledger-action-btn ledger-action-btn-secondary"
                                    style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                                    title="Edit Salary Settlement (Amount, Given By, Date)"
                                  >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSalarySettlement(settlement.id)}
                                    className="ledger-action-btn ledger-action-btn-danger"
                                    style={{ padding: '5px 7px' }}
                                    title="Revert to Unpaid"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSettleModal(row)}
                                    className="ledger-action-btn ledger-action-btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                                  >
                                    Pay Cash / UPI
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditLabourer(lab)}
                                    className="ledger-action-btn ledger-action-btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    title={`Edit wage rate / routine for ${lab.full_name}`}
                                  >
                                    <Edit2 size={12} color="#0284c7" />
                                    <span>Rate</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Settlement Cards */}
            <div className="ledger-mobile-only">
              {salaryRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: 16, border: '1.5px dashed #cbd5e1', color: '#64748b', margin: '14px 0' }}>
                  <CreditCard size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#334155' }}>No Workers or Shifts for {effectivePeriodLabel}</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add or reactivate workers to calculate salaries.</div>
                </div>
              ) : (
                salaryRows.map((row) => {
                  const { labourer: lab, dailyRate, daysWorked, grossWage, advanceDue, netTakeHome, isSettled, settlement } = row;
                  const pastSettlement = salarySettlements.find((s) => s.labourer_id === lab.id);

                  return (
                    <div key={lab.id} className="ledger-mobile-row" style={{ opacity: lab.is_active ? 1 : 0.85 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: lab.is_active ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#e2e8f0',
                            color: lab.is_active ? '#15803d' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            border: lab.is_active ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                            flexShrink: 0
                          }}>
                            {lab.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: lab.is_active ? '#143823' : '#475569' }}>{lab.full_name}</div>
                              {!lab.is_active && (
                                <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#4b6354', fontWeight: 600 }}>₹{dailyRate}/day • {daysWorked} Days Worked</div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Net Take-Home</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', fontFamily: 'Outfit, sans-serif' }}>
                            ₹{netTakeHome.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: '#f8faf8', border: '1px solid rgba(220, 235, 224, 0.8)', padding: '8px 12px', borderRadius: 10, fontSize: '0.78rem', color: '#334e3e', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div>
                          <span>Gross: <strong>₹{grossWage.toLocaleString('en-IN')}</strong></span>
                          {advanceDue > 0 && <span style={{ color: '#b45309', marginLeft: 10 }}>Advance: <strong>₹{advanceDue.toLocaleString('en-IN')}</strong></span>}
                        </div>
                        {isSettled && (
                          <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 800 }}>
                            Given By: <strong>👤 {settlement?.given_by || salaryGivenBy}</strong>
                          </div>
                        )}
                      </div>

                      {isSettled && settlement ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{
                            flex: '1 1 100%',
                            background: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            color: '#15803d',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            borderRadius: 10,
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}>
                            <CheckCircle2 size={16} /> Paid ₹{settlement.paid_amount.toLocaleString('en-IN')} ({settlement.period_type === 'weekly' ? 'Weekly' : 'Monthly'})
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSalary(settlement)}
                            style={{
                              flex: 1,
                              padding: '10px 14px',
                              borderRadius: 10,
                              border: '1.5px solid #0284c7',
                              background: '#f0f9ff',
                              color: '#0284c7',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.12)'
                            }}
                          >
                            <Edit2 size={15} />
                            <span>Edit Payout</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSalarySettlement(settlement.id)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 10,
                              border: '1px solid #fed7aa',
                              background: '#fff7ed',
                              color: '#c2410c',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Revert to Unpaid"
                          >
                            <RotateCcw size={14} />
                            <span>Revert</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditLabourer(lab)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Edit wage rate"
                          >
                            <Edit2 size={12} color="#0284c7" />
                            <span>Rate: ₹{dailyRate}</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenSettleModal(row)}
                            className="ledger-action-btn ledger-action-btn-primary"
                            style={{ width: '100%', padding: '11px', fontSize: '0.88rem', borderRadius: 12, fontWeight: 800 }}
                          >
                            Pay Cash / UPI (₹{netTakeHome.toLocaleString('en-IN')})
                          </button>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditLabourer(lab)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#334155',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5
                              }}
                            >
                              <Edit2 size={13} color="#0284c7" />
                              <span>Edit Daily Rate (₹{dailyRate})</span>
                            </button>
                            {pastSettlement && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditSalary(pastSettlement)}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  borderRadius: 10,
                                  border: '1.5px solid #bae6fd',
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 5
                                }}
                              >
                                <Edit2 size={13} />
                                <span>Edit Past Payout (₹{pastSettlement.paid_amount})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Settled Salary Payouts History Section */}
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '2px solid rgba(220, 235, 224, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#143823' }}>
                    Settled Salary Payouts History
                  </h4>
                  <div style={{ fontSize: '0.78rem', color: '#4b6354', fontWeight: 600 }}>
                    All recorded salary payments and disbursements
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    Total Paid: ₹{salarySettlements.reduce((s, st) => s + (Number(st.paid_amount) || 0), 0).toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                    {salarySettlements.length} Payouts
                  </span>
                </div>
              </div>

              {salarySettlements.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.86rem', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                  No salary payouts recorded yet. Tap "Pay Cash / UPI" on any worker above to record a payout.
                </div>
              ) : (
                <>
                  {/* Desktop History Table */}
                  <div className="ledger-desktop-only">
                    <div className="ledger-table-wrap">
                      <table className="ledger-table">
                        <thead>
                          <tr>
                            <th className="ledger-th">Date</th>
                            <th className="ledger-th">Worker</th>
                            <th className="ledger-th">Period / Cycle</th>
                            <th className="ledger-th">Gross Wage</th>
                            <th className="ledger-th">Adv Deducted</th>
                            <th className="ledger-th">Paid Amount</th>
                            <th className="ledger-th">Given By</th>
                            <th className="ledger-th">Mode</th>
                            <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salarySettlements.map((st) => (
                            <tr key={st.id} className="ledger-tr">
                              <td className="ledger-td" style={{ fontSize: '0.82rem', color: '#475569' }}>
                                {st.payment_date || (st.created_at ? new Date(st.created_at).toLocaleDateString('en-IN') : '—')}
                              </td>
                              <td className="ledger-td" style={{ fontWeight: 800, color: '#143823' }}>
                                {st.labourer_name || labourers.find(l => l.id === st.labourer_id)?.full_name || 'Worker'}
                                {st.labour_code && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 6 }}>({st.labour_code})</span>}
                              </td>
                              <td className="ledger-td" style={{ fontSize: '0.8rem', color: '#475569' }}>
                                <span style={{
                                  background: st.period_type === 'weekly' ? '#eff6ff' : '#f0fdf4',
                                  color: st.period_type === 'weekly' ? '#1d4ed8' : '#15803d',
                                  border: st.period_type === 'weekly' ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: '0.72rem',
                                  fontWeight: 800
                                }}>
                                  {st.period_type === 'weekly' ? '🗓️ Weekly' : '📅 Monthly'}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                                  {st.start_date && st.end_date ? `${st.start_date} to ${st.end_date}` : `Month ${st.month}/${st.year}`}
                                </div>
                              </td>
                              <td className="ledger-td" style={{ color: '#475569', fontWeight: 600 }}>
                                ₹{st.gross_wage?.toLocaleString('en-IN') || '0'}
                              </td>
                              <td className="ledger-td" style={{ color: '#b45309', fontWeight: 600 }}>
                                {st.advance_deducted > 0 ? `₹${st.advance_deducted.toLocaleString('en-IN')}` : '₹0'}
                              </td>
                              <td className="ledger-td" style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>
                                ₹{st.paid_amount.toLocaleString('en-IN')}
                              </td>
                              <td className="ledger-td">
                                <span style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #86efac',
                                  padding: '3px 8px',
                                  borderRadius: 8,
                                  fontWeight: 800,
                                  fontSize: '0.78rem'
                                }}>
                                  👤 {st.given_by || 'Owner'}
                                </span>
                              </td>
                              <td className="ledger-td" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                {st.payment_method || 'cash'}
                              </td>
                              <td className="ledger-td" style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSalary(st)}
                                    className="ledger-action-btn ledger-action-btn-secondary"
                                    style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.76rem' }}
                                    title="Edit salary settlement"
                                  >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSalarySettlement(st.id)}
                                    className="ledger-action-btn ledger-action-btn-danger"
                                    style={{ padding: '4px 7px' }}
                                    title="Revert to Unpaid"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile History Cards */}
                  <div className="ledger-mobile-only">
                    {salarySettlements.map((st) => (
                      <div key={st.id} className="ledger-mobile-row" style={{ padding: '12px 14px', marginBottom: 10, border: '1.5px solid rgba(220, 235, 224, 0.9)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#143823' }}>
                              {st.labourer_name || labourers.find(l => l.id === st.labourer_id)?.full_name || 'Worker'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {st.start_date && st.end_date ? `${st.start_date} to ${st.end_date}` : `Month ${st.month}/${st.year}`} • {st.days_worked} Days
                            </div>
                          </div>
                          <span style={{
                            fontWeight: 900,
                            color: '#15803d',
                            fontSize: '1.1rem',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            padding: '3px 9px',
                            borderRadius: 8
                          }}>
                            ₹{st.paid_amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', marginBottom: 8, background: '#f8fafc', padding: '6px 10px', borderRadius: 8 }}>
                          <span>Payer: <strong style={{ color: '#15803d' }}>{st.given_by || 'Owner'}</strong></span>
                          <span>Paid: <strong>{st.payment_date || '—'}</strong></span>
                          <span>Mode: <strong>{(st.payment_method || 'cash').toUpperCase()}</strong></span>
                        </div>

                        <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed #dcfce7', paddingTop: 10 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSalary(st)}
                            style={{
                              flex: 1,
                              padding: '9px 12px',
                              borderRadius: 8,
                              border: '1.5px solid #0284c7',
                              background: '#f0f9ff',
                              color: '#0284c7',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                          >
                            <Edit2 size={14} />
                            <span>Edit Payout</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSalarySettlement(st.id)}
                            style={{
                              padding: '9px 14px',
                              borderRadius: 8,
                              border: '1px solid #fed7aa',
                              background: '#fff7ed',
                              color: '#c2410c',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Revert to Unpaid"
                          >
                            <RotateCcw size={14} />
                            <span>Revert</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                    Hired Tractor Rental Logs
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: '#4b6354', fontWeight: 600 }}>
                    Track hired tractor hours, rental rates, advance paid & balance due (Zero owned tractors)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleExportTractorPdf}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title="Export Hired Tractor Rental Ledger to PDF"
                  >
                    <FileDown size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNewRentalOpen(!isNewRentalOpen)}
                    className="ledger-action-btn ledger-action-btn-primary"
                    style={{ padding: '8px 14px' }}
                  >
                    <Plus size={15} />
                    <span>{isNewRentalOpen ? 'Close Form' : 'Log Hired Tractor'}</span>
                  </button>
                </div>
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

                {(() => {
                  const options: { id: string; label: string }[] = [{ id: 'all', label: 'All Dates' }];
                  const n = new Date();
                  
                  // Today
                  const tStr = n.toLocaleDateString('en-CA');
                  const tLabel = `Today (${n.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
                  options.push({ id: tStr, label: tLabel });

                  // Yesterday
                  const y = new Date(n);
                  y.setDate(y.getDate() - 1);
                  const yStr = y.toLocaleDateString('en-CA');
                  const yLabel = `Yesterday (${y.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
                  options.push({ id: yStr, label: yLabel });

                  // 2 Days Ago
                  const d2 = new Date(n);
                  d2.setDate(d2.getDate() - 2);
                  const d2Str = d2.toLocaleDateString('en-CA');
                  const d2Label = d2.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  options.push({ id: d2Str, label: d2Label });

                  return options.map(({ id, label }) => {
                    const isActive = tractorDateFilter === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTractorDateFilter(id)}
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
                  });
                })()}

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
                          <span>Gross Bill: <strong>₹{gross}</strong><br></br> • Advance: <strong>−₹{rentalAdvance}</strong></span>
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
                  <div style={{ fontSize: '0.8rem' }}>Click "Log Hired Tractor" to record your first run.</div>
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
        {activeSection === 'labours' && (() => {
          const filteredLabourers = allLabourers.filter(l => {
            if (crewFilter === 'active') return l.is_active;
            if (crewFilter === 'deactivated') return !l.is_active;
            return true;
          });
          const activeCount = allLabourers.filter(l => l.is_active).length;
          const deactivatedCount = allLabourers.filter(l => !l.is_active).length;

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', margin: '0 0 3px 0', color: '#143823', fontWeight: 800 }}>
                    Farm Crew Directory ({filteredLabourers.length} Shown • {allLabourers.length} Total)
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: '#4b6354', fontWeight: 600 }}>
                    Manage active workforce, inspect deactivated workers, adjust rates & view monthly attendance
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleExportLabourersPdf}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title="Export Farm Crew Directory to PDF"
                  >
                    <FileDown size={15} />
                    <span>Export Crew PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="ledger-action-btn ledger-action-btn-primary"
                    style={{ padding: '8px 14px' }}
                  >
                    <UserPlus size={15} />
                    <span>Add Labourer</span>
                  </button>
                </div>
              </div>

              {/* Segmented Filter: All Workers | Active Crew | Deactivated */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setCrewFilter('all')}
                  className={`ledger-action-btn ${crewFilter === 'all' ? 'ledger-action-btn-primary' : 'ledger-action-btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  All Workers ({allLabourers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCrewFilter('active')}
                  className={`ledger-action-btn ${crewFilter === 'active' ? 'ledger-action-btn-primary' : 'ledger-action-btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  Active Crew ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCrewFilter('deactivated')}
                  className={`ledger-action-btn ${crewFilter === 'deactivated' ? 'ledger-action-btn-primary' : 'ledger-action-btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  Deactivated ({deactivatedCount})
                </button>
              </div>

              {labSuccessMsg && (
                <div style={{ background: '#dcfce7', border: '2px solid #86efac', color: '#14532d', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>{labSuccessMsg}</span>
                </div>
              )}

              {/* Empty State */}
              {filteredLabourers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: 16, border: '1.5px dashed #cbd5e1', color: '#64748b', margin: '14px 0' }}>
                  <Users size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#334155' }}>
                    No {crewFilter === 'deactivated' ? 'Deactivated' : (crewFilter === 'active' ? 'Active' : '')} Workers Found
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {crewFilter === 'deactivated' ? 'All registered labourers are currently active in the farm crew.' : 'No crew members found under this filter.'}
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Labourers Table */}
                  <div className="ledger-desktop-only">
                    <div className="ledger-table-wrap">
                      <table className="ledger-table">
                        <thead>
                          <tr>
                            <th className="ledger-th">Code</th>
                            <th className="ledger-th">Full Name</th>
                            <th className="ledger-th">Status</th>
                            <th className="ledger-th">Daily Wage</th>
                            <th className="ledger-th">Phone</th>
                            <th className="ledger-th">Due</th>
                            <th className="ledger-th" style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLabourers.map((lab) => {
                            const bal = dataService.getLabourerAdvanceBalance(lab.id);

                            return (
                              <tr key={lab.id} className="ledger-tr" style={{ opacity: lab.is_active ? 1 : 0.82, background: lab.is_active ? 'transparent' : '#f8fafc' }}>
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
                                      background: lab.is_active ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#e2e8f0',
                                      color: lab.is_active ? '#15803d' : '#64748b',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '0.9rem',
                                      border: lab.is_active ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                                      flexShrink: 0
                                    }}>
                                      {lab.full_name.charAt(0)}
                                    </div>
                                    <span style={{ fontWeight: 800, color: lab.is_active ? '#143823' : '#475569' }}>{lab.full_name}</span>
                                  </div>
                                </td>
                                <td className="ledger-td">
                                  {lab.is_active ? (
                                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                      Active
                                    </span>
                                  ) : (
                                    <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                      Deactivated
                                    </span>
                                  )}
                                </td>
                                <td className="ledger-td" style={{ fontWeight: 800, color: lab.is_active ? '#15803d' : '#64748b' }}>
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
                                    {lab.is_active && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedLabourerForCalendar(lab)}
                                        className="ledger-action-btn ledger-action-btn-secondary"
                                        style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                                      >
                                        <Calendar size={13} color="#15803d" />
                                        <span>Monthly Calendar</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditLabourer(lab)}
                                      className="ledger-action-btn ledger-action-btn-secondary"
                                      style={{ padding: '5px 10px', fontSize: '0.76rem', color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}
                                      title="Edit Worker Details"
                                    >
                                      <Edit2 size={13} color="#0284c7" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleLabourActive(lab.id)}
                                      className={`ledger-action-btn ${lab.is_active ? 'ledger-action-btn-secondary' : 'ledger-action-btn-primary'}`}
                                      style={{
                                        padding: '5px 9px',
                                        fontSize: '0.74rem',
                                        color: lab.is_active ? '#b45309' : '#ffffff',
                                        border: lab.is_active ? '1px solid #fde68a' : 'none'
                                      }}
                                      title={lab.is_active ? 'Deactivate this worker from daily attendance' : 'Reactivate this worker into active crew'}
                                    >
                                      {lab.is_active ? 'Deactivate' : '⚡ Reactivate'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmLab(lab)}
                                      className="ledger-action-btn ledger-action-btn-danger"
                                      style={{ padding: '5px 8px' }}
                                      title="Delete Worker Permanently"
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
                    {filteredLabourers.map((lab) => {
                      const bal = dataService.getLabourerAdvanceBalance(lab.id);

                      return (
                        <div key={lab.id} className="ledger-mobile-row" style={{ opacity: lab.is_active ? 1 : 0.85, background: lab.is_active ? '#ffffff' : '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                background: lab.is_active ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#e2e8f0',
                                color: lab.is_active ? '#15803d' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                border: lab.is_active ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                                flexShrink: 0
                              }}>
                                {lab.full_name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: lab.is_active ? '#143823' : '#475569' }}>
                                    {lab.full_name}
                                  </span>
                                  {lab.is_active ? (
                                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                                      Active
                                    </span>
                                  ) : (
                                    <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                                      Deactivated
                                    </span>
                                  )}
                                </div>
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

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #dcfce7', gap: 6, flexWrap: 'wrap' }}>
                            {lab.is_active && (
                              <button
                                type="button"
                                onClick={() => setSelectedLabourerForCalendar(lab)}
                                className="ledger-action-btn ledger-action-btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                              >
                                <Calendar size={13} color="#15803d" />
                                <span>Monthly Numbers</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditLabourer(lab)}
                              className="ledger-action-btn ledger-action-btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.74rem', color: '#0369a1', border: '1px solid #bae6fd', background: '#f0f9ff' }}
                              title="Edit Worker Details"
                            >
                              <Edit2 size={13} color="#0284c7" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleLabourActive(lab.id)}
                              className={`ledger-action-btn ${lab.is_active ? 'ledger-action-btn-secondary' : 'ledger-action-btn-primary'}`}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.74rem',
                                color: lab.is_active ? '#b45309' : '#ffffff'
                              }}
                            >
                              {lab.is_active ? 'Deactivate' : '⚡ Reactivate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteConfirmLab(lab)}
                              className="ledger-action-btn ledger-action-btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                              title="Delete Worker Permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* User Settings & Password Update Routine Section */}
        {activeSection === 'settings' && (
          <div style={{ marginTop: 16 }}>
            <UserSettingsPage />
          </div>
        )}
      </div>

      {/* =========================================================================
        NATIVE MOBILE FIXED / STICKY BOTTOM NAVIGATION BAR (PORTAL TO BODY)
        ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <nav
          className="mobile-bottom-nav"
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            maxWidth: '100%',
            zIndex: isAnyModalOpen ? -1 : 999999,
            display: isAnyModalOpen ? 'none' : 'flex',
            pointerEvents: isAnyModalOpen ? 'none' : 'auto',
            margin: 0,
          }}
        >
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeSection === 'attendance' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => {
              if (isAnyModalOpen) return;
              setActiveSection('attendance');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <CalendarCheck size={18} />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeSection === 'advance' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => {
              if (isAnyModalOpen) return;
              setActiveSection('advance');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Wallet size={18} />
            <span>Advance</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeSection === 'payday' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => {
              if (isAnyModalOpen) return;
              setActiveSection('payday');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <CreditCard size={18} />
            <span>Salary</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeSection === 'tractor' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => {
              if (isAnyModalOpen) return;
              setActiveSection('tractor');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Tractor size={18} />
            <span>Tractors</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeSection === 'labours' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => {
              if (isAnyModalOpen) return;
              setActiveSection('labours');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Users size={18} />
            <span>Workers</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            disabled={isAnyModalOpen}
            onClick={() => {
              if (isAnyModalOpen) return;
              setActiveSection('settings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Sliders size={18} />
            <span>Settings</span>
          </button>
        </nav>,
        document.body
      )}

      {/* =========================================================================
          ADD LABOUR MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
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
          EDIT LABOURER MODAL (SUPERVISOR & ADMIN PERMISSION)
          ========================================================================= */}
      {editingLabourer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
          }}
          onClick={() => setEditingLabourer(null)}
        >
          <div
            className="ledger-card"
            style={{ maxWidth: 450, width: '100%', padding: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>Edit Worker Details</h2>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Code: {editingLabourer.labour_code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLabourer(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateLabourer}>
              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kadam"
                  value={editLabName}
                  onChange={(e) => setEditLabName(e.target.value)}
                  className="ledger-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="ledger-label">Daily Wage (₹/day) *</label>
                  <input
                    type="number"
                    step="10"
                    min="50"
                    placeholder="e.g. 500"
                    value={editLabRate}
                    onChange={(e) => setEditLabRate(Number(e.target.value))}
                    className="ledger-input"
                    required
                  />
                </div>
                <div>
                  <label className="ledger-label">Worker Code</label>
                  <input
                    type="text"
                    value={editLabCode}
                    onChange={(e) => setEditLabCode(e.target.value.toUpperCase())}
                    className="ledger-input"
                    placeholder="e.g. LAB-001"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="ledger-label">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={editLabPhone}
                  onChange={(e) => setEditLabPhone(e.target.value)}
                  className="ledger-input"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="ledger-label">Notes / Task Specialization (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vineyard specialist, Pruning expert"
                  value={editLabNotes}
                  onChange={(e) => setEditLabNotes(e.target.value)}
                  className="ledger-input"
                />
              </div>

              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Employment Status</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Active workers appear in daily attendance list</div>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={editLabActive}
                    onChange={(e) => setEditLabActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#15803d' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: editLabActive ? '#15803d' : '#94a3b8' }}>
                    {editLabActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingLabourer(null)}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ledger-action-btn ledger-action-btn-primary"
                  style={{ flex: 2, padding: '10px', background: '#0284c7', borderColor: '#0284c7' }}
                >
                  Save Changes
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
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000070,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
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

      {/* =========================================================================
          OFFICIAL FARM PDF EXPORT MODAL
          ========================================================================= */}
      {isPdfExportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
          }}
          onClick={() => setIsPdfExportModalOpen(false)}
        >
          <div
            className="ledger-card"
            style={{
              maxWidth: 580,
              width: '100%',
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '2px solid #86efac'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#dcfce7', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileDown size={24} color="#15803d" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#143823', fontWeight: 800 }}>
                    Export Official Farm PDF
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: '#4b6354', fontWeight: 600 }}>
                    Auditable, tamper-evident PDF manifests with digital checksums
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPdfExportModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick 1-Tap Export Current View Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
              borderRadius: 14,
              padding: '14px 16px',
              color: '#ffffff',
              marginBottom: 18,
              boxShadow: '0 6px 14px rgba(21, 128, 61, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86efac', fontWeight: 800 }}>
                  Instant 1-Tap Quick Export
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: 2 }}>
                  {activeSection === 'attendance'
                    ? (attendanceViewMode === 'calendar' ? `Monthly Attendance (${monthName} ${calYear})` : `Today's Attendance (${attendanceDate})`)
                    : activeSection === 'advance'
                      ? `Worker Advances (${currentAdvMonthLabel})`
                      : activeSection === 'payday'
                        ? `Salary Sheet (${salaryMonthName} ${salaryYear})`
                        : activeSection === 'tractor'
                          ? `Hired Tractor Rentals (${tractorRentals.length} runs)`
                          : `Labour Crew Directory (${labourers.length} workers)`
                  }
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleExportCurrentViewPdf();
                  setIsPdfExportModalOpen(false);
                }}
                style={{
                  background: '#ffffff',
                  color: '#15803d',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 16px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                <Download size={15} />
                <span>Export Now</span>
              </button>
            </div>

            {/* Report Options List */}
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Choose Report Manifest
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Option 1: Daily Attendance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CalendarCheck size={20} color="#15803d" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Daily Attendance Register</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {attendanceDate} • {presentCount} Present • {halfDayCount} Half-Day</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportDailyAttendancePdf();
                    setIsPdfExportModalOpen(false);
                  }}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Option 2: Monthly Attendance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Calendar size={20} color="#0284c7" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Monthly Attendance Muster Roll</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Month: {monthName} {calYear} • Cumulative shifts & gross wages</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportMonthlyAttendancePdf();
                    setIsPdfExportModalOpen(false);
                  }}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Option 3: Monthly Salary Settlement Sheet */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CreditCard size={20} color="#7c3aed" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Monthly Salary Settlement Sheet</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Month: {salaryMonthName} {salaryYear} • Net Payout: ₹{totalNetTakeHome.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportSalaryPdf();
                    setIsPdfExportModalOpen(false);
                  }}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Option 4: Advances & Khata */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Wallet size={20} color="#b45309" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Worker Advances & Khata Ledger</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Outstanding Due: ₹{totalOverallDue.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportAdvancesPdf();
                    setIsPdfExportModalOpen(false);
                  }}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Option 5: Hired Tractor Rentals */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tractor size={20} color="#059669" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Hired Tractor Rentals & Vendor Dues</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Contract equipment hours, rental rates & vendor outstandings</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportTractorPdf();
                    setIsPdfExportModalOpen(false);
                  }}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Option 6: Master Labour Crew Register */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Users size={20} color="#475569" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Master Labour Crew Directory</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{labourers.length} registered workers • Base wage rates & phones</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportLabourersPdf();
                    setIsPdfExportModalOpen(false);
                  }}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Footer Notice */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Verified format • Includes SHA-256 manifest hash</span>
              <button
                type="button"
                onClick={() => setIsPdfExportModalOpen(false)}
                className="ledger-action-btn ledger-action-btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Advance Modal */}
      {editingAdv && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
          }}
          onClick={() => setEditingAdv(null)}
        >
          <div
            className="ledger-card"
            style={{
              maxWidth: 500,
              width: '100%',
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '2px solid #86efac'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef3c7', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={20} color="#b45309" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#143823', fontWeight: 800 }}>
                    Edit Advance Record
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Worker: {editingAdv.labourer_name || labourers.find(l => l.id === editingAdv.labourer_id)?.full_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdv(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdvance}>
              <div style={{ marginBottom: 14 }}>
                <label className="ledger-label">Worker</label>
                <select
                  value={editAdvLabId}
                  onChange={(e) => setEditAdvLabId(e.target.value)}
                  className="ledger-select"
                  required
                >
                  {allLabourers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name} ({l.labour_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="ledger-label">Advance Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editAdvAmount}
                    onChange={(e) => setEditAdvAmount(Number(e.target.value) || 0)}
                    className="ledger-input"
                    style={{ fontWeight: 800, fontSize: '1.1rem', color: '#b45309' }}
                    required
                  />
                </div>
                <div>
                  <label className="ledger-label">Date Issued</label>
                  <input
                    type="date"
                    value={editAdvDate}
                    onChange={(e) => setEditAdvDate(e.target.value)}
                    className="ledger-input"
                    required
                  />
                </div>
              </div>

              {/* Given By Field */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="ledger-label" style={{ margin: 0 }}>Given By</label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Who issued this advance</span>
                </div>
                <input
                  type="text"
                  value={editAdvGivenBy}
                  onChange={(e) => setEditAdvGivenBy(e.target.value)}
                  placeholder="Enter name"
                  className="ledger-input"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="ledger-label">Payment Mode</label>
                  <select
                    value={editAdvMethod}
                    onChange={(e) => setEditAdvMethod(e.target.value as PaymentMethod)}
                    className="ledger-select"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="ledger-label">Reference / Note</label>
                  <input
                    type="text"
                    value={editAdvRef}
                    onChange={(e) => setEditAdvRef(e.target.value)}
                    placeholder="Txn ID or ref"
                    className="ledger-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="ledger-label">Purpose / Reason</label>
                <input
                  type="text"
                  value={editAdvPurpose}
                  onChange={(e) => setEditAdvPurpose(e.target.value)}
                  placeholder="e.g. Field work cash advance, Medical, Festival"
                  className="ledger-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingAdv(null)}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ledger-action-btn ledger-action-btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Salary Modal */}
      {settleModalLab && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
          }}
          onClick={() => setSettleModalLab(null)}
        >
          <div
            className="ledger-card"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '2px solid #86efac'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#dcfce7', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={20} color="#15803d" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#143823', fontWeight: 800 }}>
                    {settleModalLab.periodType === 'weekly' ? 'Settle Weekly Wages' : (settleModalLab.periodType === 'monthly' ? 'Settle Monthly Salary' : 'Settle Custom Period Wages')}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#4b6354', fontWeight: 600 }}>
                    {settleModalLab.lab.full_name} ({settleModalLab.lab.labour_code}) • {settleModalLab.periodLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalLab(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Calculations Breakdown Strip */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Days × Rate</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#143823' }}>
                  {settleModalLab.daysWorked}d @ ₹{settleModalLab.dailyRate}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Gross Wage</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d' }}>
                  ₹{settleModalLab.grossWage.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Advance Due</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: settleModalLab.advanceDue > 0 ? '#b45309' : '#64748b' }}>
                  ₹{settleModalLab.advanceDue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmSettleSalary}>
              {/* Advance Deducted This Payout Input (Editable!) */}
              <div style={{ marginBottom: 14, background: '#fffbeb', padding: '10px 14px', borderRadius: 12, border: '1px solid #fef3c7' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="ledger-label" style={{ margin: 0, color: '#92400e' }}>Advance Deducted This Payout (₹)</label>
                  <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 800 }}>
                    Total Due: ₹{settleModalLab.advanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={settleModalLab.advanceDue}
                  step="1"
                  value={settleAdvanceDeduct}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(settleModalLab.advanceDue, Number(e.target.value) || 0));
                    setSettleAdvanceDeduct(val);
                    setSettleAmount(round2(Math.max(0, settleModalLab.grossWage - val)));
                  }}
                  className="ledger-input"
                  style={{ fontWeight: 800, fontSize: '1.05rem', color: '#b45309', background: '#ffffff' }}
                />
                <div style={{ fontSize: '0.71rem', color: '#78350f', marginTop: 4 }}>
                  💡 Tip: For weekly workers, adjust to deduct partial advance (e.g. ₹500) rather than wiping out their weekly wage.
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="ledger-label">Net Take-Home Payout Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value) || 0)}
                  className="ledger-input"
                  style={{ fontWeight: 900, fontSize: '1.25rem', color: '#15803d' }}
                  required
                />
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                  Gross ₹{settleModalLab.grossWage.toLocaleString('en-IN')} − Advance Ded. ₹{settleAdvanceDeduct.toLocaleString('en-IN')} = ₹{round2(Math.max(0, settleModalLab.grossWage - settleAdvanceDeduct)).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Given By Field with quick chips */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="ledger-label" style={{ margin: 0 }}>Given By (Salary Payer)</label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Who is handing the wage payout</span>
                </div>
                <input
                  type="text"
                  value={settleGivenBy}
                  onChange={(e) => setSettleGivenBy(e.target.value)}
                  placeholder="Enter payer name"
                  className="ledger-input"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="ledger-label">Payment Date</label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="ledger-input"
                    required
                  />
                </div>
                <div>
                  <label className="ledger-label">Payment Method</label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as PaymentMethod)}
                    className="ledger-select"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="ledger-label">Payment Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Paid in full at farm office, UPI reference"
                  className="ledger-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSettleModalLab(null)}
                  className="ledger-action-btn ledger-action-btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ledger-action-btn ledger-action-btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  Confirm Payout (₹{settleAmount.toLocaleString('en-IN')})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Salary Settlement Modal */}
      {editingSalarySettlement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
          }}
          onClick={() => setEditingSalarySettlement(null)}
        >
          <div
            className="ledger-card"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '2px solid #86efac'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0fdf4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={20} color="#15803d" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#143823', fontWeight: 800 }}>
                    Edit Salary Settlement
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#4b6354', fontWeight: 600 }}>
                    {editingSalarySettlement.labourer_name} ({editingSalarySettlement.labour_code}) • Month {editingSalarySettlement.month}/{editingSalarySettlement.year}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSalarySettlement(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Shift & Wage Info */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Days Worked</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#143823' }}>
                  {editingSalarySettlement.days_worked} Days
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Gross Wage</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d' }}>
                  ₹{editingSalarySettlement.gross_wage.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Advance Ded.</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#b45309' }}>
                  ₹{editingSalarySettlement.advance_deducted.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateSalarySettlement}>
              <div style={{ marginBottom: 14 }}>
                <label className="ledger-label">Actual Paid Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editSalaryAmount}
                  onChange={(e) => setEditSalaryAmount(Number(e.target.value) || 0)}
                  className="ledger-input"
                  style={{ fontWeight: 900, fontSize: '1.25rem', color: '#15803d' }}
                  required
                />
              </div>

              {/* Given By Field */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="ledger-label" style={{ margin: 0 }}>Given By (Salary Payer)</label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Who handed the wage payout</span>
                </div>
                <input
                  type="text"
                  value={editSalaryGivenBy}
                  onChange={(e) => setEditSalaryGivenBy(e.target.value)}
                  placeholder="Enter payer name"
                  className="ledger-input"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="ledger-label">Payment Date</label>
                  <input
                    type="date"
                    value={editSalaryDate}
                    onChange={(e) => setEditSalaryDate(e.target.value)}
                    className="ledger-input"
                    required
                  />
                </div>
                <div>
                  <label className="ledger-label">Payment Method</label>
                  <select
                    value={editSalaryMethod}
                    onChange={(e) => setEditSalaryMethod(e.target.value as PaymentMethod)}
                    className="ledger-select"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="ledger-label">Payment Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={editSalaryNotes}
                  onChange={(e) => setEditSalaryNotes(e.target.value)}
                  placeholder="e.g. Adjusted after overtime, UPI reference"
                  className="ledger-input"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleDeleteSalarySettlement(editingSalarySettlement.id)}
                  className="ledger-action-btn ledger-action-btn-danger"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <RotateCcw size={14} />
                  <span>Revert to Unpaid</span>
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEditingSalarySettlement(null)}
                    className="ledger-action-btn ledger-action-btn-secondary"
                    style={{ padding: '8px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ledger-action-btn ledger-action-btn-primary"
                    style={{ padding: '8px 20px' }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          NATIVE PDF PREVIEW & SHARING MODAL
          ========================================================================= */}
      {pdfPreviewResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 2000080,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            touchAction: 'none'
          }}
          onClick={() => setPdfPreviewResult(null)}
        >
          <div
            className="ledger-card"
            style={{
              maxWidth: 460,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              borderRadius: 20,
              background: '#ffffff',
              border: '2px solid #86efac'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with success icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
                border: '2px solid #86efac',
                flexShrink: 0
              }}>
                <CheckCircle2 size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#143823', fontWeight: 800 }}>
                  PDF Export Complete!
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#4b6354', fontWeight: 600 }}>
                  Official Farm Statement Generated
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfPreviewResult(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* File & Storage Location Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileText size={18} color="#15803d" />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>
                  {pdfPreviewResult.filename}
                </span>
              </div>
              <div style={{
                fontSize: '0.78rem',
                color: '#166534',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                padding: '8px 12px',
                lineHeight: 1.45
              }}>
                {Capacitor.isNativePlatform() ? (
                  <div>
                    <strong>📱 Saved to Phone:</strong> Your device's <code>Documents</code> folder (<code>{pdfPreviewResult.savedPath || 'Documents/' + pdfPreviewResult.filename}</code>).
                  </div>
                ) : (
                  <div>
                    <strong>💻 Downloaded to Computer:</strong> Saved in your browser's default Downloads folder.
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={async () => {
                  if (Capacitor.isNativePlatform() || pdfPreviewResult.nativeUri) {
                    try {
                      await Share.share({
                        title: 'FarmLog Report',
                        text: `FarmLog: ${pdfPreviewResult.filename}`,
                        url: pdfPreviewResult.nativeUri || pdfPreviewResult.blobUrl,
                        dialogTitle: 'Share / Save PDF to Phone'
                      });
                    } catch (e) {
                      console.warn(e);
                    }
                  } else {
                    window.open(pdfPreviewResult.blobUrl, '_blank');
                  }
                }}
                className="ledger-action-btn ledger-action-btn-primary"
                style={{
                  padding: '12px 18px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)'
                }}
              >
                <Share2 size={18} />
                <span>{Capacitor.isNativePlatform() ? 'Send via WhatsApp / Drive / Files' : 'Share / Open File'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open(pdfPreviewResult.blobUrl, '_blank');
                }}
                className="ledger-action-btn ledger-action-btn-secondary"
                style={{
                  padding: '10px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 12
                }}
              >
                <ExternalLink size={16} />
                <span>Preview in Browser</span>
              </button>

              <button
                type="button"
                onClick={() => setPdfPreviewResult(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  padding: '8px',
                  cursor: 'pointer',
                  marginTop: 2
                }}
              >
                Done
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
    </>
  );
};

export default SimpleFarmViewPage;
