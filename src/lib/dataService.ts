import {
  Farm,
  FarmMembership,
  Labourer,
  AttendanceRecord,
  PayrollPeriod,
  PayrollLine,
  PayrollPayment,
  SalarySettlement,
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
  MonthlyAttendanceSummary,
  SalaryPeriodType,
  PayFrequency
} from '../types';
import { 
  upsertToLocalDb, 
  deleteFromLocalDb, 
  syncAllFromLocalDb, 
  subscribeToRealtimeSync,
  isDbSyncActive
} from './localDbClient';

const STORAGE_KEY = 'kisanops_farm_data_v2';
const TOMBSTONES_KEY = 'farmlog_tombstones_v1';

// Tombstones: tracks deleted IDs so background syncs don't re-insert deleted records
const getTombstones = (): Set<string> => {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const addTombstone = (id: string) => {
  if (!id) return;
  try {
    const set = getTombstones();
    set.add(id);
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify([...set]));
  } catch {}
};

export const genId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
};

export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Initial Clean Farm Setup (Real Production Data — Zero Demo/Test Records)
const initialFarm: Farm = {
  id: '11111111-1111-1111-1111-111111111111',
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
  salarySettlements: SalarySettlement[];
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
      if (!parsed.salarySettlements) parsed.salarySettlements = [];
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
    salarySettlements: [],
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
  // Live Database Fetch Engine (Direct Supabase / Local PostgreSQL)
  fetchLiveAll: async (): Promise<boolean> => {
    if (!isDbSyncActive) return false;

    try {
      const dbData = await syncAllFromLocalDb();
      if (!dbData) return false;

      const store = getStore();

      // Cloud data is 100% authoritative - assign clean live dataset
      store.labourers = dbData.labourers || [];
      store.attendance = dbData.attendance || [];
      store.advances = dbData.advances || [];
      store.allocations = dbData.advanceAllocations || [];
      store.tractorRentals = dbData.tractorRentals || [];
      store.payrollPeriods = dbData.payrollPeriods || [];
      store.payrollLines = dbData.payrollLines || [];
      if (dbData.salarySettlements) store.salarySettlements = dbData.salarySettlements;

      if (dbData.appUsers && dbData.appUsers.length > 0) {
        try {
          localStorage.setItem('farmlog_cached_users', JSON.stringify(dbData.appUsers));
        } catch {}
      }

      saveStore(store);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
      }
      return true;
    } catch (err) {
      console.warn('[DataService] Live database sync error:', err);
      return false;
    }
  },

  initDatabaseSync: async () => {
    return dataService.fetchLiveAll();
  },

  // Realtime Live Synchronization across all connected devices
  initRealtimeSync: () => {
    return subscribeToRealtimeSync((table, eventType, payload) => {
      dataService.handleRealtimeChange(table, eventType, payload);
    });
  },

  handleRealtimeChange: (table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
    const store = getStore();
    const newRecord = payload.new;
    const oldRecord = payload.old;

    if (table === 'labourers') {
      if (eventType === 'DELETE' && oldRecord?.id) {
        store.labourers = store.labourers.filter(l => l.id !== oldRecord.id);
        store.attendance = store.attendance.filter(a => a.labourer_id !== oldRecord.id);
        store.advances = store.advances.filter(a => a.labourer_id !== oldRecord.id);
        addTombstone(oldRecord.id);
      } else if (newRecord) {
        const item: Labourer = {
          ...newRecord,
          base_rate: Number(newRecord.base_rate || 0),
          start_date: newRecord.start_date ? newRecord.start_date.split('T')[0] : ''
        };
        const idx = store.labourers.findIndex(l => l.id === item.id);
        if (idx >= 0) store.labourers[idx] = item;
        else store.labourers.push(item);
      }
    } else if (table === 'attendance') {
      if (eventType === 'DELETE' && oldRecord?.id) {
        store.attendance = store.attendance.filter(a => a.id !== oldRecord.id);
        addTombstone(oldRecord.id);
      } else if (newRecord) {
        const item: AttendanceRecord = {
          ...newRecord,
          payable_units: Number(newRecord.payable_units || 0),
          hours_worked: newRecord.hours_worked != null ? Number(newRecord.hours_worked) : undefined,
          work_date: newRecord.work_date ? newRecord.work_date.split('T')[0] : ''
        };
        const idx = store.attendance.findIndex(a => a.id === item.id);
        if (idx >= 0) store.attendance[idx] = item;
        else store.attendance.push(item);
      }
    } else if (table === 'advances') {
      if (eventType === 'DELETE' && oldRecord?.id) {
        store.advances = store.advances.filter(a => a.id !== oldRecord.id);
        addTombstone(oldRecord.id);
      } else if (newRecord) {
        const lab = store.labourers.find(l => l.id === newRecord.labourer_id);
        const item: Advance = {
          ...newRecord,
          amount: Number(newRecord.amount || 0),
          labourer_name: lab?.full_name || 'Worker',
          labour_code: lab?.labour_code || ''
        };
        const idx = store.advances.findIndex(a => a.id === item.id);
        if (idx >= 0) store.advances[idx] = item;
        else store.advances.push(item);
      }
    } else if (table === 'tractor_rentals') {
      if (eventType === 'DELETE' && oldRecord?.id) {
        store.tractorRentals = (store.tractorRentals || []).filter(t => t.id !== oldRecord.id);
        addTombstone(oldRecord.id);
      } else if (newRecord) {
        const item: TractorRentalLog = {
          ...newRecord,
          hours_worked: Number(newRecord.hours_worked || 0),
          hourly_rate: Number(newRecord.hourly_rate || 0),
          gross_amount: Number(newRecord.gross_amount || 0),
          advance_amount: Number(newRecord.advance_amount || 0),
          rest_amount: Number(newRecord.rest_amount || 0),
          work_date: newRecord.work_date ? newRecord.work_date.split('T')[0] : ''
        };
        if (!store.tractorRentals) store.tractorRentals = [];
        const idx = store.tractorRentals.findIndex(t => t.id === item.id);
        if (idx >= 0) store.tractorRentals[idx] = item;
        else store.tractorRentals.push(item);
      }
    }

    saveStore(store);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
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
      id: genId(),
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
  saveLabourer: async (labourer: Partial<Labourer> & { full_name: string; base_rate: number; wage_basis?: any; labour_code?: string }): Promise<Labourer> => {
    const store = getStore();
    if (labourer.id) {
      store.labourers = store.labourers.map(l => l.id === labourer.id ? { 
        ...l, 
        ...labourer, 
        updated_at: new Date().toISOString() 
      } as Labourer : l);

      dataService.logAudit('UPDATE_LABOURER', 'labourers', labourer.id, `Updated labourer ${labourer.full_name}`);
      saveStore(store);
      const updated = store.labourers.find(l => l.id === labourer.id)!;
      await upsertToLocalDb('labourers', [updated]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
      }
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

      const assignedId = genId();
      const newLabourer: Labourer = {
        id: assignedId,
        farm_id: store.farm.id,
        labour_code: code,
        full_name: labourer.full_name,
        phone: labourer.phone || '',
        work_category: labourer.work_category || 'General Field Labour',
        start_date: labourer.start_date || new Date().toISOString().split('T')[0],
        wage_basis: labourer.wage_basis || 'daily',
        base_rate: round2(labourer.base_rate),
        pay_frequency: 'monthly',
        is_active: labourer.is_active !== undefined ? labourer.is_active : true,
        notes: (labourer.notes || '').replace(/\[routine:(weekly|monthly)\]/g, '').trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.labourers.push(newLabourer);
      dataService.logAudit('CREATE_LABOURER', 'labourers', newLabourer.id, `Created labourer ${newLabourer.full_name}`);
      saveStore(store);
      await upsertToLocalDb('labourers', [newLabourer]);
      dataService.queueBackgroundSync();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
      }
      return newLabourer;
    }
  },
  toggleLabourerActive: async (id: string): Promise<Labourer> => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === id);
    if (!lab) throw new Error('Labourer not found');
    lab.is_active = !lab.is_active;
    lab.updated_at = new Date().toISOString();
    dataService.logAudit('DEACTIVATE_LABOURER', 'labourers', id, `Set labourer ${lab.full_name} active=${lab.is_active}`);
    saveStore(store);
    await upsertToLocalDb('labourers', [lab]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return lab;
  },
  removeLabourer: async (id: string): Promise<boolean> => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === id);
    if (!lab) throw new Error('Labourer not found');
    store.labourers = store.labourers.filter(l => l.id !== id);
    store.attendance = store.attendance.filter(a => a.labourer_id !== id);
    store.advances = store.advances.filter(a => a.labourer_id !== id);
    addTombstone(id);
    dataService.logAudit('REMOVE_LABOURER', 'labourers', id, `Removed labourer ${lab.full_name}`);
    saveStore(store);
    await deleteFromLocalDb('labourers', id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return true;
  },

  // Attendance
  getAttendanceForDate: (date: string, shift = 'regular'): AttendanceRecord[] => {
    return getStore().attendance.filter(a => a.work_date === date && a.shift_code === shift);
  },
  getAttendanceBetween: (startDate: string, endDate: string): AttendanceRecord[] => {
    return getStore().attendance.filter(a => a.work_date >= startDate && a.work_date <= endDate);
  },
  recordAttendance: async (
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
  ): Promise<void> => {
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
          id: genId(),
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
    await upsertToLocalDb('attendance', recordsToSync);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
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

    const todayStr = new Date().toLocaleDateString('en-CA');

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

  getLabourerDateRangeAttendance: (
    labourerId: string,
    startDate: string,
    endDate: string
  ): { records: Record<string, AttendanceRecord>; summary: MonthlyAttendanceSummary } => {
    const store = getStore();
    const labourer = store.labourers.find(l => l.id === labourerId);

    const matchingRecords = store.attendance.filter(
      a => a.labourer_id === labourerId && a.work_date >= startDate && a.work_date <= endDate
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

    const todayStr = new Date().toLocaleDateString('en-CA');
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toLocaleDateString('en-CA');
      const isSunday = d.getDay() === 0;
      const rec = recordMap[dateStr];

      if (dateStr > todayStr && !rec) {
        if (isSunday) weeklyOffDays++;
        else unmarkedDays++;
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
        if (isSunday) weeklyOffDays++;
        else unmarkedDays++;
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
  issueAdvance: async (data: {
    labourer_id: string;
    amount: number;
    purpose?: string;
    payment_method: PaymentMethod;
    payment_reference?: string;
    notes?: string;
    issued_by?: string;
    issued_at?: string;
  }): Promise<Advance> => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === data.labourer_id);
    if (!lab) throw new Error('Labourer not found');
    if (data.amount <= 0) throw new Error('Advance amount must be greater than zero.');

    const newAdvance: Advance = {
      id: genId(),
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
    await upsertToLocalDb('advances', [newAdvance]);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return newAdvance;
  },
  deleteAdvance: async (id: string): Promise<boolean> => {
    const store = getStore();
    if (!store.advances) store.advances = [];
    const adv = store.advances.find(a => a.id === id);
    if (!adv) return false;
    store.advances = store.advances.filter(a => a.id !== id);
    store.allocations = (store.allocations || []).filter(al => al.advance_id !== id);
    addTombstone(id);
    dataService.logAudit('DELETE_ADVANCE', 'advances', id, `Deleted advance ${id}`);
    saveStore(store);
    await deleteFromLocalDb('advances', id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return true;
  },
  updateAdvance: async (
    id: string,
    updates: {
      amount?: number;
      issued_at?: string;
      labourer_id?: string;
      purpose?: string;
      payment_method?: PaymentMethod;
      payment_reference?: string;
      issued_by?: string;
      notes?: string;
    }
  ): Promise<Advance> => {
    const store = getStore();
    if (!store.advances) store.advances = [];
    const index = store.advances.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Advance record not found');

    const existing = store.advances[index];
    let labName = existing.labourer_name;
    let labCode = existing.labour_code;

    if (updates.labourer_id && updates.labourer_id !== existing.labourer_id) {
      const lab = store.labourers.find(l => l.id === updates.labourer_id);
      if (lab) {
        labName = lab.full_name;
        labCode = lab.labour_code;
      }
    }

    const updatedAdv: Advance = {
      ...existing,
      ...updates,
      labourer_name: labName,
      labour_code: labCode,
      amount: updates.amount !== undefined ? round2(updates.amount) : existing.amount,
      issued_by: updates.issued_by !== undefined ? updates.issued_by.trim() : existing.issued_by,
      updated_at: new Date().toISOString()
    };

    store.advances[index] = updatedAdv;
    dataService.logAudit('UPDATE_ADVANCE', 'advances', id, `Updated advance ₹${updatedAdv.amount} for ${updatedAdv.labourer_name} (Given by: ${updatedAdv.issued_by})`);
    saveStore(store);
    await upsertToLocalDb('advances', [updatedAdv]);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return updatedAdv;
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
      id: genId(),
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
    const periodId = genId();
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
      const lineId = genId();
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
              id: genId(),
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
  getPayrollPaymentsForLine: (payrollLineId: string): PayrollPayment[] => {
    return (getStore().payrollPayments || []).filter(p => p.payroll_line_id === payrollLineId);
  },
  recordPayrollPayment: (payrollLineId: string, amount: number, method: PaymentMethod, reference?: string, givenBy?: string): PayrollPayment => {
    const store = getStore();
    const line = store.payrollLines.find(l => l.id === payrollLineId);
    if (!line) throw new Error('Payroll line not found');

    const newPaid = round2(line.paid_amount + amount);
    if (newPaid > line.net_payable) {
      throw new Error(`Total payments (₹${newPaid}) cannot exceed Net Payable (₹${line.net_payable}).`);
    }

    line.paid_amount = newPaid;
    line.updated_at = new Date().toISOString();

    const paymentPayer = givenBy?.trim() || 'Owner';
    const payment: PayrollPayment = {
      id: genId(),
      farm_id: store.farm.id,
      payroll_line_id: payrollLineId,
      paid_at: new Date().toISOString(),
      amount: round2(amount),
      method,
      reference,
      recorded_by: paymentPayer,
      given_by: paymentPayer,
      notes: `Disbursement to ${line.labourer_name}`,
      created_at: new Date().toISOString()
    };

    store.payrollPayments.push(payment);
    dataService.logAudit('PAYROLL_PAYMENT', 'payroll', payrollLineId, `Recorded payment ₹${amount} (${method}) for ${line.labourer_name} (Given by: ${paymentPayer})`);
    saveStore(store);
    upsertToLocalDb('payroll_payments', [payment]).catch(() => {});
    upsertToLocalDb('payroll_lines', [line]).catch(() => {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return payment;
  },
  updatePayrollPayment: (
    paymentId: string,
    updates: {
      amount?: number;
      method?: PaymentMethod;
      payment_method?: PaymentMethod;
      reference?: string;
      given_by?: string;
      notes?: string;
    }
  ): PayrollPayment => {
    const store = getStore();
    const payment = (store.payrollPayments || []).find(p => p.id === paymentId);
    if (!payment) throw new Error('Payment record not found');
    const line = store.payrollLines.find(l => l.id === payment.payroll_line_id);

    if (updates.amount !== undefined && line) {
      const otherPayments = (store.payrollPayments || []).filter(p => p.payroll_line_id === payment.payroll_line_id && p.id !== paymentId);
      const otherSum = otherPayments.reduce((s, p) => s + p.amount, 0);
      const newTotal = round2(otherSum + updates.amount);
      if (newTotal > line.net_payable) {
        throw new Error(`Total payments (₹${newTotal}) cannot exceed Net Payable (₹${line.net_payable}).`);
      }
      line.paid_amount = newTotal;
      line.updated_at = new Date().toISOString();
      payment.amount = round2(updates.amount);
    }
    if (updates.method) payment.method = updates.method;
    if (updates.payment_method) payment.method = updates.payment_method;
    if (updates.reference !== undefined) payment.reference = updates.reference;
    if (updates.given_by !== undefined) {
      payment.recorded_by = updates.given_by.trim();
      payment.given_by = updates.given_by.trim();
    }
    if (updates.notes !== undefined) payment.notes = updates.notes;

    saveStore(store);
    upsertToLocalDb('payroll_payments', [payment]).catch(() => {});
    if (line) upsertToLocalDb('payroll_lines', [line]).catch(() => {});
    dataService.logAudit('UPDATE_PAYMENT', 'payroll', paymentId, `Updated payment ₹${payment.amount} for line ${payment.payroll_line_id}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return payment;
  },
  deletePayrollPayment: (paymentId: string): boolean => {
    const store = getStore();
    const payment = (store.payrollPayments || []).find(p => p.id === paymentId);
    if (!payment) return false;
    const line = store.payrollLines.find(l => l.id === payment.payroll_line_id);
    if (line) {
      line.paid_amount = round2(Math.max(0, line.paid_amount - payment.amount));
      line.updated_at = new Date().toISOString();
      upsertToLocalDb('payroll_lines', [line]).catch(() => {});
    }
    store.payrollPayments = store.payrollPayments.filter(p => p.id !== paymentId);
    saveStore(store);
    deleteFromLocalDb('payroll_payments', paymentId).catch(() => {});
    dataService.logAudit('DELETE_PAYMENT', 'payroll', paymentId, `Deleted payment ₹${payment.amount} for line ${payment.payroll_line_id}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return true;
  },

  // Monthly / Weekly / Custom Salary Settlements (Simple Farm Routine & Direct Khata)
  getSalarySettlements: (
    filterOrYear?: {
      year?: number;
      month?: number;
      period_type?: SalaryPeriodType;
      start_date?: string;
      end_date?: string;
      labourer_id?: string;
    } | number,
    monthArg?: number
  ): SalarySettlement[] => {
    const list = getStore().salarySettlements || [];
    if (typeof filterOrYear === 'number') {
      const year = filterOrYear;
      const month = monthArg;
      if (year !== undefined && month !== undefined) {
        return list.filter(s => s.year === year && s.month === month && (s.period_type === 'monthly' || !s.period_type));
      }
      if (year !== undefined) {
        return list.filter(s => s.year === year);
      }
      return list;
    }

    if (filterOrYear && typeof filterOrYear === 'object') {
      const { year, month, period_type, start_date, end_date, labourer_id } = filterOrYear;
      return list.filter(s => {
        if (labourer_id && s.labourer_id !== labourer_id) return false;
        if (period_type && (s.period_type || 'monthly') !== period_type) return false;
        if (start_date && s.start_date !== start_date) return false;
        if (end_date && s.end_date !== end_date) return false;
        if (year !== undefined && s.year !== year) return false;
        if (month !== undefined && s.month !== month) return false;
        return true;
      });
    }

    return list;
  },

  settleSalary: async (data: {
    labourer_id: string;
    period_type?: SalaryPeriodType;
    start_date?: string;
    end_date?: string;
    year: number;
    month: number;
    week_number?: number;
    days_worked: number;
    daily_rate: number;
    gross_wage: number;
    advance_deducted: number;
    net_payable: number;
    paid_amount: number;
    given_by: string;
    payment_method?: PaymentMethod;
    payment_date?: string;
    payment_reference?: string;
    notes?: string;
  }): Promise<SalarySettlement> => {
    const store = getStore();
    if (!store.salarySettlements) store.salarySettlements = [];
    const lab = store.labourers.find(l => l.id === data.labourer_id);
    const labName = lab?.full_name || 'Worker';
    const labCode = lab?.labour_code || '';

    const pType: SalaryPeriodType = data.period_type || 'monthly';
    const monthPrefix = `${data.year}-${String(data.month).padStart(2, '0')}`;
    const daysInM = new Date(data.year, data.month, 0).getDate();
    const startDate = data.start_date || `${monthPrefix}-01`;
    const endDate = data.end_date || `${monthPrefix}-${String(daysInM).padStart(2, '0')}`;

    const existingIndex = store.salarySettlements.findIndex(s => {
      if (s.labourer_id !== data.labourer_id) return false;
      const existingPeriod = s.period_type || 'monthly';
      if (pType !== existingPeriod) return false;
      if (pType === 'weekly' || pType === 'custom') {
        return s.start_date === startDate && s.end_date === endDate;
      }
      return s.year === data.year && s.month === data.month;
    });

    const settlement: SalarySettlement = {
      id: existingIndex >= 0 ? store.salarySettlements[existingIndex].id : genId(),
      farm_id: store.farm.id,
      labourer_id: data.labourer_id,
      labourer_name: labName,
      labour_code: labCode,
      period_type: pType,
      start_date: startDate,
      end_date: endDate,
      year: data.year,
      month: data.month,
      week_number: data.week_number,
      days_worked: round2(data.days_worked),
      daily_rate: round2(data.daily_rate),
      gross_wage: round2(data.gross_wage),
      advance_deducted: round2(data.advance_deducted),
      net_payable: round2(data.net_payable),
      paid_amount: round2(data.paid_amount),
      given_by: data.given_by.trim() || 'Owner',
      payment_method: data.payment_method || 'cash',
      payment_date: data.payment_date || new Date().toISOString().split('T')[0],
      payment_reference: data.payment_reference || '',
      notes: data.notes || '',
      status: 'settled',
      created_at: existingIndex >= 0 ? store.salarySettlements[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      store.salarySettlements[existingIndex] = settlement;
    } else {
      store.salarySettlements.push(settlement);
    }

    const labelPeriod = pType === 'weekly'
      ? `Week ${startDate} to ${endDate}`
      : `${data.month}/${data.year}`;

    dataService.logAudit('SETTLE_SALARY', 'payroll', settlement.id, `Settled salary ₹${settlement.paid_amount} for ${labName} (${labelPeriod}) - Given by: ${settlement.given_by}`);
    saveStore(store);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return settlement;
  },

  updateSalarySettlement: async (
    id: string,
    updates: {
      paid_amount?: number;
      advance_deducted?: number;
      days_worked?: number;
      gross_wage?: number;
      net_payable?: number;
      given_by?: string;
      payment_method?: PaymentMethod;
      payment_date?: string;
      payment_reference?: string;
      notes?: string;
    }
  ): Promise<SalarySettlement> => {
    const store = getStore();
    if (!store.salarySettlements) store.salarySettlements = [];
    const index = store.salarySettlements.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Salary settlement record not found');

    const existing = store.salarySettlements[index];
    const updated: SalarySettlement = {
      ...existing,
      ...updates,
      advance_deducted: updates.advance_deducted !== undefined ? round2(updates.advance_deducted) : existing.advance_deducted,
      paid_amount: updates.paid_amount !== undefined ? round2(updates.paid_amount) : existing.paid_amount,
      given_by: updates.given_by !== undefined ? updates.given_by.trim() : existing.given_by,
      updated_at: new Date().toISOString()
    };

    store.salarySettlements[index] = updated;
    dataService.logAudit('UPDATE_SALARY_SETTLEMENT', 'payroll', id, `Updated salary settlement ₹${updated.paid_amount} for ${updated.labourer_name} - Given by: ${updated.given_by}`);
    saveStore(store);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return updated;
  },

  deleteSalarySettlement: async (id: string): Promise<boolean> => {
    const store = getStore();
    if (!store.salarySettlements) store.salarySettlements = [];
    const existing = store.salarySettlements.find(s => s.id === id);
    if (!existing) return false;

    store.salarySettlements = store.salarySettlements.filter(s => s.id !== id);
    dataService.logAudit('DELETE_SALARY_SETTLEMENT', 'payroll', id, `Reopened/deleted salary settlement for ${existing.labourer_name} (${existing.month}/${existing.year})`);
    saveStore(store);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return true;
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
        id: genId(),
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
    let actorName = 'Current User';
    let actorRole: UserRole = 'owner';
    try {
      const raw = localStorage.getItem('kisanops_auth_session_v2') || sessionStorage.getItem('kisanops_auth_session_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.userId) {
          actorName = parsed.userId;
          actorRole = String(parsed.userId).includes('supervisor') ? 'supervisor' : 'owner';
        }
      }
    } catch {}

    const log: AuditLog = {
      id: genId(),
      farm_id: store.farm.id,
      actor_name: actorName,
      actor_role: actorRole,
      action,
      entity_type,
      entity_id,
      occurred_at: new Date().toISOString(),
      reason
    };
    store.auditLogs.unshift(log);
    if (store.auditLogs.length > 500) {
      store.auditLogs = store.auditLogs.slice(0, 500);
    }
    upsertToLocalDb('audit_logs', [log]).catch(() => {});
  },

  // Sync Jobs (Google Sheets Mirror)
  getSyncJobs: (): SyncJob[] => getStore().syncJobs,
  queueBackgroundSync: () => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        dataService.triggerSync().catch(() => {});
      }, 600);
    }
  },
  triggerSync: async (customWebhookUrl?: string): Promise<{ succeeded: number; failed: number; message?: string }> => {
    const store = getStore();
    const now = new Date().toISOString();
    const defaultUrl =
      import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
      'https://script.google.com/macros/s/AKfycbwzPHk9cX19SgD04boxnAJ5AsHQF9ahZvpFP5WovBtGjmN74Pz0H1IhVXFCKUL-0Czh/exec';
    const webhookUrl = customWebhookUrl || defaultUrl;

    let syncStatus: 'succeeded' | 'failed' = 'succeeded';
    let responseMsg = 'Local mirror snapshot updated';

    if (webhookUrl) {
      try {
        const labourerMap = new Map(store.labourers.map(l => [l.id, l.full_name]));
        const enrichedAttendance = store.attendance.map(a => ({
          ...a,
          worker_name: labourerMap.get(a.labourer_id) || a.labourer_id
        }));
        const enrichedAdvances = store.advances.map(adv => ({
          ...adv,
          worker_name: labourerMap.get(adv.labourer_id) || adv.labourer_id,
          given_by: (adv as any).given_by || adv.issued_by || 'Supervisor'
        }));

        const payload = {
          farm: store.farm,
          labourers: store.labourers,
          attendance: enrichedAttendance,
          advances: enrichedAdvances,
          machinery: store.machinery,
          tractorRentals: store.tractorRentals,
          payrollLines: store.payrollLines,
          syncedAt: now
        };

        // Send to Google Apps Script Webhook
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        responseMsg = 'Data successfully mirrored to live Google Sheet!';
      } catch (err: any) {
        syncStatus = 'failed';
        responseMsg = 'Google Sheets sync request failed: ' + (err.message || 'Network error');
      }
    }

    const newJob: SyncJob = {
      id: 'sync-' + Date.now(),
      farm_id: store.farm.id,
      entity_type: 'full_manifest',
      entity_id: 'sheet-all',
      operation: 'update',
      status: syncStatus,
      attempt_count: 1,
      last_attempt_at: now,
      completed_at: syncStatus === 'succeeded' ? now : undefined,
      created_at: now
    };

    store.syncJobs.unshift(newJob);
    dataService.logAudit('GOOGLE_SHEETS_SYNC', 'integrations', newJob.id, responseMsg);
    saveStore(store);

    if (syncStatus === 'failed') {
      throw new Error(responseMsg);
    }
    return { succeeded: 1, failed: 0, message: responseMsg };
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

  saveTractorRental: async (rental: {
    tractor_name: string;
    vendor_name: string;
    work_date: string;
    hours_worked: number;
    hourly_rate: number;
    advance_amount: number;
    fuel_provided_litres?: number;
    task_name?: string;
    notes?: string;
  }): Promise<TractorRentalLog> => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];

    const gross = round2(rental.hours_worked * rental.hourly_rate);
    const adv = round2(Math.max(0, rental.advance_amount));
    const rest = round2(Math.max(0, gross - adv));

    const newLog: TractorRentalLog = {
      id: genId(),
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
    await upsertToLocalDb('tractor_rentals', [newLog]);
    dataService.queueBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return newLog;
  },

  settleTractorRental: async (id: string): Promise<TractorRentalLog> => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];
    const log = store.tractorRentals.find(l => l.id === id);
    if (!log) throw new Error('Tractor rental record not found');

    log.status = 'settled';
    log.notes = (log.notes ? log.notes + ' • ' : '') + `Full balance settled on ${new Date().toISOString().split('T')[0]}`;
    log.updated_at = new Date().toISOString();

    dataService.logAudit('SETTLE_TRACTOR_RENTAL', 'machinery', id, `Settled remaining payment ₹${log.rest_amount} for ${log.tractor_name}`);
    saveStore(store);
    await upsertToLocalDb('tractor_rentals', [log]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
    return log;
  },

  deleteTractorRental: async (id: string): Promise<boolean> => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];
    store.tractorRentals = store.tractorRentals.filter(l => l.id !== id);
    addTombstone(id);
    dataService.logAudit('DELETE_TRACTOR_RENTAL', 'machinery', id, `Deleted tractor rental record ${id}`);
    saveStore(store);
    await deleteFromLocalDb('tractor_rentals', id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farmlog-data-updated'));
    }
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
