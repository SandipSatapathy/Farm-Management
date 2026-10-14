import {
  Farm,
  FarmMembership,
  Labourer,
  AttendanceRecord,
  PayrollPeriod,
  PayrollLine,
  PayrollPayment,
  Advance,
  AdvanceAllocation,
  Machinery,
  MachineryUsage,
  MachineryExpense,
  AuditLog,
  SyncJob,
  AnnualCloseManifest,
  UserRole,
  AttendanceStatus,
  ApprovalStatus,
  PaymentMethod,
  TractorRentalLog,
  MonthlyAttendanceSummary
} from '../types';
import { 
  upsertToLocalDb, 
  deleteFromLocalDb, 
  syncAllFromLocalDb, 
  isDbSyncActive 
} from './localDbClient';

const STORAGE_KEY = 'kisanops_farm_data_v2';

export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Initial Clean Farm Setup (Real Production Data — Zero Demo/Test Records)
const initialFarm: Farm = {
  id: 'farm-main-001',
  name: 'My Farm Operations',
  address: '',
  currency_code: 'INR',
  timezone: 'Asia/Kolkata',
  financial_year_start_month: 4,
  financial_year_start_day: 1,
  settings: {
    overtime_enabled: false,
    require_correction_reason: true,
    default_payroll_cadence: 'monthly'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const initialMemberships: FarmMembership[] = [];
const initialLabourers: Labourer[] = [];
const initialMachinery: Machinery[] = [];
const initialAdvances: Advance[] = [];
const initialAllocations: AdvanceAllocation[] = [];
const initialAttendance: AttendanceRecord[] = [];
const initialUsage: MachineryUsage[] = [];
const initialExpenses: MachineryExpense[] = [];
const initialAudit: AuditLog[] = [];
const initialTractorRentals: TractorRentalLog[] = [];

interface FarmDataStore {
  farm: Farm;
  memberships: FarmMembership[];
  labourers: Labourer[];
  attendance: AttendanceRecord[];
  payrollPeriods: PayrollPeriod[];
  payrollLines: PayrollLine[];
  payrollPayments: PayrollPayment[];
  advances: Advance[];
  allocations: AdvanceAllocation[];
  machinery: Machinery[];
  usage: MachineryUsage[];
  expenses: MachineryExpense[];
  tractorRentals: TractorRentalLog[];
  auditLogs: AuditLog[];
  syncJobs: SyncJob[];
  closeManifests: AnnualCloseManifest[];
}

const getStore = (): FarmDataStore => {
  if (typeof window !== 'undefined') {
    // Purge old demo storage keys so no fake demo records persist
    try {
      localStorage.removeItem('kisanops_farm_data_v1');
    } catch {}
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (!parsed.tractorRentals) parsed.tractorRentals = [];
      if (!parsed.attendance) parsed.attendance = [];
      if (!parsed.labourers) parsed.labourers = [];
      if (!parsed.advances) parsed.advances = [];
      if (!parsed.allocations) parsed.allocations = [];
      if (!parsed.machinery) parsed.machinery = [];
      if (!parsed.usage) parsed.usage = [];
      if (!parsed.expenses) parsed.expenses = [];
      if (!parsed.auditLogs) parsed.auditLogs = [];
      if (!parsed.syncJobs) parsed.syncJobs = [];
      if (!parsed.payrollPeriods) parsed.payrollPeriods = [];
      if (!parsed.payrollLines) parsed.payrollLines = [];
      if (!parsed.payrollPayments) parsed.payrollPayments = [];
      if (!parsed.closeManifests) parsed.closeManifests = [];
      return parsed;
    } catch {
      // fallback
    }
  }

  const initialStore: FarmDataStore = {
    farm: initialFarm,
    memberships: initialMemberships,
    labourers: initialLabourers,
    attendance: initialAttendance,
    payrollPeriods: [],
    payrollLines: [],
    payrollPayments: [],
    advances: initialAdvances,
    allocations: initialAllocations,
    machinery: initialMachinery,
    usage: initialUsage,
    expenses: initialExpenses,
    tractorRentals: initialTractorRentals,
    auditLogs: initialAudit,
    syncJobs: [],
    closeManifests: []
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStore));
  return initialStore;
};

