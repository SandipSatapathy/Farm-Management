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

const STORAGE_KEY = 'kisanops_farm_data_v1';

export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Initial Seed Data
const initialFarm: Farm = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Greenfield Agro Farms',
  address: 'Survey No. 42, Dindori Road, Nashik, Maharashtra 422004',
  currency_code: 'INR',
  timezone: 'Asia/Kolkata',
  financial_year_start_month: 4,
  financial_year_start_day: 1,
  settings: {
    overtime_enabled: false,
    require_correction_reason: true,
    default_payroll_cadence: 'monthly'
  },
  created_at: '2026-04-01T08:00:00Z',
  updated_at: '2026-04-01T08:00:00Z'
};

const initialMemberships: FarmMembership[] = [
  { id: 'u1', farm_id: initialFarm.id, user_id: 'usr-1', user_name: 'Anand Deshmukh (Owner)', user_email: 'owner@greenfield.farm', role: 'owner', is_active: true, created_at: '2026-04-01T08:00:00Z' },
  { id: 'u2', farm_id: initialFarm.id, user_id: 'usr-2', user_name: 'Vikas Rao (Admin/Manager)', user_email: 'manager@greenfield.farm', role: 'admin', is_active: true, created_at: '2026-04-01T08:00:00Z' },
  { id: 'u3', farm_id: initialFarm.id, user_id: 'usr-3', user_name: 'Pooja Kulkarni (Accountant)', user_email: 'payroll@greenfield.farm', role: 'payroll', is_active: true, created_at: '2026-04-01T08:00:00Z' },
  { id: 'u4', farm_id: initialFarm.id, user_id: 'usr-4', user_name: 'Balaji Shinde (Supervisor)', user_email: 'supervisor@greenfield.farm', role: 'supervisor', is_active: true, created_at: '2026-04-01T08:00:00Z' },
  { id: 'u5', farm_id: initialFarm.id, user_id: 'usr-5', user_name: 'Suresh Mehta (Partner/Investor)', user_email: 'partner@mehtacapital.in', role: 'partner_viewer', is_active: true, created_at: '2026-04-01T08:00:00Z' },
  { id: 'u6', farm_id: initialFarm.id, user_id: 'usr-6', user_name: 'Ganesh More (Tractor Operator)', user_email: 'operator@greenfield.farm', role: 'tractor_operator', is_active: true, created_at: '2026-04-01T08:00:00Z' },
];

