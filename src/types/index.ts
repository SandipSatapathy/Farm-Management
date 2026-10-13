// Domain Types conforming to 05_DATABASE_DESIGN.md and 02_FUNCTIONAL_REQUIREMENTS.md

export type UserRole = 
  | 'owner' 
  | 'admin' 
  | 'payroll' 
  | 'supervisor' 
  | 'partner_viewer' 
  | 'tractor_operator';

export type WageBasis = 'daily' | 'hourly' | 'piece_rate';

export type AttendanceStatus = 
  | 'present' 
  | 'half_day' 
  | 'absent' 
  | 'leave' 
  | 'holiday' 
  | 'other';

export type ApprovalStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface MonthlyAttendanceSummary {
  presentDays: number;
  halfDays: number;
  absentDays: number;
  weeklyOffDays: number;
  unmarkedDays: number;
  effectiveDays: number;
  dailyRate: number;
  grossEarned: number;
  advanceOutstanding: number;
  netPayable: number;
}

export type PayrollPeriodStatus = 
  | 'draft' 
  | 'review' 
  | 'approved' 
  | 'finalized' 
  | 'reopened' 
  | 'void';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque';

export type MachineryOwnership = 'owned' | 'hired';

export type MeterType = 'hour_meter' | 'odometer' | 'none';

export type ExpenseCategory = 
  | 'fuel' 
  | 'repair' 
  | 'maintenance' 
  | 'servicing' 
  | 'parts' 
  | 'lubricant' 
  | 'hired_service' 
  | 'other';

export interface Farm {
  id: string;
  name: string;
  address?: string;
  currency_code: string;
  timezone: string;
  financial_year_start_month: number;
  financial_year_start_day: number;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FarmMembership {
  id: string;
  farm_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Labourer {
  id: string;
  farm_id: string;
  labour_code: string;
  full_name: string;
  phone?: string;
  work_category?: string;
  start_date: string;
  end_date?: string;
  wage_basis: WageBasis;
  base_rate: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  farm_id: string;
  labourer_id: string;
  work_date: string;
  shift_code: string;
  status: AttendanceStatus;
  payable_units: number;
  hours_worked?: number;
  piece_quantity?: number;
  task_name?: string;
  field_name?: string;
  supervisor_user_id?: string;
  approval_status: ApprovalStatus;
  correction_reason?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  farm_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  approved_by?: string;
  approved_at?: string;
  finalized_at?: string;
  calculation_version: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollLine {
  id: string;
  farm_id: string;
  payroll_period_id: string;
  labourer_id: string;
  labourer_name?: string;
  labour_code?: string;
  attendance_snapshot: {
    present_days: number;
    half_days: number;
    absent_days: number;
    leave_days: number;
    holiday_days: number;
    total_payable_units: number;
    total_hours: number;
  };
  wage_basis: WageBasis;
  rate_snapshot: number;
  units: number;
  gross_amount: number;
  additions: number;
  other_deductions: number;
  advance_recovery: number;
  net_payable: number;
  paid_amount: number;
  calculation_details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PayrollPayment {
  id: string;
  farm_id: string;
  payroll_line_id: string;
  paid_at: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface Advance {
  id: string;
  farm_id: string;
  labourer_id: string;
  labourer_name?: string;
  labour_code?: string;
  issued_at: string;
  amount: number;
  purpose?: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  status: 'posted' | 'void';
  issued_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvanceAllocation {
  id: string;
  farm_id: string;
  advance_id: string;
  payroll_line_id?: string;
  allocation_date: string;
  amount: number;
  allocation_type: 'payroll_recovery' | 'cash_repayment' | 'adjustment';
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface Machinery {
  id: string;
  farm_id: string;
  asset_code: string;
  name: string;
  asset_type: string;
  ownership_type: MachineryOwnership;
  registration_reference?: string;
  make?: string;
  model?: string;
  meter_type: MeterType;
  initial_meter: number;
  current_meter?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineryUsage {
  id: string;
  farm_id: string;
  machinery_id: string;
  machinery_name?: string;
  asset_code?: string;
  work_date: string;
  operator_name?: string;
  operator_user_id?: string;
  field_name?: string;
  task_name: string;
  start_time?: string;
  end_time?: string;
  start_meter?: number;
  end_meter?: number;
  duration_minutes?: number;
  work_quantity?: number;
  fuel_quantity?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineryExpense {
  id: string;
  farm_id: string;
  machinery_id?: string;
  machinery_name?: string;
  usage_id?: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  quantity?: number;
  unit?: string;
  vendor?: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  receipt_path?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  farm_id: string;
  actor_user_id?: string;
  actor_name?: string;
  actor_role?: UserRole;
  action: string;
  entity_type: string;
  entity_id?: string;
  occurred_at: string;
  reason?: string;
  request_id?: string;
  changes?: Record<string, any>;
}

export interface SyncJob {
  id: string;
  farm_id: string;
  entity_type: string;
  entity_id: string;
  operation: 'insert' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  attempt_count: number;
  next_attempt_at?: string;
  last_error?: string;
  last_attempt_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface AnnualCloseManifest {
  id: string;
  farm_id: string;
  financial_year_label: string;
  start_date: string;
  end_date: string;
  status: 'preview' | 'processing' | 'verified' | 'locked' | 'reopened';
  pdf_export_job_id?: string;
  sheets_verified_at?: string;
  record_counts: Record<string, number>;
  financial_totals: Record<string, number>;
  backup_reference?: string;
  closed_by?: string;
  closed_at: string;
  notes?: string;
  created_at: string;
}

export interface TractorRentalLog {
  id: string;
  farm_id: string;
  machinery_id?: string;
  tractor_name: string;
  vendor_name: string;
  work_date: string;
  hours_worked: number;
  hourly_rate: number;
  gross_amount: number;
  advance_amount: number;
  rest_amount: number;
  status: 'pending' | 'settled';
  fuel_provided_litres?: number;
  task_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