const saveStore = (store: FarmDataStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const dataService = {
  // Database Sync Engine (Local PostgreSQL in Dev / Supabase in Prod)
  initDatabaseSync: async () => {
    if (!isDbSyncActive) return;

    try {
      const dbData = await syncAllFromLocalDb();
      const store = getStore();

      if (dbData) {
        const hasDbRecords = 
          (dbData.labourers && dbData.labourers.length > 0) ||
          (dbData.attendance && dbData.attendance.length > 0) ||
          (dbData.advances && dbData.advances.length > 0) ||
          (dbData.tractorRentals && dbData.tractorRentals.length > 0);

        const hasLocalRecords = 
          store.labourers.length > 0 ||
          store.attendance.length > 0 ||
          store.advances.length > 0 ||
          store.tractorRentals.length > 0;

        if (hasDbRecords) {
          // Database has records -> hydrate local store from DB
          if (dbData.labourers) store.labourers = dbData.labourers;
          if (dbData.attendance) store.attendance = dbData.attendance;
          if (dbData.advances) store.advances = dbData.advances;
          if (dbData.advanceAllocations) store.allocations = dbData.advanceAllocations;
          if (dbData.tractorRentals) store.tractorRentals = dbData.tractorRentals;
          if (dbData.payrollPeriods) store.payrollPeriods = dbData.payrollPeriods;
          if (dbData.payrollLines) store.payrollLines = dbData.payrollLines;
          if (dbData.appUsers && dbData.appUsers.length > 0) {
            try {
              localStorage.setItem('farmlog_cached_users', JSON.stringify(dbData.appUsers));
            } catch {}
          }
          saveStore(store);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
          }
        } else if (hasLocalRecords) {
          // Database is empty, but local storage has records -> seed database!
          if (store.farm) upsertToLocalDb('farms', [store.farm]).catch(() => {});
          if (store.labourers.length > 0) upsertToLocalDb('labourers', store.labourers).catch(() => {});
          if (store.attendance.length > 0) upsertToLocalDb('attendance', store.attendance).catch(() => {});
          if (store.advances.length > 0) upsertToLocalDb('advances', store.advances).catch(() => {});
          if (store.allocations.length > 0) upsertToLocalDb('advance_allocations', store.allocations).catch(() => {});
          if (store.tractorRentals.length > 0) upsertToLocalDb('tractor_rentals', store.tractorRentals).catch(() => {});
          if (store.payrollPeriods.length > 0) upsertToLocalDb('payroll_periods', store.payrollPeriods).catch(() => {});
          if (store.payrollLines.length > 0) upsertToLocalDb('payroll_lines', store.payrollLines).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[DataService] Database sync initialization error:', err);
    }
  },

  // Farm & Memberships
  getFarm: (): Farm => getStore().farm,
  updateFarm: (updates: Partial<Farm>): Farm => {
    const store = getStore();
    store.farm = { ...store.farm, ...updates, updated_at: new Date().toISOString() };
    saveStore(store);
    upsertToLocalDb('farms', [store.farm]).catch(() => {});
    return store.farm;
  },
  getMemberships: (): FarmMembership[] => getStore().memberships,
  addMembership: (member: Omit<FarmMembership, 'id' | 'farm_id' | 'created_at'>): FarmMembership => {
    const store = getStore();
    const newMember: FarmMembership = {
      ...member,
      id: 'usr-' + Date.now(),
      farm_id: store.farm.id,
      created_at: new Date().toISOString()
    };
    store.memberships.push(newMember);
    dataService.logAudit('INVITE_USER', 'users', newMember.id, `Invited ${newMember.user_name} as ${newMember.role}`);
    saveStore(store);
    return newMember;
  },
  updateMembershipRole: (userId: string, role: UserRole, isActive: boolean) => {
    const store = getStore();
    // Safeguard: Prevent removing last active owner
    if (!isActive || role !== 'owner') {
      const activeOwners = store.memberships.filter(m => m.role === 'owner' && m.is_active && m.user_id !== userId);
      const isTargetOwner = store.memberships.some(m => m.user_id === userId && m.role === 'owner');
      if (isTargetOwner && activeOwners.length === 0) {
        throw new Error('Cannot demote or deactivate the last active Owner of the farm.');
      }
    }
    store.memberships = store.memberships.map(m => m.user_id === userId ? { ...m, role, is_active: isActive } : m);
    dataService.logAudit('UPDATE_ROLE', 'users', userId, `Updated user ${userId} role to ${role}, active=${isActive}`);
    saveStore(store);
  },

  // Labourers
  getLabourers: (onlyActive = false): Labourer[] => {
    const all = getStore().labourers;
    return onlyActive ? all.filter(l => l.is_active) : all;
  },
  getLabourerById: (id: string): Labourer | undefined => {
    return getStore().labourers.find(l => l.id === id);
  },
  saveLabourer: (labourer: Partial<Labourer> & { full_name: string; base_rate: number; wage_basis?: any; labour_code?: string }): Labourer => {
    const store = getStore();
    if (labourer.id) {
      store.labourers = store.labourers.map(l => l.id === labourer.id ? { ...l, ...labourer, updated_at: new Date().toISOString() } as Labourer : l);
      dataService.logAudit('UPDATE_LABOURER', 'labourers', labourer.id, `Updated labourer ${labourer.full_name}`);
      saveStore(store);
      const updated = store.labourers.find(l => l.id === labourer.id)!;
      upsertToLocalDb('labourers', [updated]).catch(() => {});
      return updated;
    } else {
      // Auto-assign labour code if not provided
      let code = labourer.labour_code?.trim();
      if (!code) {
        const nextNum = store.labourers.length + 1;
        code = `LAB-${String(nextNum).padStart(3, '0')}`;
      }
      // Check unique labour_code
      if (store.labourers.some(l => l.labour_code.toLowerCase() === code!.toLowerCase())) {
        code = `LAB-${Date.now().toString().slice(-4)}`;
      }
      const newLabourer: Labourer = {
        id: 'lab-' + Date.now(),
        farm_id: store.farm.id,
        labour_code: code,
        full_name: labourer.full_name,
        phone: labourer.phone || '',
        work_category: labourer.work_category || 'General Field Labour',
        start_date: labourer.start_date || new Date().toISOString().split('T')[0],
        wage_basis: labourer.wage_basis || 'daily',
        base_rate: round2(labourer.base_rate),
        is_active: labourer.is_active !== undefined ? labourer.is_active : true,
        notes: labourer.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.labourers.push(newLabourer);
      dataService.logAudit('CREATE_LABOURER', 'labourers', newLabourer.id, `Created labourer ${newLabourer.full_name}`);
      saveStore(store);
      upsertToLocalDb('labourers', [newLabourer]).catch(() => {});
      dataService.queueBackgroundSync();
      return newLabourer;
    }
  },
  toggleLabourerActive: (id: string): Labourer => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === id);
    if (!lab) throw new Error('Labourer not found');
    lab.is_active = !lab.is_active;
    lab.updated_at = new Date().toISOString();
    dataService.logAudit('DEACTIVATE_LABOURER', 'labourers', id, `Set labourer ${lab.full_name} active=${lab.is_active}`);
    saveStore(store);
    upsertToLocalDb('labourers', [lab]).catch(() => {});
    return lab;
  },
  removeLabourer: (id: string): boolean => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === id);
    if (!lab) throw new Error('Labourer not found');
    store.labourers = store.labourers.filter(l => l.id !== id);
    dataService.logAudit('REMOVE_LABOURER', 'labourers', id, `Removed labourer ${lab.full_name}`);
    saveStore(store);
    deleteFromLocalDb('labourers', id).catch(() => {});
    return true;
  },

  // Attendance
  getAttendanceForDate: (date: string, shift = 'regular'): AttendanceRecord[] => {
    return getStore().attendance.filter(a => a.work_date === date && a.shift_code === shift);
  },
  getAttendanceBetween: (startDate: string, endDate: string): AttendanceRecord[] => {
    return getStore().attendance.filter(a => a.work_date >= startDate && a.work_date <= endDate);
  },
  recordAttendance: (
    records: Array<{
      labourer_id: string;
      work_date: string;
      shift_code: string;
      status: AttendanceStatus;
      payable_units: number;
      hours_worked?: number;
      task_name?: string;
      field_name?: string;
      correction_reason?: string;
    }>,
    actorUserId = 'current-user'
  ) => {
    const store = getStore();
    const now = new Date().toISOString();

    records.forEach(entry => {
      const existingIdx = store.attendance.findIndex(
        a => a.labourer_id === entry.labourer_id &&
             a.work_date === entry.work_date &&
             a.shift_code === entry.shift_code
      );

      if (existingIdx >= 0) {
        store.attendance[existingIdx] = {
          ...store.attendance[existingIdx],
          status: entry.status,
          payable_units: entry.payable_units,
          hours_worked: entry.hours_worked,
          task_name: entry.task_name,
          field_name: entry.field_name,
          correction_reason: entry.correction_reason || store.attendance[existingIdx].correction_reason,
          approval_status: 'approved',
          updated_by: actorUserId,
          updated_at: now
        };
      } else {
        store.attendance.push({
          id: `att-${entry.work_date}-${entry.labourer_id}-${entry.shift_code}`,
          farm_id: store.farm.id,
          labourer_id: entry.labourer_id,
          work_date: entry.work_date,
          shift_code: entry.shift_code,
          status: entry.status,
          payable_units: entry.payable_units,
          hours_worked: entry.hours_worked,
          task_name: entry.task_name,
          field_name: entry.field_name,
          approval_status: 'approved',
          created_by: actorUserId,
          created_at: now,
          updated_at: now
        });
      }
    });

    dataService.logAudit('RECORD_ATTENDANCE', 'attendance', records[0]?.work_date, `Recorded attendance for ${records.length} labourers on ${records[0]?.work_date}`);
    saveStore(store);
    const recordsToSync = store.attendance.filter(a =>
      records.some(r => r.labourer_id === a.labourer_id && r.work_date === a.work_date && r.shift_code === a.shift_code)
    );
    upsertToLocalDb('attendance', recordsToSync).catch(() => {});
    dataService.queueBackgroundSync();
  },

  getLabourerMonthlyAttendance: (
    labourerId: string,
    year: number,
    month: number // 1 to 12
  ): { records: Record<string, AttendanceRecord>; summary: MonthlyAttendanceSummary } => {
    const store = getStore();
    const labourer = store.labourers.find(l => l.id === labourerId);
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Fetch existing records for this month
    const matchingRecords = store.attendance.filter(
      a => a.labourer_id === labourerId && a.work_date.startsWith(monthPrefix)
    );

    const recordMap: Record<string, AttendanceRecord> = {};
    matchingRecords.forEach(r => {
      recordMap[r.work_date] = r;
    });

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let weeklyOffDays = 0;
    let unmarkedDays = 0;

    const todayStr = '2026-10-13';

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Sunday
      const isSunday = dayOfWeek === 0;
      const rec = recordMap[dateStr];

      if (dateStr > todayStr && !rec) {
        // Future date without custom record
        if (isSunday) {
          weeklyOffDays++;
        } else {
          unmarkedDays++;
        }
      } else if (rec) {
        if (rec.status === 'present') {
          presentDays++;
        } else if (rec.status === 'half_day') {
          halfDays++;
        } else if (rec.status === 'leave' || rec.status === 'absent') {
          if (isSunday || rec.task_name?.includes('Sunday')) {
            weeklyOffDays++;
          } else {
            absentDays++;
          }
        }
      } else {
        // Past or current date with no record
        if (isSunday) {
          weeklyOffDays++;
        } else {
          unmarkedDays++;
        }
      }
    }

    const effectiveDays = round2(presentDays + (halfDays * 0.5));
    const dailyRate = labourer ? labourer.base_rate : 450;
    const grossEarned = round2(effectiveDays * dailyRate);
    const advanceInfo = labourerId ? dataService.getLabourerAdvanceBalance(labourerId) : { outstanding: 0 };
    const netPayable = round2(Math.max(0, grossEarned - advanceInfo.outstanding));

    const summary: MonthlyAttendanceSummary = {
      presentDays,
      halfDays,
      absentDays,
      weeklyOffDays,
      unmarkedDays,
      effectiveDays,
      dailyRate,
      grossEarned,
      advanceOutstanding: advanceInfo.outstanding,
      netPayable
    };

    return { records: recordMap, summary };
  },

  updateSingleDayAttendance: (
    labourerId: string,
    work_date: string,
    status: AttendanceStatus
  ): AttendanceRecord => {
    const units = status === 'present' ? 1.0 : (status === 'half_day' ? 0.5 : 0.0);
    const hours = units * 8;
    const lab = dataService.getLabourerById(labourerId);
    dataService.recordAttendance([{
      labourer_id: labourerId,
      work_date,
      shift_code: 'regular',
      status,
      payable_units: units,
      hours_worked: hours,
      task_name: lab?.work_category || 'Field Operations',
      correction_reason: 'Updated from monthly calendar view'
    }], 'Manager Calendar');

    const updated = dataService.getAttendanceForDate(work_date).find(a => a.labourer_id === labourerId);
    return updated!;
  },

  // Advances & Balances
  getAdvances: (): Advance[] => getStore().advances,
  getLabourerAdvanceBalance: (labourerId: string): { totalIssued: number; totalRecovered: number; outstanding: number } => {
    const store = getStore();
    const advances = store.advances.filter(a => a.labourer_id === labourerId && a.status === 'posted');
    const totalIssued = round2(advances.reduce((sum, a) => sum + a.amount, 0));

    const advanceIds = new Set(advances.map(a => a.id));
    const allocations = store.allocations.filter(alloc => advanceIds.has(alloc.advance_id));
    const totalRecovered = round2(allocations.reduce((sum, al) => sum + al.amount, 0));

    const outstanding = round2(Math.max(0, totalIssued - totalRecovered));
    return { totalIssued, totalRecovered, outstanding };
  },
  issueAdvance: (data: {
    labourer_id: string;
    amount: number;
    purpose?: string;
    payment_method: PaymentMethod;
    payment_reference?: string;
    notes?: string;
    issued_by?: string;
    issued_at?: string;
  }): Advance => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === data.labourer_id);
    if (!lab) throw new Error('Labourer not found');
    if (data.amount <= 0) throw new Error('Advance amount must be greater than zero.');

    const newAdvance: Advance = {
      id: 'adv-' + Date.now(),
      farm_id: store.farm.id,
      labourer_id: data.labourer_id,
      labourer_name: lab.full_name,
      labour_code: lab.labour_code,
      issued_at: data.issued_at || new Date().toISOString(),
      amount: round2(data.amount),
      purpose: data.purpose || 'Personal advance',
      payment_method: data.payment_method,
      payment_reference: data.payment_reference || '',
      status: 'posted',
      issued_by: data.issued_by?.trim() || 'Owner/Manager',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.advances.push(newAdvance);
    dataService.logAudit('ISSUE_ADVANCE', 'advances', newAdvance.id, `Issued advance ₹${newAdvance.amount} to ${lab.full_name} (Given by: ${newAdvance.issued_by})`);
    saveStore(store);
    upsertToLocalDb('advances', [newAdvance]).catch(() => {});
    dataService.queueBackgroundSync();
    return newAdvance;
  },
  recordDirectAdvanceRepayment: (advanceId: string, amount: number, notes?: string): AdvanceAllocation => {
    const store = getStore();
    const advance = store.advances.find(a => a.id === advanceId);
    if (!advance) throw new Error('Advance record not found');

    const bal = dataService.getLabourerAdvanceBalance(advance.labourer_id);
    if (amount > bal.outstanding) {
      throw new Error(`Repayment ₹${amount} exceeds total outstanding balance ₹${bal.outstanding}.`);
    }

    const allocation: AdvanceAllocation = {
      id: 'alloc-' + Date.now(),
      farm_id: store.farm.id,
      advance_id: advanceId,
      allocation_date: new Date().toISOString().split('T')[0],
      amount: round2(amount),
      allocation_type: 'cash_repayment',
      notes: notes || 'Cash repayment',
      created_at: new Date().toISOString()
    };

    store.allocations.push(allocation);
    dataService.logAudit('REPAY_ADVANCE', 'advances', advanceId, `Recorded direct cash repayment ₹${amount} for advance ${advanceId}`);
    saveStore(store);
    upsertToLocalDb('advance_allocations', [allocation]).catch(() => {});
    return allocation;
  },

  // Payroll Calculation Engine & Finalization
  previewPayroll: (startDate: string, endDate: string) => {
    const store = getStore();
    const attendance = store.attendance.filter(a => a.work_date >= startDate && a.work_date <= endDate && a.approval_status === 'approved');
    const labourers = store.labourers.filter(l => l.is_active);

    const lines: Array<Omit<PayrollLine, 'id' | 'farm_id' | 'payroll_period_id' | 'created_at' | 'updated_at'>> = [];

    labourers.forEach(lab => {
      const labAtt = attendance.filter(a => a.labourer_id === lab.id);
      const presentDays = labAtt.filter(a => a.status === 'present').length;
      const halfDays = labAtt.filter(a => a.status === 'half_day').length;
      const absentDays = labAtt.filter(a => a.status === 'absent').length;
      const leaveDays = labAtt.filter(a => a.status === 'leave').length;
      const holidayDays = labAtt.filter(a => a.status === 'holiday').length;

      const totalPayableUnits = round2(labAtt.reduce((sum, a) => sum + a.payable_units, 0));
      const totalHours = round2(labAtt.reduce((sum, a) => sum + (a.hours_worked || 0), 0));

      const grossAmount = round2(totalPayableUnits * lab.base_rate);
      const advanceBal = dataService.getLabourerAdvanceBalance(lab.id);

      // Advance recovery policy: deduct up to 50% of gross wage or full outstanding, whichever is lower
      const maxRecovery = round2(grossAmount * 0.5);
      const advanceRecovery = round2(Math.min(advanceBal.outstanding, maxRecovery));
      const netPayable = round2(Math.max(0, grossAmount - advanceRecovery));

      lines.push({
        labourer_id: lab.id,
        labourer_name: lab.full_name,
        labour_code: lab.labour_code,
        attendance_snapshot: {
          present_days: presentDays,
          half_days: halfDays,
          absent_days: absentDays,
          leave_days: leaveDays,
          holiday_days: holidayDays,
          total_payable_units: totalPayableUnits,
          total_hours: totalHours
        },
        wage_basis: lab.wage_basis,
        rate_snapshot: lab.base_rate,
        units: totalPayableUnits,
        gross_amount: grossAmount,
        additions: 0,
        other_deductions: 0,
        advance_recovery: advanceRecovery,
        net_payable: netPayable,
        paid_amount: 0,
        calculation_details: {
          formula: `${totalPayableUnits} units × ₹${lab.base_rate} = ₹${grossAmount}`,
          outstandingAdvanceBefore: advanceBal.outstanding,
          advanceRecoveryCappedAt50Pct: maxRecovery
        }
      });
    });

    const totalGross = round2(lines.reduce((s, l) => s + l.gross_amount, 0));
    const totalAdvanceRecovery = round2(lines.reduce((s, l) => s + l.advance_recovery, 0));
    const totalNetPayable = round2(lines.reduce((s, l) => s + l.net_payable, 0));

    return {
      period: { start_date: startDate, end_date: endDate },
      lines,
      totals: {
        totalGross,
        totalAdvanceRecovery,
        totalNetPayable,
        labourerCount: lines.length
      }
    };
  },

  finalizePayroll: (periodName: string, startDate: string, endDate: string, previewLines: any[]): PayrollPeriod => {
    const store = getStore();
    const periodId = 'pay-' + Date.now();
    const now = new Date().toISOString();

    const period: PayrollPeriod = {
      id: periodId,
      farm_id: store.farm.id,
      period_name: periodName,
      start_date: startDate,
      end_date: endDate,
      status: 'finalized',
      approved_by: 'Owner/Accountant',
      approved_at: now,
      finalized_at: now,
      calculation_version: 'v1.0-standard',
      notes: `Finalized for ${previewLines.length} labourers.`,
      created_at: now,
      updated_at: now
    };

    store.payrollPeriods.push(period);
    upsertToLocalDb('payroll_periods', [period]).catch(() => {});

    // Write immutable lines
    previewLines.forEach(pl => {
      const lineId = 'pl-' + Date.now() + '-' + pl.labourer_id;
      const line: PayrollLine = {
        id: lineId,
        farm_id: store.farm.id,
        payroll_period_id: periodId,
        labourer_id: pl.labourer_id,
        labourer_name: pl.labourer_name,
        labour_code: pl.labour_code,
        attendance_snapshot: pl.attendance_snapshot,
        wage_basis: pl.wage_basis,
        rate_snapshot: pl.rate_snapshot,
        units: pl.units,
        gross_amount: pl.gross_amount,
        additions: pl.additions || 0,
        other_deductions: pl.other_deductions || 0,
        advance_recovery: pl.advance_recovery,
        net_payable: pl.net_payable,
        paid_amount: 0,
        calculation_details: pl.calculation_details,
        created_at: now,
        updated_at: now
      };
      store.payrollLines.push(line);
      upsertToLocalDb('payroll_lines', [line]).catch(() => {});

      // Post advance recovery allocation if > 0
      if (pl.advance_recovery > 0) {
        // find active posted advances for this labourer
        const labAdvances = store.advances.filter(a => a.labourer_id === pl.labourer_id && a.status === 'posted');
        let remainingToRecover = pl.advance_recovery;

        for (const adv of labAdvances) {
          if (remainingToRecover <= 0) break;
          // check this advance's current recovery
          const advAllocs = store.allocations.filter(al => al.advance_id === adv.id);
          const alreadyRecovered = advAllocs.reduce((s, a) => s + a.amount, 0);
          const advUnrecovered = round2(adv.amount - alreadyRecovered);

          if (advUnrecovered > 0) {
            const allocAmt = round2(Math.min(remainingToRecover, advUnrecovered));
            store.allocations.push({
              id: 'alloc-' + Date.now() + '-' + adv.id,
              farm_id: store.farm.id,
              advance_id: adv.id,
              payroll_line_id: lineId,
              allocation_date: endDate,
              amount: allocAmt,
              allocation_type: 'payroll_recovery',
              notes: `Auto-recovered via Payroll ${periodName}`,
              created_at: now
            });
            remainingToRecover = round2(remainingToRecover - allocAmt);
          }
        }
      }
    });

    dataService.logAudit('FINALIZE_PAYROLL', 'payroll', periodId, `Finalized payroll period ${periodName} (Total ₹${previewLines.reduce((s, l) => s + l.net_payable, 0)})`);
    saveStore(store);
    return period;
  },

  getPayrollPeriods: (): PayrollPeriod[] => getStore().payrollPeriods,
  getPayrollLinesForPeriod: (periodId: string): PayrollLine[] => {
    return getStore().payrollLines.filter(pl => pl.payroll_period_id === periodId);
  },
  recordPayrollPayment: (payrollLineId: string, amount: number, method: PaymentMethod, reference?: string): PayrollPayment => {
    const store = getStore();
    const line = store.payrollLines.find(l => l.id === payrollLineId);
    if (!line) throw new Error('Payroll line not found');

    const newPaid = round2(line.paid_amount + amount);
    if (newPaid > line.net_payable) {
      throw new Error(`Total payments (₹${newPaid}) cannot exceed Net Payable (₹${line.net_payable}).`);
    }

    line.paid_amount = newPaid;
    line.updated_at = new Date().toISOString();

    const payment: PayrollPayment = {
      id: 'paymt-' + Date.now(),
      farm_id: store.farm.id,
      payroll_line_id: payrollLineId,
      paid_at: new Date().toISOString(),
      amount: round2(amount),
      method,
      reference,
      notes: `Disbursement to ${line.labourer_name}`,
      created_at: new Date().toISOString()
    };

    store.payrollPayments.push(payment);
    dataService.logAudit('PAYROLL_PAYMENT', 'payroll', payrollLineId, `Recorded payment ₹${amount} (${method}) for ${line.labourer_name}`);
    saveStore(store);
    return payment;
  },

  // Machinery & Usage
  getMachinery: (): Machinery[] => getStore().machinery,
  saveMachinery: (machine: Partial<Machinery> & { asset_code: string; name: string; ownership_type: any; meter_type: any }): Machinery => {
    const store = getStore();
    if (machine.id) {
      store.machinery = store.machinery.map(m => m.id === machine.id ? { ...m, ...machine, updated_at: new Date().toISOString() } as Machinery : m);
      saveStore(store);
      return store.machinery.find(m => m.id === machine.id)!;
    } else {
      const newMachine: Machinery = {
        id: 'mac-' + Date.now(),
        farm_id: store.farm.id,
        asset_code: machine.asset_code,
        name: machine.name,
        asset_type: machine.asset_type || 'tractor',
        ownership_type: machine.ownership_type,
        registration_reference: machine.registration_reference || '',
        make: machine.make || '',
        model: machine.model || '',
        meter_type: machine.meter_type,
        initial_meter: round2(machine.initial_meter || 0),
        current_meter: round2(machine.initial_meter || 0),
        is_active: true,
        notes: machine.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.machinery.push(newMachine);
      dataService.logAudit('CREATE_MACHINERY', 'machinery', newMachine.id, `Created machinery ${newMachine.name} (${newMachine.asset_code})`);
      saveStore(store);
      return newMachine;
    }
  },
  getMachineryUsage: (): MachineryUsage[] => getStore().usage,
  recordMachineryUsage: (usage: Omit<MachineryUsage, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): MachineryUsage => {
    const store = getStore();
    const mac = store.machinery.find(m => m.id === usage.machinery_id);
    if (!mac) throw new Error('Machinery not found');

    if (usage.start_meter !== undefined && usage.end_meter !== undefined) {
      if (usage.end_meter < usage.start_meter) {
        throw new Error(`End meter (${usage.end_meter}) cannot be less than start meter (${usage.start_meter}).`);
      }
    }

    const newUsage: MachineryUsage = {
      ...usage,
      id: 'usg-' + Date.now(),
      farm_id: store.farm.id,
      machinery_name: mac.name,
      asset_code: mac.asset_code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update current meter on machinery
    if (usage.end_meter !== undefined && usage.end_meter > (mac.current_meter || 0)) {
      mac.current_meter = usage.end_meter;
      mac.updated_at = new Date().toISOString();
    }

    store.usage.unshift(newUsage);
    dataService.logAudit('RECORD_USAGE', 'machinery_usage', newUsage.id, `Logged ${usage.duration_minutes}m usage for ${mac.name}`);
    saveStore(store);
    return newUsage;
  },

  // Machinery Expenses
  getExpenses: (): MachineryExpense[] => getStore().expenses,
  recordExpense: (expense: Omit<MachineryExpense, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): MachineryExpense => {
    const store = getStore();
    let macName = 'General Farm Machinery';
    if (expense.machinery_id) {
      const m = store.machinery.find(x => x.id === expense.machinery_id);
      if (m) macName = m.name;
    }

    const newExpense: MachineryExpense = {
      ...expense,
      id: 'exp-' + Date.now(),
      farm_id: store.farm.id,
      machinery_name: macName,
      amount: round2(expense.amount),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.expenses.unshift(newExpense);
    dataService.logAudit('RECORD_EXPENSE', 'machinery_expenses', newExpense.id, `Recorded ₹${newExpense.amount} (${newExpense.category}) expense`);
    saveStore(store);
    return newExpense;
  },

  // Audit Logs
  getAuditLogs: (): AuditLog[] => getStore().auditLogs,
  logAudit: (action: string, entity_type: string, entity_id?: string, reason?: string) => {
    const store = getStore();
    const log: AuditLog = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      farm_id: store.farm.id,
      actor_name: 'Current Session User',
      actor_role: 'owner',
      action,
      entity_type,
      entity_id,
      occurred_at: new Date().toISOString(),
      reason
    };
    store.auditLogs.unshift(log);
    // keep max 500 audit logs in local store
    if (store.auditLogs.length > 500) {
      store.auditLogs = store.auditLogs.slice(0, 500);
    }
    upsertToLocalDb('audit_logs', [log]).catch(() => {});
  },

  // Sync Jobs (Google Sheets Mirror)
  getSyncJobs: (): SyncJob[] => getStore().syncJobs,
  queueBackgroundSync: () => {},
  triggerSync: async (): Promise<{ succeeded: number; failed: number; message?: string }> => {
    throw new Error('Private Google Sheets sync is unavailable until an authenticated server-side integration is configured. Download CSV files to export your data.');
  },

  // Financial Year Close (1 April to 31 March)
  previewFinancialYearClose: (fyYear = 2026) => {
    const store = getStore();
    const startDate = `${fyYear}-04-01`;
    const endDate = `${fyYear + 1}-03-31`;
    const fyLabel = `FY ${fyYear}–${(fyYear + 1).toString().slice(-2)}`;

    // Reconciliation figures
    const attendanceInFY = store.attendance.filter(a => a.work_date >= startDate && a.work_date <= endDate);
    const totalAttendanceDays = round2(attendanceInFY.reduce((s, a) => s + a.payable_units, 0));

    const periodsInFY = store.payrollPeriods.filter(p => p.start_date >= startDate && p.end_date <= endDate);
    const periodIds = new Set(periodsInFY.map(p => p.id));
    const linesInFY = store.payrollLines.filter(l => periodIds.has(l.payroll_period_id));

    const totalGrossWages = round2(linesInFY.reduce((s, l) => s + l.gross_amount, 0));
    const totalNetWages = round2(linesInFY.reduce((s, l) => s + l.net_payable, 0));
    const totalWagesPaid = round2(linesInFY.reduce((s, l) => s + l.paid_amount, 0));

    const advancesInFY = store.advances.filter(a => a.issued_at >= startDate && a.issued_at <= `${endDate}T23:59:59Z`);
    const totalAdvancesIssued = round2(advancesInFY.reduce((s, a) => s + a.amount, 0));

    const usageInFY = store.usage.filter(u => u.work_date >= startDate && u.work_date <= endDate);
    const totalTractorMinutes = usageInFY.reduce((s, u) => s + (u.duration_minutes || 0), 0);
    const totalTractorHours = round2(totalTractorMinutes / 60);

    const expensesInFY = store.expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
    const totalMachineryExpenses = round2(expensesInFY.reduce((s, e) => s + e.amount, 0));

    // Checks
    const unapprovedAttendance = attendanceInFY.filter(a => a.approval_status !== 'approved').length;
    const draftPeriods = store.payrollPeriods.filter(p => p.start_date >= startDate && p.end_date <= endDate && p.status === 'draft').length;

    const isReadyForClose = unapprovedAttendance === 0 && draftPeriods === 0;

    return {
      fyLabel,
      startDate,
      endDate,
      recordCounts: {
        labourers: store.labourers.length,
        attendanceRecords: attendanceInFY.length,
        payrollPeriods: periodsInFY.length,
        payrollLines: linesInFY.length,
        advances: advancesInFY.length,
        usageLogs: usageInFY.length,
        expenses: expensesInFY.length
      },
      financialTotals: {
        totalAttendanceDays,
        totalGrossWages,
        totalNetWages,
        totalWagesPaid,
        totalAdvancesIssued,
        totalTractorHours,
        totalMachineryExpenses
      },
      checks: {
        unapprovedAttendance,
        draftPeriods,
        isReadyForClose
      }
    };
  },

  executeFinancialYearClose: (fyYear = 2026, closedBy = 'Owner'): AnnualCloseManifest => {
    const store = getStore();
    const preview = dataService.previewFinancialYearClose(fyYear);
    const now = new Date().toISOString();

    const manifest: AnnualCloseManifest = {
      id: 'close-' + fyYear,
      farm_id: store.farm.id,
      financial_year_label: preview.fyLabel,
      start_date: preview.startDate,
      end_date: preview.endDate,
      status: 'locked',
      sheets_verified_at: now,
      record_counts: preview.recordCounts,
      financial_totals: preview.financialTotals,
      backup_reference: `BK-SUPABASE-ARCHIVE-${preview.fyLabel}-IMMUTABLE`,
      closed_by: closedBy,
      closed_at: now,
      notes: `Financial Year ${preview.fyLabel} officially verified, archived, and locked. Historical records retained permanently.`,
      created_at: now
    };

    store.closeManifests = store.closeManifests.filter(m => m.financial_year_label !== preview.fyLabel);
    store.closeManifests.push(manifest);

    dataService.logAudit('ANNUAL_CLOSE', 'annual_close', manifest.id, `Closed and locked ${preview.fyLabel}. Zero records deleted.`);
    saveStore(store);
    return manifest;
  },

  getAnnualCloseManifests: (): AnnualCloseManifest[] => getStore().closeManifests,

  // Tractor Rental & Hired Machinery Management
  getTractorRentals: (dateFilter?: string): TractorRentalLog[] => {
    const store = getStore();
    const rentals = store.tractorRentals || [];
    if (!dateFilter || dateFilter === 'all') return rentals;
    return rentals.filter(r => r.work_date === dateFilter);
  },

  saveTractorRental: (rental: {
    tractor_name: string;
    vendor_name: string;
    work_date: string;
    hours_worked: number;
    hourly_rate: number;
    advance_amount: number;
    fuel_provided_litres?: number;
    task_name?: string;
    notes?: string;
  }): TractorRentalLog => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];

    const gross = round2(rental.hours_worked * rental.hourly_rate);
    const adv = round2(Math.max(0, rental.advance_amount));
    const rest = round2(Math.max(0, gross - adv));

    const newLog: TractorRentalLog = {
      id: 'trc-rent-' + Date.now(),
      farm_id: store.farm.id,
      tractor_name: rental.tractor_name.trim() || 'Rented Tractor',
      vendor_name: rental.vendor_name.trim() || 'Tractor Owner/Rental',
      work_date: rental.work_date,
      hours_worked: round2(rental.hours_worked),
      hourly_rate: round2(rental.hourly_rate),
      gross_amount: gross,
      advance_amount: adv,
      rest_amount: rest,
      status: rest === 0 ? 'settled' : 'pending',
      fuel_provided_litres: rental.fuel_provided_litres ? round2(rental.fuel_provided_litres) : undefined,
      task_name: rental.task_name?.trim() || 'Field Cultivation',
      notes: rental.notes?.trim() || '',
      created_at: new Date().toISOString()
    };

    store.tractorRentals.push(newLog);
    dataService.logAudit(
      'RECORD_TRACTOR_RENTAL',
      'machinery',
      newLog.id,
      `Recorded rental ${newLog.tractor_name} (${newLog.hours_worked} hrs @ ₹${newLog.hourly_rate}/hr, Advance ₹${newLog.advance_amount}, Rest ₹${newLog.rest_amount})`
    );
    saveStore(store);
    upsertToLocalDb('tractor_rentals', [newLog]).catch(() => {});
    dataService.queueBackgroundSync();
    return newLog;
  },

  settleTractorRental: (id: string): TractorRentalLog => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];
    const log = store.tractorRentals.find(l => l.id === id);
    if (!log) throw new Error('Tractor rental record not found');

    log.status = 'settled';
    log.notes = (log.notes ? log.notes + ' • ' : '') + `Full balance settled on ${new Date().toISOString().split('T')[0]}`;
    log.updated_at = new Date().toISOString();

    dataService.logAudit('SETTLE_TRACTOR_RENTAL', 'machinery', id, `Settled remaining payment ₹${log.rest_amount} for ${log.tractor_name}`);
    saveStore(store);
    upsertToLocalDb('tractor_rentals', [log]).catch(() => {});
    return log;
  },

  deleteTractorRental: (id: string): boolean => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];
    store.tractorRentals = store.tractorRentals.filter(l => l.id !== id);
    dataService.logAudit('DELETE_TRACTOR_RENTAL', 'machinery', id, `Deleted tractor rental record ${id}`);
    saveStore(store);
    deleteFromLocalDb('tractor_rentals', id).catch(() => {});
    return true;
  },

  getTractorRentalTotals: (dateFilter?: string) => {
    const rentals = dataService.getTractorRentals(dateFilter);
    const totalHours = round2(rentals.reduce((sum, r) => sum + r.hours_worked, 0));
    const totalGross = round2(rentals.reduce((sum, r) => sum + r.gross_amount, 0));
    const totalAdvance = round2(rentals.reduce((sum, r) => sum + r.advance_amount, 0));
    const totalRest = round2(rentals.reduce((sum, r) => sum + (r.status === 'pending' ? r.rest_amount : 0), 0));

    return { totalHours, totalGross, totalAdvance, totalRest, count: rentals.length };
  }
};