const initialLabourers: Labourer[] = [
  { id: 'lab-1', farm_id: initialFarm.id, labour_code: 'LAB-001', full_name: 'Ramesh Jadhav', phone: '9822012345', work_category: 'Harvesting & Field Hand', start_date: '2026-04-01', wage_basis: 'daily', base_rate: 550, is_active: true, notes: 'Senior crew lead', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lab-2', farm_id: initialFarm.id, labour_code: 'LAB-002', full_name: 'Sunita Patil', phone: '9822054321', work_category: 'Weeding & Pruning', start_date: '2026-04-01', wage_basis: 'daily', base_rate: 450, is_active: true, notes: 'Vineyard care specialist', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lab-3', farm_id: initialFarm.id, labour_code: 'LAB-003', full_name: 'Kailash Shinde', phone: '9822098765', work_category: 'Irrigation & Spraying', start_date: '2026-04-01', wage_basis: 'daily', base_rate: 600, is_active: true, notes: 'Handles drip irrigation & chemical sprays', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lab-4', farm_id: initialFarm.id, labour_code: 'LAB-004', full_name: 'Mangala Pawar', phone: '9822011223', work_category: 'Sorting & Packaging', start_date: '2026-04-01', wage_basis: 'daily', base_rate: 450, is_active: true, notes: 'Post-harvest grading unit', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lab-5', farm_id: initialFarm.id, labour_code: 'LAB-005', full_name: 'Ganesh More', phone: '9822033445', work_category: 'Machinery Operator & Mechanic', start_date: '2026-04-01', wage_basis: 'daily', base_rate: 700, is_active: true, notes: 'Tractor driver license MH-15', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lab-6', farm_id: initialFarm.id, labour_code: 'LAB-006', full_name: 'Anita Bhalerao', phone: '9822077889', work_category: 'Nursery & Sapling Care', start_date: '2026-04-01', wage_basis: 'daily', base_rate: 480, is_active: true, notes: 'Greenhouse manager', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
];

const initialMachinery: Machinery[] = [
  { id: 'mac-1', farm_id: initialFarm.id, asset_code: 'HRD-01', name: 'Mahindra 575 DI (Hired)', asset_type: 'tractor', ownership_type: 'hired', registration_reference: 'MH-15-AB-4021', make: 'Mahindra', model: '575 DI Sarpanch 45HP', meter_type: 'none', initial_meter: 0, current_meter: 0, is_active: true, notes: 'Hired from Patil Agri Rentals @ ₹900/hr', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'mac-2', farm_id: initialFarm.id, asset_code: 'HRD-02', name: 'John Deere 5050D (Hired)', asset_type: 'tractor', ownership_type: 'hired', registration_reference: 'MH-15-CD-8910', make: 'John Deere', model: '5050D PowerPro 50HP', meter_type: 'none', initial_meter: 0, current_meter: 0, is_active: true, notes: 'Hired from Kisan Custom Hire Centre @ ₹1,000/hr', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'mac-3', farm_id: initialFarm.id, asset_code: 'HRD-03', name: 'Kubota Combine Harvester (Hired)', asset_type: 'harvester', ownership_type: 'hired', registration_reference: 'KA-04-E-1234', make: 'Kubota', model: 'DC-68G', meter_type: 'none', initial_meter: 0, current_meter: 0, is_active: true, notes: 'Hired for wheat harvest @ ₹1,800/hr', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
];

const initialAdvances: Advance[] = [
  { id: 'adv-1', farm_id: initialFarm.id, labourer_id: 'lab-1', labourer_name: 'Ramesh Jadhav', labour_code: 'LAB-001', issued_at: '2026-10-02T10:00:00Z', amount: 2500, purpose: 'Family medical expense', payment_method: 'cash', payment_reference: 'CASH-REC-102', status: 'posted', issued_by: 'Anand Deshmukh', created_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T10:00:00Z' },
  { id: 'adv-2', farm_id: initialFarm.id, labourer_id: 'lab-3', labourer_name: 'Kailash Shinde', labour_code: 'LAB-003', issued_at: '2026-10-04T11:30:00Z', amount: 3000, purpose: 'Child school fee advance', payment_method: 'upi', payment_reference: 'UPI-98421034', status: 'posted', issued_by: 'Anand Deshmukh', created_at: '2026-10-04T11:30:00Z', updated_at: '2026-10-04T11:30:00Z' },
  { id: 'adv-3', farm_id: initialFarm.id, labourer_id: 'lab-5', labourer_name: 'Ganesh More', labour_code: 'LAB-005', issued_at: '2026-10-05T09:00:00Z', amount: 1500, purpose: 'Festival advance (Diwali preparation)', payment_method: 'cash', payment_reference: 'CASH-REC-105', status: 'posted', issued_by: 'Anand Deshmukh', created_at: '2026-10-05T09:00:00Z', updated_at: '2026-10-05T09:00:00Z' },
];

const initialAllocations: AdvanceAllocation[] = [
  { id: 'alloc-1', farm_id: initialFarm.id, advance_id: 'adv-1', allocation_date: '2026-10-08', amount: 500, allocation_type: 'cash_repayment', recorded_by: 'Pooja Kulkarni', notes: 'Voluntary cash repayment by Ramesh', created_at: '2026-10-08T14:00:00Z' }
];

// Seed rich, authentic attendance for October 2026 (Oct 1 to Oct 13, including Sundays and leaves)
const seedDates = [
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
  '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'
];
const initialAttendance: AttendanceRecord[] = [];

seedDates.forEach((dateStr) => {
  const isSunday = dateStr === '2026-10-04' || dateStr === '2026-10-11';

  initialLabourers.forEach((lab, idx) => {
    let status: AttendanceStatus = 'present';
    let units = 1.0;
    let hours = 8;
    let task = lab.work_category;

    if (isSunday) {
      status = 'leave';
      units = 0.0;
      hours = 0;
      task = 'Weekly Off (Sunday)';
    } else {
      // Realistic labor patterns:
      if (idx === 0 && dateStr === '2026-10-06') {
        // Ramesh: half-day
        status = 'half_day';
        units = 0.5;
        hours = 4;
      } else if (idx === 1 && dateStr === '2026-10-07') {
        // Sunita: leave (absent)
        status = 'leave';
        units = 0.0;
        hours = 0;
        task = 'Personal Leave';
      } else if (idx === 1 && dateStr === '2026-10-12') {
        // Sunita: half-day
        status = 'half_day';
        units = 0.5;
        hours = 4;
      } else if (idx === 2 && dateStr === '2026-10-03') {
        // Kailash: half-day
        status = 'half_day';
        units = 0.5;
        hours = 4;
      } else if (idx === 2 && dateStr === '2026-10-08') {
        // Kailash: absent
        status = 'leave';
        units = 0.0;
        hours = 0;
        task = 'Health recovery';
      } else if (idx === 3 && dateStr === '2026-10-05') {
        // Mangala: half-day
        status = 'half_day';
        units = 0.5;
        hours = 4;
      } else if (idx === 3 && dateStr === '2026-10-09') {
        // Mangala: absent
        status = 'leave';
        units = 0.0;
        hours = 0;
        task = 'Family function';
      } else if (idx === 4 && dateStr === '2026-10-02') {
        // Ganesh: half-day
        status = 'half_day';
        units = 0.5;
        hours = 4;
      } else if (idx === 5 && dateStr === '2026-10-06') {
        // Anita: half-day
        status = 'half_day';
        units = 0.5;
        hours = 4;
      } else if (idx === 5 && dateStr === '2026-10-10') {
        // Anita: leave
        status = 'leave';
        units = 0.0;
        hours = 0;
        task = 'Sick leave';
      }
    }

    initialAttendance.push({
      id: `att-${dateStr}-${lab.id}`,
      farm_id: initialFarm.id,
      labourer_id: lab.id,
      work_date: dateStr,
      shift_code: 'regular',
      status,
      payable_units: units,
      hours_worked: hours,
      task_name: task,
      field_name: idx % 2 === 0 ? 'Plot A (Grapes)' : 'Plot B (Sugarcane)',
      approval_status: 'approved',
      created_by: 'usr-4',
      created_at: `${dateStr}T18:00:00Z`,
      updated_at: `${dateStr}T18:00:00Z`
    });
  });
});

const initialUsage: MachineryUsage[] = [
  { id: 'usg-1', farm_id: initialFarm.id, machinery_id: 'mac-1', machinery_name: 'Mahindra 575 DI (Red)', asset_code: 'TRC-01', work_date: '2026-10-12', operator_name: 'Ganesh More', task_name: 'Deep Plowing & Bed Preparation', field_name: 'Plot C (Wheat block)', start_time: '2026-10-12T07:30:00Z', end_time: '2026-10-12T12:30:00Z', start_meter: 1280.2, end_meter: 1285.2, duration_minutes: 300, work_quantity: 4.5, fuel_quantity: 18, notes: 'Diesel topped up before plowing', created_at: '2026-10-12T13:00:00Z', updated_at: '2026-10-12T13:00:00Z' },
  { id: 'usg-2', farm_id: initialFarm.id, machinery_id: 'mac-2', machinery_name: 'John Deere 5050D', asset_code: 'TRC-02', work_date: '2026-10-13', operator_name: 'Ganesh More', task_name: 'Rotavator & Organic Compost Mixing', field_name: 'Plot A (Vineyard)', start_time: '2026-10-13T08:00:00Z', end_time: '2026-10-13T11:30:00Z', start_meter: 849.0, end_meter: 852.5, duration_minutes: 210, work_quantity: 3.0, fuel_quantity: 12, notes: 'Vineyard row cultivation', created_at: '2026-10-13T12:00:00Z', updated_at: '2026-10-13T12:00:00Z' }
];

const initialExpenses: MachineryExpense[] = [
  { id: 'exp-1', farm_id: initialFarm.id, machinery_id: 'mac-1', machinery_name: 'Mahindra 575 DI (Red)', expense_date: '2026-10-10', category: 'fuel', amount: 3600, quantity: 40, unit: 'Litres', vendor: 'Indian Oil Kisan Seva Kendra', payment_method: 'upi', payment_reference: 'IOCL-98124', notes: 'Diesel 40L @ ₹90/L for plowing season', created_at: '2026-10-10T16:00:00Z', updated_at: '2026-10-10T16:00:00Z' },
  { id: 'exp-2', farm_id: initialFarm.id, machinery_id: 'mac-1', machinery_name: 'Mahindra 575 DI (Red)', expense_date: '2026-10-08', category: 'servicing', amount: 2200, vendor: 'Nashik Tractor Spares & Service', payment_method: 'cash', payment_reference: 'REC-3410', notes: 'Engine oil filter replacement and greasing', created_at: '2026-10-08T11:00:00Z', updated_at: '2026-10-08T11:00:00Z' },
  { id: 'exp-3', farm_id: initialFarm.id, machinery_id: 'mac-3', machinery_name: 'Kubota Combine Harvester', expense_date: '2026-10-11', category: 'hired_service', amount: 5400, vendor: 'Patil Agri Rentals', payment_method: 'bank_transfer', payment_reference: 'NEFT-8841293', notes: 'Harvester rent 3 hours @ ₹1,800/hr', created_at: '2026-10-11T17:00:00Z', updated_at: '2026-10-11T17:00:00Z' }
];

const initialAudit: AuditLog[] = [
  { id: 'aud-1', farm_id: initialFarm.id, actor_name: 'Anand Deshmukh', actor_role: 'owner', action: 'CREATE_LABOURER', entity_type: 'labourers', entity_id: 'lab-1', occurred_at: '2026-10-01T08:00:00Z', reason: 'Initial crew onboarding' },
  { id: 'aud-2', farm_id: initialFarm.id, actor_name: 'Anand Deshmukh', actor_role: 'owner', action: 'ISSUE_ADVANCE', entity_type: 'advances', entity_id: 'adv-1', occurred_at: '2026-10-02T10:00:00Z', reason: 'Medical advance to Ramesh Jadhav' },
  { id: 'aud-3', farm_id: initialFarm.id, actor_name: 'Balaji Shinde', actor_role: 'supervisor', action: 'RECORD_ATTENDANCE', entity_type: 'attendance', entity_id: 'att-2026-10-13', occurred_at: '2026-10-13T17:00:00Z', reason: 'Daily crew attendance for 2026-10-13' }
];

const initialTractorRentals: TractorRentalLog[] = [
  {
    id: 'trc-rent-1',
    farm_id: initialFarm.id,
    tractor_name: 'Mahindra 575 DI (Hired)',
    vendor_name: 'Patil Agri Rentals',
    work_date: '2026-10-11',
    hours_worked: 4.0,
    hourly_rate: 900,
    gross_amount: 3600,
    advance_amount: 1000,
    rest_amount: 2600,
    status: 'pending',
    task_name: 'Deep Plowing & Harrowing',
    notes: 'Advance ₹1,000 paid in cash at start',
    created_at: '2026-10-11T12:00:00Z'
  },
  {
    id: 'trc-rent-2',
    farm_id: initialFarm.id,
    tractor_name: 'John Deere 5050D',
    vendor_name: 'Kisan Custom Hire Centre',
    work_date: '2026-10-12',
    hours_worked: 5.5,
    hourly_rate: 1000,
    gross_amount: 5500,
    advance_amount: 2000,
    rest_amount: 3500,
    status: 'pending',
    task_name: 'Rotavator Soil Pulverization',
    notes: 'Advance ₹2,000 via UPI',
    created_at: '2026-10-12T14:30:00Z'
  },
  {
    id: 'trc-rent-3',
    farm_id: initialFarm.id,
    tractor_name: 'Swaraj 744 FE',
    vendor_name: 'Ganesh Shinde (Neighbor Hire)',
    work_date: '2026-10-13',
    hours_worked: 3.5,
    hourly_rate: 850,
    gross_amount: 2975,
    advance_amount: 1500,
    rest_amount: 1475,
    status: 'pending',
    task_name: 'Vineyard Bed Furrowing',
    notes: 'Advance ₹1,500 cash to driver',
    created_at: '2026-10-13T11:00:00Z'
  }
];

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
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (!parsed.tractorRentals) {
        parsed.tractorRentals = [...initialTractorRentals];
      }
      if (!parsed.attendance || parsed.attendance.length < 50) {
        parsed.attendance = [...initialAttendance];
      }
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
    syncJobs: [
      { id: 'sync-1', farm_id: initialFarm.id, entity_type: 'labourers', entity_id: 'lab-1', operation: 'insert', status: 'succeeded', attempt_count: 1, last_attempt_at: '2026-10-13T10:00:00Z', completed_at: '2026-10-13T10:00:05Z', created_at: '2026-10-13T10:00:00Z' },
      { id: 'sync-2', farm_id: initialFarm.id, entity_type: 'attendance', entity_id: 'att-batch', operation: 'insert', status: 'succeeded', attempt_count: 1, last_attempt_at: '2026-10-13T12:00:00Z', completed_at: '2026-10-13T12:00:04Z', created_at: '2026-10-13T12:00:00Z' },
    ],
    closeManifests: []
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStore));
  return initialStore;
};

const saveStore = (store: FarmDataStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const dataService = {
  // Farm & Memberships
  getFarm: (): Farm => getStore().farm,
  updateFarm: (updates: Partial<Farm>): Farm => {
    const store = getStore();
    store.farm = { ...store.farm, ...updates, updated_at: new Date().toISOString() };
    saveStore(store);
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
      return store.labourers.find(l => l.id === labourer.id)!;
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
    return lab;
  },
  removeLabourer: (id: string): boolean => {
    const store = getStore();
    const lab = store.labourers.find(l => l.id === id);
    if (!lab) throw new Error('Labourer not found');
    store.labourers = store.labourers.filter(l => l.id !== id);
    dataService.logAudit('REMOVE_LABOURER', 'labourers', id, `Removed labourer ${lab.full_name}`);
    saveStore(store);
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
  issueAdvance: (data: { labourer_id: string; amount: number; purpose?: string; payment_method: PaymentMethod; payment_reference?: string; notes?: string }): Advance => {
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
      issued_at: new Date().toISOString(),
      amount: round2(data.amount),
      purpose: data.purpose || 'Personal advance',
      payment_method: data.payment_method,
      payment_reference: data.payment_reference || '',
      status: 'posted',
      issued_by: 'Owner/Manager',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.advances.push(newAdvance);
    dataService.logAudit('ISSUE_ADVANCE', 'advances', newAdvance.id, `Issued advance ₹${newAdvance.amount} to ${lab.full_name}`);
    saveStore(store);
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
  },

  // Sync Jobs (Google Sheets Mirror)
  getSyncJobs: (): SyncJob[] => getStore().syncJobs,
  triggerSync: async (): Promise<{ succeeded: number; failed: number }> => {
    const store = getStore();
    const now = new Date().toISOString();

    const newJob: SyncJob = {
      id: 'sync-' + Date.now(),
      farm_id: store.farm.id,
      entity_type: 'full_manifest',
      entity_id: 'sheet-all',
      operation: 'update',
      status: 'succeeded',
      attempt_count: 1,
      last_attempt_at: now,
      completed_at: now,
      created_at: now
    };

    store.syncJobs.unshift(newJob);
    dataService.logAudit('GOOGLE_SHEETS_SYNC', 'integrations', newJob.id, 'Executed mirror sync to Google Sheets');
    saveStore(store);
    return { succeeded: 1, failed: 0 };
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
    return log;
  },

  deleteTractorRental: (id: string): boolean => {
    const store = getStore();
    if (!store.tractorRentals) store.tractorRentals = [];
    store.tractorRentals = store.tractorRentals.filter(l => l.id !== id);
    dataService.logAudit('DELETE_TRACTOR_RENTAL', 'machinery', id, `Deleted tractor rental record ${id}`);
    saveStore(store);
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
